"""
Chunking service: HTML → structured JSON → overlapping text chunks.
"""

from __future__ import annotations
import re
from urllib.parse import urlparse

import tiktoken
from bs4 import BeautifulSoup, Tag

_enc = tiktoken.get_encoding("cl100k_base")

CHUNK_TOKENS   = 500
OVERLAP_TOKENS = 50


# ── HTML → Structured Page JSON ───────────────────────────────

def parse_page(html: str, url: str) -> dict:
    """Convert raw HTML into structured page JSON."""
    soup = BeautifulSoup(html, "lxml")

    # Remove noise
    for tag in soup(["script", "style", "nav", "footer", "head",
                     "iframe", "noscript", "button", "form"]):
        tag.decompose()

    title = ""
    if soup.find("h1"):
        title = soup.find("h1").get_text(strip=True)
    elif soup.title:
        title = soup.title.string or ""

    # Detect main content area
    main = (soup.find("main") or soup.find("article") or
            soup.find(class_=re.compile(r"content|docs|markdown|prose", re.I)) or
            soup.body)

    sections = []
    if main:
        sections = _extract_sections(main)

    # Infer version from URL
    version = ""
    parts = urlparse(url).path.split("/")
    for p in parts:
        if re.match(r"v?\d+\.\d+", p):
            version = p
            break

    return {
        "url": url,
        "title": title,
        "version": version,
        "sections": sections,
    }


def _extract_sections(container) -> list[dict]:
    """Walk heading tags and collect sections with their text."""
    sections = []
    current: dict | None = None
    current_text: list[str] = []
    current_code: list[str] = []

    for el in container.descendants:
        if not isinstance(el, Tag):
            continue
        tag = el.name

        if tag in ("h1", "h2", "h3", "h4"):
            if current is not None:
                current["text"] = " ".join(current_text).strip()
                current["code_samples"] = current_code[:]
                sections.append(current)
            current = {"heading": el.get_text(strip=True), "text": "", "code_samples": []}
            current_text = []
            current_code = []

        elif tag == "p" and current is not None:
            txt = el.get_text(separator=" ", strip=True)
            if txt:
                current_text.append(txt)

        elif tag in ("pre", "code") and current is not None:
            code_txt = el.get_text(strip=True)
            if code_txt and len(code_txt) > 10:
                current_code.append(code_txt[:500])  # cap long code blocks

    if current is not None:
        current["text"] = " ".join(current_text).strip()
        current["code_samples"] = current_code
        sections.append(current)

    return [s for s in sections if s["text"] or s["code_samples"]]


# ── Structured JSON → Chunks ──────────────────────────────────

def chunk_page(page: dict) -> list[dict]:
    """Split a structured page into overlapping token chunks."""
    chunks = []
    for section in page.get("sections", []):
        heading = section.get("heading", "")
        text    = section.get("text", "")
        code    = "\n".join(section.get("code_samples", []))

        # Combine heading + body + code for this section
        full_text = f"{heading}\n{text}"
        if code:
            full_text += f"\n\nCode example:\n{code}"

        section_chunks = _split_text(full_text)
        for idx, chunk_text in enumerate(section_chunks):
            chunks.append({
                "id":         f"{page['url']}::{heading}::{idx}",
                "page_url":   page["url"],
                "title":      page.get("title", ""),
                "heading":    heading,
                "chunk_idx":  idx,
                "version":    page.get("version", ""),
                "text":       chunk_text,
                "excerpt":    chunk_text[:150],
            })

    return chunks


def _split_text(text: str) -> list[str]:
    """Split text into overlapping chunks by token count."""
    tokens = _enc.encode(text)
    if len(tokens) <= CHUNK_TOKENS:
        return [text] if text.strip() else []

    chunks = []
    start = 0
    while start < len(tokens):
        end = min(start + CHUNK_TOKENS, len(tokens))
        chunk_tokens = tokens[start:end]
        chunks.append(_enc.decode(chunk_tokens))
        if end == len(tokens):
            break
        start = end - OVERLAP_TOKENS  # slide back for overlap

    return chunks
