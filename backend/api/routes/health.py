"""GET /api/health — scraper dashboard metrics and heal trigger"""

from __future__ import annotations
from datetime import datetime, timezone

from fastapi import APIRouter
from models.schemas import HealthResponse, HealRequest, RunEvent
from services.vector_store    import get_stats
from services.knowledge_graph import get_graph
from services.brightdata      import bdata_heal_collector

router = APIRouter()

# In-memory metrics store
_run_history: list[dict] = []
_heals_applied: int = 0
_collector_id: str | None = None


def record_run_event(status: str, pages: int, message: str) -> None:
    _run_history.append({
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "status": status,
        "pages": pages,
        "message": message,
    })
    if len(_run_history) > 50:
        _run_history.pop(0)


@router.get("", response_model=HealthResponse)
async def get_health():
    global _collector_id
    stats = get_stats()
    g = get_graph()

    last_run = _run_history[-1]["timestamp"] if _run_history else None

    return HealthResponse(
        pages_indexed=stats.get("pages", 0),
        chunks_created=stats.get("chunks", 0),
        last_run=last_run,
        heals_applied=_heals_applied,
        collector_id=_collector_id,
        run_history=[RunEvent(**e) for e in _run_history[-10:]],
    )


@router.post("/heal")
async def trigger_heal(req: HealRequest):
    global _heals_applied, _collector_id
    _collector_id = req.collector_id
    ok = await bdata_heal_collector(req.collector_id, req.description)
    if ok:
        _heals_applied += 1
        record_run_event("healed", 0,
                         f"Healed collector {req.collector_id}: {req.description}")
    return {"ok": ok, "heals_applied": _heals_applied}


@router.post("/set-collector")
async def set_collector(body: dict):
    global _collector_id
    _collector_id = body.get("collector_id")
    return {"collector_id": _collector_id}
