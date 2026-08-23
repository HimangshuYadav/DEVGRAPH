# Antigravity — Frontend Application 💻

This is the Next.js frontend for **Antigravity (DevGraph AI)** — an automated Docs→RAG & Knowledge Graph Platform.

---

## 🚀 Features

- **3-Panel Dashboard Layout**:
  - **Panel 1 — Catalog & Ingestion**: Enter documentation URLs, view scraping progress, and select indexed doc sources.
  - **Panel 2 — AI Chat Interface**: Ask technical questions with streaming responses, inline citations, and source filters.
  - **Panel 3 — Visual Knowledge Graph & Scraper Control**: Interactive node-link graph powered by **React Flow**, plus health status & self-healing logs console.
- **Modern UI Tech Stack**: Next.js 15 App Router, Tailwind CSS, Lucide Icons, `@xyflow/react` (React Flow), Markdown rendering with code highlighting.

---

## 🛠 Local Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the `frontend/` directory:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Project Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `npm run dev` | Starts local Next.js development server on port 3000 |
| `build` | `npm run build` | Compiles production build bundle |
| `start` | `npm run start` | Starts Next.js production server |
| `lint` | `npm run lint` | Runs ESLint checks across frontend code |

---

## 🏗 Directory Overview

```text
frontend/
├── app/
│   ├── layout.tsx         # Root layout with fonts & metadata
│   ├── page.tsx           # Main 3-panel application workspace
│   └── globals.css        # Global CSS variables & styling
├── components/
│   ├── ChatInterface.tsx  # RAG chat component with evidence drawer
│   ├── GraphView.tsx      # React Flow interactive knowledge graph
│   ├── ScraperControl.tsx # Ingestion launcher & job status drawer
│   ├── HealerConsole.tsx  # Bright Data self-healing event monitor
│   └── SourceSelector.tsx # Indexed domain catalog selector
└── lib/
    ├── api.ts             # REST client for backend FastAPI endpoints
    └── types.ts           # TypeScript type definitions
```
