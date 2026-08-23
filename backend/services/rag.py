"""
RAG service: Cohere retrieval + Groq LLM composition with citations.
"""

from __future__ import annotations
import os
import re

from groq import Groq

from services.embedder      import embed_query_async, embed_query
from services.vector_store  import query_similar, query_by_keywords, list_sources
from services.knowledge_graph import get_relevant_node_ids

_groq: Groq | None = None
MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")


def _get_groq() -> Groq:
    global _groq
    if _groq is None:
        from dotenv import load_dotenv
        load_dotenv()
        api_key = os.getenv("GROQ_API_KEY", "")
        _groq = Groq(api_key=api_key)
    return _groq



SYSTEM_PROMPT = """You are DevGraph AI, an expert assistant that answers questions about developer documentation.

STRICT RULES:
1. Answer ONLY based on the provided documentation excerpts below.
2. For EVERY factual claim, add an inline citation like: [[Section Heading]](url)
3. If the excerpts don't contain enough information, say so honestly.
4. Use markdown formatting: headings, bullet points, code blocks.
5. Keep answers concise but complete.
6. Never invent facts not supported by the excerpts.
7. Do NOT include any <think> tags or reasoning thoughts in your output. Go straight to the answer.

Format citations exactly as: [[Heading]](url)"""


def build_context(chunks: list[dict]) -> str:
    parts = []
    for i, chunk in enumerate(chunks):
        parts.append(
            f"--- Excerpt {i+1} ---\n"
            f"Source: {chunk['page_url']}\n"
            f"Section: {chunk['heading']}\n"
            f"Content: {chunk['text']}\n"
        )
    return "\n".join(parts)


FALLBACK_MODELS = ["openai/gpt-oss-20b", "qwen/qwen3.6-27b"]


def _call_groq_with_fallback(groq_client: Groq, messages: list[dict], temperature: float = 0.1, max_tokens: int = 800) -> str:
    """Try models sequentially to bypass single-model token limits on free tier."""
    for model in FALLBACK_MODELS:
        try:
            completion = groq_client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            content = completion.choices[0].message.content or ""
            if content.strip():
                return content
        except Exception as exc:
            print(f"[Groq Fallback] Model {model} failed ({exc}) -> trying next model")
    return ""


async def answer_question(question: str, n_results: int = 8) -> dict:
    """
    Full RAG pipeline:
    1. Embed question via Cohere (or instant keyword fallback)
    2. Retrieve top-k chunks from ChromaDB
    3. Build prompt with context
    4. Get Groq completion (with multi-model fallback)
    5. Return answer + citations + graph highlights
    """

    # 1. Embed query & retrieve chunks
    q_embedding = await embed_query_async(question)

    chunks = []
    if q_embedding:
        chunks = query_similar(q_embedding, n_results=n_results)
    if not chunks:
        chunks = query_by_keywords(question, n_results=n_results)

    if not chunks:
        suggested = await _suggest_docs_url(question)
        return {
            "answer": "No relevant documentation found for this query in the current catalog. Expand coverage by adding the documentation below.",
            "citations": [],
            "graph_highlight": [],
            "knowledge_gap": True,
            "suggested_url": suggested,
        }

    # Check confidence — if best score is below threshold, flag knowledge gap early
    max_score = max(c["score"] for c in chunks)
    knowledge_gap = max_score < 0.55
    suggested_url: str | None = None
    if knowledge_gap:
        suggested_url = await _suggest_docs_url(question)

    # 3. Build context
    context = build_context(chunks)
    user_message = f"Documentation excerpts:\n\n{context}\n\nQuestion: {question}"

    # 4. Groq completion (with multi-model fallback & non-blocking async thread)
    groq_client = _get_groq()
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user",   "content": user_message},
    ]
    import asyncio
    answer = await asyncio.to_thread(
        _call_groq_with_fallback,
        groq_client,
        messages,
        temperature=0.1,
        max_tokens=800,
    )


    if not answer:
        excerpts_formatted = []
        for c in chunks[:3]:
            excerpts_formatted.append(f"#### [{c['heading']}]({c['page_url']})\n{c['text']}")
        answer = "### Documentation Excerpts\n\n" + "\n\n".join(excerpts_formatted)



    # Robustly strip any reasoning/thinking blocks
    if "</think>" in answer:
        answer = answer.split("</think>")[-1].strip()
    elif "<think>" in answer:
        answer = re.sub(r"<think>[\s\S]*", "", answer).strip()

    # Normalize double bracket citations [[Heading]](url) -> [Heading](url)
    answer = re.sub(r"\[\[(.*?)\]\]\((.*?)\)", r"[\1](\2)", answer)
    answer = re.sub(r"\[\[(.*?)\]\]", r"[\1]", answer)

    # 5. Build citations (deduplicated by URL+heading)
    seen = set()
    citations = []
    for chunk in chunks:
        key = f"{chunk['page_url']}#{chunk['heading']}"
        if key not in seen and chunk["score"] > 0.3:
            seen.add(key)
            citations.append({
                "url":       chunk["page_url"],
                "heading":   chunk["heading"],
                "excerpt":   chunk["excerpt"],
                "chunk_idx": chunk["chunk_idx"],
            })

    # 6. Graph highlights — extract query keywords
    keywords = re.findall(r"\b\w{4,}\b", question.lower())
    graph_highlight = get_relevant_node_ids(keywords)

    # 5a. Post-answer gap scan — detect when LLM explicitly states it cannot answer
    _GAP_SIGNALS = [
        "do not contain", "don't contain",
        "does not contain", "doesn't contain",
        "not contain any information",
        "no information", "cannot find", "can't find",
        "not found in", "not available in", "not covered",
        "no relevant", "not provided", "outside the scope",
        "cannot answer", "can't answer", "unable to answer",
        "i cannot provide", "i don't have", "i do not have",
        "not mentioned", "not discussed",
    ]
    answer_lower = answer.lower()

    # Only trigger post-answer gap scan if:
    # 1. We didn't retrieve high-confidence citations (citations is empty or max_score < 0.50)
    # OR 2. The answer STARTS with a negative statement (e.g. "The provided excerpts do not contain...")
    starts_negative = any(sig in answer_lower[:200] for sig in _GAP_SIGNALS)
    has_poor_chunks = len(citations) == 0 or max_score < 0.50

    if not knowledge_gap and (has_poor_chunks or starts_negative) and any(sig in answer_lower for sig in _GAP_SIGNALS):
        knowledge_gap = True
        suggested_url = await _suggest_docs_url(question)

    # FINAL SAFEGUARD: If suggested_url's domain is ALREADY in our RAG catalog, cancel knowledge gap!
    if knowledge_gap and suggested_url:
        if is_domain_already_indexed(suggested_url):
            knowledge_gap = False
            suggested_url = None

    return {
        "answer":          answer,
        "citations":       citations[:6],     # max 6 citations shown
        "graph_highlight": graph_highlight,
        "knowledge_gap":   knowledge_gap,
        "suggested_url":   suggested_url,
    }


def is_domain_already_indexed(suggested_url: str | None) -> bool:
    """Check if the suggested URL's domain is already present in ChromaDB list_sources()."""
    if not suggested_url:
        return False
    try:
        from urllib.parse import urlparse
        parsed = urlparse(suggested_url)
        s_domain = (parsed.netloc or parsed.path).lower()
        if not s_domain:
            return False
        if s_domain.startswith("www."):
            s_domain = s_domain[4:]

        sources = list_sources()
        for src in sources:
            src_domain = src["domain"].lower()
            if src_domain.startswith("www."):
                src_domain = src_domain[4:]

            if s_domain == src_domain or s_domain.endswith("." + src_domain) or src_domain.endswith("." + s_domain):
                return True
    except Exception:
        pass
    return False


async def _suggest_docs_url(question: str) -> str | None:
    """Ask Groq to infer the best official documentation URL for a question it can't answer."""
    try:
        groq_client = _get_groq()
        completion = groq_client.chat.completions.create(
            model=MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a documentation URL recommender. "
                        "When given a developer question, respond with ONLY the root or documentation website URL (e.g. https://svelte.dev). "
                        "Return just the URL, nothing else — no explanation, no markdown."
                    ),
                },
                {
                    "role": "user",
                    "content": f"What official documentation website URL would best answer this question: {question}",
                },
            ],
            temperature=0.0,
            max_tokens=250,
        )
        raw = (completion.choices[0].message.content or "").strip()
        if "</think>" in raw:
            raw = raw.split("</think>")[-1].strip()
        urls = re.findall(r"https?://[^\s\"'\)\>]+", raw)
        return urls[0].rstrip(".,/") if urls else None
    except Exception as e:
        print(f"[URL Suggest] Error: {e}")
        return None





