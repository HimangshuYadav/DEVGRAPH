"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { apiUrl } from "@/lib/api";


interface MiniCard {
  id: string;
  title: string;
  callNo: string;
  type: "API" | "Concept" | "Guide" | "Security" | "Root";
  x: number;
  y: number;
  fullUrl?: string;
  rawType?: string;
  connectionsCount?: number;
}

interface StringConn {
  from: string;
  to: string;
}

interface Props {
  highlightIds: string[];
  onNodeHover?: (id: string | null) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  Root:     "#B08D57", // Brass
  API:      "#3F6E64", // Stamp Teal
  Concept:  "#241B14", // Typewriter Ink
  Guide:    "#B14A3D", // Rule Red
  Security: "#8C6D3A", // Dark Brass
};

function cleanLabelText(str: string): string {
  if (!str) return "";
  return str
    .replace(/¶$/, "")
    .replace(/^[#\s]+/, "")
    .trim();
}

function initialCards(w: number, h: number): MiniCard[] {
  const cx = Math.max(10, w / 2 - 55);
  const cy = Math.max(10, h / 2 - 30);
  return [
    { id: "root",        title: "FastAPI Root",   callNo: "DG·FA·00", type: "Root",     x: cx,       y: cy },
    { id: "auth",        title: "JWT Security",   callNo: "DG·FA·01", type: "Security", x: cx - 110, y: cy - 100 },
    { id: "routing",     title: "APIRouter",      callNo: "DG·FA·02", type: "API",      x: cx + 100, y: cy - 110 },
    { id: "models",      title: "Pydantic Specs", callNo: "DG·FA·03", type: "Concept",  x: cx + 110, y: cy + 80 },
    { id: "middleware",  title: "CORSMiddleware", callNo: "DG·FA·04", type: "Guide",    x: cx - 110, y: cy + 80 },
    { id: "deps",        title: "Depends Inject", callNo: "DG·FA·05", type: "API",      x: cx - 10,  y: cy - 130 },
    { id: "responses",   title: "JSONResponse",   callNo: "DG·FA·06", type: "API",      x: cx + 120, y: cy - 20 },
    { id: "lifespan",    title: "Lifespan Async", callNo: "DG·FA·07", type: "Guide",    x: cx - 120, y: cy - 10 },
  ];
}

function initialConnections(): StringConn[] {
  return [
    { from: "root", to: "auth" },
    { from: "root", to: "routing" },
    { from: "root", to: "models" },
    { from: "root", to: "middleware" },
    { from: "root", to: "deps" },
    { from: "root", to: "responses" },
    { from: "root", to: "lifespan" },
    { from: "routing", to: "deps" },
  ];
}

export default function KnowledgeGraph({ highlightIds, onNodeHover }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cards, setCards] = useState<MiniCard[]>([]);
  const [connections, setConnections] = useState<StringConn[]>(initialConnections());
  const [graphData, setGraphData] = useState<any>(null);
  const [selectedCard, setSelectedCard] = useState<MiniCard | null>(null);
  const [activePinId, setActivePinId] = useState<string | null>(null);

  // Helper to test if a card matches query highlights
  const isCardHighlighted = useCallback((cardId: string, fullUrl?: string, title?: string) => {
    if (!highlightIds || highlightIds.length === 0) return false;
    const cleanCard = cardId.replace(/^(page|section|concept):/, "").toLowerCase();
    const cleanUrl = (fullUrl || "").toLowerCase();
    const cleanTitle = (title || "").toLowerCase();

    return highlightIds.some(h => {
      if (!h) return false;
      const hLower = h.toLowerCase().replace(/^(page|section|concept):/, "");
      return (
        cleanCard === hLower ||
        (hLower.length > 3 && cleanCard.includes(hLower)) ||
        (cleanCard.length > 3 && hLower.includes(cleanCard)) ||
        (cleanUrl && (cleanUrl === hLower || cleanUrl.includes(hLower) || (hLower.length > 6 && hLower.includes(cleanUrl)))) ||
        (cleanTitle && cleanTitle.length > 3 && (cleanTitle.includes(hLower) || hLower.includes(cleanTitle)))
      );
    });
  }, [highlightIds]);

  // Re-build pinboard layout based on raw graph data and active highlight IDs
  const rebuildBoard = useCallback((data: any, activeHighlights: string[]) => {
    if (!containerRef.current) return;
    const w = containerRef.current.clientWidth || 350;
    const h = containerRef.current.clientHeight || 420;

    if (!data?.nodes?.length) {
      setCards(initialCards(w, h));
      setConnections(initialConnections());
      return;
    }

    const allNodes: any[] = data.nodes;
    const allEdges: any[] = data.edges ?? [];

    let selectedNodes: any[] = [];
    const seenNodeIds = new Set<string>();

    // 1. Find nodes that match active query highlight IDs
    if (activeHighlights.length > 0) {
      for (const n of allNodes) {
        const nId = n.id;
        const nLabel = cleanLabelText(String(n.data?.label || "")).toLowerCase();
        const nUrl = String(n.data?.url || "").toLowerCase();
        const cleanNId = nId.replace(/^(page|section|concept):/, "").toLowerCase();

        const isMatch = activeHighlights.some(hId => {
          if (!hId) return false;
          const hLower = hId.toLowerCase().replace(/^(page|section|concept):/, "");
          return (
            cleanNId === hLower ||
            (hLower.length > 3 && cleanNId.includes(hLower)) ||
            (cleanNId.length > 3 && hLower.includes(cleanNId)) ||
            (nUrl && (nUrl === hLower || nUrl.includes(hLower) || (hLower.length > 6 && hLower.includes(nUrl)))) ||
            (nLabel && nLabel.length > 3 && (nLabel.includes(hLower) || hLower.includes(nLabel)))
          );
        });

        if (isMatch && !seenNodeIds.has(nId)) {
          seenNodeIds.add(nId);
          selectedNodes.push(n);
        }
        if (selectedNodes.length >= 8) break;
      }

      // Add direct connected neighbors of matched nodes
      if (selectedNodes.length > 0 && selectedNodes.length < 10) {
        const matchedSet = new Set(selectedNodes.map(n => n.id));
        for (const e of allEdges) {
          const srcId = typeof e.source === "string" ? e.source : e.source?.id;
          const tgtId = typeof e.target === "string" ? e.target : e.target?.id;

          if (matchedSet.has(srcId) && !seenNodeIds.has(tgtId)) {
            const tgtNode = allNodes.find(n => n.id === tgtId);
            if (tgtNode) {
              seenNodeIds.add(tgtId);
              selectedNodes.push(tgtNode);
            }
          } else if (matchedSet.has(tgtId) && !seenNodeIds.has(srcId)) {
            const srcNode = allNodes.find(n => n.id === srcId);
            if (srcNode) {
              seenNodeIds.add(srcId);
              selectedNodes.push(srcNode);
            }
          }
          if (selectedNodes.length >= 10) break;
        }
      }
    }

    // 2. If no highlights or need more nodes, pick a diverse sample (pages + concepts)
    if (selectedNodes.length < 9) {
      // Pick top pages
      const pageNodes = allNodes.filter(n => n.data?.type === "page" && !seenNodeIds.has(n.id));
      for (const n of pageNodes) {
        seenNodeIds.add(n.id);
        selectedNodes.push(n);
        if (selectedNodes.length >= 6) break;
      }
      // Pick top concepts / sections
      const otherNodes = allNodes.filter(n => !seenNodeIds.has(n.id));
      for (const n of otherNodes) {
        seenNodeIds.add(n.id);
        selectedNodes.push(n);
        if (selectedNodes.length >= 9) break;
      }
    }

    const cx = Math.max(10, (w - 110) / 2);
    const cy = Math.max(10, (h - 60) / 2);
    const total = selectedNodes.length;

    // Position cards radially on pinboard
    const mappedCards: MiniCard[] = selectedNodes.map((n: any, idx: number) => {
      const rawLabel = n.data?.label || n.data?.title || n.id;
      const cleanLabel = cleanLabelText(String(rawLabel));

      let cardType: MiniCard["type"] = "Concept";
      const rawType = (n.data?.type || "").toLowerCase();
      if (idx === 0 && activeHighlights.length === 0) {
        cardType = "Root";
      } else if (rawType === "page") {
        cardType = "Guide";
      } else if (rawType === "section") {
        cardType = cleanLabel.toLowerCase().includes("auth") || cleanLabel.toLowerCase().includes("security")
          ? "Security"
          : "API";
      } else if (cleanLabel.toLowerCase().includes("jwt") || cleanLabel.toLowerCase().includes("oauth") || cleanLabel.toLowerCase().includes("auth")) {
        cardType = "Security";
      }

      if (idx === 0) {
        return {
          id: n.id,
          title: cleanLabel || "Index Hub",
          callNo: `DG·${(idx + 1).toString().padStart(2, "0")}`,
          type: cardType,
          x: cx,
          y: cy,
          fullUrl: n.data?.url || "",
          rawType: n.data?.type || "",
        };
      }

      const angle = ((idx - 1) / Math.max(1, total - 1)) * 2 * Math.PI - Math.PI / 2;
      const radiusX = Math.min(w * 0.36, 130);
      const radiusY = Math.min(h * 0.34, 120);

      return {
        id: n.id,
        title: cleanLabel.length > 20 ? cleanLabel.slice(0, 18) + "…" : cleanLabel || `Card ${idx + 1}`,
        callNo: `DG·${(idx + 1).toString().padStart(2, "0")}`,
        type: cardType,
        x: Math.max(10, Math.min(w - 115, cx + Math.cos(angle) * radiusX)),
        y: Math.max(10, Math.min(h - 65, cy + Math.sin(angle) * radiusY)),
        fullUrl: n.data?.url || "",
        rawType: n.data?.type || "",
      };
    });

    // Map connections between selected nodes
    const validIds = new Set(mappedCards.map(c => c.id));
    const rootId = mappedCards[0]?.id || "root";

    const mappedConns: StringConn[] = allEdges
      .map((e: any) => ({
        from: typeof e.source === "string" ? e.source : e.source?.id,
        to: typeof e.target === "string" ? e.target : e.target?.id,
      }))
      .filter((c: any) => validIds.has(c.from) && validIds.has(c.to));

    // Ensure all cards have at least one thread back to center or neighbor
    const connectedCardIds = new Set([
      ...mappedConns.map(c => c.from),
      ...mappedConns.map(c => c.to),
    ]);

    const supplementalConns: StringConn[] = [];
    mappedCards.forEach((c, i) => {
      if (i > 0 && !connectedCardIds.has(c.id)) {
        supplementalConns.push({ from: rootId, to: c.id });
      }
    });

    const finalConns = [...mappedConns, ...supplementalConns];
    if (finalConns.length === 0) {
      mappedCards.slice(1).forEach(c => {
        finalConns.push({ from: rootId, to: c.id });
      });
    }

    setCards(mappedCards);
    setConnections(finalConns);
  }, []);

  // Fetch graph JSON on initial mount
  const loadGraph = useCallback(() => {
    fetch(apiUrl("/api/graph/raw"))
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data?.nodes?.length) {
          setGraphData(data);
          rebuildBoard(data, highlightIds);
        }
      })
      .catch(() => {});
  }, [rebuildBoard, highlightIds]);


  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  // Re-build board whenever highlightIds or graphData changes
  useEffect(() => {
    if (graphData) {
      rebuildBoard(graphData, highlightIds);
    }
  }, [highlightIds, graphData, rebuildBoard]);

  // Window resize observer to keep cards in bounds
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => {
      if (graphData) {
        rebuildBoard(graphData, highlightIds);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [graphData, highlightIds, rebuildBoard]);

  return (
    <div ref={containerRef} className="relative flex flex-col h-full bg-[#4A3527] select-none overflow-hidden">
      {/* Board Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-[#B08D57]/30 bg-[#35251B]">
        <div className="flex items-center gap-2">
          <span className="font-typewriter text-[10px] text-[#B08D57] uppercase tracking-widest font-bold">
            CROSS-REFERENCE WEB ({cards.length} CARDS)
          </span>
          {highlightIds.length > 0 && (
            <span className="font-typewriter text-[9px] text-[#3F6E64] font-bold px-1.5 py-0.5 bg-[#3F6E64]/20 border border-[#3F6E64]/40 rounded-xs uppercase flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3F6E64] animate-pulse" />
              Active Citations
            </span>
          )}
        </div>
        <button
          onClick={() => {
            setActivePinId(null);
            setSelectedCard(null);
            if (graphData) rebuildBoard(graphData, []);
          }}
          className="font-typewriter text-[9px] text-[#EFE3C8]/60 hover:text-[#B08D57] uppercase tracking-wider transition-colors"
        >
          Reset View
        </button>
      </div>

      {/* Pinboard Canvas */}
      <div className="flex-1 relative min-h-0 bg-[#3F2B1E] shadow-inner overflow-hidden">
        {/* SVG Bezier Crimson & Brass Threads */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          {connections.map((conn, i) => {
            const fromCard = cards.find(c => c.id === conn.from);
            const toCard = cards.find(c => c.id === conn.to);
            if (!fromCard || !toCard) return null;

            const x1 = fromCard.x + 52;
            const y1 = fromCard.y + 26;
            const x2 = toCard.x + 52;
            const y2 = toCard.y + 26;

            const dx = (x2 - x1) * 0.35;
            const dy = (y2 - y1) * 0.35;
            const d = `M ${x1} ${y1} C ${x1 + dx} ${y1 + dy}, ${x2 - dx} ${y2 - dy}, ${x2} ${y2}`;

            const isFromCited = isCardHighlighted(fromCard.id, fromCard.fullUrl, fromCard.title);
            const isToCited = isCardHighlighted(toCard.id, toCard.fullUrl, toCard.title);
            const isFromActive = activePinId === fromCard.id;
            const isToActive = activePinId === toCard.id;

            const isTaut = (isFromCited && isToCited) || (isFromActive && isToActive);
            const isPartial = isFromCited || isToCited || isFromActive || isToActive;
            const strokeColor = isTaut ? "#B08D57" : isPartial ? "#B14A3D" : "rgba(177, 74, 61, 0.4)";

            return (
              <g key={`${conn.from}-${conn.to}-${i}`}>
                <path
                  d={d}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={isTaut ? "2.5" : isPartial ? "1.8" : "1.2"}
                  strokeDasharray={isTaut ? "none" : isPartial ? "4 3" : "3 3"}
                  className="transition-all duration-200"
                />
                <circle cx={x1} cy={y1} r={3} fill="#B08D57" stroke="#241B14" strokeWidth={1} />
                <circle cx={x2} cy={y2} r={3} fill="#B08D57" stroke="#241B14" strokeWidth={1} />
              </g>
            );
          })}
        </svg>

        {/* Draggable Mini Index Cards */}
        {cards.map((card) => {
          const isCited = isCardHighlighted(card.id, card.fullUrl, card.title);
          const isPinned = activePinId === card.id;
          const categoryColor = CATEGORY_COLORS[card.type] ?? "#241B14";

          return (
            <motion.div
              key={card.id}
              drag
              dragMomentum={false}
              dragConstraints={containerRef}
              onClick={() => {
                setActivePinId(prev => (prev === card.id ? null : card.id));
                setSelectedCard(card);
              }}
              onMouseEnter={() => {
                onNodeHover?.(card.id);
                setSelectedCard(card);
              }}
              onMouseLeave={() => {
                onNodeHover?.(null);
                if (!activePinId) setSelectedCard(null);
              }}
              animate={{
                scale: isPinned ? 1.12 : isCited ? 1.06 : 1,
                zIndex: isPinned ? 30 : isCited ? 20 : 10,
              }}
              transition={{ duration: 0.15 }}
              className={`absolute w-[105px] h-[52px] card-stock card-ruled p-1.5 border rounded-xs shadow-md cursor-grab active:cursor-grabbing flex flex-col justify-between select-none
                ${isPinned
                  ? "border-[#B08D57] ring-2 ring-[#B08D57] shadow-xl bg-[#FFF8EE]"
                  : isCited
                  ? "border-[#B14A3D] ring-1 ring-[#B14A3D] shadow-lg"
                  : "border-[#4A3527]/40 hover:border-[#B08D57]/70"}`}
              style={{
                left: `${card.x}px`,
                top: `${card.y}px`,
              }}
            >
              {/* Header call number & category tab */}
              <div className="flex items-center justify-between border-b border-[#B14A3D]/30 pb-0.5">
                <span className="font-typewriter text-[8px] text-[#B14A3D] font-bold">
                  {card.callNo}
                </span>
                <span
                  className="w-2 h-1.5 rounded-xs"
                  style={{ backgroundColor: categoryColor }}
                  title={card.type}
                />
              </div>

              {/* Title */}
              <p
                className="font-typewriter text-[9px] font-bold text-[#241B14] truncate leading-tight"
                title={card.title}
              >
                {card.title}
              </p>

              {/* Brass pin anchor mark */}
              <div className="flex items-center justify-between">
                <span className="font-typewriter text-[7px] text-[#241B14]/60 uppercase">
                  {card.type}
                </span>
                <div
                  className={`w-2 h-2 rounded-full border border-[#241B14] ${
                    isPinned ? "bg-[#B08D57] ring-1 ring-[#241B14]" : isCited ? "bg-[#B14A3D]" : "bg-[#B08D57]"
                  }`}
                />
              </div>
            </motion.div>
          );
        })}

        {/* Hover / Pin Detail Floating Slip */}
        {selectedCard && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-2 left-2 right-2 bg-[#2A1F1A]/95 backdrop-blur-sm border border-[#B08D57] p-2.5 rounded-xs text-[#EFE3C8] font-typewriter text-[10px] shadow-2xl z-40"
          >
            <div className="flex items-center justify-between border-b border-[#B08D57]/30 pb-1 mb-1">
              <span className="font-bold text-[#B08D57] uppercase truncate max-w-[200px]">
                {selectedCard.title}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.2 bg-[#B08D57]/20 border border-[#B08D57]/40 text-[8px] text-[#B08D57] rounded-xs uppercase">
                  {selectedCard.type}
                </span>
                <span className="text-[9px] text-[#EFE3C8]/60">{selectedCard.callNo}</span>
              </div>
            </div>
            {selectedCard.fullUrl ? (
              <a
                href={selectedCard.fullUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-code-mono text-[9px] text-[#EFE3C8]/80 hover:text-[#B08D57] underline truncate block mt-0.5"
              >
                {selectedCard.fullUrl} ↗
              </a>
            ) : (
              <p className="font-code-mono text-[9px] text-[#EFE3C8]/60 italic">
                Node ID: {selectedCard.id}
              </p>
            )}
          </motion.div>
        )}
      </div>

      {/* Category Swatches Legend */}
      <div className="flex-shrink-0 flex items-center justify-around px-4 py-2 border-t border-[#B08D57]/30 bg-[#35251B]">
        {["API", "Concept", "Guide", "Security"].map((cat) => (
          <div key={cat} className="flex items-center gap-1.5">
            <div
              className="w-3 h-2 rounded-t-xs"
              style={{ backgroundColor: CATEGORY_COLORS[cat] }}
            />
            <span className="font-typewriter text-[9px] text-[#EFE3C8]/70 uppercase">
              {cat}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

