"""
Lightweight stock news sentiment engine with caching and safe fallbacks.
"""

from __future__ import annotations

import math
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional
from urllib.parse import quote_plus
import xml.etree.ElementTree as ET

import requests
import yfinance as yf


CACHE_TTL_SECONDS = 600
MAX_ARTICLES = 6
_CACHE: Dict[str, Dict] = {}
_SESSION = requests.Session()
_SESSION.trust_env = False
_SESSION.headers.update(
    {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept": "application/rss+xml, application/xml;q=0.9, */*;q=0.8",
    }
)

POSITIVE_PHRASES = {
    "beats estimates": 1.8,
    "strong earnings": 1.6,
    "strong results": 1.5,
    "raises guidance": 1.8,
    "record revenue": 1.7,
    "profit growth": 1.5,
    "strategic partnership": 1.2,
    "buy rating": 1.2,
    "upgrades stock": 1.4,
    "surges": 1.1,
    "jumps": 1.0,
}

NEGATIVE_PHRASES = {
    "misses estimates": -1.8,
    "cuts guidance": -1.9,
    "profit warning": -1.9,
    "regulatory probe": -1.8,
    "downgrades stock": -1.4,
    "sell rating": -1.2,
    "weak demand": -1.4,
    "falls": -0.9,
    "drops": -0.9,
    "slumps": -1.1,
    "lawsuit": -1.4,
}

POSITIVE_WORDS = {
    "gain", "gains", "growth", "strong", "bullish", "beat", "beats", "buy",
    "positive", "expand", "expansion", "surge", "surges", "jump", "jumps",
    "record", "improves", "improvement", "outperform", "optimistic", "upgrade",
}

NEGATIVE_WORDS = {
    "loss", "losses", "weak", "bearish", "miss", "misses", "sell", "negative",
    "drop", "drops", "slump", "slumps", "cut", "cuts", "probe", "lawsuit",
    "decline", "declines", "warning", "downgrade", "risk",
}


def _normalize_score(score: float, text_length: int) -> float:
    if text_length <= 0:
        return 0.0
    scaled = score / max(math.sqrt(text_length / 6), 1.0)
    return max(-1.0, min(1.0, scaled))


def _score_text(text: str) -> float:
    lowered = (text or "").lower().strip()
    if not lowered:
        return 0.0

    score = 0.0

    for phrase, weight in POSITIVE_PHRASES.items():
        if phrase in lowered:
            score += weight

    for phrase, weight in NEGATIVE_PHRASES.items():
        if phrase in lowered:
            score += weight

    tokens = [
        token.strip(".,:;!?()[]{}\"'")
        for token in lowered.split()
        if token.strip(".,:;!?()[]{}\"'")
    ]

    for token in tokens:
        if token in POSITIVE_WORDS:
            score += 0.35
        elif token in NEGATIVE_WORDS:
            score -= 0.35

    return _normalize_score(score, len(tokens))


def _label_for_score(score: float) -> str:
    if score > 0.1:
        return "Positive"
    if score < -0.1:
        return "Negative"
    return "Neutral"


def _parse_yfinance_news(fetch_symbol: str) -> List[Dict]:
    try:
        ticker = yf.Ticker(fetch_symbol)
        news_items = getattr(ticker, "news", None) or []
    except Exception:
        news_items = []

    articles: List[Dict] = []
    for item in news_items[:MAX_ARTICLES]:
        content = item.get("content") or {}
        title = content.get("title") or item.get("title") or ""
        summary = content.get("summary") or item.get("summary") or ""
        source = content.get("provider", {}).get("displayName") or item.get("publisher") or "Yahoo Finance"
        url = content.get("canonicalUrl", {}).get("url") or item.get("link") or ""
        published = content.get("pubDate") or item.get("providerPublishTime") or item.get("published_at")

        if isinstance(published, (int, float)):
            published_at = datetime.fromtimestamp(published, tz=timezone.utc).isoformat()
        else:
            published_at = str(published) if published else None

        if title:
            articles.append({
                "title": title,
                "summary": summary,
                "source": source,
                "url": url,
                "published_at": published_at,
            })
    return articles


def _parse_google_rss(symbol: str) -> List[Dict]:
    query = f"\"{symbol}\" stock OR {symbol} shares OR {symbol} earnings"
    rss_url = f"https://news.google.com/rss/search?q={quote_plus(query)}&hl=en-IN&gl=IN&ceid=IN:en"
    try:
        response = _SESSION.get(rss_url, timeout=8)
        response.raise_for_status()
        xml_bytes = response.content
    except Exception:
        return []

    try:
        root = ET.fromstring(xml_bytes)
    except ET.ParseError:
        return []

    articles: List[Dict] = []
    for item in root.findall("./channel/item")[:MAX_ARTICLES]:
        title = item.findtext("title") or ""
        url = item.findtext("link") or ""
        published_at = item.findtext("pubDate")
        source_el = item.find("{http://search.yahoo.com/mrss/}source")
        source = source_el.text if source_el is not None and source_el.text else "Google News"
        if title:
            articles.append({
                "title": title,
                "summary": "",
                "source": source,
                "url": url,
                "published_at": published_at,
            })
    return articles


def _parse_yahoo_rss(fetch_symbol: str) -> List[Dict]:
    rss_url = f"https://finance.yahoo.com/rss/headline?s={quote_plus(fetch_symbol)}"

    try:
        response = _SESSION.get(rss_url, timeout=8)
        response.raise_for_status()
        xml_bytes = response.content
    except Exception:
        return []

    try:
        root = ET.fromstring(xml_bytes)
    except ET.ParseError:
        return []

    articles: List[Dict] = []
    for item in root.findall("./channel/item")[:MAX_ARTICLES]:
        title = item.findtext("title") or ""
        url = item.findtext("link") or ""
        published_at = item.findtext("pubDate")
        description = item.findtext("description") or ""
        if title:
            articles.append({
                "title": title,
                "summary": description,
                "source": "Yahoo Finance",
                "url": url,
                "published_at": published_at,
            })
    return articles


def _is_relevant_article(symbol: str, fetch_symbol: str, article: Dict) -> bool:
    normalized_symbol = (symbol or "").upper().replace(".NS", "").replace(".BO", "")
    resolved_symbol = (fetch_symbol or symbol or "").upper().replace(".NS", "").replace(".BO", "")
    title = (article.get("title") or "").upper()
    summary = (article.get("summary") or "").upper()
    haystack = f"{title} {summary}"
    candidates = {
        normalized_symbol,
        resolved_symbol,
        f"{normalized_symbol}.NS",
        f"{normalized_symbol}.BO",
    }
    return any(candidate and candidate in haystack for candidate in candidates)


def get_stock_news_sentiment(symbol: str, fetch_symbol: Optional[str] = None, force_refresh: bool = False) -> Dict:
    normalized_symbol = (symbol or "").upper().strip()
    resolved_symbol = (fetch_symbol or normalized_symbol).upper().strip()
    cache_key = f"{normalized_symbol}:{resolved_symbol}"
    cached = _CACHE.get(cache_key)
    now = time.time()

    if not force_refresh and cached and (now - cached["timestamp"]) < CACHE_TTL_SECONDS:
        payload = dict(cached["payload"])
        payload["cached"] = True
        return payload

    articles = _parse_yfinance_news(resolved_symbol)
    source = "yfinance"
    if not articles:
        articles = _parse_google_rss(normalized_symbol)
        source = "google_rss"
    if not articles:
        articles = _parse_yahoo_rss(resolved_symbol)
        source = "yahoo_rss"

    relevant_articles = [
        article for article in articles
        if _is_relevant_article(normalized_symbol, resolved_symbol, article)
    ]
    if relevant_articles:
        articles = relevant_articles

    scored_articles = []
    scores = []
    for article in articles[:MAX_ARTICLES]:
        combined_text = f"{article.get('title', '')}. {article.get('summary', '')}".strip()
        article_score = _score_text(combined_text)
        scores.append(article_score)
        scored_articles.append({
            **article,
            "sentiment_score": round(article_score, 3),
            "sentiment_label": _label_for_score(article_score),
        })

    average_score = round(sum(scores) / len(scores), 3) if scores else 0.0
    payload = {
        "success": True,
        "symbol": normalized_symbol,
        "fetch_symbol": resolved_symbol,
        "score": average_score,
        "label": _label_for_score(average_score),
        "article_count": len(scored_articles),
        "headlines": scored_articles,
        "source": source,
        "cached": False,
        "last_updated": datetime.now(timezone.utc).isoformat(),
    }

    if not scored_articles:
        payload["message"] = "No recent news found. Falling back to neutral sentiment."

    _CACHE[cache_key] = {
        "timestamp": now,
        "payload": payload,
    }
    return payload
