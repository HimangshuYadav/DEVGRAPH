const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type Citation = {
  url: string;
  heading: string;
  excerpt: string;
  chunk_idx: number;
};

export type QueryResponse = {
  answer: string;
  citations: Citation[];
  graph_highlight: string[];
};

export type ScrapeJob = {
  job_id: string;
  status: string;
  pages_found: number;
  pages_scraped: number;
  chunks_created: number;
  error?: string;
};

export type GraphData = {
  nodes: RFNode[];
  edges: RFEdge[];
  stats: Record<string, number>;
};

export type RFNode = {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    type: "page" | "section" | "concept";
    color: string;
    url?: string;
    title?: string;
  };
};

export type RFEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
  style?: Record<string, string>;
};

export type HealthData = {
  pages_indexed: number;
  chunks_created: number;
  last_run: string | null;
  heals_applied: number;
  collector_id: string | null;
  run_history: RunEvent[];
};

export type RunEvent = {
  timestamp: string;
  status: "ok" | "failed" | "healed" | "partial";
  pages: number;
  message: string;
};

// ── API calls ─────────────────────────────────────────────────

export async function startScrape(url: string, maxPages = 20): Promise<{ job_id: string }> {
  const r = await fetch(`${API}/api/scrape`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, max_pages: maxPages }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getScrapeStatus(jobId: string): Promise<ScrapeJob> {
  const r = await fetch(`${API}/api/scrape/${jobId}`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function queryDocs(question: string): Promise<QueryResponse> {
  const r = await fetch(`${API}/api/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getGraph(): Promise<GraphData> {
  const r = await fetch(`${API}/api/graph/raw`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getHealth(): Promise<HealthData> {
  const r = await fetch(`${API}/api/health`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function triggerHeal(
  collectorId: string,
  description: string
): Promise<{ ok: boolean }> {
  const r = await fetch(`${API}/api/health/heal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ collector_id: collectorId, description }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
