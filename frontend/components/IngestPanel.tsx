"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { IngestStats } from "@/app/page";
import { apiUrl } from "@/lib/api";


// ── Types ─────────────────────────────────────────────────────

interface DocSource {
  domain: string;
  root_url: string;
  pages: number;
  chunks: number;
  last_updated: string | null;
  source_type: "DEFAULT" | "USER";
}

const PRESETS: { label: string; url: string; code: string }[] = [
  { label: "FastAPI",  url: "https://fastapi.tiangolo.com", code: "F" },
  { label: "Next.js",  url: "https://nextjs.org/docs",      code: "N" },
  { label: "Python",   url: "https://docs.python.org/3",    code: "P" },
  { label: "Tailwind", url: "https://tailwindcss.com/docs",  code: "T" },
];

type Step = { label: string; tech: string };
const STEPS: Step[] = [
  { label: "1. Acquisition",   tech: "Discover & Sitemap" },
  { label: "2. Accessioning",  tech: "Crawl & DOM Tag" },
  { label: "3. Cataloging",    tech: "Cohere 1024-dim Vectoring" },
  { label: "4. Filing",        tech: "ChromaDB + NetworkX Graph" },
];

type RightTab = "board" | "mending";
type PanelTab = "intake" | "catalog";

interface Props {
  onComplete: (stats: IngestStats, name?: string) => void;
  rightTab: RightTab;
  setRightTab: (t: RightTab) => void;
  stats: IngestStats;
  pendingUrl: string | null;
  onPendingUrlConsumed: () => void;
}

// ── Source Badge ──────────────────────────────────────────────

function SourceBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    DEFAULT: "text-[#3F6E64] border-[#3F6E64]/50",
    USER:    "text-[#B08D57] border-[#B08D57]/50",
  };
  return (
    <span className={`font-typewriter text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 border rounded-xs ${colors[type] ?? "text-[#EFE3C8]/60 border-[#EFE3C8]/30"}`}>
      {type}
    </span>
  );
}

// ── Catalog Browser Tab ───────────────────────────────────────

function CatalogBrowser({ onRefile }: { onRefile: (url: string) => void }) {
  const [sources, setSources]   = useState<DocSource[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const loadSources = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/sources"));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data: DocSource[] = await res.json();
      setSources(data);
    } catch (e) {
      setError("Could not reach the backend catalog service.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSources(); }, [loadSources]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-[#EFE3C8]/50 p-4">
        <span className="font-typewriter text-lg animate-spin">◐</span>
        <span className="font-typewriter text-[10px] uppercase tracking-widest">Reading catalog…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 p-4 text-center">
        <span className="font-typewriter text-[10px] text-[#B14A3D] uppercase">{error}</span>
        <button onClick={loadSources} className="font-typewriter text-[10px] text-[#B08D57] hover:underline uppercase">
          Retry
        </button>
      </div>
    );
  }

  if (sources.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 p-4 text-center">
        <span className="font-typewriter text-2xl text-[#EFE3C8]/20">⊘</span>
        <p className="font-typewriter text-[10px] text-[#EFE3C8]/50 uppercase tracking-wider">
          No docs indexed yet.
        </p>
        <p className="font-card-body text-[10px] text-[#EFE3C8]/40 italic">
          Switch to Intake to file your first collection.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto space-y-2 p-3">
      {/* Refresh + count */}
      <div className="flex items-center justify-between pb-1 border-b border-[#B08D57]/20">
        <span className="font-typewriter text-[9px] uppercase tracking-widest text-[#B08D57]">
          {sources.length} COLLECTION{sources.length !== 1 ? "S" : ""} INDEXED
        </span>
        <button
          onClick={loadSources}
          className="font-typewriter text-[9px] text-[#EFE3C8]/50 hover:text-[#B08D57] uppercase tracking-wider"
        >
          ↻ Refresh
        </button>
      </div>

      {sources.map((src) => (
        <div
          key={src.domain}
          className="card-stock card-ruled p-2.5 border border-[#4A3527]/40 rounded-sm shadow-sm"
        >
          {/* Card header: domain + badge */}
          <div className="flex items-center justify-between border-b border-[#B14A3D]/30 pb-1 mb-1.5">
            <span className="font-typewriter text-[10px] font-bold text-[#241B14] truncate max-w-[140px]">
              {src.domain}
            </span>
            <SourceBadge type={src.source_type} />
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-3 font-code-mono text-[9px] text-[#241B14]/70 mb-2">
            <span>
              <span className="font-bold text-[#241B14]">{src.pages}</span> pages
            </span>
            <span>·</span>
            <span>
              <span className="font-bold text-[#241B14]">{src.chunks}</span> chunks
            </span>
            {src.last_updated && (
              <>
                <span>·</span>
                <span className="truncate">{src.last_updated.slice(0, 10)}</span>
              </>
            )}
          </div>

          {/* Root URL */}
          <div className="flex items-center justify-between gap-2">
            <a
              href={src.root_url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-code-mono text-[9px] text-[#B14A3D] truncate hover:underline flex-1"
            >
              {src.root_url} ↗
            </a>
            <button
              onClick={() => onRefile(src.root_url)}
              className="font-typewriter text-[9px] font-bold text-[#241B14] bg-[#B08D57] px-2 py-0.5 rounded-xs hover:bg-[#C5A367] transition-colors flex-shrink-0 uppercase"
            >
              Re-file
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main IngestPanel Component ────────────────────────────────

export default function IngestPanel({
  onComplete, rightTab, setRightTab, stats, pendingUrl, onPendingUrlConsumed,
}: Props) {
  const [panelTab, setPanelTab]   = useState<PanelTab>("intake");
  const [activePreset, setActivePreset] = useState("FastAPI");
  const [url, setUrl]             = useState("https://fastapi.tiangolo.com");
  const [depth, setDepth]         = useState(35);
  const [running, setRunning]     = useState(false);
  const [doneSteps, setDoneSteps] = useState<number[]>([]);
  const [stepTimes, setStepTimes] = useState<Record<number, number>>({});
  const startRef  = useRef<number>(0);
  const stepStart = useRef<number>(0);

  // When a gap suggestion arrives, switch to INTAKE and pre-fill the URL
  useEffect(() => {
    if (pendingUrl) {
      setPanelTab("intake");
      setUrl(pendingUrl);
      setActivePreset(""); // clear preset highlight; not a standard preset
      onPendingUrlConsumed();
    }
  }, [pendingUrl, onPendingUrlConsumed]);

  const handlePreset = useCallback((preset: { label: string; url: string; code: string }) => {
    setActivePreset(preset.label);
    setUrl(preset.url);
  }, []);

  // Called from Catalog tab "Re-file" button
  const handleRefile = useCallback((refUrl: string) => {
    setPanelTab("intake");
    setUrl(refUrl);
    setActivePreset("");
  }, []);

  const handleBuild = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setDoneSteps([]);
    setStepTimes({});
    startRef.current = performance.now();
    stepStart.current = performance.now();

    try {
      await delay(350);
      markStep(0);

      markStep(1);
      const res = await fetch(apiUrl("/api/scrape"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, max_pages: depth }),
      });

      if (!res.ok) throw new Error(`Scrape endpoint returned HTTP ${res.status}`);
      const data = await res.json();

      await delay(250);
      markStep(2);

      await delay(200);
      markStep(3);

      onComplete({
        pages:     data.pages_found     ?? data.pages_scraped ?? 0,
        chunks:    data.chunks_created  ?? 0,
        endpoints: data.apis_found      ?? 0,
        vectors:   (data.chunks_created ?? 0) * 1024,
      }, activePreset || new URL(url).hostname);
    } catch (e) {
      console.error("Acquisition failed:", e);
    } finally {
      setRunning(false);
    }
  }, [running, url, depth, activePreset, onComplete]);

  function markStep(i: number) {
    const elapsed = Math.round(performance.now() - stepStart.current);
    stepStart.current = performance.now();
    setDoneSteps(prev => [...prev, i]);
    setStepTimes(prev => ({ ...prev, [i]: elapsed }));
  }

  function delay(ms: number) {
    return new Promise(r => setTimeout(r, ms));
  }

  const allDone = doneSteps.length === STEPS.length;

  return (
    <div className="flex flex-col h-full select-none bg-[#4A3527] text-[#EFE3C8]">
      {/* ── INTAKE | CATALOG Panel Tabs ── */}
      <div className="flex-shrink-0 flex border-b border-[#B08D57]/30 bg-[#3B291D]">
        {(["intake", "catalog"] as PanelTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setPanelTab(t)}
            className={`flex-1 py-2.5 text-[11px] font-typewriter uppercase tracking-widest transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[#B08D57]
              ${panelTab === t
                ? "text-[#241B14] bg-[#EFE3C8] font-bold border-b-2 border-[#B08D57]"
                : "text-[#EFE3C8]/60 hover:text-[#EFE3C8]"
              }`}
          >
            {t === "intake" ? "Intake Form" : "Catalog Browser"}
          </button>
        ))}
      </div>

      {/* ── CATALOG BROWSER TAB ── */}
      {panelTab === "catalog" && (
        <CatalogBrowser onRefile={handleRefile} />
      )}

      {/* ── INTAKE FORM TAB ── */}
      {panelTab === "intake" && (
        <div className="flex flex-col flex-1 min-h-0 p-4 gap-4 overflow-y-auto">
          {/* Section Header */}
          <div className="border-b border-[#B08D57]/30 pb-2">
            <h2 className="font-typewriter text-xs tracking-widest text-[#B08D57] uppercase font-bold">
              DRAWER: SURVEY & INTAKE
            </h2>
            <p className="text-[10px] font-card-body italic text-[#EFE3C8]/70">
              File documentation sites into the reference catalog
            </p>
          </div>

          {/* Angled Guide Tabs */}
          <div>
            <p className="text-[9px] font-typewriter uppercase tracking-widest text-[#B08D57] mb-1">
              COLLECTION SECTION
            </p>
            <div className="flex items-end gap-1 pt-1">
              {PRESETS.map((p) => {
                const isSelected = url === p.url && activePreset === p.label;
                return (
                  <button
                    key={p.label}
                    onClick={() => handlePreset(p)}
                    className={`relative flex-1 py-1.5 px-1 font-typewriter text-[11px] uppercase tracking-wider text-center transition-all duration-150 border-t border-x border-[#B08D57]/40 rounded-t-sm focus-visible:outline-2 focus-visible:outline-[#B08D57]
                      ${isSelected
                        ? "bg-[#EFE3C8] text-[#241B14] font-bold border-[#B08D57] -mb-px z-10 shadow-sm"
                        : "bg-[#3A291E] text-[#EFE3C8]/70 hover:bg-[#453225] hover:text-[#EFE3C8]"
                      }`}
                  >
                    <div className="flex flex-col items-center leading-none gap-0.5">
                      <span className="text-[9px] text-[#B08D57] font-mono">{p.code}</span>
                      <span className="truncate max-w-[55px]">{p.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Docs Root URL Input */}
          <div className="space-y-1">
            <label className="text-[9px] font-typewriter uppercase tracking-widest text-[#B08D57] block">
              DOCS ROOT URL
            </label>
            <div className="flex items-center border border-[#B08D57]/40 bg-[#2A1F1A] px-2.5 py-1.5 rounded-sm">
              <input
                type="url"
                value={url}
                onChange={e => { setUrl(e.target.value); setActivePreset(""); }}
                placeholder="https://..."
                className="flex-1 bg-transparent text-[#EFE3C8] text-[11px] font-code-mono placeholder-[#EFE3C8]/30 outline-none min-w-0"
              />
            </div>
          </div>

          {/* Accession Range Slider */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[9px] font-typewriter uppercase tracking-widest text-[#B08D57]">
                ACCESSION RANGE
              </label>
              <span className="font-code-mono text-[11px] text-[#B08D57] font-bold">
                {depth} PAGES
              </span>
            </div>
            <input
              type="range"
              min={5}
              max={50}
              value={depth}
              onChange={e => setDepth(Number(e.target.value))}
              className="w-full h-1 cursor-pointer appearance-none bg-[#2A1F1A] border border-[#B08D57]/30 rounded-sm"
              style={{ accentColor: "#B08D57" }}
            />
            <div className="flex justify-between font-code-mono text-[9px] text-[#EFE3C8]/40">
              <span>5</span><span>50</span>
            </div>
          </div>

          {/* Primary Action Button */}
          <button
            onClick={handleBuild}
            disabled={running}
            className="w-full py-2.5 border border-[#B08D57] bg-[#B08D57] text-[#241B14] font-typewriter text-xs font-bold uppercase tracking-widest hover:bg-[#C5A367] transition-all duration-150 shadow-md active:translate-y-0.5 disabled:opacity-60 disabled:cursor-wait"
          >
            {running ? "ACQUIRING & FILING…" : allDone ? "RE-FILE COLLECTION" : "FILE THE COLLECTION"}
          </button>

          {/* 4-Step Library Progress */}
          {(running || allDone) && (
            <div className="border border-[#B08D57]/30 bg-[#35251B] p-2.5 space-y-2 rounded-sm">
              <p className="text-[9px] font-typewriter uppercase tracking-widest text-[#B08D57] border-b border-[#B08D57]/20 pb-1">
                CATALOGING SEQUENCE
              </p>
              {STEPS.map((s, i) => {
                const done = doneSteps.includes(i);
                const active = running && !done && doneSteps.length === i;
                return (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center mt-0.5">
                      {done   ? <span className="text-[#3F6E64] font-typewriter text-xs font-bold">✓</span>
                       : active ? <span className="text-[#B08D57] font-typewriter text-xs animate-spin">◐</span>
                       : <span className="text-[#EFE3C8]/30 font-typewriter text-xs">○</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-typewriter ${done ? "text-[#EFE3C8]" : "text-[#EFE3C8]/50"}`}>
                          {s.label}
                        </span>
                        {done && stepTimes[i] !== undefined && (
                          <span className="text-[9px] font-code-mono text-[#3F6E64]">{stepTimes[i]}ms</span>
                        )}
                      </div>
                      <p className="text-[9px] font-card-body text-[#EFE3C8]/40 italic">{s.tech}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Catalog Record Card */}
          <div className="mt-auto">
            <div className="card-stock card-ruled p-3 border border-[#4A3527]/30 rounded-sm shadow-md">
              <div className="flex items-center justify-between border-b border-[#B14A3D]/40 pb-1 mb-2">
                <span className="font-typewriter text-[10px] font-bold text-[#241B14] uppercase tracking-wider">
                  CATALOG RECORD
                </span>
                <span className="font-code-mono text-[9px] text-[#B14A3D] font-bold">
                  ACC: {(activePreset || "CUSTOM").toUpperCase()}-01
                </span>
              </div>
              <div className="space-y-1.5 font-typewriter text-[11px]">
                <div className="flex justify-between border-b border-[#B14A3D]/20 pb-0.5">
                  <span className="text-[#241B14]/70">PAGES FILED:</span>
                  <span className="font-code-mono font-bold text-[#241B14]">{stats.pages > 0 ? stats.pages.toLocaleString() : "—"}</span>
                </div>
                <div className="flex justify-between border-b border-[#B14A3D]/20 pb-0.5">
                  <span className="text-[#241B14]/70">CHUNKS INDEXED:</span>
                  <span className="font-code-mono font-bold text-[#241B14]">{stats.chunks > 0 ? stats.chunks.toLocaleString() : "—"}</span>
                </div>
                <div className="flex justify-between border-b border-[#B14A3D]/20 pb-0.5">
                  <span className="text-[#241B14]/70">ENDPOINTS MAPPED:</span>
                  <span className="font-code-mono font-bold text-[#241B14]">{stats.endpoints > 0 ? stats.endpoints.toLocaleString() : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#241B14]/70">VECTOR REFS:</span>
                  <span className="font-code-mono font-bold text-[#241B14]">{stats.vectors > 0 ? stats.vectors.toLocaleString() : "—"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
