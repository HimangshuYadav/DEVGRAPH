# 🚀 DEVGRAPH — Deployment Guide

This guide covers production deployment options for DevGraph (FastAPI Backend + Next.js Frontend).

---

## 📋 Prerequisites & Environment Variables

Before deploying, ensure you have your API keys ready:

| Variable | Description | Example / Default |
|---|---|---|
| `GROQ_API_KEY` | Groq LLM API Key | `gsk_...` |
| `COHERE_API_KEY` | Cohere Embeddings Key | `...` |
| `BRIGHTDATA_API_KEY` | Bright Data Scraping API Key | `...` |
| `GROQ_MODEL` | LLM Model Identifier | `openai/gpt-oss-120b` or `llama-3.3-70b-versatile` |
| `COHERE_EMBED_MODEL` | Embeddings Model | `embed-english-v3.0` |
| `CHROMA_DB_PATH` | Vector store storage directory | `./chroma_db` |
| `GRAPH_PATH` | Graph persistence JSON file | `./graph.json` |
| `CORS_ORIGIN` | Allowed origin(s) | `https://your-frontend-domain.com` |
| `PORT` | Backend server port | `8000` |

---

## 🐳 Option 1: One-Click Docker Compose (Recommended for VPS / Self-Hosting)

Docker Compose deploys both the **FastAPI Backend** and the **Next.js Frontend** as containerized services with automated health checks and persistent volume mounts.

### 1. Clone & Configure
```bash
git clone <your-repo-url>
cd scrapper

# Configure backend environment variables
cp backend/.env.example backend/.env
# Edit backend/.env with your API keys
```

### 2. Launch
```bash
docker compose up -d --build
```

### 3. Verify
- Frontend: `http://<your-server-ip>:3000`
- Backend API Docs: `http://<your-server-ip>:8000/docs`
- Healthcheck: `http://<your-server-ip>:8000/api/health`

To stop the containers:
```bash
docker compose down
```

---

## ☁️ Option 2: Cloud Deployment (Vercel + Render / Railway)

### Part A: Deploy Backend to Render / Railway

1. **Push your repository to GitHub / GitLab**.
2. **Create a New Web Service on Render** (or Railway):
   - **Root Directory**: `backend`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Environment Variables**: Add `GROQ_API_KEY`, `COHERE_API_KEY`, `BRIGHTDATA_API_KEY`, `CORS_ORIGIN=*`.
   - **Persistent Disk (Optional)**: Mount `/var/data` for persistent ChromaDB & `graph.json`.
3. Note your backend URL (e.g. `https://devgraph-backend.onrender.com`).

---

### Part B: Deploy Frontend to Vercel

1. Import the repository into **Vercel**.
2. Set the **Root Directory** to `frontend`.
3. **Framework Preset**: Next.js.
4. **Environment Variables**:
   - `BACKEND_URL`: `https://devgraph-backend.onrender.com`
   - `NEXT_PUBLIC_API_URL`: `https://devgraph-backend.onrender.com`
5. Click **Deploy**.

---

## 🖥️ Option 3: Production Linux VPS (systemd + Nginx)

### 1. Backend Service (`/etc/systemd/system/devgraph-backend.service`)
```ini
[Unit]
Description=DevGraph FastAPI Backend
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/scrapper/backend
ExecStart=/home/ubuntu/scrapper/backend/venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000 --workers 2
Restart=always
EnvironmentFile=/home/ubuntu/scrapper/backend/.env

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now devgraph-backend
```

### 2. Frontend PM2 / Systemd
```bash
cd /home/ubuntu/scrapper/frontend
npm install
npm run build
pm2 start npm --name "devgraph-frontend" -- start -- -p 3000
```

### 3. Nginx Reverse Proxy (`/etc/nginx/sites-available/devgraph`)
```nginx
server {
    server_name yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
