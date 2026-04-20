"""
Analyst Agent
Predicts continuous forward returns using a regression model.
"""

from __future__ import annotations

import os
import sys
from typing import Dict, List, Optional

import numpy as np
import pandas as pd

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from data.collector import DataCollector
from models.return_regression import ReturnRegressor

try:
    from backend.config import DEFAULT_CONFIDENCE
except ImportError:
    DEFAULT_CONFIDENCE = 0.5


class AnalystAgent:
    """Analyst Agent that predicts continuous stock returns."""

    def __init__(self, symbols: List[str] = None, forecast_horizon: int = 10, default_market: str = "US"):
        self.symbols = symbols or ['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN']
        self.forecast_horizon = forecast_horizon
        self.default_market = default_market
        self.data_collector = DataCollector(self.symbols)
        self.models: Dict[str, ReturnRegressor] = {}
        self.predictions: Dict[str, Dict[str, float]] = {}

        for symbol in self.symbols:
            self.models[symbol] = ReturnRegressor(forecast_horizon=forecast_horizon)

    def train_models(self, epochs: int = 30):
        """Train per-symbol regression models."""
        print("[Analyst] Training return regression models...")

        for symbol in self.symbols:
            try:
                training_df = self.data_collector.build_training_frame(
                    symbol,
                    forecast_horizon=self.forecast_horizon,
                    market=self.default_market,
                    period="2y"
                )

                if training_df.empty or len(training_df) < 80:
                    print(f"[Analyst] Warning: Insufficient training data for {symbol}")
                    continue

                metrics = self.models[symbol].train(training_df)
                print(
                    f"[Analyst] Trained {symbol} regression model "
                    f"(samples={metrics['samples']}, mae={metrics['mae']:.2f}, r2={metrics['r2']:.2f})"
                )
            except Exception as e:
                print(f"[Analyst] Error training model for {symbol}: {str(e)}")

    def analyze(self, symbol: str, market: str = "US") -> Dict[str, any]:
        """Analyze a stock and predict its forward return."""
        try:
            model_key = self._ensure_symbol_model(symbol, market)
            df = self.data_collector.fetch_data(symbol, period="1y", interval="1d", market=market)
            if df.empty:
                return self._build_empty_prediction("No data")

            feature_df = self.data_collector.get_feature_frame(symbol, market=market, period="1y")
            if feature_df.empty:
                return self._indicator_only_prediction(df)

            latest_features = feature_df.tail(1)
            if latest_features.empty:
                return self._indicator_only_prediction(df)

            base_symbol = symbol.replace('.NS', '').replace('.BO', '')
            model = self.models.get(model_key) or self.models.get(base_symbol) or self.models.get(symbol)

            if model is not None and model.is_trained:
                raw_return = model.predict(latest_features)
            else:
                raw_return = self._estimate_return_from_indicators(df)

            prediction = self._compose_prediction(df, raw_return, model.metrics.r2 if model and model.is_trained else 0.0)

            self.predictions[symbol] = prediction
            self.predictions[base_symbol] = prediction
            return prediction
        except Exception as e:
            print(f"[Analyst] Error analyzing {symbol}: {str(e)}")
            return self._build_empty_prediction(str(e))

    def analyze_all(self) -> Dict[str, Dict[str, any]]:
        results = {}
        for symbol in self.symbols:
            market = self.default_market
            results[symbol] = self.analyze(symbol, market=market)
            print(
                f"[Analyst] {symbol}: return={results[symbol]['expected_return']:.2f}% "
                f"risk={results[symbol]['risk']:.2f} score={results[symbol]['score']:.2f} "
                f"action_bias={results[symbol]['signal']} confidence={results[symbol]['confidence']:.2f}"
            )
        return results

    def get_prediction(self, symbol: str) -> Optional[Dict[str, any]]:
        return self.predictions.get(symbol)

    def _compose_prediction(self, df: pd.DataFrame, raw_return: float, model_quality: float) -> Dict[str, any]:
        indicator_return = self._estimate_return_from_indicators(df)
        blended_return = 0.65 * raw_return + 0.35 * indicator_return
        expected_return = self._sanitize_expected_return(blended_return, indicator_return)
        risk = self._estimate_risk(df)
        score = expected_return / max(risk, 0.5)
        confidence = self._calculate_confidence(df, expected_return, indicator_return, risk, model_quality)

        if expected_return > 1.0:
            signal = "Up"
        elif expected_return < -1.0:
            signal = "Down"
        else:
            signal = "Neutral"

        return {
            "signal": signal,
            "confidence": confidence,
            "expected_return": round(float(expected_return), 2),
            "risk": round(float(risk), 2),
            "score": round(float(score), 2),
            "forecast_horizon_days": self.forecast_horizon,
            "model_type": "regression"
        }

    def _indicator_only_prediction(self, df: pd.DataFrame) -> Dict[str, any]:
        estimate = self._estimate_return_from_indicators(df)
        return self._compose_prediction(df, estimate, 0.0)

    def _estimate_return_from_indicators(self, df: pd.DataFrame) -> float:
        row = df.iloc[-1]

        rsi_component = (float(row.get('RSI', 50.0)) - 50.0) / 50.0
        macd_component = np.tanh(float(row.get('MACD_diff', 0.0)) * 8.0)
        trend_component = np.tanh(float(row.get('Trend_Strength', 0.0)) * 12.0)
        long_trend_component = np.tanh(float(row.get('Trend_Long', 0.0)) * 10.0)
        momentum_component = np.tanh(float(row.get('Momentum_20', 0.0)) * 7.0)
        adx_strength = min(max(float(row.get('ADX', 20.0)) / 50.0, 0.2), 1.5)
        volatility_penalty = min(float(row.get('Volatility_20', 0.02)) * 45.0, 1.5)

        weighted_signal = (
            0.18 * rsi_component +
            0.22 * macd_component +
            0.22 * trend_component +
            0.14 * long_trend_component +
            0.24 * momentum_component
        )

        expected_return = weighted_signal * adx_strength * 8.5
        expected_return -= volatility_penalty
        return float(np.clip(expected_return, -15.0, 15.0))

    def _estimate_risk(self, df: pd.DataFrame) -> float:
        row = df.iloc[-1]
        realized_vol = float(row.get('Volatility_20', 0.02)) * 100.0
        atr_pct = float(row.get('ATR_Pct', 0.015)) * 100.0
        volume_ratio = float(row.get('Volume_Ratio', 1.0))
        liquidity_penalty = 0.5 if volume_ratio < 0.8 else 0.0
        risk = 0.55 * realized_vol + 0.45 * atr_pct + liquidity_penalty
        return float(np.clip(risk, 0.75, 12.0))

    def _calculate_confidence(
        self,
        df: pd.DataFrame,
        expected_return: float,
        indicator_return: float,
        risk: float,
        model_quality: float
    ) -> float:
        row = df.iloc[-1]
        adx_weight = min(float(row.get('ADX', 20.0)) / 40.0, 1.0)
        rsi_distance = abs(float(row.get('RSI', 50.0)) - 50.0) / 50.0
        macd_strength = min(abs(float(row.get('MACD_diff', 0.0))) * 10.0, 1.0)
        momentum_strength = min(abs(float(row.get('Momentum_20', 0.0))) * 8.0, 1.0)
        agreement = 1.0 - min(abs(expected_return - indicator_return) / 12.0, 1.0)
        model_bonus = min(max(model_quality, 0.0), 1.0) * 0.15
        risk_penalty = min(risk / 15.0, 0.25)

        confidence = (
            0.22 * adx_weight +
            0.18 * rsi_distance +
            0.22 * macd_strength +
            0.20 * momentum_strength +
            0.18 * agreement
        )
        confidence = confidence + model_bonus - risk_penalty
        return float(np.clip(confidence, 0.35, 0.92))

    def _sanitize_expected_return(self, expected_return: float, fallback_direction: float) -> float:
        adjusted = float(np.clip(expected_return, -15.0, 15.0))
        if abs(adjusted) < 0.2:
            direction = 1.0 if fallback_direction >= 0 else -1.0
            adjusted = direction * 0.2
        return adjusted

    def _build_empty_prediction(self, error: str) -> Dict[str, any]:
        baseline_return = 0.2
        baseline_risk = 4.0
        return {
            "signal": "Neutral",
            "confidence": DEFAULT_CONFIDENCE,
            "expected_return": baseline_return,
            "risk": baseline_risk,
            "score": round(baseline_return / baseline_risk, 2),
            "forecast_horizon_days": self.forecast_horizon,
            "model_type": "regression",
            "error": error
        }

    def _ensure_symbol_model(self, symbol: str, market: str) -> str:
        model_key = symbol.replace('.NS', '').replace('.BO', '')
        if model_key not in self.models:
            self.models[model_key] = ReturnRegressor(forecast_horizon=self.forecast_horizon)

        model = self.models[model_key]
        if not model.is_trained:
            try:
                training_df = self.data_collector.build_training_frame(
                    symbol,
                    forecast_horizon=self.forecast_horizon,
                    market=market,
                    period="2y"
                )
                if not training_df.empty and len(training_df) >= 80:
                    model.train(training_df)
            except Exception as e:
                print(f"[Analyst] Lazy training failed for {symbol}: {str(e)}")

        return model_key

if __name__ == "__main__":
    analyst = AnalystAgent(['AAPL', 'TSLA'])
    analyst.train_models()
    predictions = analyst.analyze_all()
    for symbol, pred in predictions.items():
        print(f"{symbol}: {pred}")
