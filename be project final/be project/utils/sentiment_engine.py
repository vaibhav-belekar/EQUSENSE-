"""
News sentiment engine for Indian equities.

Fetches recent headlines from NewsAPI, scores them with TextBlob, and caches
the results for a short time so analyst predictions can use sentiment without
adding heavy latency on every request.
"""

from __future__ import annotations

import json
import os
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from typing import Dict, List, Optional
from urllib.error import HTTPError, URLError
from urllib.parse import quote_plus
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET

from textblob import TextBlob
import yfinance as yf

CACHE_TTL_SECONDS = 600
DEFAULT_HEADLINES_PER_STOCK = 5
MAX_HEADLINES_PER_STOCK = 10
DEFAULT_TIMEOUT_SECONDS = 3.0
NEWS_API_URL = "https://newsapi.org/v2/everything"
GOOGLE_NEWS_RSS_URL = "https://news.google.com/rss/search"

NIFTY_50_SYMBOLS = [
    "ADANIENT", "ADANIPORTS", "APOLLOHOSP", "ASIANPAINT", "AXISBANK",
    "BAJAJ-AUTO", "BAJFINANCE", "BAJAJFINSV", "BHARTIARTL",
    "BPCL", "BRITANNIA", "CIPLA", "COALINDIA", "DRREDDY",
    "EICHERMOT", "GRASIM", "HCLTECH", "HDFCBANK",
    "HDFCLIFE", "HEROMOTOCO", "HINDALCO", "HINDUNILVR", "ICICIBANK",
    "INDUSINDBK", "INFY", "ITC", "JIOFIN", "JSWSTEEL",
    "KOTAKBANK", "LT", "M&M", "MARUTI", "NESTLEIND",
    "NTPC", "ONGC", "POWERGRID", "RELIANCE", "SBILIFE",
    "SBIN", "SHRIRAMFIN", "SUNPHARMA", "TATACONSUM", "TATAMOTORS",
    "TATASTEEL", "TCS", "TECHM", "TITAN", "TRENT", "ULTRACEMCO", "WIPRO"
]

COMPANY_QUERY_MAP = {
    "ADANIENT": "Adani Enterprises",
    "ADANIPORTS": "Adani Ports",
    "APOLLOHOSP": "Apollo Hospitals",
    "ASIANPAINT": "Asian Paints",
    "AXISBANK": "Axis Bank",
    "BAJAJ-AUTO": "Bajaj Auto",
    "BAJFINANCE": "Bajaj Finance",
    "BAJAJFINSV": "Bajaj Finserv",
    "BEL": "Bharat Electronics",
    "BHARTIARTL": "Bharti Airtel",
    "BPCL": "Bharat Petroleum",
    "BRITANNIA": "Britannia",
    "CIPLA": "Cipla",
    "COALINDIA": "Coal India",
    "DRREDDY": "Dr Reddys",
    "EICHERMOT": "Eicher Motors",
    "ETERNAL": "Zomato",
    "GRASIM": "Grasim",
    "HCLTECH": "HCL Technologies",
    "HDFCBANK": "HDFC Bank",
    "HDFCLIFE": "HDFC Life",
    "HEROMOTOCO": "Hero MotoCorp",
    "HINDALCO": "Hindalco",
    "HINDUNILVR": "Hindustan Unilever",
    "ICICIBANK": "ICICI Bank",
    "INDUSINDBK": "IndusInd Bank",
    "INFY": "Infosys",
    "ITC": "ITC",
    "JIOFIN": "Jio Financial Services",
    "JSWSTEEL": "JSW Steel",
    "KOTAKBANK": "Kotak Mahindra Bank",
    "LT": "Larsen and Toubro",
    "M&M": "Mahindra and Mahindra",
    "MARUTI": "Maruti Suzuki",
    "NESTLEIND": "Nestle India",
    "NTPC": "NTPC",
    "ONGC": "ONGC",
    "POWERGRID": "Power Grid",
    "RELIANCE": "Reliance Industries",
    "SBILIFE": "SBI Life",
    "SBIN": "State Bank of India",
    "SHRIRAMFIN": "Shriram Finance",
    "SUNPHARMA": "Sun Pharma",
    "TATACONSUM": "Tata Consumer",
    "TATAMOTORS": "Tata Motors",
    "TATASTEEL": "Tata Steel",
    "TCS": "Tata Consultancy Services",
    "TECHM": "Tech Mahindra",
    "TITAN": "Titan Company",
    "TRENT": "Trent",
    "ULTRACEMCO": "UltraTech Cement",
    "WIPRO": "Wipro",
}

_cache_lock = threading.Lock()
_sentiment_cache: Dict[str, Dict[str, object]] = {}


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _normalize_symbol(symbol: str) -> str:
    return (symbol or "").strip().upper().replace(".NS", "").replace(".BO", "")


def _build_cache_key(symbol: str, market: str) -> str:
    return f"{market.upper()}::{_normalize_symbol(symbol)}"


def _get_api_key() -> Optional[str]:
    return os.getenv("NEWS_API_KEY") or os.getenv("NEWSAPI_KEY")


def _get_query_name(symbol: str) -> str:
    normalized = _normalize_symbol(symbol)
    return COMPANY_QUERY_MAP.get(normalized, normalized.replace("-", " "))


def _build_query(symbol: str, market: str) -> str:
    market_term = "India" if market.upper() == "IN" else "stock"
    return f"{_get_query_name(symbol)} stock {market_term}"


def _get_fetch_symbol(symbol: str, market: str) -> str:
    normalized = _normalize_symbol(symbol)
    if market.upper() == "IN" and not normalized.endswith((".NS", ".BO")):
        return f"{normalized}.NS"
    return normalized


def _get_cached_detail(symbol: str, market: str) -> Optional[Dict[str, object]]:
    cache_key = _build_cache_key(symbol, market)
    with _cache_lock:
        cached = _sentiment_cache.get(cache_key)
        if not cached:
            return None
        expires_at = cached.get("expires_at")
        if isinstance(expires_at, datetime) and expires_at > _utc_now():
            return dict(cached)
        _sentiment_cache.pop(cache_key, None)
    return None


def _set_cached_detail(symbol: str, market: str, detail: Dict[str, object]) -> Dict[str, object]:
    cache_key = _build_cache_key(symbol, market)
    payload = dict(detail)
    payload["expires_at"] = _utc_now() + timedelta(seconds=CACHE_TTL_SECONDS)
    with _cache_lock:
        _sentiment_cache[cache_key] = payload
    return dict(payload)


def _empty_detail(symbol: str, market: str, reason: str = "neutral fallback") -> Dict[str, object]:
    normalized = _normalize_symbol(symbol)
    now_iso = _utc_now().isoformat()
    return {
        "symbol": normalized,
        "market": market.upper(),
        "score": 0.0,
        "label": "Neutral",
        "headlines": [],
        "article_count": 0,
        "updated_at": now_iso,
        "reason": reason,
    }


def _score_headline(title: str, summary: str = "") -> float:
    try:
        text = f"{title}. {summary}".strip() if summary else title
        return float(TextBlob(text).sentiment.polarity)
    except Exception:
        return 0.0


def _label_from_score(score: float) -> str:
    if score > 0.1:
        return "Positive"
    if score < -0.1:
        return "Negative"
    return "Neutral"


def _fetch_newsapi_articles(symbol: str, market: str, page_size: int) -> List[Dict[str, object]]:
    api_key = _get_api_key()
    if not api_key:
        return []

    query = quote_plus(_build_query(symbol, market))
    size = max(1, min(page_size, MAX_HEADLINES_PER_STOCK))
    url = (
        f"{NEWS_API_URL}?q={query}&language=en&sortBy=publishedAt"
        f"&pageSize={size}&apiKey={quote_plus(api_key)}"
    )
    request = Request(
        url,
        headers={
            "User-Agent": "Equisense-Sentiment/1.0",
            "Accept": "application/json",
        },
    )
    try:
        with urlopen(request, timeout=DEFAULT_TIMEOUT_SECONDS) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        if exc.code == 429:
            return []
        raise
    except (URLError, TimeoutError):
        return []

    if payload.get("status") != "ok":
        return []
    return payload.get("articles", []) or []


def _extract_nested(value: Dict[str, object], *path: str):
    current = value
    for key in path:
        if not isinstance(current, dict):
            return None
        current = current.get(key)
    return current


def _normalize_yfinance_article(article: Dict[str, object]) -> Optional[Dict[str, object]]:
    content = article.get("content") if isinstance(article, dict) else {}
    title = (
        _extract_nested(article, "content", "title")
        or article.get("title")
        or article.get("headline")
    )
    if not title:
        return None

    source = (
        _extract_nested(article, "content", "provider", "displayName")
        or _extract_nested(article, "publisher")
        or article.get("publisher")
        or "Yahoo Finance"
    )
    url = (
        _extract_nested(article, "content", "canonicalUrl", "url")
        or _extract_nested(article, "content", "clickThroughUrl", "url")
        or article.get("link")
        or article.get("url")
    )
    summary = (
        _extract_nested(article, "content", "summary")
        or article.get("summary")
        or article.get("description")
        or ""
    )
    published_at = (
        _extract_nested(article, "content", "pubDate")
        or article.get("providerPublishTime")
        or article.get("publishedAt")
    )
    if isinstance(published_at, (int, float)):
        try:
            published_at = datetime.fromtimestamp(published_at, tz=timezone.utc).isoformat()
        except Exception:
            published_at = None

    return {
        "title": str(title).strip(),
        "source": source,
        "url": url,
        "publishedAt": published_at,
        "description": str(summary).strip(),
    }


def _fetch_yfinance_articles(symbol: str, market: str, page_size: int) -> List[Dict[str, object]]:
    try:
        ticker = yf.Ticker(_get_fetch_symbol(symbol, market))
        raw_items = getattr(ticker, "news", None) or []
    except Exception:
        return []

    normalized_items = []
    for item in raw_items[: max(page_size * 2, page_size)]:
        normalized = _normalize_yfinance_article(item)
        if normalized:
            normalized_items.append(normalized)
        if len(normalized_items) >= page_size:
            break
    return normalized_items


def _fetch_google_news_articles(symbol: str, market: str, page_size: int) -> List[Dict[str, object]]:
    query = quote_plus(_build_query(symbol, market))
    url = f"{GOOGLE_NEWS_RSS_URL}?q={query}&hl=en-IN&gl=IN&ceid=IN:en"
    request = Request(
        url,
        headers={
            "User-Agent": "Equisense-Sentiment/1.0",
            "Accept": "application/rss+xml, application/xml;q=0.9, */*;q=0.8",
        },
    )
    try:
        with urlopen(request, timeout=DEFAULT_TIMEOUT_SECONDS) as response:
            payload = response.read()
        root = ET.fromstring(payload)
    except Exception:
        return []

    articles: List[Dict[str, object]] = []
    for item in root.findall(".//item")[: max(page_size * 2, page_size)]:
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        pub_date = (item.findtext("pubDate") or "").strip()
        description = (item.findtext("description") or "").strip()
        source = "Google News"

        source_el = item.find("{http://search.yahoo.com/mrss/}source")
        if source_el is not None and source_el.text:
            source = source_el.text.strip()

        if pub_date:
            try:
                pub_date = parsedate_to_datetime(pub_date).astimezone(timezone.utc).isoformat()
            except Exception:
                pass

        if title:
            articles.append(
                {
                    "title": title,
                    "source": source,
                    "url": link,
                    "publishedAt": pub_date or None,
                    "description": description,
                }
            )
        if len(articles) >= page_size:
            break
    return articles


def _dedupe_articles(articles: List[Dict[str, object]], page_size: int) -> List[Dict[str, object]]:
    seen = set()
    unique_articles: List[Dict[str, object]] = []
    for article in articles:
        title = (article.get("title") or "").strip()
        url = (article.get("url") or "").strip()
        key = (title.lower(), url.lower())
        if not title or key in seen:
            continue
        seen.add(key)
        unique_articles.append(article)
        if len(unique_articles) >= page_size:
            break
    return unique_articles


def _fetch_news_articles(symbol: str, market: str, page_size: int) -> List[Dict[str, object]]:
    combined: List[Dict[str, object]] = []
    combined.extend(_fetch_newsapi_articles(symbol, market, page_size))
    if len(combined) < page_size:
        combined.extend(_fetch_yfinance_articles(symbol, market, page_size))
    if len(combined) < page_size:
        combined.extend(_fetch_google_news_articles(symbol, market, page_size))
    return _dedupe_articles(combined, page_size)


def _build_sentiment_detail(symbol: str, market: str, page_size: int) -> Dict[str, object]:
    normalized = _normalize_symbol(symbol)
    try:
        articles = _fetch_news_articles(normalized, market, page_size=page_size)
    except Exception as exc:
        return _empty_detail(normalized, market, reason=f"news fetch failed: {exc}")

    if not articles:
        reason = "news api unavailable or no articles found"
        if not _get_api_key():
            reason = "NEWS_API_KEY not configured"
        return _empty_detail(normalized, market, reason=reason)

    scored_headlines = []
    for article in articles[:page_size]:
        title = (article.get("title") or "").strip()
        if not title:
            continue
        summary = (article.get("description") or article.get("summary") or "").strip()
        score = _score_headline(title, summary)
        source_value = article.get("source")
        if isinstance(source_value, dict):
            source_name = source_value.get("name")
        else:
            source_name = source_value
        scored_headlines.append(
            {
                "title": title,
                "source": source_name,
                "url": article.get("url"),
                "published_at": article.get("publishedAt"),
                "score": round(score, 4),
                "summary": summary,
            }
        )

    if not scored_headlines:
        return _empty_detail(normalized, market, reason="no valid headlines")

    avg_score = sum(item["score"] for item in scored_headlines) / len(scored_headlines)
    return {
        "symbol": normalized,
        "market": market.upper(),
        "score": round(float(avg_score), 4),
        "label": _label_from_score(avg_score),
        "headlines": scored_headlines,
        "article_count": len(scored_headlines),
        "updated_at": _utc_now().isoformat(),
        "reason": "live news",
    }


def get_stock_sentiment_detail(
    symbol: str,
    market: str = "IN",
    refresh: bool = False,
    page_size: int = DEFAULT_HEADLINES_PER_STOCK,
) -> Dict[str, object]:
    normalized = _normalize_symbol(symbol)
    if not refresh:
        cached = _get_cached_detail(normalized, market)
        if cached:
            cached.pop("expires_at", None)
            return cached

    detail = _build_sentiment_detail(normalized, market, page_size=page_size)
    stored = _set_cached_detail(normalized, market, detail)
    stored.pop("expires_at", None)
    return stored


def get_stock_sentiment(symbol: str, market: str = "IN", refresh: bool = False) -> float:
    detail = get_stock_sentiment_detail(symbol, market=market, refresh=refresh)
    return float(detail.get("score", 0.0) or 0.0)


def get_market_sentiment_details(
    symbols: Optional[List[str]] = None,
    market: str = "IN",
    refresh: bool = False,
    page_size: int = DEFAULT_HEADLINES_PER_STOCK,
) -> Dict[str, Dict[str, object]]:
    target_symbols = [_normalize_symbol(symbol) for symbol in (symbols or NIFTY_50_SYMBOLS) if symbol]
    if not target_symbols:
        return {}

    if len(target_symbols) == 1:
        symbol = target_symbols[0]
        return {symbol: get_stock_sentiment_detail(symbol, market=market, refresh=refresh, page_size=page_size)}

    results: Dict[str, Dict[str, object]] = {}
    pending: List[str] = []

    if not refresh:
        for symbol in target_symbols:
            cached = _get_cached_detail(symbol, market)
            if cached:
                cached.pop("expires_at", None)
                results[symbol] = cached
            else:
                pending.append(symbol)
    else:
        pending = list(target_symbols)

    if not pending:
        return results

    max_workers = min(8, len(pending))
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_map = {
            executor.submit(
                get_stock_sentiment_detail,
                symbol,
                market,
                True,
                page_size,
            ): symbol
            for symbol in pending
        }
        for future in as_completed(future_map):
            symbol = future_map[future]
            try:
                results[symbol] = future.result()
            except Exception:
                results[symbol] = _empty_detail(symbol, market, reason="parallel fetch failed")

    return results


def get_market_sentiment(
    symbols: Optional[List[str]] = None,
    market: str = "IN",
    refresh: bool = False,
    page_size: int = DEFAULT_HEADLINES_PER_STOCK,
) -> Dict[str, float]:
    details = get_market_sentiment_details(
        symbols=symbols,
        market=market,
        refresh=refresh,
        page_size=page_size,
    )
    return {symbol: float(detail.get("score", 0.0) or 0.0) for symbol, detail in details.items()}


__all__ = [
    "NIFTY_50_SYMBOLS",
    "get_market_sentiment",
    "get_market_sentiment_details",
    "get_stock_sentiment",
    "get_stock_sentiment_detail",
]
