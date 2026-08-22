# Antigravity 🚀

> **DevGraph AI — Docs→RAG Platform**  
> Bright Data · Cohere Embeddings · ChromaDB · Groq LLM · NetworkX Knowledge Graph · Next.js

---

## What It Does

1. **Scrape** any documentation site via Bright Data (auto-discovers sitemap/nav links)
2. **Parse** pages into structured JSON (sections, headings, code samples)
3. **Embed** 500-token chunks with Cohere `embed-english-v3.0`
4. **Index** into ChromaDB (cosine similarity, HNSW)
5. **Build** a NetworkX knowledge graph (Pages → Sections → Concepts)
6. **Answer** questions with Groq `llama-3.3-70b-versatile` + inline citations
7. **Self-heal** broken scrapers via `bdata scraper heal`

---

## Quick Start

### 1. Docker Compose (1-Click Production Stack)

```bash
cp backend/.env.example backend/.env # Add your API keys
docker compose up -d --build
```
* Frontend: `http://localhost:3000`
* Backend: `http://localhost:8000/docs`

---

### 2. Manual Local Development

#### Backend
```bash
cd backend
cp .env.example .env        # fill in COHERE_API_KEY, GROQ_API_KEY, etc.
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

#### Frontend
```bash
cd frontend
npm install
npm run dev                  # http://localhost:3000
```

#### Self-Heal Demo
```bash
chmod +x demo/heal-demo.sh
./demo/heal-demo.sh
```

---

### 3. Cloud Deployment

See [DEPLOYMENT.md](file:///Users/himangshuyadav/scrapper/DEPLOYMENT.md) for full instructions on deploying to **Vercel + Render / Railway / Docker VPS**.


---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `BRIGHTDATA_API_KEY` | Yes | Bright Data API key |
| `COHERE_API_KEY` | Yes | Cohere API key (free tier) |
| `GROQ_API_KEY` | Yes | Groq API key |
| `GROQ_MODEL` | No | Default: `llama-3.3-70b-versatile` |
| `CHROMA_DB_PATH` | No | Default: `./chroma_db` |
| `GRAPH_PATH` | No | Default: `./graph.json` |

---

## Architecture

```
Browser (Next.js)
    │
    ▼ REST
FastAPI Backend
    │
    ├─ Bright Data (fetch/unlocker) ──► HTML pages
    │       └─► bdata CLI (scraper create/heal demo)
    │
    ├─ Chunker (BeautifulSoup + tiktoken)
    │
    ├─ Cohere embed-english-v3.0 ──► 1024-dim vectors
    │
    ├─ ChromaDB ──► semantic search
    │
    ├─ NetworkX ──► knowledge graph
    │
    └─ Groq llama-3.3-70b ──► cited answers
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/scrape` | Start ingestion `{url, max_pages}` |
| `GET`  | `/api/scrape/{job_id}` | Poll job status |
| `POST` | `/api/query` | RAG query `{question}` |
| `GET`  | `/api/graph/raw` | React Flow graph JSON |
| `GET`  | `/api/health` | Scraper dashboard metrics |
| `POST` | `/api/health/heal` | Trigger bdata scraper heal |

---

## Hackathon Compliance

- ✅ **Bright Data Scraper Studio** — CLI wrappers for create/run/heal
- ✅ **Self-healing** — `bdata scraper heal` preserves Collector ID
- ✅ **Structured output** — HTML → JSON with sections/headings/code
- ✅ **Impact** — Chat with any docs site with evidence-backed answers
- ✅ **UI** — Premium 3-panel dark-mode Next.js interface
- ✅ **Knowledge Graph** — Visual node-link graph with query highlighting
