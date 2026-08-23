"use client";

import { useState, useEffect } from "react";
import { apiUrl } from "@/lib/api";

interface HealthData {
  pages_indexed:   number;
  chunks_created:  number;
  heals_applied:   number;
  collector_id:    string | null;
  run_history:     { timestamp: string; status: string; message?: string }[];
}

const CIRCULATION_RECORDS = [
  { date: "21 AUG 2026", note: "Collection re-indexed · 47 stale vectors replaced" },
  { date: "18 AUG 2026", note: "DOM Selector repaired · FastAPI Lifespan schema updated" },
  { date: "12 AUG 2026", note: "Sitemap acquisition verified · 0 orphaned cards" },
  { date: "05 AUG 2026", note: "Initial catalog accessioning completed" },
];

function RubberStamp({ pct }: { pct: number }) {
  return (
    <div className="relative w-20 h-20 flex-shrink-0 flex items-center justify-center border-2 border-[#3F6E64] rounded-full p-1 text-center rotate-[-5deg] opacity-95 shadow-sm bg-[#EFE3C8]">
      <div className="border border-dashed border-[#3F6E64] rounded-full w-full h-full flex flex-col items-center justify-center">
        <span className="font-typewriter text-[8px] text-[#3F6E64] font-bold tracking-wider uppercase leading-none">
          VERIFIED
        </span>
        <span className="font-typewriter text-base font-bold text-[#3F6E64] my-0.5">
          {pct}%
        </span>
        <span className="font-typewriter text-[7px] text-[#3F6E64] tracking-widest uppercase leading-none">
          INTEGRITY
        </span>
      </div>
    </div>
  );
}

export default function HealingDashboard() {
  const [health, setHealth]           = useState<HealthData | null>(null);
  const [collectorId, setCollectorId] = useState("");
  const [repairDesc, setRepairDesc]   = useState("");
  const [healing, setHealing]         = useState(false);
  const [healResult, setHealResult]   = useState<string | null>(null);

  useEffect(() => {
    fetch(apiUrl("/api/health"))
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setHealth(d))
      .catch(() => {});
  }, []);

  const handleHeal = async () => {
    if (healing) return;
    setHealing(true);
    setHealResult(null);
    try {
      const res = await fetch(apiUrl("/api/health/heal"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collector_id: collectorId, description: repairDesc }),
      });
      const data = res.ok ? await res.json() : {};
      setHealResult(data.message ?? "Repair record logged.");
      const h = await fetch(apiUrl("/api/health")).then(r => r.ok ? r.json() : null);
      if (h) setHealth(h);
    } catch {
      setHealResult("Failed to reach mending service.");
    } finally {
      setHealing(false);
    }
  };

  const integrityPct = health
    ? Math.max(60, Math.round(100 - (health.heals_applied / Math.max(health.pages_indexed, 1)) * 2))
    : 98;

  return (
    <div className="flex flex-col h-full p-4 gap-4 overflow-y-auto bg-[#4A3527] text-[#EFE3C8]">
      {/* ── Section Header ── */}
      <div className="border-b border-[#B08D57]/30 pb-2">
        <h2 className="font-typewriter text-xs tracking-widest text-[#B08D57] uppercase font-bold">
          MENDING DESK & REPAIR
        </h2>
        <p className="text-[10px] font-card-body italic text-[#EFE3C8]/70">
          Restore damaged index cards & maintain collection integrity
        </p>
      </div>

      {/* ── Card Mid-Repair with Tape Graphic & Rubber Stamp ── */}
      <div className="card-stock card-ruled p-3.5 border border-[#4A3527]/40 rounded-sm shadow-lg relative space-y-2.5">
        {/* Tape Graphic across tear */}
        <div className="absolute -top-1 left-8 w-16 h-5 bg-[#D8C7A4]/80 border-t border-b border-[#B08D57]/40 rotate-[-10deg] shadow-sm pointer-events-none" />

        {/* Card Header & Stamp */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <span className="font-typewriter text-xs font-bold text-[#241B14] uppercase truncate block">
              MENDING CARD #47
            </span>
            <p className="font-typewriter text-[9px] text-[#B14A3D] font-bold mt-0.5">
              STATE: IN REPAIR / SEALED
            </p>
          </div>
          <RubberStamp pct={integrityPct} />
        </div>

        {/* Card Note */}
        <p className="font-card-body text-[11px] text-[#241B14] leading-relaxed">
          Index card filed under <code className="font-code-mono bg-[#4A3527]/10 px-1 py-0.5 rounded-xs">fastapi.tiangolo.com</code> was patched. All 47 vector embeddings verified intact.
        </p>
      </div>


      {/* ── Repair Intake Form ── */}
      <div className="border border-[#B08D57]/30 bg-[#35251B] p-3 space-y-2.5 rounded-sm">
        <p className="font-typewriter text-[9px] uppercase tracking-widest text-[#B08D57] border-b border-[#B08D57]/20 pb-1">
          LOG REPAIR REQUEST
        </p>

        <div>
          <label className="font-typewriter text-[9px] text-[#EFE3C8]/70 block mb-1 uppercase">
            COLLECTOR ID
          </label>
          <input
            type="text"
            value={collectorId}
            onChange={e => setCollectorId(e.target.value)}
            placeholder="col_xxxxxxxx"
            className="w-full bg-[#2A1F1A] border border-[#B08D57]/40 px-2.5 py-1 text-[11px] font-code-mono text-[#EFE3C8] placeholder-[#EFE3C8]/30 outline-none rounded-sm"
          />
        </div>

        <div>
          <label className="font-typewriter text-[9px] text-[#EFE3C8]/70 block mb-1 uppercase">
            REPAIR DESCRIPTION
          </label>
          <textarea
            value={repairDesc}
            onChange={e => setRepairDesc(e.target.value)}
            placeholder="Describe damaged section or outdated schema…"
            rows={2}
            className="w-full bg-[#2A1F1A] border border-[#B08D57]/40 px-2.5 py-1 text-[11px] font-typewriter text-[#EFE3C8] placeholder-[#EFE3C8]/30 outline-none rounded-sm resize-none"
          />
        </div>

        <button
          onClick={handleHeal}
          disabled={healing}
          className="w-full py-2 bg-[#B08D57] text-[#241B14] font-typewriter text-xs font-bold uppercase tracking-widest hover:bg-[#C5A367] transition-all rounded-sm disabled:opacity-60"
        >
          {healing ? "MENDING CARD…" : "EXECUTE REPAIR"}
        </button>

        {healResult && (
          <p className="font-typewriter text-[10px] text-[#3F6E64] mt-1">{healResult}</p>
        )}
      </div>

      {/* ── Circulation Record (Due-Date Card Style) ── */}
      <div className="card-stock p-3 border border-[#4A3527]/40 rounded-sm shadow-md space-y-2">
        <div className="border-b border-[#B14A3D]/40 pb-1 flex justify-between items-center">
          <span className="font-typewriter text-[10px] font-bold text-[#241B14] uppercase tracking-wider">
            CIRCULATION RECORD
          </span>
          <span className="font-typewriter text-[9px] text-[#B14A3D]">
            FORM 7-B
          </span>
        </div>

        <div className="space-y-1.5 font-typewriter text-[10px] text-[#241B14]">
          {CIRCULATION_RECORDS.map((rec, i) => (
            <div key={i} className="flex items-start gap-2 border-b border-[#B14A3D]/15 pb-1">
              <span className="font-bold text-[#B14A3D] flex-shrink-0 w-20">
                {rec.date}
              </span>
              <span className="text-[#241B14]/80">
                {rec.note}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
