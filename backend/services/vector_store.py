"""ChromaDB vector store service."""

from __future__ import annotations
import os
import chromadb
from chromadb.config import Settings

_client: chromadb.Client | None = None
_collection: chromadb.Collection | None = None
COLLECTION_NAME = "antigravity_docs"


def init_chroma() -> None:
    global _client, _collection
    db_path = os.getenv("CHROMA_DB_PATH", "./chroma_db")
    _client = chromadb.PersistentClient(
        path=db_path,
        settings=Settings(anonymized_telemetry=False),
    )
    _collection = _client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )
    count = _collection.count()
    print(f"[ChromaDB] Collection '{COLLECTION_NAME}' loaded — {count} chunks")


def get_collection() -> chromadb.Collection:
    if _collection is None:
        init_chroma()
    return _collection


def upsert_chunks(chunks: list[dict], embeddings: list[list[float]]) -> int:
    """Upsert chunk embeddings into ChromaDB. Returns count of new items."""
    col = get_collection()
    if not chunks or not embeddings:
        return 0

    ids        = [c["id"]      for c in chunks]
    documents  = [c["text"]    for c in chunks]
    metadatas  = [
        {
            "page_url":  c["page_url"],
            "title":     c["title"],
            "heading":   c["heading"],
            "chunk_idx": str(c["chunk_idx"]),
            "version":   c.get("version", ""),
            "excerpt":   c["excerpt"],
        }
        for c in chunks
    ]

    col.upsert(
        ids=ids,
        embeddings=embeddings,
        documents=documents,
        metadatas=metadatas,
    )
    return len(ids)


def query_similar(
    query_embedding: list[float],
    n_results: int = 8,
    where: dict | None = None,
) -> list[dict]:
    """Return top-k chunks most similar to the query embedding."""
    col = get_collection()
    kwargs: dict = {
        "query_embeddings": [query_embedding],
        "n_results": min(n_results, col.count() or 1),
        "include": ["documents", "metadatas", "distances"],
    }
    if where:
        kwargs["where"] = where

    results = col.query(**kwargs)

    chunks = []
    ids        = results["ids"][0]
    documents  = results["documents"][0]
    metadatas  = results["metadatas"][0]
    distances  = results["distances"][0]

    for i, doc_id in enumerate(ids):
        chunks.append({
            "id":        doc_id,
            "text":      documents[i],
            "score":     1 - distances[i],   # cosine similarity
            "page_url":  metadatas[i].get("page_url", ""),
            "title":     metadatas[i].get("title", ""),
            "heading":   metadatas[i].get("heading", ""),
            "excerpt":   metadatas[i].get("excerpt", ""),
            "chunk_idx": int(metadatas[i].get("chunk_idx", 0)),
        })

    return sorted(chunks, key=lambda x: x["score"], reverse=True)


def get_stats() -> dict:
    col = get_collection()
    count = col.count()
    # Get unique page URLs
    if count > 0:
        sample = col.get(limit=min(count, 1000), include=["metadatas"])
        urls = {m.get("page_url") for m in sample["metadatas"]}
        return {"chunks": count, "pages": len(urls)}
    return {"chunks": 0, "pages": 0}


def list_sources() -> list[dict]:
    """Return one entry per unique root domain with chunk count + last-updated timestamp."""
    col = get_collection()
    count = col.count()
    if count == 0:
        return []

    sample = col.get(limit=min(count, 5000), include=["metadatas"])
    metadatas = sample["metadatas"]

    # Group chunks by root domain
    from urllib.parse import urlparse
    from collections import defaultdict

    domain_data: dict[str, dict] = defaultdict(lambda: {
        "chunks": 0,
        "pages": set(),
        "last_updated": "",
        "root_url": "",
    })

    for m in metadatas:
        page_url = m.get("page_url", "")
        if not page_url:
            continue
        try:
            parsed = urlparse(page_url)
            domain = parsed.netloc
            root_url = f"{parsed.scheme}://{parsed.netloc}"
        except Exception:
            continue

        entry = domain_data[domain]
        entry["chunks"] += 1
        entry["pages"].add(page_url)
        entry["root_url"] = root_url

        # Track most recent timestamp (stored in version field by scraper)
        ts = m.get("version", "")
        if ts and ts > entry["last_updated"]:
            entry["last_updated"] = ts

    result = []
    for domain, data in domain_data.items():
        result.append({
            "domain": domain,
            "root_url": data["root_url"],
            "pages": len(data["pages"]),
            "chunks": data["chunks"],
            "last_updated": data["last_updated"] or None,
            # source_type heuristic: well-known seeds vs user-added
            "source_type": _classify_source(domain),
        })

    return sorted(result, key=lambda x: x["chunks"], reverse=True)


_DEFAULT_DOMAINS = {
    "fastapi.tiangolo.com",
    "docs.python.org",
    "nextjs.org",
    "tailwindcss.com",
}


def _classify_source(domain: str) -> str:
    if domain in _DEFAULT_DOMAINS:
        return "DEFAULT"
    return "USER"
