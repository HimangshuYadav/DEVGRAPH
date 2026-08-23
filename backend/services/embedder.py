"""Cohere embed-english-v3.0 embedding service."""

from __future__ import annotations
import os
import hashlib
import math
import re
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


def _fallback_embed_single(text: str, dim: int = 1024) -> list[float]:
    """Generate a deterministic 1024-dim normalized float vector for text."""
    tokens = re.findall(r"\w+", text.lower())
    vec = [0.0] * dim
    for tok in tokens:
        h = int(hashlib.md5(tok.encode("utf-8")).hexdigest(), 16)
        vec[h % dim] += 1.0
    norm = math.sqrt(sum(x * x for x in vec)) or 1.0
    return [x / norm for x in vec]


def embed_texts(texts: list[str], input_type: str = "search_document") -> list[list[float]]:
    """
    Embed a list of texts using Cohere.
    If Cohere hits rate limit or fails, falls back immediately to local deterministic vectors.
    Returns list of 1024-dim float vectors.
    """
    if not texts:
        return []

    client = _get_client()
    all_embeddings: list[list[float]] = []

    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i : i + BATCH_SIZE]
        try:
            response = client.embed(
                texts=batch,
                model=MODEL,
                input_type=input_type,
                embedding_types=["float"],
            )
            all_embeddings.extend(response.embeddings.float)
        except Exception as exc:
            print(f"[Cohere] embed_texts failed ({exc}) -> generating instant local vectors")
            for text in batch:
                all_embeddings.append(_fallback_embed_single(text))

    return all_embeddings


def embed_query(query: str) -> list[float]:
    """Embed a single query string without blocking retries."""
    if not query:
        return []
    try:
        client = _get_client()
        response = client.embed(
            texts=[query],
            model=MODEL,
            input_type="search_query",
            embedding_types=["float"],
        )
        return response.embeddings.float[0]
    except Exception as exc:
        print(f"[Cohere] embed_query rate-limited/failed ({exc}) -> instant keyword fallback")
        return []



