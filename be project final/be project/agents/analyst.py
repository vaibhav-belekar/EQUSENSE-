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
                    period="1y"
                )

                if training_df.empty or len(training_df) < 80:
                    print(f"[Analyst] Warning: Insufficient training data for {symbol}")
                    continue

                metrics = self.models[symbol].train(training_df)
                print(
                    f"[Analyst] Trained {symbol} {metrics['primary_model']} model "
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

            prediction = self._compose_prediction(
                df,
                raw_return,
                model.metrics.r2 if model and model.is_trained else 0.0,
                model.metrics.mae if model and model.is_trained else 6.0,
            )

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

    def _compose_prediction(self, df: pd.DataFrame, raw_return: float, model_quality: float, model_mae: float) -> Dict[str, any]:
        indicator_return = self._estimate_return_from_indicators(df)
        model_reliability = self._estimate_model_reliability(model_quality, model_mae)
        model_weight = 0.2 + (0.35 * model_reliability)
        blended_return = (model_weight * raw_return) + ((1.0 - model_weight) * indicator_return)
        expected_return = self._calibrate_expected_return(df, blended_return, indicator_return, model_reliability)
        risk = self._estimate_risk(df)
        score = expected_return / max(risk, 0.5)
        confidence = self._calculate_confidence(df, expected_return, indicator_return, risk, model_quality, model_mae)
        signal = self._infer_signal(df, expected_return, confidence)

        return {
            "signal": signal,
            "confidence": confidence,
            "expected_return": round(float(expected_return), 2),
            "risk": round(float(risk), 2),
            "score": round(float(score), 2),
            "forecast_horizon_days": self.forecast_horizon,
            "model_type": "xgboost_regression" if self._uses_xgboost() else "tree_regression"
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
        model_quality: float,
        model_mae: float,
    ) -> float:
        row = df.iloc[-1]
        adx_weight = min(float(row.get('ADX', 20.0)) / 40.0, 1.0)
        rsi_distance = abs(float(row.get('RSI', 50.0)) - 50.0) / 50.0
        macd_strength = min(abs(float(row.get('MACD_diff', 0.0))) * 10.0, 1.0)
        momentum_strength = min(abs(float(row.get('Momentum_20', 0.0))) * 8.0, 1.0)
        agreement = 1.0 - min(abs(expected_return - indicator_return) / 8.0, 1.0)
        model_bonus = min(max(model_quality, 0.0), 0.6) * 0.10
        mae_penalty = min(max(model_mae, 0.0) / 20.0, 0.18)
        risk_penalty = min(risk / 15.0, 0.25)

        confidence = (
            0.22 * adx_weight +
            0.18 * rsi_distance +
            0.22 * macd_strength +
            0.20 * momentum_strength +
            0.18 * agreement
        )
        confidence = confidence + model_bonus - risk_penalty - mae_penalty
        return float(np.clip(confidence, 0.28, 0.78))

    def _infer_signal(self, df: pd.DataFrame, expected_return: float, confidence: float) -> str:
        if df is None or df.empty or 'Close' not in df.columns:
            if expected_return >= 0.45:
                return "Up"
            if expected_return <= -0.45:
                return "Down"
            return "Neutral"

        closes = df['Close'].dropna()
        if len(closes) < 3:
            if expected_return >= 0.45:
                return "Up"
            if expected_return <= -0.45:
                return "Down"
            return "Neutral"

        last_close = float(closes.iloc[-1])
        move_5 = ((last_close / float(closes.iloc[-6])) - 1.0) if len(closes) >= 6 and float(closes.iloc[-6]) > 0 else 0.0
        move_20 = ((last_close / float(closes.iloc[-21])) - 1.0) if len(closes) >= 21 and float(closes.iloc[-21]) > 0 else 0.0
        momentum_score = (move_5 * 0.65) + (move_20 * 0.35)

        if expected_return >= 0.45:
            return "Up"
        if expected_return <= -0.45:
            return "Down"

        if momentum_score >= 0.012 and confidence >= 0.42:
            return "Up"
        if momentum_score <= -0.012 and confidence >= 0.42:
            return "Down"

        return "Neutral"

    def _estimate_model_reliability(self, model_quality: float, model_mae: float) -> float:
        quality_component = min(max(model_quality, 0.0), 0.6) / 0.6 if model_quality > 0 else 0.0
        mae_component = 1.0 - min(max(model_mae, 0.0) / 12.0, 1.0)
        return float(np.clip(0.6 * quality_component + 0.4 * mae_component, 0.0, 1.0))

    def _calibrate_expected_return(
        self,
        df: pd.DataFrame,
        proposed_return: float,
        fallback_direction: float,
        model_reliability: float,
    ) -> float:
        row = df.iloc[-1]
        realized_vol_pct = max(float(row.get('Volatility_20', 0.02)) * 100.0, 0.8)
        adx_strength = min(max(float(row.get('ADX', 20.0)) / 30.0, 0.75), 1.2)
        horizon_scale = np.sqrt(max(self.forecast_horizon, 1) / 10.0)
        move_cap = float(np.clip(realized_vol_pct * horizon_scale * 1.45 * adx_strength, 1.5, 9.0))
        damped = float(np.tanh(proposed_return / max(move_cap, 1.0)) * move_cap)
        reliability_damping = 0.75 + (0.2 * model_reliability)
        calibrated = damped * reliability_damping
        return self._sanitize_expected_return(calibrated, fallback_direction)

    def _sanitize_expected_return(self, expected_return: float, fallback_direction: float) -> float:
        adjusted = float(np.clip(expected_return, -9.0, 9.0))
        if abs(adjusted) < 0.1:
            direction = 1.0 if fallback_direction >= 0 else -1.0
            adjusted = direction * 0.1
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
            "model_type": "xgboost_regression" if self._uses_xgboost() else "tree_regression",
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
                    period="1y"
                )
                if not training_df.empty and len(training_df) >= 80:
                    model.train(training_df)
            except Exception as e:
                print(f"[Analyst] Lazy training failed for {symbol}: {str(e)}")

        return model_key

    def _uses_xgboost(self) -> bool:
        return any(getattr(model, "primary_model_name", "") == "xgboost" for model in self.models.values())

if __name__ == "__main__":
    analyst = AnalystAgent(['AAPL', 'TSLA'])
    analyst.train_models()
    predictions = analyst.analyze_all()
    for symbol, pred in predictions.items():
        print(f"{symbol}: {pred}")
