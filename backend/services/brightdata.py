"""
Bright Data integration service.

Primary:   Bright Data Web Unlocker via bdata CLI (subprocess)
Secondary: Plain httpx with browser User-Agent (fallback for simple docs pages)
Demo:      bdata scraper create/run/heal for self-healing demonstration
"""

from __future__ import annotations

import asyncio
import json
import os
import re
import subprocess
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

BD_API_KEY = os.getenv("BRIGHTDATA_API_KEY", "")
BDATA_CMD  = ["npx", "-p", "@brightdata/cli", "bdata"]
HEADERS    = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/126.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "en-US,en;q=0.9",
}


# ── Page fetching ─────────────────────────────────────────────

async def fetch_page(url: str) -> str:
    """Fetch a URL's HTML. Tries plain httpx first; on failure uses bdata CLI."""
    try:
        async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
            r = await client.get(url, headers=HEADERS)
            if r.status_code == 200 and "<html" in r.text.lower():
                return r.text
    except Exception as exc:
        print(f"[Fetch] httpx failed for {url}: {exc}")

    # Fallback: bdata CLI unlocker
    return await _bdata_fetch(url)


async def _bdata_fetch(url: str) -> str:
    """Use bdata CLI to fetch a URL through the cli_unlocker zone."""
    try:
        proc = await asyncio.create_subprocess_exec(
            *BDATA_CMD, "fetch", url,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=60)
        return stdout.decode(errors="replace")
    except Exception as exc:
        print(f"[BData] bdata fetch failed: {exc}")
        return ""


# ── Sitemap / link discovery ──────────────────────────────────

async def discover_urls(base_url: str, max_pages: int = 20) -> list[str]:
    """
    Returns up to max_pages URLs from the site.
    Strategy:
    1. Try /sitemap.xml
    2. Crawl nav links from homepage
    """
    base = urlparse(base_url)
    origin = f"{base.scheme}://{base.netloc}"

    # 1. Sitemap
    sitemap_urls = await _try_sitemap(origin)
    if sitemap_urls:
        return sitemap_urls[:max_pages]

    # 2. Nav link crawl from homepage
    html = await fetch_page(base_url)
    if not html:
        return [base_url]
    
    soup = BeautifulSoup(html, "lxml")
    # Look for nav/sidebar links (common in docs sites)
    nav_links: list[str] = []
    for selector in ["nav a[href]", ".sidebar a[href]", ".toc a[href]",
                     "aside a[href]", "[class*='nav'] a[href]"]:
        for a in soup.select(selector):
            href = a.get("href", "")
            full = urljoin(origin, href)
            p = urlparse(full)
            if p.netloc == base.netloc and full not in nav_links:
                nav_links.append(full)

    if nav_links:
        return nav_links[:max_pages]

    # Fallback: all same-domain links
    all_links = []
    for a in soup.find_all("a", href=True):
        full = urljoin(origin, a["href"])
        p = urlparse(full)
        if p.netloc == base.netloc and not full.endswith((".png", ".jpg", ".pdf", ".zip")):
            all_links.append(full)
    
    seen = list(dict.fromkeys(all_links))  # deduplicate preserving order
    return seen[:max_pages]


async def _try_sitemap(origin: str) -> list[str]:
    for path in ["/sitemap.xml", "/sitemap_index.xml", "/docs/sitemap.xml"]:
        try:
            async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
                r = await client.get(f"{origin}{path}", headers=HEADERS)
                if r.status_code == 200 and "<url" in r.text:
                    urls = re.findall(r"<loc>(.*?)</loc>", r.text)
                    return [u for u in urls if origin in u]
        except Exception:
            continue
    return []


# ── bdata CLI wrappers (for Scraper Studio demo) ──────────────

async def bdata_create_collector(url: str, prompt: str) -> str | None:
    """Create a Scraper Studio collector. Returns collector ID or None."""
    try:
        proc = await asyncio.create_subprocess_exec(
            *BDATA_CMD, "scraper", "create", url, prompt,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=600)
        output = stdout.decode(errors="replace")
        match = re.search(r"c_[a-zA-Z0-9]+", output)
        return match.group(0) if match else None
    except Exception as exc:
        print(f"[BData] create failed: {exc}")
        return None


async def bdata_run_collector(collector_id: str, url: str) -> list[dict]:
    """Run a Scraper Studio collector. Returns list of scraped records."""
    try:
        proc = await asyncio.create_subprocess_exec(
            *BDATA_CMD, "scraper", "run", collector_id, url,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=300)
        return json.loads(stdout.decode(errors="replace"))
    except Exception as exc:
        print(f"[BData] run failed: {exc}")
        return []


async def bdata_heal_collector(collector_id: str, description: str) -> bool:
    """Heal a broken collector. Returns True if succeeded."""
    try:
        proc = await asyncio.create_subprocess_exec(
            *BDATA_CMD, "scraper", "heal", collector_id, description,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        await asyncio.wait_for(proc.communicate(), timeout=600)

        proc2 = await asyncio.create_subprocess_exec(
            *BDATA_CMD, "scraper", "approve", collector_id,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        await asyncio.wait_for(proc2.communicate(), timeout=60)
        return True
    except Exception as exc:
        print(f"[BData] heal failed: {exc}")
        return False


# ── REST API trigger (scheduled runs) ────────────────────────

async def trigger_collection(collector_id: str, url: str) -> str | None:
    """Trigger a collection via Bright Data REST API. Returns snapshot ID."""
    if not BD_API_KEY:
        return None
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                f"https://api.brightdata.com/dca/trigger?collector={collector_id}",
                headers={"Authorization": f"Bearer {BD_API_KEY}"},
                json=[{"url": url}],
            )
            if r.status_code == 200:
                return r.json().get("collection_id")
    except Exception as exc:
        print(f"[BData] trigger failed: {exc}")
    return None
