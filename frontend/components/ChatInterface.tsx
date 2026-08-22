"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import ReactMarkdown from "react-markdown";

import { apiUrl } from "@/lib/api";

interface Message {

  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  confidence?: number;
  callNumber?: string;
  knowledgeGap?: boolean;
  suggestedUrl?: string | null;
  userQuery?: string;
}

interface Source {
  id: string;
  title: string;
  url: string;
  snippet: string;
}

interface Props {
  onQueryComplete: (highlightIds: string[]) => void;
  hoveredNodeId: string | null;
  onSuggestUrl: (url: string) => void;
}

const EXAMPLE_QUERIES = [
  "How do I set up a lifespan event in FastAPI?",
  "How do I handle JWT authentication?",
  "How does dependency injection work in FastAPI routers?",
];

export default function ChatInterface({ onQueryComplete, hoveredNodeId, onSuggestUrl }: Props) {
  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [hoveredSource, setHoveredSource] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (query: string) => {
    const q = query.trim();
    if (!q || loading) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: q };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res  = await fetch(apiUrl("/api/query"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, query: q }),
      });

      if (!res.ok) throw new Error(`Query endpoint returned HTTP ${res.status}`);
      const data = await res.json();

      const sources: Source[] = (data.citations ?? data.sources ?? []).map(
        (s: { id?: string; title?: string; url?: string; snippet?: string; heading?: string; source?: string }, i: number) => {
          const rawUrl = s.url ?? s.source ?? "#";
          let displayTitle = s.heading ?? s.title;
          if (!displayTitle || displayTitle.startsWith("Source ")) {
            try {
              const parsed = new URL(rawUrl);
              displayTitle = parsed.pathname !== "/" ? parsed.pathname.replace(/\/$/, "") : parsed.hostname;
            } catch {
              displayTitle = rawUrl;
            }
          }
          return {
            id:      s.id      ?? `src-${i}`,
            title:   displayTitle,
            url:     rawUrl,
            snippet: s.snippet ?? "",
          };
        }
      );

      const callNum = `DG · FASTAPI · 0${Math.floor(Math.random() * 80 + 10)}`;

      const assistantMsg: Message = {
        id:           crypto.randomUUID(),
        role:         "assistant",
        content:      data.answer ?? data.response ?? "No catalog entry found for this query.",
        sources,
        confidence:   data.confidence ?? (sources.length > 0 ? sources.length : undefined),
        callNumber:   callNum,
        knowledgeGap: data.knowledge_gap ?? false,
        suggestedUrl: data.suggested_url ?? null,
        userQuery:    q,
      };

      const highlights = [
        ...(data.graph_highlight ?? []),
        ...sources.map(s => s.url).filter(Boolean),
        ...sources.map(s => s.title).filter(Boolean),
      ];

      setMessages(prev => [...prev, assistantMsg]);
      onQueryComplete(highlights);
    } catch (e) {
      setMessages(prev => [...prev, {
        id:         crypto.randomUUID(),
        role:       "assistant",
        content:    "Failed to reach the backend catalog service. Check if main.py server is running.",
        callNumber: "DG · ERROR · 000",
      }]);
    } finally {
      setLoading(false);
    }
  }, [loading, onQueryComplete]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#2A1F1A]">
      {/* ── Reading Desk Header ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-[#B08D57]/30 bg-[#35251B]">
        <div className="flex items-center gap-2">
          <span className="font-typewriter text-xs font-bold tracking-widest text-[#B08D57] uppercase">
            READING DESK
          </span>
          <span className="text-[10px] font-card-body italic text-[#EFE3C8]/50">
            — Reference Inquiry
          </span>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => { setMessages([]); onQueryComplete([]); }}
            className="text-[10px] font-typewriter text-[#EFE3C8]/60 hover:text-[#B08D57] transition-colors uppercase tracking-wider focus-visible:outline-2 focus-visible:outline-[#B08D57]"
          >
            Clear Desk
          </button>
        )}
      </div>

      {/* ── Desk Workspace / Messages ── */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-6 pb-6">
            {/* Blank Card Prompt */}
            <div className="card-stock card-ruled p-6 w-full max-w-md border border-[#4A3527]/40 rounded-sm shadow-lg text-center space-y-4">
              <div className="border-b border-[#B14A3D]/40 pb-2 flex justify-between items-center">
                <span className="font-typewriter text-xs font-bold text-[#241B14] tracking-widest">
                  CATALOG INQUIRY
                </span>
                <span className="font-typewriter text-[10px] text-[#B14A3D]">
                  FORM 10-A
                </span>
              </div>
              <p className="font-typewriter text-sm font-bold text-[#241B14] tracking-wider uppercase">
                ASK ABOUT THE DOCS
              </p>
              <p className="font-card-body text-xs text-[#241B14]/70 italic">
                Type a question below to pull reference cards from the collection.
              </p>

              {/* Example Inquiry Slips */}
              <div className="space-y-2 pt-2 border-t border-[#B14A3D]/20">
                <p className="font-typewriter text-[9px] text-[#241B14]/50 uppercase tracking-widest text-left">
                  SAMPLE INQUIRIES:
                </p>
                {EXAMPLE_QUERIES.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q)}
                    className="w-full text-left text-[11px] font-typewriter text-[#241B14] hover:text-[#B14A3D] px-2.5 py-1.5 border border-[#B14A3D]/30 bg-[#EFE3C8]/60 hover:bg-[#EFE3C8] transition-all duration-150 rounded-sm"
                  >
                    → {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="space-y-2">
            {msg.role === "user" ? (
              /* User Query Slip */
              <div className="flex items-center gap-2 max-w-2xl">
                <span className="font-typewriter text-[10px] text-[#B08D57] font-bold uppercase tracking-wider">
                  QUERY:
                </span>
                <div className="border-b border-[#B08D57]/40 pb-0.5 flex-1 font-typewriter text-xs text-[#EFE3C8]">
                  "{msg.content}"
                </div>
              </div>
            ) : (
              /* Reference Card (Assistant Response) */
              <div className="card-stock card-ruled p-5 border border-[#4A3527]/50 rounded-sm shadow-xl space-y-4 relative">
                {/* Typed Header & Call Number */}
                <div className="flex items-center justify-between border-b border-[#B14A3D]/50 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-typewriter text-xs font-bold text-[#241B14] uppercase tracking-wider">
                      REFERENCE CARD
                    </span>
                    {msg.confidence !== undefined && (
                      <span className="font-typewriter text-[10px] text-[#241B14]/60 italic">
                        (derived from {msg.confidence} source{msg.confidence !== 1 ? "s" : ""})
                      </span>
                    )}
                  </div>
                  <span className="font-typewriter text-xs font-bold text-[#B14A3D] tracking-widest">
                    {msg.callNumber ?? "DG · CARD · 014"}
                  </span>
                </div>

                {/* Markdown Answer Body */}
                <div className="font-card-body text-sm text-[#241B14] leading-relaxed space-y-2">
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => <h1 className="font-typewriter text-base font-bold text-[#241B14] mt-2 mb-1">{children}</h1>,
                      h2: ({ children }) => <h2 className="font-typewriter text-sm font-bold text-[#241B14] mt-2 mb-1">{children}</h2>,
                      h3: ({ children }) => <h3 className="font-card-body text-sm font-bold text-[#241B14] mt-2 mb-1">{children}</h3>,
                      p:  ({ children }) => <p className="font-card-body text-sm text-[#241B14] leading-relaxed mb-2">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-2">{children}</ol>,
                      li: ({ children }) => <li className="font-card-body text-sm text-[#241B14]">{children}</li>,
                      strong: ({ children }) => <strong className="font-bold text-[#241B14]">{children}</strong>,
                      code: ({ children, className }) => {
                        const isBlock = className?.includes("language-");
                        if (isBlock) {
                          return (
                            <div className="my-3 border border-[#B08D57]/40 rounded-sm overflow-hidden">
                              <div className="bg-[#4A3527] px-3 py-1 border-b border-[#B08D57]/30 flex items-center justify-between">
                                <span className="font-typewriter text-[9px] text-[#B08D57] uppercase tracking-widest">
                                  {className?.replace("language-", "") ?? "CODE PANEL"}
                                </span>
                              </div>
                              <pre className="p-3 bg-[#2A1F1A] text-[#EFE3C8] font-code-mono text-[11px] overflow-x-auto leading-relaxed">
                                <code>{children}</code>
                              </pre>
                            </div>
                          );
                        }
                        return (
                          <code className="font-code-mono text-[11px] px-1 py-0.5 bg-[#4A3527]/20 text-[#241B14] font-bold">
                            {children}
                          </code>
                        );
                      },
                      a: ({ href, children }) => (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-typewriter text-[#B14A3D] hover:underline font-bold underline decoration-dotted underline-offset-2 transition-colors"
                        >
                          {children} ↗
                        </a>
                      ),
                      pre: ({ children }) => <>{children}</>,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>

                {/* "See also →" Source References */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="pt-3 border-t border-[#B14A3D]/30 space-y-1.5">
                    <p className="font-typewriter text-[10px] text-[#B14A3D] font-bold uppercase tracking-wider">
                      SEE ALSO →
                    </p>
                    <div className="space-y-1.5">
                      {msg.sources.map((src, i) => (
                        <a
                          key={src.id}
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onMouseEnter={() => setHoveredSource(src.url)}
                          onMouseLeave={() => setHoveredSource(null)}
                          className="flex items-start gap-2 group font-typewriter text-[11px] text-[#241B14] hover:text-[#B14A3D] transition-colors"
                        >
                          <span className="text-[#B14A3D] font-bold flex-shrink-0">[{i + 1}]</span>
                          <div className="flex-1 min-w-0">
                            <span className="underline decoration-dotted underline-offset-2 group-hover:text-[#B14A3D] font-bold block truncate">
                              {src.title}
                            </span>
                            {src.url && src.url !== "#" && (
                              <span className="block text-[9px] font-code-mono text-[#241B14]/50 truncate mt-0.5 group-hover:text-[#B14A3D]/70">
                                {src.url} ↗
                              </span>
                            )}
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Punched Hole & Rod Line near bottom center */}
                <div className="pt-4 flex flex-col items-center justify-center relative">
                  <div className="w-full h-px bg-[#B14A3D]/25" />
                  <div className="w-4 h-4 rounded-full border-2 border-[#B14A3D]/40 bg-[#2A1F1A] -mt-2 z-10 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#B08D57]" />
                  </div>
                </div>
              </div>
            )}

            {/* ── Knowledge Gap Suggestion Card ── */}
            {msg.role === "assistant" && msg.knowledgeGap && msg.suggestedUrl && (
              <div className="border border-[#B08D57]/50 bg-[#35251B] p-3 rounded-sm flex items-start gap-3">
                {/* Stamp icon */}
                <div className="flex-shrink-0 w-8 h-8 border-2 border-[#B08D57] rounded-full flex items-center justify-center text-[#B08D57] font-typewriter text-xs font-bold">
                  ?
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <p className="font-typewriter text-[10px] font-bold text-[#B08D57] uppercase tracking-wider">
                    KNOWLEDGE GAP DETECTED
                  </p>
                  <p className="font-card-body text-[11px] text-[#EFE3C8]/80 italic">
                    This query isn&apos;t well-covered in the current catalog. Groq suggests adding:
                  </p>
                  <div className="font-code-mono text-[11px] text-[#EFE3C8] truncate bg-[#241A15] px-2 py-1 border border-[#B08D57]/30 rounded-xs">
                    {msg.suggestedUrl}
                  </div>
                  <button
                    onClick={() => {
                      if (msg.suggestedUrl) {
                        onSuggestUrl(msg.suggestedUrl);
                      }
                      if (msg.userQuery) {
                        setInput(msg.userQuery);
                        inputRef.current?.focus();
                      }
                    }}
                    className="w-full py-1.5 bg-[#B08D57] text-[#241B14] font-typewriter text-[10px] font-bold uppercase tracking-widest hover:bg-[#C5A367] transition-all rounded-xs"
                  >
                    Add to Catalog →
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="card-stock card-ruled p-4 border border-[#4A3527]/40 rounded-sm shadow-md flex items-center gap-3">
            <span className="font-typewriter text-xs text-[#B14A3D] animate-spin">◐</span>
            <span className="font-typewriter text-xs text-[#241B14]">
              SEARCHING CATALOG CARDS…
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input Slip at Bottom ── */}
      <div className="flex-shrink-0 border-t border-[#B08D57]/30 p-3 bg-[#35251B]">
        <div className="card-stock px-3 py-2 border border-[#B08D57]/40 rounded-sm shadow-md flex items-center gap-2">
          <span className="font-typewriter text-xs text-[#B14A3D] font-bold">⌨</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type query to pull catalog cards…"
            disabled={loading}
            className="flex-1 bg-transparent text-[#241B14] text-xs font-typewriter placeholder-[#241B14]/40 outline-none"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="px-2.5 py-1 bg-[#B08D57] text-[#241B14] font-typewriter text-xs font-bold uppercase rounded-sm hover:bg-[#C5A367] transition-all disabled:opacity-40"
          >
            FILE →
          </button>
        </div>
      </div>
    </div>
  );
}
