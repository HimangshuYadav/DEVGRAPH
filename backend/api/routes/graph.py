"""GET /api/graph — knowledge graph export for React Flow"""

from fastapi import APIRouter
from models.schemas import GraphResponse, GraphNode, GraphEdge
from services.knowledge_graph import export_react_flow

router = APIRouter()


@router.get("", response_model=GraphResponse)
async def get_graph():
    data = export_react_flow()
    nodes = [GraphNode(
        id=n["id"],
        label=n["data"]["label"],
        type=n["data"]["type"],
        data=n["data"],
    ) for n in data["nodes"]]
    edges = [GraphEdge(
        id=e["id"],
        source=e["source"],
        target=e["target"],
        label=e.get("label", ""),
    ) for e in data["edges"]]
    return GraphResponse(nodes=nodes, edges=edges, stats=data["stats"])


@router.get("/raw")
async def get_graph_raw():
    """Return raw React Flow JSON (nodes array with full data for frontend)."""
    return export_react_flow()
