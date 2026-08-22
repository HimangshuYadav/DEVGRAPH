"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import IngestPanel from "@/components/IngestPanel";
import ChatInterface from "@/components/ChatInterface";
import KnowledgeGraph from "@/components/KnowledgeGraph";
import HealingDashboard from "@/components/HealingDashboard";

type RightTab = "board" | "mending";
type MobileTab = "survey" | "desk" | "board";

export interface IngestStats {
  pages: number;
  chunks: number;
  endpoints: number;
  vectors: number;
}

export default function Home() {
  const shouldReduceMotion = useReducedMotion();
  const [highlightIds, setHighlightIds]   = useState<string[]>([]);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [graphKey, setGraphKey]           = useState(0);
  const [rightTab, setRightTab]           = useState<RightTab>("board");
  const [mobileTab, setMobileTab]         = useState<MobileTab>("survey");
  const [collectionName, setCollectionName] = useState("FASTAPI — F");
  const [ingestStats, setIngestStats]     = useState<IngestStats>({
    pages: 0, chunks: 0, endpoints: 0, vectors: 0,
  });

  // Gap detection — when chat detects missing knowledge, pre-fill the survey drawer
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  const onQueryComplete = useCallback((ids: string[]) => {
    setHighlightIds(ids);
  }, []);

  const onScrapeComplete = useCallback((stats: IngestStats, name?: string) => {
    setIngestStats(stats);
    if (name) setCollectionName(name.toUpperCase());
    setGraphKey(k => k + 1);
    setPendingUrl(null);
  }, []);

  // Called by ChatInterface when knowledge_gap=true and user clicks "Add to Catalog →"
  const onSuggestUrl = useCallback((url: string) => {
    setPendingUrl(url);
    setMobileTab("survey");  // Switch to survey drawer on mobile
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#2A1F1A]">
      {/* ── CABINET TOP BAR & BRASS LABEL PLATE ── */}
      <header className="h-14 flex-shrink-0 bg-[#4A3527] border-b border-[#B08D57]/40 px-5 flex items-center justify-between z-30 relative shadow-md">
        {/* Title */}
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 bg-[#B08D57] rounded-sm flex items-center justify-center text-[#241B14] font-typewriter text-[10px] font-bold">
            DG
          </div>
          <span className="font-typewriter text-[#EFE3C8] text-sm tracking-wider uppercase font-bold">
            DEVGRAPH <span className="text-[#B08D57] opacity-80">— CARD CATALOG</span>
          </span>
        </div>

        {/* Engraved Brass Label Plate (Center) */}
        <div className="absolute left-1/2 -translate-x-1/2 top-1.5 bottom-1.5 px-6 bg-gradient-to-b from-[#C5A367] via-[#B08D57] to-[#8C6D3A] border-2 border-[#5E4723] rounded-sm shadow-inner flex items-center justify-center">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#241B14]/40" />
            <span className="font-typewriter text-[12px] font-bold tracking-widest text-[#241B14] drop-shadow-sm uppercase">
              {collectionName}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#241B14]/40" />
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-4 font-typewriter text-[11px]">
          <div className="flex items-center gap-1.5 text-[#EFE3C8]/70">
            <span>Bright Data</span>
            <span className="w-2 h-2 rounded-full bg-[#3F6E64]" />
          </div>
          <div className="flex items-center gap-1.5 text-[#EFE3C8]/70">
            <span>Groq 120B</span>
            <span className="w-2 h-2 rounded-full bg-[#B08D57]" />
          </div>
        </div>
      </header>

      {/* ── MOBILE TAB SWITCHER ── */}
      <div className="flex md:hidden border-b border-[#B08D57]/30 bg-[#4A3527]">
        {(["survey", "desk", "board"] as MobileTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setMobileTab(t)}
            className={`flex-1 py-2.5 text-xs font-typewriter uppercase tracking-wider transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[#B08D57]
              ${mobileTab === t ? "text-[#B08D57] bg-[#2A1F1A] border-b-2 border-[#B08D57]" : "text-[#EFE3C8]/60 hover:text-[#EFE3C8]"}`}
          >
            {t === "survey" ? "Survey Drawer" : t === "desk" ? "Reading Desk" : "Pinboard"}
          </button>
        ))}
      </div>

      {/* ── DRAWER OPEN ANIMATED CABINET CONTAINER ── */}
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="flex-1 flex min-h-0 overflow-hidden p-2 md:p-3 gap-3 bg-[#2A1F1A]"
      >
        {/* LEFT — Survey Drawer */}
        <aside
          className={`w-full md:w-[310px] md:flex-shrink-0 border border-[#B08D57]/30 bg-[#4A3527] flex flex-col rounded-sm overflow-hidden shadow-xl
            ${mobileTab !== "survey" ? "hidden md:flex" : "flex"}`}
        >
          <IngestPanel
            onComplete={onScrapeComplete}
            rightTab={rightTab}
            setRightTab={setRightTab}
            stats={ingestStats}
            pendingUrl={pendingUrl}
            onPendingUrlConsumed={() => setPendingUrl(null)}
          />
        </aside>

        {/* CENTER — Reading Desk */}
        <main
          className={`flex-1 flex flex-col min-w-0 border border-[#B08D57]/30 bg-[#2A1F1A] rounded-sm shadow-inner relative overflow-hidden
            ${mobileTab !== "desk" ? "hidden md:flex" : "flex"}`}
        >
          <ChatInterface
            onQueryComplete={onQueryComplete}
            hoveredNodeId={hoveredNodeId}
            onSuggestUrl={onSuggestUrl}
          />
        </main>

        {/* RIGHT — Cross-Reference Board / Mending Desk */}
        <aside
          className={`w-full md:w-[370px] md:flex-shrink-0 border border-[#B08D57]/30 bg-[#4A3527] flex flex-col rounded-sm overflow-hidden shadow-xl
            ${mobileTab !== "board" ? "hidden md:flex" : "flex"}`}
        >
          {/* Header Tab Switcher */}
          <div className="flex-shrink-0 flex border-b border-[#B08D57]/30 bg-[#3B291D]">
            {(["board", "mending"] as RightTab[]).map((t) => (
              <button
                key={t}
                onClick={() => setRightTab(t)}
                className={`flex-1 py-2.5 text-[11px] font-typewriter uppercase tracking-widest transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[#B08D57]
                  ${rightTab === t
                    ? "text-[#241B14] bg-[#EFE3C8] font-bold border-b-2 border-[#B08D57]"
                    : "text-[#EFE3C8]/60 hover:text-[#EFE3C8]"
                  }`}
              >
                {t === "board" ? "Cross-Reference Board" : "Mending Desk"}
              </button>
            ))}
          </div>

          <div className="flex-1 min-h-0 overflow-hidden relative">
            <AnimatePresence mode="wait">
              {rightTab === "board" ? (
                <motion.div
                  key="board"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="h-full"
                >
                  <KnowledgeGraph
                    key={graphKey}
                    highlightIds={highlightIds}
                    onNodeHover={setHoveredNodeId}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="mending"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="h-full overflow-y-auto"
                >
                  <HealingDashboard />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </aside>
      </motion.div>
    </div>
  );
}
