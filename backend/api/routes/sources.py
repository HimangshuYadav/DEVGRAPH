"""GET /api/sources — list all indexed documentation sources from ChromaDB"""

from fastapi import APIRouter
from models.schemas import DocSource
from services.vector_store import list_sources

router = APIRouter()


@router.get("", response_model=list[DocSource])
async def get_sources():
    """Return all unique root domains that have been indexed into ChromaDB."""
    return list_sources()
