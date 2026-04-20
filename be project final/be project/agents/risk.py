"""
Risk Agent
Controls exposure and directly influences trading decisions.
"""

from __future__ import annotations

import math
import os
import sys
from typing import Dict, List

import numpy as np

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from backend.config import (
        MAX_POSITION_SIZE,
        MAX_LOSS_THRESHOLD,
        MAX_PORTFOLIO_RISK,
        VOLATILITY_WINDOW,
        VOLATILITY_HIGH_THRESHOLD,
        DEFAULT_VOLATILITY,
        TRADER_CAPITAL_PERCENT_PER_TRADE
    )
except ImportError:
    MAX_POSITION_SIZE = 0.40
    MAX_LOSS_THRESHOLD = 0.15
    MAX_PORTFOLIO_RISK = 0.30
    VOLATILITY_WINDOW = 20
    VOLATILITY_HIGH_THRESHOLD = 0.08
    DEFAULT_VOLATILITY = 0.02
    TRADER_CAPITAL_PERCENT_PER_TRADE = 0.25


class RiskAgent:
    """Risk Agent that evaluates trade-level and portfolio-level risk."""

    def __init__(
        self,
        max_position_size: float = None,
        max_loss_threshold: float = None,
        max_portfolio_risk: float = None,
        volatility_window: int = None
    ):
        self.max_position_size = max_position_size if max_position_size is not None else MAX_POSITION_SIZE
        self.max_loss_threshold = max_loss_threshold if max_loss_threshold is not None else MAX_LOSS_THRESHOLD
        self.max_portfolio_risk = max_portfolio_risk if max_portfolio_risk is not None else MAX_PORTFOLIO_RISK
        self.volatility_window = volatility_window if volatility_window is not None else VOLATILITY_WINDOW
        self.portfolio_history = []
        self.price_history: Dict[str, List[float]] = {}
        self.risk_alerts: List[str] = []

    def preview_trade(
        self,
        symbol: str,
        proposed_action: str,
        prediction: Dict[str, any],
        portfolio: Dict[str, int],
        current_prices: Dict[str, float],
        portfolio_value: float
    ):
        """Influence TraderAgent decisions before final execution."""
        alerts = []
        action = proposed_action
        price = current_prices.get(symbol)
        shares = portfolio.get(symbol, 0)
        expected_return = float(prediction.get("expected_return", 0.2))
        modeled_risk = float(prediction.get("risk", 4.0))
        risk_level = self._prediction_risk_level(modeled_risk)

        self._record_price(symbol, price)

        if action == "Buy" and expected_return <= 10.0:
            action = "Hold"
            alerts.append(f"{symbol}: return forecast {expected_return:.2f}% is below aggressive buy threshold")

        if action == "Buy" and risk_level != "Low":
            action = "Hold"
            alerts.append(f"{symbol}: modeled risk is {risk_level}, buy blocked")

        if action == "Buy" and price:
            proposed_shares = self._estimate_trade_size(portfolio_value, price)
            position_ratio = ((shares * price) + (proposed_shares * price)) / max(portfolio_value, 1.0)
            if position_ratio > self.max_position_size:
                action = "Hold"
                alerts.append(f"{symbol}: position limit exceeded ({position_ratio*100:.1f}%)")

        if shares > 0 and price:
            entry_price = self._get_average_entry_price(symbol)
            if entry_price > 0:
                loss_ratio = (entry_price - price) / entry_price
                if loss_ratio > self.max_loss_threshold:
                    action = "Sell"
                    alerts.append(f"{symbol}: stop loss triggered at {loss_ratio*100:.1f}% drawdown")

        note = " | ".join(alerts) if alerts else "Accepted by risk agent"
        if alerts:
            self.risk_alerts.extend(alerts)
        return action, note

    def evaluate(
        self,
        trader_decision: Dict[str, str],
        portfolio: Dict[str, int],
        current_prices: Dict[str, float],
        portfolio_value: float,
        predictions: Dict[str, Dict[str, any]] = None
    ) -> Dict[str, any]:
        """Final post-trader risk pass before execution."""
        risk_adjusted_decisions = {}
        alerts = []

        for symbol, price in current_prices.items():
            self._record_price(symbol, price)

        for symbol, action in trader_decision.items():
            adjusted_action = action
            prediction = (predictions or {}).get(symbol, {})
            price = current_prices.get(symbol)
            shares = portfolio.get(symbol, 0)

            modeled_risk = float(prediction.get("risk", self._calculate_volatility(symbol) * 100.0))
            if adjusted_action == "Buy" and self._prediction_risk_level(modeled_risk) == "High":
                adjusted_action = "Hold"
                alerts.append(f"{symbol}: high modeled risk blocked final buy")

            volatility = self._calculate_volatility(symbol)
            if adjusted_action == "Buy" and volatility > VOLATILITY_HIGH_THRESHOLD:
                adjusted_action = "Hold"
                alerts.append(f"{symbol}: realized volatility {volatility*100:.1f}% is too high")

            if shares > 0 and price:
                entry_price = self._get_average_entry_price(symbol)
                if entry_price > 0:
                    loss_ratio = (entry_price - price) / entry_price
                    if loss_ratio > self.max_loss_threshold:
                        adjusted_action = "Sell"
                        alerts.append(f"{symbol}: stop loss forced sell")

            portfolio_risk = self._calculate_portfolio_risk(portfolio, current_prices, portfolio_value)
            if portfolio_risk > self.max_portfolio_risk and adjusted_action == "Buy":
                adjusted_action = "Hold"
                alerts.append(f"Portfolio risk {portfolio_risk*100:.1f}% exceeds limit, blocking {symbol}")

            risk_adjusted_decisions[symbol] = adjusted_action

        if alerts:
            self.risk_alerts.extend(alerts)
            for alert in alerts:
                print(f"[Risk] {alert}")

        portfolio_risk = self._calculate_portfolio_risk(portfolio, current_prices, portfolio_value)
        return {
            "decisions": risk_adjusted_decisions,
            "alerts": alerts,
            "portfolio_risk": portfolio_risk,
            "status": "Safe" if not alerts else "Warning"
        }

    def _record_price(self, symbol: str, price: float):
        if price is None:
            return
        if symbol not in self.price_history:
            self.price_history[symbol] = []
        self.price_history[symbol].append(price)
        max_len = self.volatility_window * 3
        if len(self.price_history[symbol]) > max_len:
            self.price_history[symbol] = self.price_history[symbol][-max_len:]

    def _estimate_trade_size(self, portfolio_value: float, price: float) -> int:
        trade_value = portfolio_value * TRADER_CAPITAL_PERCENT_PER_TRADE
        return int(trade_value / max(price, 1e-9))

    def _prediction_risk_level(self, modeled_risk: float) -> str:
        if modeled_risk <= 3.0:
            return "Low"
        if modeled_risk <= 6.0:
            return "Medium"
        return "High"

    def _calculate_volatility(self, symbol: str) -> float:
        prices = self.price_history.get(symbol, [])
        if len(prices) < 2:
            return DEFAULT_VOLATILITY

        returns = np.diff(np.array(prices[-self.volatility_window:])) / np.array(prices[-self.volatility_window:-1])
        if len(returns) == 0:
            return DEFAULT_VOLATILITY

        volatility = np.std(returns)
        return float(volatility) if volatility > 0 else DEFAULT_VOLATILITY

    def _get_average_entry_price(self, symbol: str) -> float:
        if symbol not in self.price_history or len(self.price_history[symbol]) < 5:
            return 0.0
        return float(np.mean(self.price_history[symbol][:5]))

    def _calculate_portfolio_risk(
        self,
        portfolio: Dict[str, int],
        current_prices: Dict[str, float],
        portfolio_value: float
    ) -> float:
        if portfolio_value <= 0:
            return 0.0

        total_risk = 0.0
        for symbol, shares in portfolio.items():
            if symbol in current_prices:
                position_value = shares * current_prices[symbol]
                weight = position_value / portfolio_value
                total_risk += weight * self._calculate_volatility(symbol)
        return float(total_risk)

    def calculate_sharpe_ratio(self, returns: List[float], risk_free_rate: float = 0.02) -> float:
        if not returns or len(returns) < 2:
            return 0.0

        returns_array = np.array(returns)
        mean_return = np.mean(returns_array)
        std_return = np.std(returns_array)
        if std_return == 0:
            return 0.0

        return float((mean_return - risk_free_rate / 252) / std_return * math.sqrt(252))

    def get_risk_alerts(self) -> List[str]:
        return self.risk_alerts[-10:]

    def reset_alerts(self):
        self.risk_alerts = []


if __name__ == "__main__":
    risk_agent = RiskAgent()
    decisions = {"AAPL": "Buy", "TSLA": "Sell"}
    portfolio = {"AAPL": 10, "TSLA": 5}
    prices = {"AAPL": 150.0, "TSLA": 200.0}
    result = risk_agent.evaluate(decisions, portfolio, prices, 10000.0)
    print(result)
