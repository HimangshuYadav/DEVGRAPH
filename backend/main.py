"""
Antigravity (DevGraph AI) — FastAPI Backend
Docs→RAG platform: Bright Data → Cohere → ChromaDB → Groq
"""

import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes.scrape   import router as scrape_router
from api.routes.query    import router as query_router
from api.routes.graph    import router as graph_router
from api.routes.health   import router as health_router
from api.routes.sources  import router as sources_router
from services.vector_store    import init_chroma
from services.knowledge_graph import init_graph


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize persistent services on startup."""
    init_chroma()
    init_graph()
    print("\n🚀 Antigravity backend ready")
    print(f"   Vector DB : {os.getenv('CHROMA_DB_PATH', './chroma_db')}")
    print(f"   Groq model: {os.getenv('GROQ_MODEL', 'llama-3.3-70b-versatile')}")
    print(f"   Embed model: {os.getenv('COHERE_EMBED_MODEL', 'embed-english-v3.0')}\n")
    yield


app = FastAPI(
    title="Antigravity API",
    description="Docs→RAG platform powered by Bright Data + Cohere + Groq",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



app.include_router(scrape_router,  prefix="/api/scrape",   tags=["Scraping"])
app.include_router(query_router,   prefix="/api/query",    tags=["RAG Query"])
app.include_router(graph_router,   prefix="/api/graph",    tags=["Knowledge Graph"])
app.include_router(health_router,  prefix="/api/health",   tags=["Health"])
app.include_router(sources_router, prefix="/api/sources",  tags=["Catalog Sources"])


@app.get("/")
async def root():
    return {
        "service": "Antigravity",
        "version": "1.0.0",
        "docs": "/docs",
    }
