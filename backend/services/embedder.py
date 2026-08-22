"""Cohere embed-english-v3.0 embedding service."""

from __future__ import annotations
import os
import cohere

_client: cohere.Client | None = None
MODEL = os.getenv("COHERE_EMBED_MODEL", "embed-english-v3.0")
BATCH_SIZE = 96  # Cohere max


def _get_client() -> cohere.Client:
    global _client
    if _client is None:
        api_key = os.getenv("COHERE_API_KEY", "")
        _client = cohere.Client(api_key)
    return _client


def embed_texts(texts: list[str], input_type: str = "search_document") -> list[list[float]]:
    """
    Embed a list of texts using Cohere.
    input_type: 'search_document' for indexing, 'search_query' for queries.
    Returns list of 1024-dim float vectors.
    """
    if not texts:
        return []

    client = _get_client()
    all_embeddings: list[list[float]] = []

    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i : i + BATCH_SIZE]
        
        # Retry loop for Cohere trial key rate limits (100k tokens/min)
        for attempt in range(5):
            try:
                response = client.embed(
                    texts=batch,
                    model=MODEL,
                    input_type=input_type,
                    embedding_types=["float"],
                )
                all_embeddings.extend(response.embeddings.float)
                break
            except Exception as exc:
                err_msg = str(exc).lower()
                if ("429" in err_msg or "rate limit" in err_msg or "too_many_requests" in err_msg) and attempt < 4:
                    wait_sec = (attempt + 1) * 12  # 12s, 24s, 36s, 48s backoff
                    print(f"[Cohere] Rate limit hit (429). Retrying in {wait_sec}s... (attempt {attempt+1}/5)")
                    import time
                    time.sleep(wait_sec)
                else:
                    raise exc

    return all_embeddings


def embed_query(query: str) -> list[float]:
    """Embed a single query string."""
    result = embed_texts([query], input_type="search_query")
    return result[0] if result else []
