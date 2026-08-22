"""
NetworkX in-memory knowledge graph.
Nodes: Page, Section, Concept
Exports React Flow JSON for the frontend.
"""

from __future__ import annotations
import json
import os
import re
from collections import Counter

import networkx as nx

_graph: nx.DiGraph = nx.DiGraph()
GRAPH_PATH = os.getenv("GRAPH_PATH", "./graph.json")

# Simple keyword list for concept extraction
TECH_CONCEPTS = re.compile(
    r"\b(api|oauth|jwt|rest|graphql|websocket|middleware|async|await|"
    r"database|postgres|redis|docker|kubernetes|authentication|authorization|"
    r"endpoint|request|response|router|handler|schema|model|orm|"
    r"fastapi|django|flask|express|nextjs|react|typescript|python|"
    r"embedding|vector|rag|llm|chromadb|cohere|groq|openai)\b",
    re.IGNORECASE,
)


def init_graph() -> None:
    global _graph
    if os.path.exists(GRAPH_PATH):
        try:
            with open(GRAPH_PATH) as f:
                data = json.load(f)
            _graph = nx.node_link_graph(data)
            print(f"[Graph] Loaded {_graph.number_of_nodes()} nodes, "
                  f"{_graph.number_of_edges()} edges from {GRAPH_PATH}")
            return
        except Exception as exc:
            print(f"[Graph] Could not load {GRAPH_PATH}: {exc}")
    _graph = nx.DiGraph()
    print("[Graph] Starting with empty graph")


def _save_graph() -> None:
    try:
        with open(GRAPH_PATH, "w") as f:
            json.dump(nx.node_link_data(_graph), f)
    except Exception as exc:
        print(f"[Graph] Save failed: {exc}")


def add_page(page: dict) -> None:
    """Add a scraped page (with sections) to the knowledge graph."""
    url   = page["url"]
    title = page.get("title", url)

    # Page node
    _graph.add_node(f"page:{url}", label=title, type="page",
                    url=url, title=title)

    for section in page.get("sections", []):
        heading = section.get("heading", "")
        text    = section.get("text", "")
        if not heading:
            continue

        sec_id = f"section:{url}#{heading}"
        _graph.add_node(sec_id, label=heading, type="section",
                        url=url, heading=heading)
        _graph.add_edge(f"page:{url}", sec_id, label="contains")

        # Extract concepts from section text
        concepts = Counter(m.lower() for m in TECH_CONCEPTS.findall(text))
        for concept, _ in concepts.most_common(5):
            con_id = f"concept:{concept}"
            if not _graph.has_node(con_id):
                _graph.add_node(con_id, label=concept, type="concept")
            _graph.add_edge(sec_id, con_id, label="mentions")

    _save_graph()


def get_relevant_node_ids(query_terms: list[str]) -> list[str]:
    """Return node IDs relevant to a list of query terms (for UI highlighting)."""
    query_lower = {t.lower() for t in query_terms}
    relevant = []
    for node_id, data in _graph.nodes(data=True):
        label = data.get("label", "").lower()
        if any(t in label for t in query_lower):
            relevant.append(node_id)
            # Also include direct neighbors
            relevant.extend(list(_graph.successors(node_id)))
            relevant.extend(list(_graph.predecessors(node_id)))
    return list(set(relevant))[:50]


def export_react_flow() -> dict:
    """Convert the graph to React Flow {nodes, edges} format."""
    TYPE_COLORS = {
        "page":    "#3b82f6",  # blue
        "section": "#8b5cf6",  # purple
        "concept": "#f59e0b",  # amber
    }

    nodes = []
    for node_id, data in _graph.nodes(data=True):
        node_type = data.get("type", "concept")
        nodes.append({
            "id":       node_id,
            "type":     "custom",
            "position": {"x": 0, "y": 0},   # frontend uses auto-layout
            "data": {
                "label":  data.get("label", node_id),
                "type":   node_type,
                "color":  TYPE_COLORS.get(node_type, "#6b7280"),
                "url":    data.get("url", ""),
                "title":  data.get("title", ""),
            },
        })

    edges = []
    for i, (src, dst, data) in enumerate(_graph.edges(data=True)):
        edges.append({
            "id":             f"e{i}",
            "source":         src,
            "target":         dst,
            "label":          data.get("label", ""),
            "animated":       data.get("label") == "mentions",
            "style":          {"stroke": "#475569"},
        })

    stats = {
        "pages":    sum(1 for _, d in _graph.nodes(data=True) if d.get("type") == "page"),
        "sections": sum(1 for _, d in _graph.nodes(data=True) if d.get("type") == "section"),
        "concepts": sum(1 for _, d in _graph.nodes(data=True) if d.get("type") == "concept"),
        "edges":    _graph.number_of_edges(),
    }

    return {"nodes": nodes, "edges": edges, "stats": stats}


def get_graph() -> nx.DiGraph:
    return _graph
