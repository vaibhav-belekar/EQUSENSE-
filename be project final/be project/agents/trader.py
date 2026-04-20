"""
Trader Agent
Makes portfolio actions from expected return, risk, and risk-agent feedback.
"""

from __future__ import annotations

from datetime import datetime
from typing import Dict, List
import os
import random
import sys

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from backend.config import (
        EXPECTED_RETURN_HOLD,
        EXPECTED_RETURN_STRONG_BUY,
        RISK_SCORE_STRONG_BUY,
        SCORE_BUY_THRESHOLD,
        TRADER_CAPITAL_PERCENT_PER_TRADE,
        TRADER_EXPLORATION_RATE,
        TRADER_LEARNING_RATE
    )
except ImportError:
    EXPECTED_RETURN_HOLD = 0.0
    EXPECTED_RETURN_STRONG_BUY = 5.0
    RISK_SCORE_STRONG_BUY = 7.0
    SCORE_BUY_THRESHOLD = 0.8
    TRADER_CAPITAL_PERCENT_PER_TRADE = 0.25
    TRADER_EXPLORATION_RATE = 0.2
    TRADER_LEARNING_RATE = 0.1


class TraderAgent:
    """Trader Agent that acts on risk-adjusted return forecasts."""

    def __init__(self, initial_capital: float = 100000.0, transaction_cost: float = 0.001):
        self.initial_capital = initial_capital
        self.capital = initial_capital
        self.transaction_cost = transaction_cost
        self.portfolio: Dict[str, int] = {}
        self.prices: Dict[str, float] = {}
        self.trade_history: List[Dict] = []
        self.total_trades = 0
        self.successful_trades = 0
        self.learning_rate = TRADER_LEARNING_RATE
        self.exploration_rate = TRADER_EXPLORATION_RATE
        self.q_table: Dict[str, Dict[str, float]] = {}
        self.last_decision_context: Dict[str, Dict[str, any]] = {}

    def process(
        self,
        analyst_predictions: Dict[str, Dict[str, any]],
        current_prices: Dict[str, float],
        risk_agent=None,
        portfolio_value: float = None
    ) -> Dict[str, str]:
        """Process analyst forecasts and return final actions."""
        decisions = {}
        self.prices = current_prices
        portfolio_value = portfolio_value or self.get_portfolio_value(current_prices)

        for symbol, prediction in analyst_predictions.items():
            if symbol not in current_prices:
                decisions[symbol] = "Hold"
                continue

            action, context = self._make_decision(symbol, prediction, current_prices[symbol])

            if risk_agent is not None:
                action, risk_note = risk_agent.preview_trade(
                    symbol=symbol,
                    proposed_action=action,
                    prediction=prediction,
                    portfolio=self.get_portfolio(),
                    current_prices=current_prices,
                    portfolio_value=portfolio_value
                )
                context["risk_note"] = risk_note

            decisions[symbol] = action
            self.last_decision_context[symbol] = context

            print(
                f"[Trader] {symbol}: action={action} expected_return={prediction.get('expected_return', 0):.2f}% "
                f"risk={prediction.get('risk', 0):.2f} score={prediction.get('score', 0):.2f} "
                f"confidence={prediction.get('confidence', 0):.2f}"
            )

        return decisions

    def _make_decision(self, symbol: str, prediction: Dict[str, any], price: float):
        shares = self.portfolio.get(symbol, 0)
        expected_return = float(prediction.get("expected_return", 0.2))
        risk = float(prediction.get("risk", 5.0))
        confidence = float(prediction.get("confidence", 0.5))
        score = float(prediction.get("score", expected_return / max(risk, 0.5)))
        recommendation = "Hold"
        if expected_return < EXPECTED_RETURN_HOLD:
            recommendation = "Avoid"
        elif expected_return >= EXPECTED_RETURN_STRONG_BUY and risk <= RISK_SCORE_STRONG_BUY and score >= SCORE_BUY_THRESHOLD:
            recommendation = "Buy"
        else:
            recommendation = "Hold"

        if recommendation == "Buy":
            action = "Buy" if shares == 0 else "Hold"
        elif recommendation == "Avoid":
            action = "Sell" if shares > 0 and expected_return < 0 else "Hold"
        else:
            action = "Hold"

        if action == "Hold" and confidence < 0.45 and random.random() < self.exploration_rate * 0.25:
            action = self._rl_decision(symbol, recommendation, score, shares)

        self._update_q_table(symbol, recommendation, score, action)

        context = {
            "recommendation": recommendation,
            "expected_return": expected_return,
            "risk": risk,
            "score": score,
            "confidence": confidence,
            "price": price
        }
        return action, context

    def _rl_decision(self, symbol: str, recommendation: str, score: float, shares: int) -> str:
        state = f"{recommendation}_{'holding' if shares > 0 else 'empty'}"
        if state not in self.q_table:
            self.q_table[state] = {'Buy': 0.0, 'Sell': 0.0, 'Hold': 0.0}

        q_values = self.q_table[state]
        if recommendation == "Buy":
            q_values["Buy"] += max(score, 0)
        elif recommendation == "Avoid":
            q_values["Sell"] += abs(min(score, 0)) + 0.1
        else:
            q_values["Hold"] += 0.15

        action = max(q_values, key=q_values.get)
        if action == "Buy" and shares > 0:
            return "Hold"
        if action == "Sell" and shares == 0:
            return "Hold"
        return action

    def _update_q_table(self, symbol: str, recommendation: str, score: float, action: str):
        state = f"{recommendation}_{'holding' if self.portfolio.get(symbol, 0) > 0 else 'empty'}"
        if state not in self.q_table:
            self.q_table[state] = {'Buy': 0.0, 'Sell': 0.0, 'Hold': 0.0}

        reward = max(score, 0.05) if action != "Hold" else 0.05
        self.q_table[state][action] += self.learning_rate * reward

    def _risk_level(self, risk: float) -> str:
        if risk <= 3.0:
            return "Low"
        if risk <= 6.0:
            return "Medium"
        return "High"

    def execute_trade(self, symbol: str, action: str, quantity: int = None, price: float = None) -> Dict[str, any]:
        if action == "Hold":
            return {"action": "Hold", "symbol": symbol, "shares": 0, "cost": 0}

        if price is None:
            price = self.prices.get(symbol, 0)

        if price == 0:
            return {"action": "Hold", "symbol": symbol, "shares": 0, "cost": 0, "error": "No price"}

        current_shares = self.portfolio.get(symbol, 0)

        if action == "Buy":
            if quantity is None:
                available_capital = self.capital * TRADER_CAPITAL_PERCENT_PER_TRADE
                quantity = int(available_capital / price)

            if quantity <= 0:
                return {"action": "Hold", "symbol": symbol, "shares": 0, "cost": 0}

            cost = quantity * price * (1 + self.transaction_cost)
            if cost > self.capital:
                quantity = int(self.capital / (price * (1 + self.transaction_cost)))
                cost = quantity * price * (1 + self.transaction_cost)

            if quantity > 0:
                self.portfolio[symbol] = current_shares + quantity
                self.capital -= cost
                self.total_trades += 1

                trade = {
                    "action": "Buy",
                    "symbol": symbol,
                    "shares": quantity,
                    "price": price,
                    "cost": cost,
                    "timestamp": datetime.now()
                }
                self.trade_history.append(trade)
                print(f"[Trader] Executed Buy Order: {quantity} shares of {symbol} at ${price:.2f}")
                return trade

        elif action == "Sell":
            if current_shares == 0:
                return {"action": "Hold", "symbol": symbol, "shares": 0, "cost": 0}

            if quantity is None:
                quantity = current_shares

            quantity = min(quantity, current_shares)
            revenue = quantity * price * (1 - self.transaction_cost)
            self.portfolio[symbol] = current_shares - quantity
            self.capital += revenue
            self.total_trades += 1

            trade = {
                "action": "Sell",
                "symbol": symbol,
                "shares": quantity,
                "price": price,
                "revenue": revenue,
                "timestamp": datetime.now()
            }
            self.trade_history.append(trade)
            print(f"[Trader] Executed Sell Order: {quantity} shares of {symbol} at ${price:.2f}")
            return trade

        return {"action": "Hold", "symbol": symbol, "shares": 0, "cost": 0}

    def get_portfolio_value(self, current_prices: Dict[str, float]) -> float:
        portfolio_value = self.capital
        for symbol, shares in self.portfolio.items():
            if symbol in current_prices:
                portfolio_value += shares * current_prices[symbol]
        return portfolio_value

    def get_portfolio(self) -> Dict[str, int]:
        return self.portfolio.copy()

    def get_trade_history(self) -> List[Dict]:
        return self.trade_history.copy()


if __name__ == "__main__":
    trader = TraderAgent(initial_capital=100000.0)
    analyst_predictions = {
        "AAPL": {"expected_return": 12.5, "risk": 2.4, "score": 5.2, "confidence": 0.74},
        "TSLA": {"expected_return": 3.1, "risk": 5.5, "score": 0.56, "confidence": 0.58}
    }
    current_prices = {"AAPL": 150.0, "TSLA": 200.0}
    decisions = trader.process(analyst_predictions, current_prices)
    print(f"\nDecisions: {decisions}")
