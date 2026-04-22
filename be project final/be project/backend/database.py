"""
Database configuration and connectivity helpers.

Designed for Supabase/Postgres first, while keeping the backend decoupled from
any single managed provider.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any, Optional
from urllib.parse import urlparse


@dataclass
class DatabaseSettings:
    provider: str
    database_url: str
    direct_url: str
    ssl_mode: str

    @property
    def is_configured(self) -> bool:
        return bool(self.direct_url or self.database_url)

    @property
    def effective_url(self) -> str:
        return self.direct_url or self.database_url

    @property
    def masked_url(self) -> Optional[str]:
        raw = self.effective_url
        if not raw:
            return None

        parsed = urlparse(raw)
        if not parsed.hostname:
            return "<configured>"

        port = f":{parsed.port}" if parsed.port else ""
        db_name = parsed.path.lstrip("/") if parsed.path else ""
        db_suffix = f"/{db_name}" if db_name else ""
        return f"{parsed.scheme}://{parsed.hostname}{port}{db_suffix}"


def load_database_settings() -> DatabaseSettings:
    provider = os.getenv("DATABASE_PROVIDER", "supabase").strip().lower()
    database_url = os.getenv("DATABASE_URL", "").strip()
    direct_url = os.getenv("DIRECT_DATABASE_URL", "").strip()
    ssl_mode = os.getenv("DATABASE_SSL_MODE", "require").strip()
    return DatabaseSettings(
        provider=provider,
        database_url=database_url,
        direct_url=direct_url,
        ssl_mode=ssl_mode,
    )


class DatabaseManager:
    """Thin Postgres connectivity helper."""

    def __init__(self, settings: Optional[DatabaseSettings] = None):
        self.settings = settings or load_database_settings()

    def connection_status(self) -> dict:
        if not self.settings.is_configured:
            return {
                "configured": False,
                "connected": False,
                "provider": self.settings.provider,
                "database": None,
                "message": "DATABASE_URL is not configured.",
            }

        try:
            import psycopg
        except ImportError:
            return {
                "configured": True,
                "connected": False,
                "provider": self.settings.provider,
                "database": self.settings.masked_url,
                "message": "psycopg is not installed. Run pip install -r requirements.txt.",
            }

        try:
            with psycopg.connect(
                self.settings.effective_url,
                connect_timeout=5,
                sslmode=self.settings.ssl_mode,
            ) as conn:
                with conn.cursor() as cur:
                    cur.execute("select current_database(), current_user, version()")
                    current_database, current_user, version = cur.fetchone()

            return {
                "configured": True,
                "connected": True,
                "provider": self.settings.provider,
                "database": current_database,
                "database_url": self.settings.masked_url,
                "user": current_user,
                "version": version.split(",")[0],
                "message": "Database connection successful.",
            }
        except Exception as exc:
            return {
                "configured": True,
                "connected": False,
                "provider": self.settings.provider,
                "database": self.settings.masked_url,
                "message": str(exc),
            }

    def apply_schema(self, schema_path: Optional[str] = None) -> dict:
        if not self.settings.is_configured:
            return {
                "success": False,
                "message": "DATABASE_URL is not configured.",
            }

        schema_file = Path(schema_path) if schema_path else Path(__file__).with_name("sql") / "schema.sql"
        if not schema_file.exists():
            return {
                "success": False,
                "message": f"Schema file not found: {schema_file}",
            }

        try:
            import psycopg

            sql_text = schema_file.read_text(encoding="utf-8")
            with psycopg.connect(
                self.settings.effective_url,
                connect_timeout=5,
                sslmode=self.settings.ssl_mode,
            ) as conn:
                with conn.cursor() as cur:
                    cur.execute(sql_text)
                conn.commit()

            return {
                "success": True,
                "message": f"Schema applied successfully from {schema_file.name}.",
            }
        except Exception as exc:
            return {
                "success": False,
                "message": str(exc),
            }

    def save_analysis_run(self, payload: dict[str, Any]) -> dict:
        if not self.settings.is_configured:
            return {"success": False, "message": "Database is not configured."}

        try:
            import psycopg

            with psycopg.connect(
                self.settings.effective_url,
                connect_timeout=5,
                sslmode=self.settings.ssl_mode,
            ) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        insert into public.analysis_runs (
                            symbol,
                            market,
                            investment_amount,
                            investment_period,
                            current_price,
                            predicted_price,
                            expected_return,
                            risk,
                            confidence,
                            signal,
                            recommendation,
                            raw_response
                        )
                        values (
                            %(symbol)s,
                            %(market)s,
                            %(investment_amount)s,
                            %(investment_period)s,
                            %(current_price)s,
                            %(predicted_price)s,
                            %(expected_return)s,
                            %(risk)s,
                            %(confidence)s,
                            %(signal)s,
                            %(recommendation)s,
                            %(raw_response)s::jsonb
                        )
                        returning id, created_at
                        """,
                        {
                            "symbol": payload.get("symbol"),
                            "market": payload.get("market"),
                            "investment_amount": payload.get("investment_amount"),
                            "investment_period": payload.get("investment_period"),
                            "current_price": payload.get("current_price"),
                            "predicted_price": payload.get("predicted_price"),
                            "expected_return": payload.get("expected_return"),
                            "risk": payload.get("risk"),
                            "confidence": payload.get("confidence"),
                            "signal": payload.get("signal"),
                            "recommendation": payload.get("recommendation"),
                            "raw_response": json.dumps(self._make_json_safe(payload.get("raw_response", {}))),
                        },
                    )
                    row = cur.fetchone()
                conn.commit()

            return {
                "success": True,
                "id": str(row[0]) if row else None,
                "created_at": row[1].isoformat() if row and hasattr(row[1], "isoformat") else None,
            }
        except Exception as exc:
            return {"success": False, "message": str(exc)}

    def get_analysis_history(
        self,
        limit: int = 20,
        symbol: Optional[str] = None,
        market: Optional[str] = None,
    ) -> dict:
        if not self.settings.is_configured:
            return {
                "success": False,
                "message": "Database is not configured.",
                "history": [],
            }

        try:
            import psycopg

            conditions = []
            params: dict[str, Any] = {"limit": max(1, min(int(limit), 100))}

            if symbol:
                conditions.append("symbol = %(symbol)s")
                params["symbol"] = symbol.upper()
            if market:
                conditions.append("market = %(market)s")
                params["market"] = market.upper()

            where_clause = f"where {' and '.join(conditions)}" if conditions else ""
            query = f"""
                select
                    id,
                    symbol,
                    market,
                    investment_amount,
                    investment_period,
                    current_price,
                    predicted_price,
                    expected_return,
                    risk,
                    confidence,
                    signal,
                    recommendation,
                    created_at
                from public.analysis_runs
                {where_clause}
                order by created_at desc
                limit %(limit)s
            """

            with psycopg.connect(
                self.settings.effective_url,
                connect_timeout=5,
                sslmode=self.settings.ssl_mode,
            ) as conn:
                with conn.cursor() as cur:
                    cur.execute(query, params)
                    rows = cur.fetchall()

            history = []
            for row in rows:
                history.append(
                    {
                        "id": str(row[0]),
                        "symbol": row[1],
                        "market": row[2],
                        "investment_amount": float(row[3]) if row[3] is not None else None,
                        "investment_period": int(row[4]) if row[4] is not None else None,
                        "current_price": float(row[5]) if row[5] is not None else None,
                        "predicted_price": float(row[6]) if row[6] is not None else None,
                        "expected_return": float(row[7]) if row[7] is not None else None,
                        "risk": float(row[8]) if row[8] is not None else None,
                        "confidence": float(row[9]) if row[9] is not None else None,
                        "signal": row[10],
                        "recommendation": row[11],
                        "created_at": row[12].isoformat() if hasattr(row[12], "isoformat") else str(row[12]),
                    }
                )

            return {"success": True, "history": history}
        except Exception as exc:
            return {"success": False, "message": str(exc), "history": []}

    def _ensure_demo_profile(self, conn) -> str:
        with conn.cursor() as cur:
            cur.execute(
                """
                insert into public.profiles (email, full_name, preferred_market, risk_profile)
                values ('demo@equisense.local', 'Equisense Demo User', 'IN', 'balanced')
                on conflict (email) do update set full_name = excluded.full_name
                returning id
                """
            )
            row = cur.fetchone()
        return str(row[0])

    def _ensure_default_watchlist(self, conn) -> tuple[str, str]:
        user_id = self._ensure_demo_profile(conn)
        with conn.cursor() as cur:
            cur.execute(
                """
                insert into public.watchlists (user_id, name, is_default)
                values (%s, 'My Watchlist', true)
                on conflict (user_id, name) do update set is_default = true
                returning id, name
                """,
                (user_id,),
            )
            row = cur.fetchone()
        return str(row[0]), row[1]

    def get_watchlist(self, market: str = "IN") -> dict:
        if not self.settings.is_configured:
            return {"success": False, "message": "Database is not configured.", "items": []}
        try:
            import psycopg

            with psycopg.connect(
                self.settings.effective_url,
                connect_timeout=5,
                sslmode=self.settings.ssl_mode,
            ) as conn:
                watchlist_id, watchlist_name = self._ensure_default_watchlist(conn)
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        select symbol, market, added_at, notes
                        from public.watchlist_items
                        where watchlist_id = %s and market = %s
                        order by added_at asc
                        """,
                        (watchlist_id, market.upper()),
                    )
                    rows = cur.fetchall()
                conn.commit()

            items = [
                {
                    "symbol": row[0],
                    "market": row[1],
                    "added_at": row[2].isoformat() if hasattr(row[2], "isoformat") else str(row[2]),
                    "notes": row[3],
                }
                for row in rows
            ]
            return {"success": True, "watchlist_id": watchlist_id, "name": watchlist_name, "items": items}
        except Exception as exc:
            return {"success": False, "message": str(exc), "items": []}

    def add_watchlist_item(self, symbol: str, market: str = "IN", notes: Optional[str] = None) -> dict:
        if not self.settings.is_configured:
            return {"success": False, "message": "Database is not configured."}
        try:
            import psycopg

            with psycopg.connect(
                self.settings.effective_url,
                connect_timeout=5,
                sslmode=self.settings.ssl_mode,
            ) as conn:
                watchlist_id, _ = self._ensure_default_watchlist(conn)
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        insert into public.watchlist_items (watchlist_id, symbol, market, notes)
                        values (%s, %s, %s, %s)
                        on conflict (watchlist_id, symbol, market) do update set notes = excluded.notes
                        returning symbol, market, added_at, notes
                        """,
                        (watchlist_id, symbol.upper(), market.upper(), notes),
                    )
                    row = cur.fetchone()
                conn.commit()

            return {
                "success": True,
                "item": {
                    "symbol": row[0],
                    "market": row[1],
                    "added_at": row[2].isoformat() if hasattr(row[2], "isoformat") else str(row[2]),
                    "notes": row[3],
                },
            }
        except Exception as exc:
            return {"success": False, "message": str(exc)}

    def remove_watchlist_item(self, symbol: str, market: str = "IN") -> dict:
        if not self.settings.is_configured:
            return {"success": False, "message": "Database is not configured."}
        try:
            import psycopg

            with psycopg.connect(
                self.settings.effective_url,
                connect_timeout=5,
                sslmode=self.settings.ssl_mode,
            ) as conn:
                watchlist_id, _ = self._ensure_default_watchlist(conn)
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        delete from public.watchlist_items
                        where watchlist_id = %s and symbol = %s and market = %s
                        returning symbol
                        """,
                        (watchlist_id, symbol.upper(), market.upper()),
                    )
                    row = cur.fetchone()
                conn.commit()

            return {"success": True, "removed": bool(row), "symbol": symbol.upper(), "market": market.upper()}
        except Exception as exc:
            return {"success": False, "message": str(exc)}

    def _make_json_safe(self, value: Any) -> Any:
        if isinstance(value, dict):
            return {str(key): self._make_json_safe(item) for key, item in value.items()}
        if isinstance(value, list):
            return [self._make_json_safe(item) for item in value]
        if isinstance(value, tuple):
            return [self._make_json_safe(item) for item in value]
        if isinstance(value, Decimal):
            return float(value)
        if isinstance(value, (datetime, date)):
            return value.isoformat()
        return value
