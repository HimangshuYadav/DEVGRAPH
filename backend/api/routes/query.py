"""POST /api/query — RAG question answering"""

from fastapi import APIRouter
from models.schemas import QueryRequest, QueryResponse, Citation
from services.rag import answer_question

router = APIRouter()


@router.post("", response_model=QueryResponse)
async def query_docs(req: QueryRequest):
    try:
        result = await answer_question(req.question, n_results=req.n_results)
        valid_citations = []
        for c in result.get("citations", []):
            try:
                valid_citations.append(Citation(
                    url=str(c.get("url", "#")),
                    heading=str(c.get("heading", "")),
                    excerpt=str(c.get("excerpt", "")),
                    chunk_idx=int(c.get("chunk_idx", 0)),
                ))
            except Exception:
                pass

        return QueryResponse(
            answer=result.get("answer", "No response generated."),
            citations=valid_citations,
            graph_highlight=result.get("graph_highlight", []),
            knowledge_gap=result.get("knowledge_gap", False),
            suggested_url=result.get("suggested_url", None),
        )
    except Exception as exc:
        print(f"[Query Route Error] {exc}")
        return QueryResponse(
            answer=f"Unable to process query: {exc}",
            citations=[],
            graph_highlight=[],
            knowledge_gap=False,
            suggested_url=None,
        )

