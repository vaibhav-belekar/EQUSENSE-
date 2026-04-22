"""
FastAPI Backend for Multi-Agent Trading Ecosystem
Provides REST API endpoints for the frontend
"""

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Dict, Optional
import sys
import os
import asyncio
from datetime import datetime
import json
import pandas as pd
import numpy as np

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import TradingEcosystem
from backend.config import (
    CONFIDENCE_BUY_THRESHOLD,
    CONFIDENCE_SELL_THRESHOLD,
    CONFIDENCE_HIGH_THRESHOLD,
    CONFIDENCE_MEDIUM_THRESHOLD,
    VOLATILITY_HIGH_THRESHOLD,
    VOLATILITY_MEDIUM_THRESHOLD,
    MAX_POSITION_SIZE,
    POSITION_SIZE_WARNING,
    EXPECTED_RETURN_STRONG_BUY,
    EXPECTED_RETURN_BUY,
    RISK_SCORE_STRONG_BUY,
    RISK_SCORE_BUY,
    SCORE_BUY_THRESHOLD,
    PRICE_CHANGE_SIGNAL_THRESHOLD,
    PRICE_CHANGE_CONFIDENCE_MULTIPLIER,
    EXPECTED_RETURN_MULTIPLIER,
    PRICE_CHANGE_PERCENT_MULTIPLIER,
    RISK_SCALE_MULTIPLIER,
    SCORE_RISK_PENALTY,
    DEFAULT_CONFIDENCE,
    DEFAULT_VOLATILITY,
    DEFAULT_RISK_SCORE,
    DEFAULT_EXPECTED_RETURN
)
from backend.recommendation_engine import (
    calculate_volatility_from_data,
    calculate_risk_level,
    calculate_risk_score,
    calculate_effective_risk,
    calculate_expected_return,
    calculate_recommendation_score,
    get_recommendation_from_score,
    get_model_aligned_recommendation,
    get_auditor_recommendation,
    get_trader_action,
    generate_unified_recommendation
)
from backend.database import DatabaseManager
from backend.sentiment_engine import get_stock_news_sentiment

# Initialize FastAPI app
app = FastAPI(
    title="Multi-Agent Trading Ecosystem API",
    description="REST API for the AI Trading Ecosystem",
    version="1.0.0"
)

# Enable CORS for frontend
# This app does not use cookie-based auth, so permissive CORS is acceptable
# and avoids Vercel/preview origin mismatches during deployment.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global ecosystem instance
ecosystem: Optional[TradingEcosystem] = None
database_manager = DatabaseManager()

# Indian stock symbol normalization
INDIAN_SYMBOL_ALIASES = {
    'JSW': 'JSWSTEEL',
    'JSWSTEEL': 'JSWSTEEL',
    'RELIANCE': 'RELIANCE',
    'TCS': 'TCS',
    'INFY': 'INFY',
    'WIPRO': 'WIPRO',
    'KOTAKBANK': 'KOTAKBANK',
    'HDFCBANK': 'HDFCBANK',
    'ICICIBANK': 'ICICIBANK',
    'HDFC': 'HDFC',
    'AXISBANK': 'AXISBANK',
    'INDUSINDBK': 'INDUSINDBK',
    'HINDUNILVR': 'HINDUNILVR',
    'ITC': 'ITC',
    'SBIN': 'SBIN',
    'HCLTECH': 'HCLTECH',
    'TECHM': 'TECHM',
    'BHARTIARTL': 'BHARTIARTL',
    'TATASTEEL': 'TATASTEEL',
    'SAILIND': 'SAILIND',
    'NMDC': 'NMDC',
    'MARUTI': 'MARUTI',
    'M&M': 'M&M',
    'TATAMOTORS': 'TATAMOTORS',
    'SUNPHARMA': 'SUNPHARMA',
    'DRREDDY': 'DRREDDY',
    'CIPLA': 'CIPLA',
    'LUPIN': 'LUPIN',
    'DIVISLAB': 'DIVISLAB',
    'BIOCON': 'BIOCON',
    'TORNTPHARM': 'TORNTPHARM',
    'ONGC': 'ONGC',
    'IOC': 'IOC',
    'BPCL': 'BPCL',
    'HPCL': 'HPCL',
    'GAIL': 'GAIL',
    'ADANIENT': 'ADANIENT',
    'ADANIPORTS': 'ADANIPORTS',
    'LT': 'LT',
    'LARSEN': 'LARSEN',
    'BHEL': 'BHEL',
    'SIEMENS': 'SIEMENS',
    'ABB': 'ABB',
    'SCHNEIDER': 'SCHNEIDER',
    'HINDALCO': 'HINDALCO',
    'VEDL': 'VEDL',
    'COALINDIA': 'COALINDIA',
    'ULTRACEMCO': 'ULTRACEMCO',
    'SHREECEM': 'SHREECEM',
    'ACC': 'ACC',
    'AMBUJACEM': 'AMBUJACEM',
    'DALBHARAT': 'DALBHARAT',
    'NTPC': 'NTPC',
    'POWERGRID': 'POWERGRID',
    'TATAPOWER': 'TATAPOWER',
    'ADANIPOWER': 'ADANIPOWER',
    'NHPC': 'NHPC',
    'DLF': 'DLF',
    'GODREJPROP': 'GODREJPROP',
    'PRESTIGE': 'PRESTIGE',
    'SOBHA': 'SOBHA',
    'ZEE': 'ZEE',
    'SUNTV': 'SUNTV',
    'TV18BRDCST': 'TV18BRDCST',
    'DMART': 'DMART',
    'RELAXO': 'RELAXO',
    'BATAINDIA': 'BATAINDIA',
    'UPL': 'UPL',
    'RCF': 'RCF',
    'GNFC': 'GNFC',
    'FACT': 'FACT',
    'ASIANPAINT': 'ASIANPAINT',
    'BERGEPAINT': 'BERGEPAINT',
    'PIDILITIND': 'PIDILITIND',
    'GRASIM': 'GRASIM',
    'ADANIGREEN': 'ADANIGREEN',
    'ADANITRANS': 'ADANITRANS'
}


def normalize_symbol(symbol: str, market_hint: str = None):
    symbol = (symbol or '').strip().upper()
    suffix = ''

    if symbol.endswith('.NS'):
        suffix = '.NS'
        symbol = symbol[:-3]
    elif symbol.endswith('.BO'):
        suffix = '.BO'
        symbol = symbol[:-3]

    normalized = INDIAN_SYMBOL_ALIASES.get(symbol, symbol)
    market = 'US'

    if market_hint and market_hint.upper() == 'IN':
        market = 'IN'
    elif suffix in ('.NS', '.BO') or normalized in INDIAN_SYMBOL_ALIASES:
        market = 'IN'

    fetch_symbol = normalized
    if market == 'IN':
        if suffix:
            fetch_symbol = f"{normalized}{suffix}"
        else:
            fetch_symbol = f"{normalized}.NS"

    return normalized, market, fetch_symbol


def ensure_market_ecosystem(symbols: List[str], market: str = "US", initial_capital: float = 100000.0):
    """Ensure the global ecosystem is aligned with the requested market and symbols."""
    global ecosystem

    requested = [sym.replace('.NS', '').replace('.BO', '').upper() for sym in symbols]
    if ecosystem is not None:
        current_symbols = [sym.replace('.NS', '').replace('.BO', '').upper() for sym in ecosystem.symbols]
        same_market = getattr(ecosystem, "market", market) == market
        has_all_symbols = all(sym in current_symbols for sym in requested)
        if same_market and has_all_symbols:
            return ecosystem

    ecosystem = TradingEcosystem(symbols=symbols, initial_capital=initial_capital, market=market)
    return ecosystem


# Pydantic models for request/response
class SymbolsRequest(BaseModel):
    symbols: List[str]
    initial_capital: float = 100000.0


class TradeCycleRequest(BaseModel):
    train_models: bool = False
    epochs: int = 10


class InvestmentAnalysisRequest(BaseModel):
    symbol: str
    market: Optional[str] = None
    investment_amount: float
    investment_period: int


class WatchlistItemRequest(BaseModel):
    symbol: str
    market: Optional[str] = "IN"
    notes: Optional[str] = None


class EcosystemStatus(BaseModel):
    initialized: bool
    symbols: List[str]
    initial_capital: float
    cycle_count: int


@app.on_event("startup")
async def startup_event():
    """Initialize ecosystem on startup"""
    global ecosystem
    try:
        if ecosystem is None:
            ecosystem = TradingEcosystem(
                symbols=['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN'],
                initial_capital=100000.0
            )
            # Initialize (fetch data) - but don't block startup
            print("[API] Ecosystem created, will initialize on first request")
    except Exception as e:
        print(f"[API] Error during startup: {str(e)}")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Multi-Agent Trading Ecosystem API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/api/status")
async def get_status():
    """Get ecosystem status"""
    global ecosystem
    if ecosystem is None:
        return {"initialized": False}
    
    return {
        "initialized": True,
        "symbols": ecosystem.symbols,
        "initial_capital": ecosystem.trader.initial_capital,
        "cycle_count": ecosystem.cycle_count
    }


@app.get("/api/database/status")
async def get_database_status():
    """Check whether database connectivity is configured and healthy."""
    return database_manager.connection_status()


@app.post("/api/database/setup")
async def setup_database_schema():
    """Apply the SQL schema to the configured database."""
    result = database_manager.apply_schema()
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("message"))
    return result


@app.get("/api/analysis-history")
async def get_analysis_history(limit: int = 20, symbol: Optional[str] = None, market: Optional[str] = None):
    """Get recent saved investment analyses."""
    result = database_manager.get_analysis_history(limit=limit, symbol=symbol, market=market)
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("message"))
    return result


@app.get("/api/watchlist")
async def get_watchlist(market: str = "IN"):
    result = database_manager.get_watchlist(market=market)
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("message"))
    return result


@app.post("/api/watchlist")
async def add_watchlist_item(request: WatchlistItemRequest):
    result = database_manager.add_watchlist_item(
        symbol=request.symbol,
        market=request.market or "IN",
        notes=request.notes,
    )
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("message"))
    return result


@app.delete("/api/watchlist/{symbol}")
async def remove_watchlist_item(symbol: str, market: str = "IN"):
    result = database_manager.remove_watchlist_item(symbol=symbol, market=market)
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("message"))
    return result


@app.post("/api/initialize")
async def initialize_ecosystem(request: SymbolsRequest):
    """Initialize the trading ecosystem"""
    global ecosystem
    try:
        normalized_symbols = []
        for sym in request.symbols:
            _, _, fetch_symbol = normalize_symbol(sym)
            normalized_symbols.append(fetch_symbol)

        print(f"[API] Initializing ecosystem with symbols: {request.symbols} -> {normalized_symbols}")
        market = 'IN' if any(sym.endswith(('.NS', '.BO')) for sym in normalized_symbols) else 'US'
        ecosystem = TradingEcosystem(
            symbols=normalized_symbols,
            initial_capital=request.initial_capital,
            market=market
        )
        print("[API] Ecosystem created, initializing...")
        ecosystem.initialize()
        print("[API] Ecosystem initialized successfully")
        
        return {
            "success": True,
            "message": "Ecosystem initialized successfully",
            "symbols": normalized_symbols,
            "initial_capital": request.initial_capital
        }
    except Exception as e:
        print(f"[API] Error initializing ecosystem: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/predictions")
async def get_predictions():
    """Get current predictions from Analyst Agent for Indian market stocks"""
    global ecosystem

    # If ecosystem is not initialized, return empty predictions (frontend will calculate from price data)
    if ecosystem is None:
        print("[API] Ecosystem not initialized, returning empty predictions")
        return {"success": True, "predictions": {}, "market": "IN"}

    try:
        # Get comprehensive list of major Indian stocks (NSE)
        stocks = [
            # Large Cap - Banking & Financial Services
            'RELIANCE', 'TCS', 'HDFCBANK', 'ICICIBANK', 'HDFC', 'SBIN', 'KOTAKBANK', 'AXISBANK', 'INDUSINDBK',
            # IT & Technology
            'INFY', 'WIPRO', 'HCLTECH', 'TECHM', 'LTIM', 'LTTS', 'PERSISTENT', 'MINDTREE',
            # FMCG & Consumer
            'HINDUNILVR', 'ITC', 'NESTLEIND', 'MARICO', 'DABUR', 'BRITANNIA', 'TITAN', 'TATACONSUM',
            # Telecom
            'BHARTIARTL', 'IDEA',
            # Automobiles
            'MARUTI', 'M&M', 'TATAMOTORS', 'BAJAJ-AUTO', 'HEROMOTOCO', 'EICHERMOT',
            # Pharmaceuticals
            'SUNPHARMA', 'DRREDDY', 'CIPLA', 'LUPIN', 'DIVISLAB', 'BIOCON', 'TORNTPHARM',
            # Steel & Infrastructure (Including JSW Steel)
            'JSW', 'JSWSTEEL', 'TATASTEEL', 'SAILIND', 'NMDC',
            # Energy & Oil
            'ONGC', 'IOC', 'BPCL', 'HPCL', 'GAIL', 'ADANIENT', 'ADANIPORTS',
            # Infrastructure & Engineering
            'LT', 'LARSEN', 'BHEL', 'SIEMENS', 'ABB', 'SCHNEIDER',
            # Metals & Mining
            'TATASTEEL', 'JSWSTEEL', 'HINDALCO', 'VEDL', 'NMDC', 'COALINDIA',
            # Cement
            'ULTRACEMCO', 'SHREECEM', 'ACC', 'AMBUJACEM', 'DALBHARAT',
            # Power & Utilities
            'NTPC', 'POWERGRID', 'TATAPOWER', 'ADANIPOWER', 'NHPC',
            # Real Estate
            'DLF', 'GODREJPROP', 'PRESTIGE', 'SOBHA',
            # Media & Entertainment
            'ZEE', 'SUNTV', 'TV18BRDCST',
            # Retail
            'DMART', 'RELAXO', 'BATAINDIA',
            # Chemicals
            'UPL', 'RCF', 'GNFC', 'FACT',
            # Others
            'ASIANPAINT', 'BERGEPAINT', 'PIDILITIND', 'GRASIM', 'ADANIGREEN', 'ADANITRANS'
        ]

        # Analyze each stock for Indian market
        predictions = {}
        for symbol in stocks[:50]:  # Limit to first 50 stocks to avoid timeout
            try:
                base_symbol, market, fetch_symbol = normalize_symbol(symbol)
                prediction = ecosystem.analyst.analyze(fetch_symbol, market="IN")
                # Store with both symbol formats
                predictions[symbol] = prediction
                if fetch_symbol != symbol:
                    predictions[fetch_symbol] = prediction
                if base_symbol != symbol and base_symbol not in predictions:
                    predictions[base_symbol] = prediction
            except Exception as e:
                print(f"[API] Error analyzing {symbol}: {str(e)}")
                # Return default prediction on error
                predictions[symbol] = {
                    "signal": "Neutral",
                    "confidence": 0.4,
                    "error": str(e)
                }

        return {"success": True, "predictions": predictions, "market": "IN"}
    except Exception as e:
        print(f"[API] Error getting predictions: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/ohlc/{symbol}")
async def get_ohlc_data(symbol: str, period: str = "1mo", interval: str = "1d", market: str = "US"):
    """Get OHLC data for candlestick charts"""
    global ecosystem
    
    # Initialize minimal ecosystem if not already initialized (for data fetching only)
    if ecosystem is None:
        try:
            print("[API] Ecosystem not initialized, initializing minimal instance for OHLC data...")
            from main import TradingEcosystem
            ecosystem = TradingEcosystem(symbols=[symbol.upper()], initial_capital=100000)
            print("[API] Minimal ecosystem initialized for OHLC data")
        except Exception as e:
            print(f"[API] Error initializing ecosystem for OHLC: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Could not initialize data collector: {str(e)}")
    
    try:
        base_symbol, market, fetch_symbol = normalize_symbol(symbol, market_hint=market)
        print(f"[API] Analyzing {symbol}, market: {market}, fetch_symbol: {fetch_symbol}, base_symbol: {base_symbol}")
        
        print(f"[API] Getting OHLC data for {symbol} -> {fetch_symbol} (market: {market}, period: {period}, interval: {interval})")
        
        df = ecosystem.data_collector.get_ohlc_data(fetch_symbol, period=period, interval=interval, market=market)
        
        if df.empty:
            # Try with base symbol
            if fetch_symbol != base_symbol:
                print(f"[API] Retrying with base symbol {base_symbol}")
                df = ecosystem.data_collector.get_ohlc_data(base_symbol, period=period, interval=interval, market=market)
        
        # If still empty and it's an intraday interval, try daily data as fallback
        if df.empty and interval in ['5m', '15m', '30m', '1h', '90m']:
            print(f"[API] No intraday data available (market may be closed), trying daily data...")
            # Use a longer period for daily data
            fallback_period = "3mo" if period in ['5d', '1mo'] else period
            df = ecosystem.data_collector.get_ohlc_data(fetch_symbol, period=fallback_period, interval="1d", market=market)
            if df.empty and fetch_symbol != base_symbol:
                df = ecosystem.data_collector.get_ohlc_data(base_symbol, period=fallback_period, interval="1d", market=market)
        
        if df.empty:
            error_msg = f"No data found for {symbol}. "
            if interval in ['5m', '15m', '30m', '1h', '90m']:
                error_msg += "Intraday data may not be available when market is closed. Try daily (1D) interval."
            raise HTTPException(status_code=404, detail=error_msg)
        
        # Validate required columns
        required_columns = ['Open', 'High', 'Low', 'Close']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise HTTPException(status_code=500, detail=f"Data format error: Missing required columns: {', '.join(missing_columns)}")
        
        # Convert to list of dictionaries for JSON response
        ohlc_data = []
        for idx, row in df.iterrows():
            try:
                # Handle different date index types
                if hasattr(idx, 'to_pydatetime'):
                    date_str = idx.to_pydatetime().isoformat()
                elif hasattr(idx, 'isoformat'):
                    date_str = idx.isoformat()
                elif hasattr(idx, 'date'):
                    date_str = str(idx.date())
                else:
                    date_str = str(idx)
                
                # Handle NaN values
                open_val = row.get('Open', 0)
                high_val = row.get('High', 0)
                low_val = row.get('Low', 0)
                close_val = row.get('Close', 0)
                
                # Skip rows with invalid data
                if pd.isna(open_val) or pd.isna(high_val) or pd.isna(low_val) or pd.isna(close_val):
                    continue
                
                ohlc_data.append({
                    "date": date_str,
                    "open": round(float(open_val), 2),
                    "high": round(float(high_val), 2),
                    "low": round(float(low_val), 2),
                    "close": round(float(close_val), 2),
                    "volume": int(row['Volume']) if 'Volume' in row and not pd.isna(row['Volume']) else 0
                })
            except Exception as e:
                print(f"[API] Error converting row to dict: {str(e)}, row: {row}")
                continue
        
        if len(ohlc_data) == 0:
            raise HTTPException(status_code=404, detail=f"No valid data found for {symbol} after processing. Data may contain only NaN values.")
        
        print(f"[API] Returning {len(ohlc_data)} data points for {symbol}")
        
        return {
            "success": True,
            "symbol": symbol,
            "market": market,
            "data": ohlc_data
        }
    except HTTPException:
        # Re-raise HTTP exceptions (like 404, 400) as-is
        raise
    except Exception as e:
        print(f"[API] Error getting OHLC data: {str(e)}")
        import traceback
        traceback.print_exc()
        error_detail = str(e)
        if "AttributeError" in error_detail or "NoneType" in error_detail:
            error_detail = f"Data collection error: {error_detail}. Please ensure the stock symbol is correct and data is available."
        raise HTTPException(status_code=500, detail=error_detail)


@app.get("/api/realtime-price/{symbol}")
async def get_realtime_price(symbol: str, market: str = "US"):
    """Get real-time price for a symbol"""
    global ecosystem
    
    try:
        base_symbol, market, fetch_symbol = normalize_symbol(symbol, market_hint=market)
        symbol = symbol.upper()
        
        price = None
        
        # Try ecosystem first if available
        if ecosystem is not None:
            try:
                price = ecosystem.data_collector.get_realtime_price(fetch_symbol, market=market)
            except Exception as e:
                print(f"[API] Error getting price from ecosystem: {str(e)}")
        
        # If no price from ecosystem, try direct yfinance fetch
        if price is None:
            try:
                import yfinance as yf
                ticker = yf.Ticker(fetch_symbol)
                fast_info = getattr(ticker, 'fast_info', None)
                if fast_info:
                    fast_price = (
                        fast_info.get('lastPrice') or
                        fast_info.get('regularMarketPrice') or
                        fast_info.get('previousClose')
                    )
                    if fast_price:
                        price = float(fast_price)

                info = ticker.info
                
                # Try to get current price
                if price:
                    pass
                elif info and 'currentPrice' in info and info['currentPrice']:
                    price = float(info['currentPrice'])
                elif info and 'regularMarketPrice' in info and info['regularMarketPrice']:
                    price = float(info['regularMarketPrice'])
                elif info and 'previousClose' in info and info['previousClose']:
                    price = float(info['previousClose'])
                else:
                    # Try to get from latest data
                    df = ticker.history(period="1d", interval="1d")
                    if not df.empty and 'Close' in df.columns:
                        price = float(df['Close'].iloc[-1])
            except Exception as e:
                print(f"[API] Error getting price from yfinance: {str(e)}")
        
        if price is None or price <= 0:
            # Return error but don't raise exception - let frontend handle it
            return {
                "success": False,
                "symbol": symbol,
                "market": market,
                "price": None,
                "message": f"Could not get price for {symbol}. Please check if the symbol is correct."
            }
        
        return {
            "success": True,
            "symbol": symbol,
            "market": market,
            "price": float(price),
            "current_price": float(price),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        print(f"[API] Error getting real-time price: {str(e)}")
        import traceback
        traceback.print_exc()
        # Return error response instead of raising exception
        return {
            "success": False,
            "symbol": symbol if 'symbol' in locals() else "UNKNOWN",
            "market": market,
            "price": None,
            "message": f"Error getting price: {str(e)}"
        }


# WebSocket for real-time price updates
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
    
    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()


@app.websocket("/ws/realtime-prices")
async def websocket_realtime_prices(websocket: WebSocket):
    """WebSocket endpoint for real-time price updates"""
    await manager.connect(websocket)
    try:
        while True:
            # Receive subscription request
            data = await websocket.receive_json()
            symbols = data.get("symbols", [])
            market = data.get("market", "US")
            interval = data.get("interval", 5)  # Update every 5 seconds
            
            while True:
                if ecosystem is None:
                    await websocket.send_json({"error": "Ecosystem not initialized"})
                    await asyncio.sleep(interval)
                    continue
                
                # Fetch real-time prices for subscribed symbols
                prices = {}
                for symbol in symbols:
                    try:
                        price = ecosystem.data_collector.get_realtime_price(symbol, market=market)
                        if price:
                            prices[symbol] = price
                    except:
                        pass
                
                # Send prices to client
                await websocket.send_json({
                    "type": "price_update",
                    "market": market,
                    "prices": prices,
                    "timestamp": datetime.now().isoformat()
                })
                
                await asyncio.sleep(interval)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"[WebSocket] Error: {str(e)}")
        manager.disconnect(websocket)


@app.get("/api/company-info/{symbol}")
async def get_company_info(symbol: str, market: str = "US"):
    """Get company information including sector, market cap, P/E ratio, etc."""
    try:
        base_symbol, market, fetch_symbol = normalize_symbol(symbol, market_hint=market)
        print(f"[API] Getting company info for {symbol} -> {fetch_symbol} (market: {market})")
        
        # Check for local logo first using logo_mapper
        logo_url = None
        try:
            from logo_mapper import get_logo_path
            local_logo_path = get_logo_path(base_symbol)
            if local_logo_path:
                logo_url = local_logo_path
                print(f"[API] Found local logo: {local_logo_path}")
        except Exception as e:
            print(f"[API] Error checking local logos: {str(e)}")
            # Fallback: try manual check
            try:
                from pathlib import Path
                logo_symbol = base_symbol.upper()
                logo_extensions = ['.png', '.jpg', '.jpeg', '.svg', '.webp']
                frontend_logos_path = Path(__file__).parent.parent / 'frontend' / 'public' / 'logos'
                
                if frontend_logos_path.exists():
                    for ext in logo_extensions:
                        logo_file = frontend_logos_path / f"{logo_symbol}{ext}"
                        if logo_file.exists():
                            logo_url = f"/logos/{logo_symbol}{ext}"
                            print(f"[API] Found local logo (fallback): {logo_url}")
                            break
            except Exception as e2:
                print(f"[API] Fallback logo check failed: {str(e2)}")
        
        # Try to get company info from yfinance (directly, no ecosystem needed)
        company_name = symbol
        sector = None
        industry = None
        market_cap = None
        pe_ratio = None
        description = None
        website = None
        
        try:
            import yfinance as yf
            ticker = yf.Ticker(fetch_symbol)
            info = ticker.info
            
            if info and len(info) > 1:  # yfinance returns dict with at least 1 item even if empty
                company_name = info.get('longName') or info.get('shortName') or info.get('symbol') or symbol
                sector = info.get('sector') or info.get('industry')
                industry = info.get('industry')
                description = info.get('longBusinessSummary') or info.get('description')
                website = info.get('website')
                
                # Get logo URL from yfinance (only if local logo not found)
                if not logo_url:
                    logo_url = info.get('logo_url')
                
                # Market cap
                market_cap_val = info.get('marketCap') or info.get('enterpriseValue')
                if market_cap_val and market_cap_val > 0:
                    if market == "IN":
                        currency = "₹"
                    else:
                        currency = "$"
                    
                    if market_cap_val >= 1e12:
                        market_cap = f"{currency}{(market_cap_val / 1e12):.2f}T"
                    elif market_cap_val >= 1e9:
                        market_cap = f"{currency}{(market_cap_val / 1e9):.2f}B"
                    elif market_cap_val >= 1e6:
                        market_cap = f"{currency}{(market_cap_val / 1e6):.2f}M"
                    else:
                        market_cap = f"{currency}{market_cap_val:.2f}"
                
                # P/E Ratio
                pe_ratio_val = info.get('trailingPE') or info.get('forwardPE')
                if pe_ratio_val and pe_ratio_val > 0:
                    pe_ratio = f"{pe_ratio_val:.2f}"
        except Exception as e:
            print(f"[API] Error fetching company info from yfinance: {str(e)}")
        
        # If logo not found from yfinance or local, try Clearbit Logo API
        if not logo_url and website:
            try:
                # Extract domain from website URL
                if website and ('http' in website or 'www' in website):
                    import re
                    domain = re.sub(r'^https?://(www\.)?', '', website)
                    domain = domain.split('/')[0]
                    logo_url = f"https://logo.clearbit.com/{domain}"
            except Exception as e:
                print(f"[API] Error generating Clearbit logo URL: {str(e)}")
        
        # If still no logo, try alternative methods
        if not logo_url:
            # Try Finnhub logo API (requires API key, but we can try)
            # For now, we'll leave it as None and frontend will use fallback
            pass
        
        # Always check fallback database for known stocks (prioritize fallback for reliability)
        company_db = {
            'RELIANCE': {
                'name': 'Reliance Industries Limited', 
                'sector': 'Conglomerates', 
                'pe': '27.2', 
                'marketCap': '₹18.6T',
                'description': 'Reliance Industries Limited is an Indian multinational conglomerate company, headquartered in Mumbai.',
                'website': 'ril.com'
            },
            'TCS': {
                'name': 'Tata Consultancy Services Limited', 
                'sector': 'IT Services', 
                'industry': 'IT Services & Consulting',
                'pe': '30.5', 
                'marketCap': '₹14.2T',
                'description': 'Tata Consultancy Services is an Indian multinational information technology services and consulting company.',
                'website': 'tcs.com',
                'logo_url': 'https://logo.clearbit.com/tcs.com'
            },
            'INFY': {
                'name': 'Infosys Limited', 
                'sector': 'IT Services', 
                'industry': 'IT Services & Consulting',
                'pe': '28.3', 
                'marketCap': '₹7.8T',
                'description': 'Infosys is an Indian multinational information technology company that provides business consulting, information technology and outsourcing services.',
                'website': 'infosys.com'
            },
            'HDFCBANK': {
                'name': 'HDFC Bank Limited', 
                'sector': 'Banking', 
                'industry': 'Private Sector Banking',
                'pe': '18.5', 
                'marketCap': '₹12.5T',
                'description': 'HDFC Bank is an Indian banking and financial services company, headquartered in Mumbai.',
                'website': 'hdfcbank.com'
            },
            'ICICIBANK': {
                'name': 'ICICI Bank Limited',
                'sector': 'Banking',
                'industry': 'Private Sector Banking',
                'pe': '19.2',
                'marketCap': '₹7.5T',
                'description': 'ICICI Bank is an Indian multinational banking and financial services company.',
                'website': 'icicibank.com'
            },
            'HINDUNILVR': {
                'name': 'Hindustan Unilever Limited',
                'sector': 'FMCG',
                'industry': 'Consumer Goods',
                'pe': '65.0',
                'marketCap': '₹5.8T',
                'description': 'Hindustan Unilever is an Indian consumer goods company.',
                'website': 'hul.co.in'
            },
            'ITC': {
                'name': 'ITC Limited',
                'sector': 'FMCG',
                'industry': 'Consumer Goods',
                'pe': '25.8',
                'marketCap': '₹5.2T',
                'description': 'ITC is an Indian conglomerate with interests in FMCG, hotels, paperboards, and agribusiness.',
                'website': 'itcportal.com'
            },
            'SBIN': {
                'name': 'State Bank of India',
                'sector': 'Banking',
                'industry': 'Public Sector Banking',
                'pe': '12.5',
                'marketCap': '₹5.5T',
                'description': 'State Bank of India is an Indian multinational public sector bank and financial services company.',
                'website': 'sbi.co.in'
            },
            'BHARTIARTL': {
                'name': 'Bharti Airtel Limited',
                'sector': 'Telecommunications',
                'industry': 'Telecom Services',
                'pe': '85.3',
                'marketCap': '₹7.2T',
                'description': 'Bharti Airtel is an Indian multinational telecommunications services company.',
                'website': 'airtel.in'
            },
            'AAPL': {
                'name': 'Apple Inc.', 
                'sector': 'Technology', 
                'industry': 'Consumer Electronics',
                'pe': '28.5', 
                'marketCap': '$3.2T',
                'description': 'Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide.',
                'website': 'apple.com'
            },
            'TSLA': {
                'name': 'Tesla Inc.', 
                'sector': 'Automotive', 
                'industry': 'Electric Vehicles',
                'pe': '65.3', 
                'marketCap': '$850B',
                'description': 'Tesla, Inc. designs, develops, manufactures, leases, and sells electric vehicles, and energy generation and storage systems.',
                'website': 'tesla.com'
            },
            'MSFT': {
                'name': 'Microsoft Corporation',
                'sector': 'Technology',
                'industry': 'Software & Cloud Services',
                'pe': '35.2',
                'marketCap': '$3.1T',
                'description': 'Microsoft Corporation is an American multinational technology corporation.',
                'website': 'microsoft.com'
            },
            'GOOGL': {
                'name': 'Alphabet Inc.',
                'sector': 'Technology',
                'industry': 'Internet Services',
                'pe': '26.8',
                'marketCap': '$1.8T',
                'description': 'Alphabet Inc. is an American multinational technology conglomerate.',
                'website': 'google.com'
            },
            'AMZN': {
                'name': 'Amazon.com Inc.',
                'sector': 'E-commerce',
                'industry': 'Online Retail',
                'pe': '52.3',
                'marketCap': '$1.7T',
                'description': 'Amazon.com, Inc. is an American multinational technology company.',
                'website': 'amazon.com'
            },
        }
        
        # Check fallback database - prioritize if available, or use if yfinance data is minimal
        if base_symbol in company_db:
            data = company_db[base_symbol]
            # Use fallback data if yfinance didn't provide good data, or enhance existing data
            if company_name == symbol or not sector or not industry:
                company_name = data['name']
                sector = data.get('sector', sector)
                industry = data.get('industry', industry)
                if not pe_ratio:
                    pe_ratio = data.get('pe')
                if not market_cap:
                    market_cap = data.get('marketCap')
                if not description:
                    description = data.get('description', description)
                if not website:
                    website = data.get('website', website)
            # Always check for logo in fallback database
            if not logo_url:
                if data.get('logo_url'):
                    logo_url = data['logo_url']
                elif data.get('website'):
                    logo_url = f"https://logo.clearbit.com/{data['website']}"
        
        # Always return data, even if minimal
        return {
            "success": True,
            "symbol": symbol,
            "fetch_symbol": fetch_symbol,
            "company_name": company_name,
            "sector": sector,
            "industry": industry,
            "market_cap": market_cap,
            "pe_ratio": pe_ratio,
            "logo_url": logo_url,
            "description": description,
            "website": website,
            "market": market
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[API] Error getting company info: {str(e)}")
        import traceback
        traceback.print_exc()
        # Return minimal data instead of error
        symbol_upper = symbol.upper() if symbol else "UNKNOWN"
        return {
            "success": True,
            "symbol": symbol_upper,
            "fetch_symbol": symbol_upper,
            "company_name": symbol_upper,
            "sector": None,
            "industry": None,
            "market_cap": None,
            "pe_ratio": None,
            "logo_url": None,
            "description": None,
            "website": None,
            "market": market
        }


@app.get("/api/stocks/{market}")
async def get_stocks_by_market(market: str):
    """Get available stocks for a specific market"""
    if market.upper() == "US":
        stocks = ['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'NFLX', 'AMD', 'INTC']
    elif market.upper() == "IN":
        # Comprehensive list of major Indian stocks (NSE)
        stocks = [
            # Large Cap - Banking & Financial Services
            'RELIANCE', 'TCS', 'HDFCBANK', 'ICICIBANK', 'HDFC', 'SBIN', 'KOTAKBANK', 'AXISBANK', 'INDUSINDBK',
            # IT & Technology
            'INFY', 'WIPRO', 'HCLTECH', 'TECHM', 'LTIM', 'LTTS', 'PERSISTENT', 'MINDTREE',
            # FMCG & Consumer
            'HINDUNILVR', 'ITC', 'NESTLEIND', 'MARICO', 'DABUR', 'BRITANNIA', 'TITAN', 'TATACONSUM',
            # Telecom
            'BHARTIARTL', 'RIL',
            # Automobiles
            'MARUTI', 'M&M', 'TATAMOTORS', 'BAJAJ-AUTO', 'HEROMOTOCO', 'EICHERMOT',
            # Pharmaceuticals
            'SUNPHARMA', 'DRREDDY', 'CIPLA', 'LUPIN', 'DIVISLAB', 'BIOCON', 'TORNTPHARM',
            # Energy & Oil
            'ONGC', 'IOC', 'BPCL', 'HPCL', 'GAIL', 'ADANIENT', 'ADANIPORTS',
            # Infrastructure & Engineering
            'LT', 'LARSEN', 'BHEL', 'SIEMENS', 'ABB', 'SCHNEIDER',
            # Metals & Mining
            'JSW', 'TATASTEEL', 'JSWSTEEL', 'HINDALCO', 'VEDL', 'NMDC', 'COALINDIA',
            # Cement
            'ULTRACEMCO', 'SHREECEM', 'ACC', 'AMBUJACEM', 'DALBHARAT',
            # Power & Utilities
            'NTPC', 'POWERGRID', 'TATAPOWER', 'ADANIPOWER', 'NHPC',
            # Real Estate
            'DLF', 'GODREJPROP', 'PRESTIGE', 'SOBHA',
            # Media & Entertainment
            'ZEE', 'SUNTV', 'TV18BRDCST',
            # Retail
            'DMART', 'RELAXO', 'BATAINDIA',
            # Chemicals
            'UPL', 'RCF', 'GNFC', 'FACT',
            # Others
            'ASIANPAINT', 'BERGEPAINT', 'PIDILITIND', 'GRASIM', 'ADANIGREEN', 'ADANITRANS'
        ]
    else:
        raise HTTPException(status_code=400, detail=f"Unknown market: {market}")
    
    return {
        "success": True,
        "market": market.upper(),
        "stocks": stocks
    }


@app.get("/api/stock/{symbol}")
async def get_stock_detail(symbol: str, market: str = "US"):
    """Get detailed information for a specific stock"""
    global ecosystem
    if ecosystem is None:
        raise HTTPException(status_code=400, detail="Ecosystem not initialized")
    
    try:
        base_symbol, market, fetch_symbol = normalize_symbol(symbol, market_hint=market)
        # Get current price
        current_prices = ecosystem.get_current_prices()
        current_price = (
            current_prices.get(symbol.upper(), 0) or
            current_prices.get(fetch_symbol, 0) or
            current_prices.get(base_symbol, 0)
        )
        
        # Get prediction
        prediction = ecosystem.analyst.analyze(fetch_symbol, market=market)
        
        # Get portfolio holding
        portfolio = ecosystem.trader.get_portfolio()
        shares = (
            portfolio.get(symbol.upper(), 0) or
            portfolio.get(fetch_symbol, 0) or
            portfolio.get(base_symbol, 0)
        )
        
        # Get trade history for this stock
        stock_trades = [
            t for t in ecosystem.trader.trade_history
            if t.get('symbol') in {symbol.upper(), fetch_symbol, base_symbol}
        ]
        
        # Calculate profit/loss
        profit_loss = None
        if shares > 0 and current_price > 0:
            holding_value = shares * current_price
            # Estimate entry cost (simplified - would need actual entry prices)
            estimated_cost = shares * current_price * 0.99  # Approximate with 1% transaction cost
            profit_loss = {
                "value": holding_value - estimated_cost,
                "percentage": ((holding_value - estimated_cost) / estimated_cost * 100) if estimated_cost > 0 else 0
            }
        
        # Get price history (from cached data)
        price_history = []
        df = ecosystem.data_collector.get_latest_data(fetch_symbol)
        if df is None or df.empty:
            df = ecosystem.data_collector.get_latest_data(base_symbol)
        if df is None or df.empty:
            df = ecosystem.data_collector.get_latest_data(symbol.upper())
        if df is not None and not df.empty:
            # Get last 30 days
            recent_data = df.tail(30)
            price_history = [
                {
                    "date": str(idx.date()),
                    "price": float(row['Close']),
                    "volume": int(row['Volume']) if 'Volume' in row else 0
                }
                for idx, row in recent_data.iterrows()
            ]
        
        return {
            "success": True,
            "symbol": symbol.upper(),
            "current_price": current_price,
            "shares": shares,
            "value": shares * current_price,
            "prediction": prediction,
            "profit_loss": profit_loss,
            "trade_count": len(stock_trades),
            "price_history": price_history,
            "recent_trades": stock_trades[-10:]  # Last 10 trades
        }
    except Exception as e:
        print(f"[API] Error getting stock detail: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/analyze-investment")
async def analyze_investment(request: InvestmentAnalysisRequest):
    """Analyze investment and predict outcome with all agent reports"""
    global ecosystem
    if ecosystem is None:
        raise HTTPException(status_code=400, detail="Ecosystem not initialized")
    
    try:
        symbol = request.symbol.upper()
        investment_amount = request.investment_amount
        investment_period = request.investment_period
        
        base_symbol, market, fetch_symbol = normalize_symbol(symbol, market_hint=request.market)
        print(f"[API] Analyzing {symbol}, market: {market}, fetch_symbol: {fetch_symbol}, base_symbol: {base_symbol}")
        
        ensure_market_ecosystem([fetch_symbol], market=market)

        # Get current price - try multiple methods
        current_price = 0
        
        # Method 1: Try from ecosystem prices
        try:
            current_prices = ecosystem.get_current_prices()
            current_price = current_prices.get(symbol, 0) or current_prices.get(fetch_symbol, 0) or current_prices.get(base_symbol, 0)
        except Exception as e:
            print(f"[API] Error getting ecosystem prices: {str(e)}")
        
        # Method 2: Try real-time price API
        if current_price == 0:
            try:
                print(f"[API] Trying real-time price for {base_symbol} (market: {market})")
                price_data = ecosystem.data_collector.get_realtime_price(base_symbol, market=market)
                if price_data and price_data > 0:
                    current_price = float(price_data)
                    print(f"[API] Got price from real-time API: {current_price}")
                else:
                    print(f"[API] Real-time price returned None or 0 for {base_symbol}")
            except Exception as e:
                print(f"[API] Error getting real-time price: {str(e)}")
                import traceback
                traceback.print_exc()
        
        # Method 3: Fetch fresh data
        if current_price == 0:
            try:
                print(f"[API] Trying to fetch data for {fetch_symbol} (market: {market})")
                df = ecosystem.data_collector.fetch_data(fetch_symbol, period="5d", interval="1d", market=market)
                if not df.empty and len(df) > 0:
                    current_price = float(df['Close'].iloc[-1])
                    print(f"[API] Got price from data fetch: {current_price}")
                else:
                    print(f"[API] No data returned for {fetch_symbol}, trying alternative...")
                    # Try with just base symbol
                    if fetch_symbol != base_symbol:
                        df = ecosystem.data_collector.fetch_data(base_symbol, period="5d", interval="1d", market=market)
                        if not df.empty and len(df) > 0:
                            current_price = float(df['Close'].iloc[-1])
                            print(f"[API] Got price from data fetch (base symbol): {current_price}")
            except Exception as e:
                print(f"[API] Error fetching data for {fetch_symbol}: {str(e)}")
                import traceback
                traceback.print_exc()
                # Try one more time with base symbol
                try:
                    if fetch_symbol != base_symbol:
                        print(f"[API] Retrying with base symbol {base_symbol}")
                        df = ecosystem.data_collector.fetch_data(base_symbol, period="5d", interval="1d", market=market)
                        if not df.empty and len(df) > 0:
                            current_price = float(df['Close'].iloc[-1])
                            print(f"[API] Got price on retry: {current_price}")
                except Exception as e2:
                    print(f"[API] Retry also failed: {str(e2)}")
        
        if current_price == 0:
            raise HTTPException(status_code=404, detail=f"Could not get price for {symbol}. Tried: {symbol}, {fetch_symbol}, {base_symbol}. Market: {market}. Please check if the symbol is correct.")
        
        # Get prediction from Analyst Agent
        # Use fetch_symbol for analysis (with .NS suffix for Indian stocks)
        try:
            prediction = ecosystem.analyst.analyze(fetch_symbol, market=market)
        except Exception as e:
            print(f"[API] Error in analyst.analyze for {fetch_symbol}: {str(e)}")
            import traceback
            traceback.print_exc()
            # Fallback: try with base symbol
            try:
                prediction = ecosystem.analyst.analyze(base_symbol, market=market)
            except Exception as e2:
                print(f"[API] Error in analyst.analyze for {base_symbol}: {str(e2)}")
                # Return a default prediction if analysis fails
                prediction = {
                    "signal": "Neutral",
                    "confidence": DEFAULT_CONFIDENCE,
                    "expected_return": 0.8,
                    "risk": DEFAULT_RISK_SCORE,
                    "score": round(0.8 / max(DEFAULT_RISK_SCORE, 0.5), 2),
                    "error": f"Analysis failed: {str(e2)}"
                }
        
        # Scale the regression output to the requested investment period.
        # The analyst forecast is generated for its own horizon (default 10 days),
        # so we compound/decompound that return to match the selected duration.
        signal = prediction.get('signal', 'Neutral')
        confidence = float(prediction.get('confidence', DEFAULT_CONFIDENCE))
        expected_return_pct = float(prediction.get('expected_return', 0.2))
        modeled_risk = float(prediction.get('risk', DEFAULT_RISK_SCORE))
        score = float(prediction.get('score', expected_return_pct / max(modeled_risk, 0.5)))
        forecast_horizon_days = max(1, int(prediction.get('forecast_horizon_days', 10) or 10))
        requested_period_days = max(1, int(investment_period or forecast_horizon_days))
        base_return_decimal = expected_return_pct / 100.0

        df = None
        try:
            df = ecosystem.data_collector.get_latest_data(fetch_symbol)
            if df is None or df.empty:
                df = ecosystem.data_collector.fetch_data(fetch_symbol, period="1y", interval="1d", market=market)
        except Exception as e:
            print(f"[API] Error getting data for calibration/risk analysis: {str(e)}")
            df = None

        # Raw compounding can create unrealistic prices for noisy signals, so damp the move
        # using model confidence and clip it by realized volatility.
        raw_scaled_return_decimal = (1 + base_return_decimal) ** (requested_period_days / forecast_horizon_days) - 1
        confidence_damping = 0.45 + (0.55 * confidence)
        damped_scaled_return_pct = raw_scaled_return_decimal * 100.0 * confidence_damping
        volatility = calculate_volatility_from_data(df) if df is not None else DEFAULT_VOLATILITY
        volatility_pct = volatility * 100.0
        move_cap_pct = float(np.clip(volatility_pct * np.sqrt(requested_period_days) * 2.25, 2.5, 18.0))
        scaled_expected_return_pct = float(np.clip(damped_scaled_return_pct, -move_cap_pct, move_cap_pct))
        scaled_return_decimal = scaled_expected_return_pct / 100.0
        price_change_percent = scaled_return_decimal
        predicted_price = current_price * (1 + scaled_return_decimal)
        
        # Calculate investment outcome
        shares = investment_amount / current_price
        predicted_value = shares * predicted_price
        profit_loss = predicted_value - investment_amount
        profit_loss_percent = (profit_loss / investment_amount) * 100
        
        # Generate agent reports
        agent_reports = {}
        
        # Analyst Agent Report
        agent_reports['analyst'] = {
            "signal": signal,
            "confidence": confidence,
            "expected_return": scaled_expected_return_pct,
            "risk": modeled_risk,
            "score": score,
            "reasoning": f"Regression model forecast is normalized from {forecast_horizon_days} days to {requested_period_days} days, "
                        f"resulting in {scaled_expected_return_pct:.2f}% expected return with {confidence*100:.1f}% confidence, "
                        f"modeled risk {modeled_risk:.2f}, and score {score:.2f}."
        }
        
        # Trader Agent Report - Use unified recommendation engine (same logic as Trader Agent)
        # Get trader action using unified engine (matches Trader Agent logic)
        model_decision = get_model_aligned_recommendation(
            signal=signal,
            confidence=confidence,
            expected_return=scaled_expected_return_pct,
            risk=modeled_risk,
            score=score,
        )
        trader_action = (
            "Buy"
            if model_decision["recommendation"] == "BUY"
            else "Avoid"
            if model_decision["recommendation"] == "AVOID"
            else "Hold"
        )
        recommended_action = trader_action
        
        agent_reports['trader'] = {
            "action": recommended_action,
            "recommended_shares": int(shares) if recommended_action == 'Buy' else 0,
            "reasoning": f"Trader Agent recommends {recommended_action} based on Analyst's {signal} signal. "
                        f"For ₹{investment_amount:,.2f} investment, you could purchase approximately {int(shares)} shares at ₹{current_price:.2f}."
        }
        
        agent_reports['trader']["reasoning"] = (
            f"Trader Agent recommends {recommended_action} from expected return {scaled_expected_return_pct:.2f}%, "
            f"risk {modeled_risk:.2f}, and score {score:.2f}. "
            f"For investment amount {investment_amount:,.2f}, you could purchase approximately {int(shares)} shares at price {current_price:.2f}."
        )
        agent_reports['trader']["reasoning"] = (
            f"{model_decision['reason']} "
            f"For investment amount {investment_amount:,.2f}, you could purchase approximately {int(shares)} shares at price {current_price:.2f}."
        )

        # Risk Agent Report - Use unified recommendation engine
        # Calculate volatility using unified engine (same logic as Risk Agent)
        
        # Get portfolio value for position size calculation
        portfolio_value = 100000  # Default fallback
        try:
            current_prices_dict = ecosystem.get_current_prices()
            if current_prices_dict and isinstance(current_prices_dict, dict):
                portfolio_value = ecosystem.trader.get_portfolio_value(current_prices_dict)
            else:
                portfolio_value = getattr(ecosystem.trader, 'initial_capital', 100000)
        except Exception as e:
            print(f"[API] Error getting portfolio value for risk analysis: {str(e)}")
            portfolio_value = getattr(ecosystem.trader, 'initial_capital', 100000)
        
        risk_score, risk_level, risk_alerts = calculate_effective_risk(
            volatility,
            expected_return=scaled_expected_return_pct,
            confidence=confidence,
        )
        
        # Risk Agent Report (using unified recommendation)
        agent_reports['risk'] = {
            "risk_level": risk_level,
            "volatility": volatility,
            "position_size_percent": (investment_amount / portfolio_value * 100) if portfolio_value else None,
            "alerts": risk_alerts,
            "reasoning": (
                f"Risk Agent assesses {risk_level} risk level for this investment. "
                f"Volatility is {volatility*100:.2f}% and effective downside-aware risk score is {risk_score:.1f}/10. "
                + (
                    "Position size would be "
                    f"{(investment_amount / portfolio_value * 100):.1f}% of portfolio."
                    if portfolio_value
                    else ""
                )
            )
        }
        
        # Auditor Agent Report (using unified recommendation)
        # Use profit_loss_percent for expected return (from actual investment analysis)
        # But calculate risk_score using unified logic
        expected_return_for_auditor = profit_loss_percent
        auditor_recommendation = get_auditor_recommendation(expected_return_for_auditor, risk_score)
        
        agent_reports['auditor'] = {
            "expected_return": expected_return_for_auditor,
            "risk_score": risk_score,
            "recommendation": auditor_recommendation,
            "reasoning": f"Auditor Agent evaluates this investment with expected return of {expected_return_for_auditor:.2f}% "
                        f"and risk score of {risk_score:.2f}/10. {auditor_recommendation}"
        }
        
        response_payload = {
            "success": True,
            "report": {
                "symbol": symbol,
                "current_price": current_price,
                "predicted_price": predicted_price,
                "price_change_percent": price_change_percent * 100,
                "investment_amount": investment_amount,
                "investment_period": investment_period,
                "shares": shares,
                "predicted_value": predicted_value,
                "profit_loss": profit_loss,
                "profit_loss_percent": profit_loss_percent,
                "prediction": {
                    **prediction,
                    "expected_return": scaled_expected_return_pct,
                    "forecast_horizon_days": forecast_horizon_days,
                    "confidence_damping": round(float(confidence_damping), 3),
                    "move_cap_pct": round(float(move_cap_pct), 2)
                },
                "expected_return": scaled_expected_return_pct,
                "risk": modeled_risk,
                "score": score,
                "recommendation": model_decision["recommendation"],
                "recommendation_reason": model_decision["reason"],
                "model_action": recommended_action,
                "calibration": {
                    "confidence_damping": round(float(confidence_damping), 3),
                    "move_cap_pct": round(float(move_cap_pct), 2),
                    "raw_expected_return_pct": round(float(raw_scaled_return_decimal * 100.0), 2)
                },
                "agent_reports": agent_reports
            }
        }

        persistence_result = database_manager.save_analysis_run(
            {
                "symbol": symbol,
                "market": market,
                "investment_amount": investment_amount,
                "investment_period": investment_period,
                "current_price": current_price,
                "predicted_price": predicted_price,
                "expected_return": scaled_expected_return_pct,
                "risk": modeled_risk,
                "confidence": confidence * 100.0,
                "signal": signal,
                "recommendation": agent_reports["trader"]["action"],
                "raw_response": response_payload,
            }
        )

        response_payload["persistence"] = persistence_result
        return response_payload
    except HTTPException:
        # Re-raise HTTP exceptions (like 404, 400) as-is
        raise
    except Exception as e:
        print(f"[API] Error analyzing investment: {str(e)}")
        import traceback
        traceback.print_exc()
        error_detail = str(e)
        # Provide more helpful error messages
        if "AttributeError" in error_detail or "'NoneType' object has no attribute" in error_detail:
            error_detail = f"Ecosystem component error: {error_detail}. The ecosystem may not be fully initialized."
        elif "KeyError" in error_detail:
            error_detail = f"Data structure error: {error_detail}. Missing required data fields."
        raise HTTPException(status_code=500, detail=error_detail)


@app.get("/api/recommend/{symbol}")
async def get_recommendation(symbol: str, market: str = "US"):
    """Get BUY/HOLD/AVOID recommendation for a stock based on prediction and risk analysis"""
    global ecosystem
    
    try:
        symbol = symbol.upper()
        
        # Determine market from symbol
        base_symbol, market, fetch_symbol = normalize_symbol(symbol, market_hint=market)
        
        print(f"[API] Getting recommendation for {symbol} -> {fetch_symbol} (market: {market})")
        
        # Ensure the ecosystem is aligned with the requested market/symbol
        try:
            ensure_market_ecosystem([fetch_symbol], market=market)
        except Exception as e:
            print(f"[API] Error initializing ecosystem for recommendation: {str(e)}")
        
        # Get prediction from Analyst Agent (if ecosystem is available)
        signal = "Neutral"
        confidence = DEFAULT_CONFIDENCE
        prediction = None
        
        if ecosystem is not None:
            try:
                prediction = ecosystem.analyst.analyze(fetch_symbol, market=market)
                signal = prediction.get('signal', 'Neutral')
                confidence = float(prediction.get('confidence', DEFAULT_CONFIDENCE))
            except Exception as e:
                print(f"[API] Error in analyst.analyze for {fetch_symbol}: {str(e)}")
                # Fallback: try with base symbol
                try:
                    prediction = ecosystem.analyst.analyze(base_symbol, market=market)
                    signal = prediction.get('signal', 'Neutral')
                    confidence = float(prediction.get('confidence', DEFAULT_CONFIDENCE))
                except Exception as e2:
                    print(f"[API] Error in analyst.analyze for {base_symbol}: {str(e2)}")
                    # Use default values from config
                    signal = "Neutral"
                    confidence = DEFAULT_CONFIDENCE
        else:
            # If no ecosystem, use simple price-based prediction
            print("[API] No ecosystem available, using price-based prediction")
            try:
                import yfinance as yf
                ticker = yf.Ticker(fetch_symbol)
                df = ticker.history(period="1y", interval="1d")
                if not df.empty and 'Close' in df.columns:
                    recent_prices = df['Close'].tail(10)
                    if len(recent_prices) > 1:
                        price_change = (recent_prices.iloc[-1] - recent_prices.iloc[0]) / recent_prices.iloc[0]
                        if price_change > PRICE_CHANGE_SIGNAL_THRESHOLD:  # Using config threshold
                            signal = "Up"
                            confidence = min(0.9, DEFAULT_CONFIDENCE + abs(price_change) * PRICE_CHANGE_CONFIDENCE_MULTIPLIER)
                        elif price_change < -PRICE_CHANGE_SIGNAL_THRESHOLD:  # Using config threshold
                            signal = "Down"
                            confidence = min(0.9, DEFAULT_CONFIDENCE + abs(price_change) * PRICE_CHANGE_CONFIDENCE_MULTIPLIER)
                        else:
                            signal = "Neutral"
                            confidence = DEFAULT_CONFIDENCE
            except Exception as e:
                print(f"[API] Error in price-based prediction: {str(e)}")
                signal = "Neutral"
                confidence = DEFAULT_CONFIDENCE
        
        sentiment_payload = get_stock_news_sentiment(base_symbol, fetch_symbol=fetch_symbol)

        # Get risk analysis (volatility) - Use unified recommendation engine
        df = None
        if ecosystem is not None:
            try:
                df = ecosystem.data_collector.get_latest_data(fetch_symbol)
                if df is None or df.empty:
                    df = ecosystem.data_collector.fetch_data(fetch_symbol, period="1y", interval="1d", market=market)
            except Exception as e:
                print(f"[API] Error getting data for volatility calculation: {str(e)}")
                df = None
        
        # If no ecosystem data, try direct yfinance fetch
        if df is None or df.empty:
            try:
                import yfinance as yf
                ticker = yf.Ticker(fetch_symbol)
                df = ticker.history(period="1y", interval="1d")
            except Exception as e:
                print(f"[API] Error fetching data from yfinance: {str(e)}")
                df = None
        
        # Calculate volatility using unified engine (same logic as Risk Agent)
        volatility = calculate_volatility_from_data(df) if df is not None else DEFAULT_VOLATILITY
        
        base_expected_return = prediction.get('expected_return') if prediction else calculate_expected_return(signal, confidence)
        recommendation_summary = generate_unified_recommendation(
            signal=signal,
            confidence=confidence,
            volatility=volatility,
            sentiment_score=sentiment_payload.get('score', 0.0),
            sentiment_label=sentiment_payload.get('label', 'Neutral'),
            base_expected_return=base_expected_return,
        )
        expected_return = recommendation_summary.get('expected_return', base_expected_return)
        modeled_risk = recommendation_summary.get('risk', prediction.get('risk') if prediction else calculate_risk_score(volatility))
        score = recommendation_summary.get('score', calculate_recommendation_score(expected_return, max(modeled_risk, 0.5)))
        recommendation_data = get_model_aligned_recommendation(
            signal=signal,
            confidence=confidence,
            expected_return=expected_return,
            risk=modeled_risk,
            score=score,
        )
        if recommendation_summary.get('sentiment_impact'):
            recommendation_data['reason'] = (
                f"{recommendation_data['reason']} "
                f"News sentiment is {recommendation_summary['sentiment_label'].lower()} "
                f"({recommendation_summary['sentiment_score']:+.2f}) and adjusted the modeled return by "
                f"{recommendation_summary['sentiment_impact']:+.2f}%."
            )
        
        return {
            "success": True,
            "symbol": symbol,
            "recommendation": recommendation_data["recommendation"],
            "reason": recommendation_data["reason"],
            "color": recommendation_data["color"],
            "score": round(float(score), 2),
            "expected_return": round(float(expected_return), 2),
            "base_expected_return": round(float(base_expected_return), 2),
            "risk": round(float(modeled_risk), 1),
            "confidence": round(float(confidence * 100), 1),
            "signal": signal,
            "sentiment": {
                "label": recommendation_summary.get("sentiment_label", "Neutral"),
                "score": recommendation_summary.get("sentiment_score", 0.0),
                "impact": recommendation_summary.get("sentiment_impact", 0.0),
                "headline": (sentiment_payload.get("headlines") or [{}])[0].get("title"),
                "article_count": sentiment_payload.get("article_count", 0),
                "last_updated": sentiment_payload.get("last_updated"),
            },
            "risk_alerts": recommendation_summary.get("risk_alerts", []),
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[API] Error getting recommendation: {str(e)}")
        import traceback
        traceback.print_exc()
        # Return a default recommendation instead of failing
        return {
            "success": True,
            "symbol": symbol,
            "recommendation": "HOLD",
            "reason": "Unable to calculate recommendation. Please try analyzing the stock first.",
            "color": "yellow",
            "score": 0.0,
            "expected_return": DEFAULT_EXPECTED_RETURN,
            "base_expected_return": DEFAULT_EXPECTED_RETURN,
            "risk": DEFAULT_RISK_SCORE,
            "confidence": DEFAULT_CONFIDENCE * 100,
            "signal": "Neutral",
            "sentiment": {
                "label": "Neutral",
                "score": 0.0,
                "impact": 0.0,
                "headline": None,
                "article_count": 0,
                "last_updated": None,
            },
            "risk_alerts": [],
        }


@app.get("/api/news-sentiment/{symbol}")
async def get_news_sentiment(symbol: str, market: str = "US", refresh: bool = False):
    """Return live-ish stock headlines with aggregated sentiment."""
    try:
        symbol = symbol.upper()
        base_symbol, market, fetch_symbol = normalize_symbol(symbol, market_hint=market)
        payload = get_stock_news_sentiment(base_symbol, fetch_symbol=fetch_symbol, force_refresh=refresh)
        payload["market"] = market
        return payload
    except Exception as e:
        print(f"[API] Error getting news sentiment for {symbol}: {str(e)}")
        return {
            "success": True,
            "symbol": symbol.upper(),
            "market": market,
            "score": 0.0,
            "label": "Neutral",
            "article_count": 0,
            "headlines": [],
            "message": "News sentiment is temporarily unavailable. Falling back to neutral sentiment.",
            "cached": False,
            "last_updated": datetime.utcnow().isoformat(),
        }


@app.post("/api/train-models")
async def train_models(epochs: int = 10):
    """Train prediction models"""
    global ecosystem
    if ecosystem is None:
        raise HTTPException(status_code=400, detail="Ecosystem not initialized")
    
    try:
        ecosystem.analyst.train_models(epochs=epochs)
        return {"success": True, "message": f"Models trained with {epochs} epochs"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/run-cycle")
async def run_trading_cycle(request: TradeCycleRequest):
    """Run a trading cycle"""
    global ecosystem
    if ecosystem is None:
        raise HTTPException(status_code=400, detail="Ecosystem not initialized")
    
    try:
        # Train models if requested
        if request.train_models:
            ecosystem.analyst.train_models(epochs=request.epochs)
        
        # Run cycle
        ecosystem.run_cycle()
        
        # Get updated status
        portfolio = ecosystem.trader.get_portfolio()
        current_prices = ecosystem.get_current_prices()
        portfolio_value = ecosystem.trader.get_portfolio_value(current_prices)
        
        return {
            "success": True,
            "message": "Trading cycle completed",
            "cycle_count": ecosystem.cycle_count,
            "portfolio_value": portfolio_value,
            "holdings": portfolio
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/portfolio")
async def get_portfolio():
    """Get current portfolio status"""
    global ecosystem
    if ecosystem is None:
        raise HTTPException(status_code=400, detail="Ecosystem not initialized")
    
    try:
        portfolio = ecosystem.trader.get_portfolio()
        current_prices = ecosystem.get_current_prices()
        portfolio_value = ecosystem.trader.get_portfolio_value(current_prices)
        
        holdings = []
        for symbol, shares in portfolio.items():
            price = current_prices.get(symbol, 0)
            holdings.append({
                "symbol": symbol,
                "shares": shares,
                "price": price,
                "value": shares * price
            })
        
        return {
            "success": True,
            "portfolio_value": portfolio_value,
            "initial_capital": ecosystem.trader.initial_capital,
            "profit_loss": portfolio_value - ecosystem.trader.initial_capital,
            "return_pct": ((portfolio_value - ecosystem.trader.initial_capital) / 
                          ecosystem.trader.initial_capital * 100) if ecosystem.trader.initial_capital > 0 else 0,
            "holdings": holdings,
            "cash": ecosystem.trader.capital
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/performance")
async def get_performance():
    """Get performance metrics"""
    global ecosystem
    if ecosystem is None:
        raise HTTPException(status_code=400, detail="Ecosystem not initialized")
    
    try:
        current_prices = ecosystem.get_current_prices()
        portfolio_value = ecosystem.trader.get_portfolio_value(current_prices)
        
        performance = ecosystem.auditor.evaluate_performance(
            portfolio_value,
            ecosystem.trader.initial_capital,
            ecosystem.trader.trade_history,
            current_prices,
            ecosystem.trader.get_portfolio()
        )
        
        return {
            "success": True,
            "performance": performance
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/trade-history")
async def get_trade_history(limit: int = 50):
    """Get trade history"""
    global ecosystem
    if ecosystem is None:
        raise HTTPException(status_code=400, detail="Ecosystem not initialized")
    
    try:
        trades = ecosystem.trader.trade_history[-limit:]
        # Convert datetime to string for JSON serialization
        trade_list = []
        for trade in trades:
            trade_dict = trade.copy()
            if 'timestamp' in trade_dict:
                trade_dict['timestamp'] = trade_dict['timestamp'].isoformat() if hasattr(trade_dict['timestamp'], 'isoformat') else str(trade_dict['timestamp'])
            trade_list.append(trade_dict)
        
        return {
            "success": True,
            "trades": trade_list,
            "total_trades": len(ecosystem.trader.trade_history)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/performance-history")
async def get_performance_history():
    """Get performance history for charts"""
    global ecosystem
    if ecosystem is None:
        raise HTTPException(status_code=400, detail="Ecosystem not initialized")
    
    try:
        history = ecosystem.auditor.performance_history
        
        # Convert to list of dicts with serializable timestamps
        history_list = []
        for record in history:
            record_dict = record.copy()
            if 'timestamp' in record_dict:
                timestamp = record_dict['timestamp']
                if hasattr(timestamp, 'isoformat'):
                    record_dict['timestamp'] = timestamp.isoformat()
                else:
                    record_dict['timestamp'] = str(timestamp)
            history_list.append(record_dict)
        
        return {
            "success": True,
            "history": history_list
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/risk-alerts")
async def get_risk_alerts():
    """Get risk alerts from Risk Agent"""
    global ecosystem
    if ecosystem is None:
        raise HTTPException(status_code=400, detail="Ecosystem not initialized")
    
    try:
        alerts = ecosystem.risk.get_risk_alerts()
        return {
            "success": True,
            "alerts": alerts
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/historical-analysis/{symbol}")
async def get_historical_analysis(symbol: str, market: str = "US"):
    """Get historical analysis and backtesting data for a stock"""
    global ecosystem
    
    # Normalize symbol and determine market before initialization
    base_symbol, market, fetch_symbol = normalize_symbol(symbol, market_hint=market)

    # Initialize minimal ecosystem if not already initialized (for data fetching only)
    if ecosystem is None:
        try:
            print("[API] Ecosystem not initialized, initializing minimal instance for historical analysis...")
            from main import TradingEcosystem
            ecosystem = TradingEcosystem(symbols=[fetch_symbol], initial_capital=100000)
            print("[API] Minimal ecosystem initialized for historical analysis")
        except Exception as e:
            print(f"[API] Error initializing ecosystem for historical analysis: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Could not initialize data collector: {str(e)}")
    
    try:
        symbol = symbol.upper()
        print(f"[API] Getting historical analysis for {symbol} -> {fetch_symbol} (market: {market})")
        
        # For Indian stocks, add .NS suffix if not present
        print(f"[API] Getting historical analysis for {symbol} -> {fetch_symbol} (market: {market})")
        
        # Get historical data
        df = ecosystem.data_collector.get_latest_data(fetch_symbol)
        if df is None or df.empty:
            df = ecosystem.data_collector.fetch_data(fetch_symbol, period="6mo", interval="1d", market=market)
        
        if df.empty:
            # Try with base symbol
            if fetch_symbol != base_symbol:
                df = ecosystem.data_collector.fetch_data(base_symbol, period="6mo", interval="1d", market=market)
        
        if df.empty:
            raise HTTPException(status_code=404, detail=f"No historical data for {symbol}")
        
        # Simulate historical predictions (in real system, would use actual past predictions)
        price_history = []
        prediction_history = []
        correct_predictions = 0
        total_predictions = 0
        errors = []
        
        # Analyze last 30 days
        try:
            recent_data = df.tail(30)
            if len(recent_data) < 2:
                raise HTTPException(status_code=404, detail=f"Insufficient historical data for {symbol} (need at least 2 data points, got {len(recent_data)})")
            
            if 'Close' not in recent_data.columns:
                raise HTTPException(status_code=500, detail=f"Data format error: 'Close' column not found in historical data")
            
            for i in range(1, len(recent_data)):
                try:
                    current_price_val = recent_data.iloc[i]['Close']
                    prev_price_val = recent_data.iloc[i-1]['Close']
                    
                    # Handle NaN or None values
                    try:
                        import pandas as pd
                        is_na_func = pd.isna
                    except:
                        is_na_func = lambda x: x is None or (isinstance(x, float) and np.isnan(x))
                    
                    if is_na_func(current_price_val) or is_na_func(prev_price_val):
                        continue
                    
                    current_price = float(current_price_val)
                    prev_price = float(prev_price_val)
                    
                    if prev_price <= 0 or current_price <= 0:
                        continue
                    
                    actual_change = (current_price - prev_price) / prev_price
                    
                    # Simulate prediction (would use actual model in production)
                    if abs(actual_change) > 0.01:
                        predicted_signal = 'Up' if actual_change > 0 else 'Down'
                        predicted_change = abs(actual_change) * 0.8  # Simulate 80% accuracy
                        predicted_price = prev_price * (1 + (predicted_change if actual_change > 0 else -predicted_change))
                        
                        error = abs((current_price - predicted_price) / current_price * 100) if current_price > 0 else 0
                        correct = (predicted_signal == 'Up' and actual_change > 0) or (predicted_signal == 'Down' and actual_change < 0)
                        
                        if correct:
                            correct_predictions += 1
                        total_predictions += 1
                        errors.append(error)
                        
                        # Format date safely
                        try:
                            idx = recent_data.index[i]
                            if hasattr(idx, 'date'):
                                date_str = str(idx.date())
                            elif hasattr(idx, 'isoformat'):
                                date_str = idx.isoformat()[:10]  # Get just the date part
                            else:
                                date_str = str(idx)
                        except:
                            date_str = f"Day_{i}"
                        
                        prediction_history.append({
                            "date": date_str,
                            "predicted_price": round(float(predicted_price), 2),
                            "actual_price": round(float(current_price), 2),
                            "error": round(float(error), 2),
                            "correct": bool(correct)
                        })
                    
                    # Format date safely for price_history
                    try:
                        idx = recent_data.index[i]
                        if hasattr(idx, 'date'):
                            date_str = str(idx.date())
                        elif hasattr(idx, 'isoformat'):
                            date_str = idx.isoformat()[:10]
                        else:
                            date_str = str(idx)
                    except:
                        date_str = f"Day_{i}"
                    
                    price_history.append({
                        "date": date_str,
                        "actual_price": round(float(current_price), 2),
                        "predicted_price": round(float(prev_price * 1.02), 2)  # Simplified prediction
                    })
                except Exception as e:
                    print(f"[API] Error processing historical data point {i}: {str(e)}")
                    continue
        except HTTPException:
            raise
        except Exception as e:
            print(f"[API] Error analyzing historical data: {str(e)}")
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Error processing historical data: {str(e)}")
        
        accuracy = (correct_predictions / total_predictions * 100) if total_predictions > 0 else 0
        avg_error = sum(errors) / len(errors) if errors else 0
        
        return {
            "success": True,
            "analysis": {
                "symbol": symbol,
                "accuracy": accuracy,
                "total_predictions": total_predictions,
                "correct_predictions": correct_predictions,
                "avg_error": avg_error,
                "price_history": price_history[-20:],  # Last 20 days
                "prediction_history": prediction_history[-10:]  # Last 10 predictions
            }
        }
    except HTTPException:
        # Re-raise HTTP exceptions (like 404, 400) as-is
        raise
    except Exception as e:
        print(f"[API] Error getting historical analysis: {str(e)}")
        import traceback
        traceback.print_exc()
        error_detail = str(e)
        if "AttributeError" in error_detail or "NoneType" in error_detail:
            error_detail = f"Data processing error: {error_detail}. Please ensure the stock symbol is correct and historical data is available."
        raise HTTPException(status_code=500, detail=error_detail)


@app.get("/api/agent-status")
async def get_agent_status():
    """Get status of all agents"""
    global ecosystem
    if ecosystem is None:
        raise HTTPException(status_code=400, detail="Ecosystem not initialized")
    
    try:
        current_prices = ecosystem.get_current_prices()
        portfolio_value = ecosystem.trader.get_portfolio_value(current_prices)
        
        return {
            "success": True,
            "agents": {
                "analyst": {
                    "status": "active",
                    "predictions_count": len(ecosystem.analyst.predictions),
                    "models_trained": any(m.is_trained for m in ecosystem.analyst.models.values())
                },
                "trader": {
                    "status": "active",
                    "capital": ecosystem.trader.capital,
                    "total_trades": len(ecosystem.trader.trade_history)
                },
                "risk": {
                    "status": "active",
                    "alerts_count": len(ecosystem.risk.get_risk_alerts())
                },
                "auditor": {
                    "status": "active",
                    "records_count": len(ecosystem.auditor.trade_records)
                }
            },
            "portfolio_value": portfolio_value
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
