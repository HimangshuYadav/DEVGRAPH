"""POST /api/scrape — trigger ingestion pipeline (async job)"""

from __future__ import annotations
import asyncio
import uuid
from datetime import datetime

from fastapi import APIRouter

from models.schemas import ScrapeRequest, ScrapeJobResponse, ScrapeStatusResponse
from services.brightdata    import discover_urls, fetch_page
from services.chunker       import parse_page, chunk_page
from services.embedder      import embed_texts
from services.vector_store  import upsert_chunks, get_stats
from services.knowledge_graph import add_page
from api.routes.health      import record_run_event

router = APIRouter()

# In-memory job store
_jobs: dict[str, dict] = {}


@router.post("", response_model=ScrapeJobResponse)
async def start_scrape(req: ScrapeRequest):
    job_id = str(uuid.uuid4())
    _jobs[job_id] = {
        "status": "queued",
        "pages_found": 0,
        "pages_scraped": 0,
        "chunks_created": 0,
        "error": None,
    }
    # Fire and forget
    asyncio.create_task(_run_pipeline(job_id, req.url, req.max_pages))
    return ScrapeJobResponse(job_id=job_id, status="queued",
                             message=f"Ingestion started for {req.url}")


@router.get("/{job_id}", response_model=ScrapeStatusResponse)
async def get_job_status(job_id: str):
    job = _jobs.get(job_id)
    if not job:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Job not found")
    return ScrapeStatusResponse(job_id=job_id, **job)


# ── Pipeline ──────────────────────────────────────────────────

async def _run_pipeline(job_id: str, start_url: str, max_pages: int):
    def update(**kwargs):
        _jobs[job_id].update(kwargs)

    try:
        # Step 1: Discover URLs
        update(status="discovering")
        urls = await discover_urls(start_url, max_pages)
        update(pages_found=len(urls))
        print(f"[Scrape {job_id}] Discovered {len(urls)} URLs")

        total_chunks = 0
        failed = 0

        for i, url in enumerate(urls):
            try:
                # Step 2: Fetch
                update(status="scraping", pages_scraped=i)
                html = await fetch_page(url)
                if not html:
                    failed += 1
                    continue

                # Step 3: Parse → structured JSON
                page = parse_page(html, url)
                if not page["sections"]:
                    continue

                # Step 4: Chunk
                chunks = chunk_page(page)
                if not chunks:
                    continue

                # Step 5: Embed
                update(status="embedding")
                texts = [c["text"] for c in chunks]
                embeddings = embed_texts(texts)
                if not embeddings or len(embeddings) != len(chunks):
                    continue

                # Step 6: Upsert to ChromaDB
                update(status="indexing")
                n = upsert_chunks(chunks, embeddings)
                total_chunks += n

                # Step 7: Add to knowledge graph
                add_page(page)

                update(chunks_created=total_chunks, pages_scraped=i + 1)
                print(f"[Scrape {job_id}] {i+1}/{len(urls)} — {url} → {n} chunks")

            except Exception as page_err:
                print(f"[Scrape {job_id}] Error processing {url}: {page_err}")
                failed += 1

            # Small delay between pages to pace rate limits
            await asyncio.sleep(0.3)

        stats = get_stats()
        record_run_event(
            status="ok" if failed == 0 else "partial",
            pages=len(urls) - failed,
            message=f"Scraped {len(urls)-failed}/{len(urls)} pages, {total_chunks} chunks created",
        )
        update(status="done", chunks_created=total_chunks,
               pages_scraped=len(urls) - failed)

    except Exception as exc:
        import traceback
        traceback.print_exc()
        update(status="error", error=str(exc))
        record_run_event(status="failed", pages=0, message=str(exc))
