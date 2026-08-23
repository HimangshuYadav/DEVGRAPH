# Antigravity 🚀

> **DevGraph AI — Automated Docs→RAG & Knowledge Graph Platform**  
> Powered by **Bright Data · Cohere Embeddings · ChromaDB · Groq LLM · NetworkX · Next.js**

---

![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![Bright Data](https://img.shields.io/badge/Bright_Data-Scraper_Studio-orange?style=for-the-badge)
![Cohere](https://img.shields.io/badge/Cohere-Embeddings-purple?style=for-the-badge)
![ChromaDB](https://img.shields.io/badge/ChromaDB-Vector_Store-blue?style=for-the-badge)
![Groq](https://img.shields.io/badge/Groq-LLM_Inference-red?style=for-the-badge)
![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?style=for-the-badge&logo=docker&logoColor=white)

---

## 🌟 What It Does

Antigravity transforms any technical documentation website into a high-performance **RAG system** with an interactive **Knowledge Graph** and **Self-Healing Web Scrapers**.

1. **Scrape & Discover**: Automatically crawl documentation sites via Bright Data Web Unlocker / Scraper Studio with intelligent sitemap & link navigation.
2. **Parse & Structure**: Extract page sections, subheadings, and code snippets into clean structured JSON schemas.
3. **Vector Embeddings**: Generate 1024-dimensional embeddings using Cohere `embed-english-v3.0`.
4. **Vector Database**: Store and index text chunks into ChromaDB with HNSW vector similarity search.
5. **Knowledge Graph**: Build hierarchical concept networks using NetworkX (Pages ↔ Sections ↔ Concepts) for context-rich Graph RAG.
6. **AI Question Answering**: Answer developer questions using Groq `llama-3.3-70b-versatile` with inline evidence citations.
7. **Self-Healing Scrapers**: Repair broken CSS selectors seamlessly via `bdata scraper heal` while preserving existing Collector IDs.
8. **Interactive UI**: Explore documentation with a 3-panel dashboard (Chat Interface, React Flow Node Graph, Scraper Health & Healing Console).

---

## 📁 Repository Structure

```text
scrapper/
├── backend/                  # FastAPI Backend Service
│   ├── api/routes/           # API endpoints (scrape, query, graph, health, sources)
│   ├── models/               # Pydantic schemas and data validation models
│   ├── services/             # Core business logic (Bright Data, Cohere, ChromaDB, NetworkX, RAG)
│   ├── main.py               # FastAPI application entrypoint
│   ├── Dockerfile            # Container definition for backend
│   └── requirements.txt      # Python dependencies
├── frontend/                 # Next.js Frontend Application
│   ├── app/                  # App Router pages and layout
│   ├── components/           # 3-Panel UI, Chat, React Flow Graph, Dashboard, Healer
│   ├── lib/                  # Backend API client & TypeScript interfaces
│   └── Dockerfile            # Container definition for frontend
├── demo/
│   └── heal-demo.sh          # Interactive CLI demo for Bright Data self-healing scraper
├── docker-compose.yml        # Orchestration for full-stack local deployment
├── DEPLOYMENT.md             # Production cloud deployment guide (Vercel, Render, Railway, Docker VPS)
└── README.md                 # Project documentation
```

---

## 🚀 Quick Start

### 1. Docker Compose (1-Click Stack)

```bash
# 1. Prepare environment variables
cp backend/.env.example backend/.env   # Add your API keys

# 2. Build and launch services
docker compose up -d --build
```
- **Frontend App**: `http://localhost:3000`
- **Backend API & Swagger Docs**: `http://localhost:8000/docs`

---

### 2. Manual Local Development

#### Backend (FastAPI)
```bash
cd backend
cp .env.example .env        # Add BRIGHTDATA_API_KEY, COHERE_API_KEY, GROQ_API_KEY
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

#### Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev                  # http://localhost:3000
```

---

### 3. Self-Healing Scraper Demo

Run the interactive CLI demonstration of Bright Data's `bdata scraper heal` repairing broken scrapers without breaking downstream API pipelines:

```bash
chmod +x demo/heal-demo.sh
./demo/heal-demo.sh
```

---

### 4. Cloud Deployment

Refer to [DEPLOYMENT.md](file:///Users/himangshuyadav/scrapper/DEPLOYMENT.md) for full step-by-step instructions on deploying the frontend to **Vercel** and the backend to **Render**, **Railway**, or a **Docker VPS**.

---

## 🔑 Environment Variables

Create a `backend/.env` file with the following variables:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BRIGHTDATA_API_KEY` | Yes | — | Bright Data API key for Web Unlocker & Scraper Studio |
| `COHERE_API_KEY` | Yes | — | Cohere API key for vector embeddings |
| `GROQ_API_KEY` | Yes | — | Groq API key for LLM inference |
| `GROQ_MODEL` | No | `llama-3.3-70b-versatile` | LLM model deployed on Groq |
| `COHERE_EMBED_MODEL` | No | `embed-english-v3.0` | Cohere embedding model identifier |
| `CHROMA_DB_PATH` | No | `./chroma_db` | Persistence directory for ChromaDB vector storage |
| `GRAPH_PATH` | No | `./graph.json` | Persistence path for NetworkX Knowledge Graph JSON |
| `PORT` | No | `8000` | Backend API port |
| `CORS_ORIGIN` | No | `http://localhost:3000` | Allowed CORS origin for frontend |
| `MAX_PAGES` | No | `50` | Maximum pages to scrape per documentation domain |

---

## 🏗 Architecture

```text
Browser (Next.js Frontend)
    │
    ▼ REST API
FastAPI Backend
    │
    ├─ Bright Data (Scraper / Unlocker) ──► Raw HTML Docs
    │       └─► bdata CLI (Self-healing scraper studio integration)
    │
    ├─ Parser & Chunker (BeautifulSoup + Tiktoken)
    │
    ├─ Cohere embed-english-v3.0 ──► 1024-dim Vector Embeddings
    │
    ├─ ChromaDB ──► Semantic Similarity Vector Search
    │
    ├─ NetworkX ──► Hierarchical Concept Knowledge Graph
    │
    └─ Groq LLM (Llama-3.3 / GPT-OSS) ──► Evidence-Cited Answers
```

---

## 📡 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/scrape` | Trigger ingestion job for a target URL `{url, max_pages}` |
| `GET`  | `/api/scrape/{job_id}` | Poll background scraping & indexing job progress |
| `POST` | `/api/query` | RAG query `{question, source_filter}` for cited answers |
| `GET`  | `/api/graph/raw` | Retrieve NetworkX graph JSON formatted for React Flow |
| `GET`  | `/api/sources` | List all unique documentation domains indexed in ChromaDB |
| `GET`  | `/api/health` | Scraper dashboard status & system health metrics |
| `POST` | `/api/health/heal` | Record a `bdata` scraper self-healing event |

---

## 🏆 Feature Highlights & Compliance

- ✅ **Bright Data Scraper Studio Integration**: CLI & API wrappers for target creation, extraction, and automated repairs.
- ✅ **Zero-Downtime Self-Healing**: `bdata scraper heal` repairs broken selectors while keeping the Collector ID constant.
- ✅ **Structured Knowledge Extraction**: HTML pages parsed into sub-sections, heading hierarchies, and code blocks.
- ✅ **Graph-Augmented RAG**: Combines vector search with NetworkX entity relationship graphs for contextual retrieval.
- ✅ **3-Panel Dashboard**: Next.js interface with real-time Chat, interactive Graph visualizer, and Scraper Control Panel.
