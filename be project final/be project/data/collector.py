"""
Data Collection Module
Fetches stock market data from yfinance and calculates technical indicators
"""

import yfinance as yf
import pandas as pd
import numpy as np
from typing import List, Dict, Optional
import ta


class DataCollector:
    """Collects and processes stock market data"""
    
    def __init__(self, symbols: List[str] = None):
        """
        Initialize data collector
        
        Args:
            symbols: List of stock symbols (e.g., ['AAPL', 'TSLA', 'MSFT'])
        """
        self.symbols = symbols or ['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN']
        self.data_cache = {}

    def _build_symbol_candidates(self, symbol: str, market: str = "US") -> List[str]:
        """Return possible Yahoo Finance symbol variants for a stock."""
        clean_symbol = (symbol or '').strip().upper()
        if not clean_symbol:
            return []

        candidates = []

        def add_candidate(value: str):
            if value and value not in candidates:
                candidates.append(value)

        base_symbol = clean_symbol.replace('.NS', '').replace('.BO', '')

        if market == "IN":
            if clean_symbol.endswith(('.NS', '.BO')):
                add_candidate(clean_symbol)
                add_candidate(f"{base_symbol}.NS")
                add_candidate(f"{base_symbol}.BO")
            else:
                add_candidate(f"{base_symbol}.NS")
                add_candidate(f"{base_symbol}.BO")
                add_candidate(base_symbol)
        else:
            add_candidate(clean_symbol)

        return candidates
    
    def fetch_data(self, symbol: str, period: str = "1y", interval: str = "1d", market: str = "US") -> pd.DataFrame:
        """
        Fetch historical data for a symbol
        
        Args:
            symbol: Stock symbol
            period: Time period (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max)
            interval: Data interval (1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo)
            market: Market type ('US' or 'IN' for Indian stocks)
        
        Returns:
            DataFrame with OHLCV data
        """
        try:
            candidates = self._build_symbol_candidates(symbol, market=market)
            print(
                f"[DataCollector] Fetching data for {symbol} "
                f"(market: {market}, period: {period}, interval: {interval}, candidates: {candidates})"
            )

            for fetch_symbol in candidates:
                try:
                    ticker = yf.Ticker(fetch_symbol)
                    df = ticker.history(period=period, interval=interval)

                    if df.empty:
                        print(f"[DataCollector] Warning: No data fetched for {fetch_symbol}")
                        continue

                    print(f"[DataCollector] Successfully fetched {len(df)} rows for {fetch_symbol}")

                    # Calculate technical indicators
                    df = self._add_indicators(df)

                    base_symbol = symbol.replace('.NS', '').replace('.BO', '')
                    self.data_cache[symbol] = df
                    self.data_cache[fetch_symbol] = df
                    self.data_cache[base_symbol] = df

                    return df
                except Exception as candidate_error:
                    print(f"[DataCollector] Candidate {fetch_symbol} failed: {str(candidate_error)}")
                    continue

            return pd.DataFrame()

        except Exception as e:
            print(f"[DataCollector] Error fetching data for {symbol}: {str(e)}")
            import traceback
            traceback.print_exc()
            return pd.DataFrame()
    
    def get_realtime_price(self, symbol: str, market: str = "US") -> Optional[float]:
        """
        Get real-time price for a symbol
        
        Args:
            symbol: Stock symbol
            market: Market type ('US' or 'IN')
        
        Returns:
            Current price or None
        """
        try:
            candidates = self._build_symbol_candidates(symbol, market=market)
            print(f"[DataCollector] Fetching real-time price for {symbol} (market: {market}, candidates: {candidates})")

            for fetch_symbol in candidates:
                try:
                    ticker = yf.Ticker(fetch_symbol)
                    info = ticker.info

                    if info and len(info) > 0:
                        current_price = info.get('currentPrice') or info.get('regularMarketPrice') or info.get('previousClose')
                        if current_price:
                            price = float(current_price)
                            print(f"[DataCollector] Got price for {fetch_symbol}: {price}")
                            return price

                    print(f"[DataCollector] No direct price found in info for {fetch_symbol}, trying history fallback")
                    df = ticker.history(period="1d", interval="1d")
                    if not df.empty:
                        price = float(df['Close'].iloc[-1])
                        print(f"[DataCollector] Got price from history for {fetch_symbol}: {price}")
                        return price
                except Exception as candidate_error:
                    print(f"[DataCollector] Candidate {fetch_symbol} realtime fetch failed: {str(candidate_error)}")
                    continue

            return None
        except Exception as e:
            print(f"[DataCollector] Error fetching real-time price for {symbol}: {str(e)}")
            import traceback
            traceback.print_exc()
            return None
    
    def get_ohlc_data(self, symbol: str, period: str = "1mo", interval: str = "1d", market: str = "US") -> pd.DataFrame:
        """
        Get OHLC (Open, High, Low, Close) data for candlestick charts
        
        Args:
            symbol: Stock symbol
            period: Time period
            interval: Data interval
            market: Market type ('US' or 'IN')
        
        Returns:
            DataFrame with OHLCV data
        """
        return self.fetch_data(symbol, period=period, interval=interval, market=market)
    
    def _add_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add technical indicators to the dataframe"""
        if df.empty:
            return df
        
        try:
            # RSI (Relative Strength Index)
            df['RSI'] = ta.momentum.RSIIndicator(df['Close']).rsi()
            
            # MACD
            macd = ta.trend.MACD(df['Close'])
            df['MACD'] = macd.macd()
            df['MACD_signal'] = macd.macd_signal()
            df['MACD_diff'] = macd.macd_diff()
            
            # Bollinger Bands
            bollinger = ta.volatility.BollingerBands(df['Close'])
            df['BB_high'] = bollinger.bollinger_hband()
            df['BB_low'] = bollinger.bollinger_lband()
            df['BB_mid'] = bollinger.bollinger_mavg()
            
            # Moving Averages
            df['SMA_20'] = ta.trend.SMAIndicator(df['Close'], window=20).sma_indicator()
            df['SMA_50'] = ta.trend.SMAIndicator(df['Close'], window=50).sma_indicator()
            df['SMA_200'] = ta.trend.SMAIndicator(df['Close'], window=200).sma_indicator()
            df['EMA_12'] = ta.trend.EMAIndicator(df['Close'], window=12).ema_indicator()
            df['EMA_26'] = ta.trend.EMAIndicator(df['Close'], window=26).ema_indicator()

            # Momentum indicators
            df['ROC_10'] = ta.momentum.ROCIndicator(df['Close'], window=10).roc()
            df['ROC_20'] = ta.momentum.ROCIndicator(df['Close'], window=20).roc()
            df['Momentum_10'] = df['Close'].pct_change(10)
            df['Momentum_20'] = df['Close'].pct_change(20)
            df['Momentum_60'] = df['Close'].pct_change(60)

            # Trend strength indicators
            df['ADX'] = ta.trend.ADXIndicator(df['High'], df['Low'], df['Close']).adx()
            df['CCI'] = ta.trend.CCIIndicator(df['High'], df['Low'], df['Close']).cci()
            stoch = ta.momentum.StochasticOscillator(df['High'], df['Low'], df['Close'])
            df['Stoch_K'] = stoch.stoch()
            df['Stoch_D'] = stoch.stoch_signal()
            
            # Volume indicators (simple moving average of volume)
            df['Volume_SMA'] = df['Volume'].rolling(window=20).mean()
            df['Volume_Ratio'] = df['Volume'] / df['Volume_SMA'].replace(0, np.nan)
            
            # ATR (Average True Range) for volatility
            df['ATR'] = ta.volatility.AverageTrueRange(
                df['High'], df['Low'], df['Close']
            ).average_true_range()

            # Realized volatility and normalized trend spreads
            returns = df['Close'].pct_change()
            df['Return_1D'] = returns
            df['Volatility_5'] = returns.rolling(window=5).std()
            df['Volatility_10'] = returns.rolling(window=10).std()
            df['Volatility_20'] = returns.rolling(window=20).std()
            df['ATR_Pct'] = df['ATR'] / df['Close'].replace(0, np.nan)
            df['Trend_Strength'] = (df['SMA_20'] - df['SMA_50']) / df['SMA_50'].replace(0, np.nan)
            df['Trend_Long'] = (df['SMA_50'] - df['SMA_200']) / df['SMA_200'].replace(0, np.nan)
            df['MACD_Normalized'] = df['MACD_diff'] / df['Close'].replace(0, np.nan)
            df['BB_Width'] = (df['BB_high'] - df['BB_low']) / df['BB_mid'].replace(0, np.nan)
            
            # Fill NaN values
            df = df.bfill().ffill()
            
        except Exception as e:
            print(f"Error adding indicators: {str(e)}")
        
        return df
    
    def get_latest_data(self, symbol: str) -> Optional[pd.DataFrame]:
        """Get the latest cached data for a symbol"""
        return self.data_cache.get(symbol)
    
    def fetch_multiple(self, symbols: List[str] = None, period: str = "1y") -> Dict[str, pd.DataFrame]:
        """
        Fetch data for multiple symbols
        
        Args:
            symbols: List of stock symbols
            period: Time period
        
        Returns:
            Dictionary mapping symbols to DataFrames
        """
        symbols = symbols or self.symbols
        data = {}
        
        for symbol in symbols:
            df = self.fetch_data(symbol, period=period)
            if not df.empty:
                data[symbol] = df
        
        return data
    
    def get_features(self, symbol: str, lookback: int = 60) -> Optional[np.ndarray]:
        """
        Extract features for ML model
        
        Args:
            symbol: Stock symbol
            lookback: Number of days to look back
        
        Returns:
            Feature array for the model
        """
        df = self.get_latest_data(symbol)
        if df is None or df.empty:
            return None
        
        # Select relevant features
        feature_cols = [
            'Open', 'High', 'Low', 'Close', 'Volume',
            'RSI', 'MACD', 'MACD_signal', 'MACD_diff',
            'BB_high', 'BB_low', 'BB_mid',
            'SMA_20', 'SMA_50', 'EMA_12', 'EMA_26',
            'ATR'
        ]
        
        # Get available features
        available_cols = [col for col in feature_cols if col in df.columns]
        
        if len(available_cols) == 0:
            return None
        
        # Get last 'lookback' days
        recent_data = df[available_cols].tail(lookback).values
        
        # Normalize features
        if recent_data.shape[0] < lookback:
            # Pad with last value if not enough data
            padding = np.tile(recent_data[-1:], (lookback - recent_data.shape[0], 1))
            recent_data = np.vstack([padding, recent_data])
        
        return recent_data.astype(np.float32)

    def get_feature_frame(self, symbol: str, market: str = "US", period: str = "2y") -> pd.DataFrame:
        """
        Return a row-wise feature frame for regression-style models.

        Args:
            symbol: Stock symbol
            market: Market type ('US' or 'IN')
            period: History window to fetch if cache is empty

        Returns:
            DataFrame with engineered features
        """
        df = self.get_latest_data(symbol)
        if df is None or df.empty:
            df = self.fetch_data(symbol, period=period, interval="1d", market=market)

        if df is None or df.empty:
            return pd.DataFrame()

        feature_cols = [
            'Close', 'Volume', 'RSI', 'MACD', 'MACD_signal', 'MACD_diff',
            'SMA_20', 'SMA_50', 'SMA_200', 'EMA_12', 'EMA_26',
            'ATR', 'ATR_Pct', 'Volatility_5', 'Volatility_10', 'Volatility_20',
            'Momentum_10', 'Momentum_20', 'Momentum_60', 'ROC_10', 'ROC_20',
            'ADX', 'CCI', 'Stoch_K', 'Stoch_D', 'Trend_Strength',
            'Trend_Long', 'MACD_Normalized', 'BB_Width', 'Volume_Ratio', 'Return_1D'
        ]

        available_cols = [col for col in feature_cols if col in df.columns]
        if not available_cols:
            return pd.DataFrame()

        feature_df = df[available_cols].copy()
        feature_df = feature_df.replace([np.inf, -np.inf], np.nan).dropna()
        return feature_df

    def build_training_frame(
        self,
        symbol: str,
        forecast_horizon: int = 10,
        market: str = "US",
        period: str = "2y"
    ) -> pd.DataFrame:
        """
        Build a supervised learning frame with future return targets.

        Target is expressed in percent to make decision thresholds intuitive.
        """
        df = self.fetch_data(symbol, period=period, interval="1d", market=market)
        if df.empty:
            return pd.DataFrame()

        feature_df = self.get_feature_frame(symbol, market=market, period=period)
        if feature_df.empty:
            return pd.DataFrame()

        aligned = df.loc[feature_df.index].copy()
        future_close = aligned['Close'].shift(-forecast_horizon)
        target_return_pct = ((future_close - aligned['Close']) / aligned['Close']) * 100.0

        training_df = feature_df.copy()
        training_df['target_return_pct'] = target_return_pct
        training_df = training_df.replace([np.inf, -np.inf], np.nan).dropna()
        return training_df


if __name__ == "__main__":
    # Test the data collector
    collector = DataCollector(['AAPL', 'TSLA'])
    data = collector.fetch_multiple()
    
    for symbol, df in data.items():
        print(f"\n{symbol} data shape: {df.shape}")
        print(f"Columns: {df.columns.tolist()}")
        print(f"\nLatest data:\n{df.tail()}")
