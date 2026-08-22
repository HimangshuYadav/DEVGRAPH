"""POST /api/query — RAG question answering"""

from fastapi import APIRouter
from models.schemas import QueryRequest, QueryResponse, Citation
from services.rag import answer_question

router = APIRouter()


@router.post("", response_model=QueryResponse)
async def query_docs(req: QueryRequest):
    result = await answer_question(req.question, n_results=req.n_results)
    return QueryResponse(
        answer=result["answer"],
        citations=[Citation(**c) for c in result["citations"]],
        graph_highlight=result["graph_highlight"],
        knowledge_gap=result.get("knowledge_gap", False),
        suggested_url=result.get("suggested_url", None),
    )
