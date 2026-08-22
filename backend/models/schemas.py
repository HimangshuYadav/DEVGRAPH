"""Pydantic schemas for request/response models."""

from __future__ import annotations
from typing import Any
from pydantic import BaseModel, HttpUrl


# ── Scraping ──────────────────────────────────────────────────

class ScrapeRequest(BaseModel):
    url: str
    max_pages: int = 20


class ScrapeJobResponse(BaseModel):
    job_id: str
    status: str
    message: str


class ScrapeStatusResponse(BaseModel):
    job_id: str
    status: str          # queued | discovering | scraping | embedding | indexing | done | error
    pages_found: int = 0
    pages_scraped: int = 0
    chunks_created: int = 0
    error: str | None = None


# ── RAG Query ─────────────────────────────────────────────────

class QueryRequest(BaseModel):
    question: str
    n_results: int = 8


class Citation(BaseModel):
    url: str
    heading: str
    excerpt: str
    chunk_idx: int


class QueryResponse(BaseModel):
    answer: str
    citations: list[Citation]
    graph_highlight: list[str]   # node IDs to highlight in React Flow
    knowledge_gap: bool = False
    suggested_url: str | None = None


# ── Catalog Sources ───────────────────────────────────────────

class DocSource(BaseModel):
    domain: str
    root_url: str
    pages: int
    chunks: int
    last_updated: str | None
    source_type: str   # DEFAULT | USER


# ── Knowledge Graph ───────────────────────────────────────────

class GraphNode(BaseModel):
    id: str
    label: str
    type: str                    # page | section | concept
    data: dict[str, Any] = {}


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    label: str


class GraphResponse(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]
    stats: dict[str, int]


# ── Health / Scraper Dashboard ────────────────────────────────

class HealRequest(BaseModel):
    collector_id: str
    description: str
    url: str | None = None


class RunEvent(BaseModel):
    timestamp: str
    status: str           # ok | failed | healed
    pages: int
    message: str


class HealthResponse(BaseModel):
    pages_indexed: int
    chunks_created: int
    last_run: str | None
    heals_applied: int
    collector_id: str | None
    run_history: list[RunEvent]
