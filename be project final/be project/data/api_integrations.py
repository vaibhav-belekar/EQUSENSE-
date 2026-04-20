"""
API Integrations for Stock Market Data
Supports multiple data sources: yfinance, Alpha Vantage, Alpaca
"""

import os
import pandas as pd
import numpy as np
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import yfinance as yf

try:
    from alpha_vantage.timeseries import TimeSeries
    ALPHA_VANTAGE_AVAILABLE = True
except ImportError:
    ALPHA_VANTAGE_AVAILABLE = False

try:
    import alpaca_trade_api as tradeapi
    ALPACA_AVAILABLE = True
except ImportError:
    ALPACA_AVAILABLE = False


class APIDataCollector:
    """Unified API data collector supporting multiple sources"""
    
    def __init__(self, symbols: List[str] = None, api_source: str = "yfinance"):
        """
        Initialize API data collector
        
        Args:
            symbols: List of stock symbols
            api_source: Data source ('yfinance', 'alpha_vantage', 'alpaca')
        """
        self.symbols = symbols or ['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN']
        self.api_source = api_source
        self.data_cache = {}
        
        # Initialize API clients
        self.alpha_vantage_client = None
        self.alpaca_client = None
        
        if api_source == "alpha_vantage":
            self._init_alpha_vantage()
        elif api_source == "alpaca":
            self._init_alpaca()
    
    def _init_alpha_vantage(self):
        """Initialize Alpha Vantage API client"""
        if not ALPHA_VANTAGE_AVAILABLE:
            print("Warning: alpha_vantage package not installed. Install with: pip install alpha-vantage")
            return
        
        api_key = os.getenv('ALPHA_VANTAGE_API_KEY')
        if not api_key:
            print("Warning: ALPHA_VANTAGE_API_KEY not found in environment variables")
            print("Get free API key from: https://www.alphavantage.co/support/#api-key")
            return
        
        try:
            self.alpha_vantage_client = TimeSeries(key=api_key, output_format='pandas')
            print("[API] Alpha Vantage client initialized")
        except Exception as e:
            print(f"[API] Error initializing Alpha Vantage: {str(e)}")
    
    def _init_alpaca(self):
        """Initialize Alpaca API client"""
        if not ALPACA_AVAILABLE:
            print("Warning: alpaca-trade-api package not installed. Install with: pip install alpaca-trade-api")
            return
        
        api_key = os.getenv('ALPACA_API_KEY')
        api_secret = os.getenv('ALPACA_SECRET_KEY')
        base_url = os.getenv('ALPACA_BASE_URL', 'https://paper-api.alpaca.markets')  # Default to paper trading
        
        if not api_key or not api_secret:
            print("Warning: Alpaca API credentials not found in environment variables")
            print("Set ALPACA_API_KEY and ALPACA_SECRET_KEY environment variables")
            print("Get credentials from: https://alpaca.markets/")
            return
        
        try:
            self.alpaca_client = tradeapi.REST(api_key, api_secret, base_url, api_version='v2')
            print("[API] Alpaca client initialized")
        except Exception as e:
            print(f"[API] Error initializing Alpaca: {str(e)}")
    
    def fetch_data(self, symbol: str, period: str = "1y", interval: str = "1d") -> pd.DataFrame:
        """
        Fetch data from the configured API source
        
        Args:
            symbol: Stock symbol
            period: Time period
            interval: Data interval
        
        Returns:
            DataFrame with OHLCV data
        """
        if self.api_source == "yfinance":
            return self._fetch_yfinance(symbol, period, interval)
        elif self.api_source == "alpha_vantage":
            return self._fetch_alpha_vantage(symbol, interval)
        elif self.api_source == "alpaca":
            return self._fetch_alpaca(symbol, period, interval)
        else:
            print(f"Unknown API source: {self.api_source}, falling back to yfinance")
            return self._fetch_yfinance(symbol, period, interval)
    
    def _fetch_yfinance(self, symbol: str, period: str, interval: str) -> pd.DataFrame:
        """Fetch data from yfinance (free, no API key needed)"""
        try:
            ticker = yf.Ticker(symbol)
            df = ticker.history(period=period, interval=interval)
            
            if df.empty:
                print(f"Warning: No data fetched for {symbol} from yfinance")
                return pd.DataFrame()
            
            # Rename columns to standard format
            df.columns = [col.replace(' ', '_') for col in df.columns]
            
            return df
        
        except Exception as e:
            print(f"Error fetching {symbol} from yfinance: {str(e)}")
            return pd.DataFrame()
    
    def _fetch_alpha_vantage(self, symbol: str, interval: str = "daily") -> pd.DataFrame:
        """Fetch data from Alpha Vantage API"""
        if not self.alpha_vantage_client:
            print("Alpha Vantage client not initialized, falling back to yfinance")
            return self._fetch_yfinance(symbol, "1y", "1d")
        
        try:
            # Map interval
            av_interval = "daily" if interval == "1d" else interval
            
            # Alpha Vantage has rate limits (5 calls/min, 500/day)
            data, meta_data = self.alpha_vantage_client.get_daily_adjusted(symbol=symbol, outputsize='full')
            
            if data is None or data.empty:
                print(f"Warning: No data fetched for {symbol} from Alpha Vantage")
                return pd.DataFrame()
            
            # Rename columns to match standard format
            data.columns = [col.split('. ')[-1] for col in data.columns]
            data = data.rename(columns={
                'open': 'Open',
                'high': 'High',
                'low': 'Low',
                'close': 'Close',
                'adjusted close': 'Close',
                'volume': 'Volume'
            })
            
            # Sort by date (ascending)
            data = data.sort_index()
            
            return data
        
        except Exception as e:
            print(f"Error fetching {symbol} from Alpha Vantage: {str(e)}")
            print("Falling back to yfinance...")
            return self._fetch_yfinance(symbol, "1y", "1d")
    
    def _fetch_alpaca(self, symbol: str, period: str, interval: str) -> pd.DataFrame:
        """Fetch data from Alpaca API (supports real-time and paper trading)"""
        if not self.alpaca_client:
            print("Alpaca client not initialized, falling back to yfinance")
            return self._fetch_yfinance(symbol, period, interval)
        
        try:
            # Map period to Alpaca format
            end_date = datetime.now()
            if period == "1y":
                start_date = end_date - timedelta(days=365)
            elif period == "6mo":
                start_date = end_date - timedelta(days=180)
            elif period == "3mo":
                start_date = end_date - timedelta(days=90)
            elif period == "1mo":
                start_date = end_date - timedelta(days=30)
            else:
                start_date = end_date - timedelta(days=365)
            
            # Map interval
            alpaca_interval = "1Day" if interval == "1d" else interval
            
            # Fetch bars
            bars = self.alpaca_client.get_bars(
                symbol,
                alpaca_interval,
                start=start_date.strftime('%Y-%m-%d'),
                end=end_date.strftime('%Y-%m-%d')
            ).df
            
            if bars.empty:
                print(f"Warning: No data fetched for {symbol} from Alpaca")
                return pd.DataFrame()
            
            # Rename columns to standard format
            bars = bars.rename(columns={
                'open': 'Open',
                'high': 'High',
                'low': 'Low',
                'close': 'Close',
                'volume': 'Volume'
            })
            
            return bars
        
        except Exception as e:
            print(f"Error fetching {symbol} from Alpaca: {str(e)}")
            print("Falling back to yfinance...")
            return self._fetch_yfinance(symbol, period, interval)
    
    def get_real_time_price(self, symbol: str) -> Optional[float]:
        """
        Get real-time price (if supported by API)
        
        Args:
            symbol: Stock symbol
        
        Returns:
            Current price or None
        """
        if self.api_source == "alpaca" and self.alpaca_client:
            try:
                quote = self.alpaca_client.get_latest_quote(symbol)
                if quote:
                    return float((quote.bp + quote.ap) / 2)  # Mid price
            except Exception as e:
                print(f"Error getting real-time price for {symbol}: {str(e)}")
        
        # Fallback: get latest close price
        df = self.fetch_data(symbol, period="5d", interval="1d")
        if not df.empty:
            return float(df['Close'].iloc[-1])
        
        return None
    
    def execute_trade_alpaca(self, symbol: str, qty: int, side: str = "buy") -> Dict:
        """
        Execute a trade via Alpaca API (only works with Alpaca)
        
        Args:
            symbol: Stock symbol
            qty: Number of shares
            side: 'buy' or 'sell'
        
        Returns:
            Trade result dictionary
        """
        if self.api_source != "alpaca" or not self.alpaca_client:
            return {"error": "Alpaca API not configured"}
        
        try:
            order = self.alpaca_client.submit_order(
                symbol=symbol,
                qty=qty,
                side=side,
                type='market',
                time_in_force='day'
            )
            
            return {
                "success": True,
                "order_id": order.id,
                "symbol": symbol,
                "qty": qty,
                "side": side,
                "status": order.status
            }
        
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }


if __name__ == "__main__":
    # Test the API collector
    print("Testing API Data Collector...")
    
    # Test yfinance (no API key needed)
    collector = APIDataCollector(['AAPL'], api_source='yfinance')
    df = collector.fetch_data('AAPL', period='1mo')
    print(f"\nyfinance - AAPL data shape: {df.shape}")
    print(f"Columns: {df.columns.tolist()}")
    
    # Test Alpha Vantage (requires API key)
    if os.getenv('ALPHA_VANTAGE_API_KEY'):
        collector_av = APIDataCollector(['AAPL'], api_source='alpha_vantage')
        df_av = collector_av.fetch_data('AAPL')
        print(f"\nAlpha Vantage - AAPL data shape: {df_av.shape}")
    
    # Test Alpaca (requires API keys)
    if os.getenv('ALPACA_API_KEY') and os.getenv('ALPACA_SECRET_KEY'):
        collector_alpaca = APIDataCollector(['AAPL'], api_source='alpaca')
        df_alpaca = collector_alpaca.fetch_data('AAPL', period='1mo')
        print(f"\nAlpaca - AAPL data shape: {df_alpaca.shape}")

