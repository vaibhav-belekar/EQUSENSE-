"""
Unified Recommendation Engine
Uses all agents consistently to generate recommendations
All logic matches the agent implementations
"""

import sys
import os
from typing import Dict, Optional, Tuple

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Try importing from backend.config first (when run as module), then from config (direct)
try:
    from config import (
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
        EXPECTED_RETURN_MULTIPLIER,
        RISK_SCALE_MULTIPLIER,
        SCORE_RISK_PENALTY,
        DEFAULT_CONFIDENCE,
        DEFAULT_VOLATILITY,
        DEFAULT_RISK_SCORE,
        DEFAULT_EXPECTED_RETURN,
        VOLATILITY_WINDOW
    )
except ImportError:
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
        EXPECTED_RETURN_MULTIPLIER,
        RISK_SCALE_MULTIPLIER,
        SCORE_RISK_PENALTY,
        DEFAULT_CONFIDENCE,
        DEFAULT_VOLATILITY,
        DEFAULT_RISK_SCORE,
        DEFAULT_EXPECTED_RETURN,
        VOLATILITY_WINDOW
    )
import pandas as pd
import numpy as np


def calculate_volatility_from_data(df: pd.DataFrame, window: int = None) -> float:
    """
    Calculate volatility from price data using the same logic as Risk Agent
    This matches the RiskAgent._calculate_volatility method
    """
    if df is None or df.empty or 'Close' not in df.columns:
        return DEFAULT_VOLATILITY
    
    window = window or VOLATILITY_WINDOW
    recent_prices = df['Close'].tail(window)
    
    if len(recent_prices) < 2:
        return DEFAULT_VOLATILITY
    
    # Calculate returns (same as Risk Agent)
    returns = recent_prices.pct_change().dropna()
    
    if len(returns) == 0:
        return DEFAULT_VOLATILITY
    
    # Calculate volatility (standard deviation of returns) - same as Risk Agent
    volatility = float(returns.std())
    
    return volatility if volatility > 0 else DEFAULT_VOLATILITY


def calculate_risk_level(volatility: float) -> Tuple[str, list]:
    """
    Calculate risk level using the same logic as Risk Agent
    This matches the risk assessment in analyze-investment endpoint
    """
    alerts = []
    
    if volatility > VOLATILITY_HIGH_THRESHOLD:
        risk_level = "High"
        alerts.append(f"High volatility detected ({volatility*100:.2f}%). Consider smaller position size.")
    elif volatility > VOLATILITY_MEDIUM_THRESHOLD:
        risk_level = "Medium"
        alerts.append(f"Moderate volatility ({volatility*100:.2f}%). Monitor position closely.")
    else:
        risk_level = "Low"
    
    return risk_level, alerts


def calculate_risk_score(volatility: float) -> float:
    """
    Calculate risk score (0-10) from volatility using the same logic as recommendation endpoint
    This matches the risk calculation in /api/recommend/{symbol}
    """
    # Risk is volatility as percentage (scale to 0-10 using config)
    risk = min(10.0, max(0.0, volatility * 100 * RISK_SCALE_MULTIPLIER))
    return risk


def get_risk_level_from_score(risk_score: float) -> str:
    """
    Convert a 0-10 risk score into a display-friendly label.
    """
    if risk_score <= 3.0:
        return "Low"
    if risk_score <= 6.0:
        return "Medium"
    return "High"


def calculate_effective_risk(
    volatility: float,
    expected_return: Optional[float] = None,
    confidence: float = DEFAULT_CONFIDENCE,
) -> Tuple[float, str, list]:
    """
    Blend realized volatility with downside outlook so negative-return setups do not
    show unrealistically low risk.
    """
    base_risk = calculate_risk_score(volatility)
    _, alerts = calculate_risk_level(volatility)
    alerts = list(alerts)
    effective_risk = base_risk

    if expected_return is not None and expected_return < 0:
        downside_penalty = min(4.0, abs(expected_return) * (0.35 + 0.65 * confidence))
        effective_risk = min(10.0, base_risk + downside_penalty)

        minimum_downside_risk = 4.0
        if expected_return <= -4.0 and confidence >= 0.65:
            minimum_downside_risk = 6.5

        effective_risk = max(effective_risk, minimum_downside_risk)
        alerts.append(
            f"Negative return outlook ({expected_return:.2f}%) increases downside risk at {confidence*100:.1f}% confidence."
        )

    risk_level = get_risk_level_from_score(effective_risk)
    return effective_risk, risk_level, alerts


def calculate_expected_return(signal: str, confidence: float) -> float:
    """
    Derive a continuous return estimate from direction and confidence.
    """
    confidence = float(np.clip(confidence, 0.0, 1.0))
    if signal == 'Up':
        expected_return = 0.8 + (confidence * 6.2)
    elif signal == 'Down':
        expected_return = -0.8 - (confidence * 6.2)
    else:
        expected_return = (confidence - 0.5) * 2.4

    if abs(expected_return) < 0.2:
        expected_return = 0.2 if expected_return >= 0 else -0.2

    return expected_return


def dampen_sentiment_impact(score: float, signal: str) -> float:
    """
    Keep news sentiment useful without letting a mildly negative headline
    flip most neutral setups into a SELL call.
    """
    multiplier = 0.35 if signal == 'Neutral' else 0.5
    return float(np.clip(score * multiplier, -0.6, 0.6))


def calculate_recommendation_score(expected_return: float, risk: float) -> float:
    """
    Score = expected return divided by risk.
    """
    score = expected_return / max(risk, 0.5)
    return score


def get_recommendation_from_score(score: float, confidence: float, expected_return: float, risk: float) -> Dict:
    """
    Return decision labels aligned with the agents.
    """
    risk_level = get_risk_level_from_score(risk)

    if expected_return >= 0.75 and confidence >= CONFIDENCE_BUY_THRESHOLD and risk <= 9.0 and score >= 0.12:
        recommendation = "BUY"
        color = "green"
        reason = (
            f"Profit outlook is positive ({expected_return:.2f}%) with acceptable risk "
            f"({risk:.2f}/10) and a supportive return/risk score ({score:.2f})."
        )
    elif expected_return <= -0.75 and confidence >= CONFIDENCE_SELL_THRESHOLD and score <= -0.12:
        recommendation = "SELL"
        color = "red"
        reason = (
            f"Modeled return is negative ({expected_return:.2f}%) after accounting for "
            f"risk ({risk:.2f}/10), so downside outweighs reward."
        )
    else:
        recommendation = "HOLD"
        color = "yellow"
        reason = (
            f"Return/risk profile is positive but not strong enough for a buy call yet: "
            f"expected return {expected_return:.2f}%, risk {risk:.2f}/10, score {score:.2f}."
        )

    return {
        "recommendation": recommendation,
        "color": color,
        "reason": reason,
        "score": round(float(score), 2),
        "expected_return": round(float(expected_return), 2),
        "risk": round(float(risk), 1),
        "confidence": round(float(confidence * 100), 1)
    }


def get_model_aligned_recommendation(
    signal: str,
    confidence: float,
    expected_return: float,
    risk: float,
    score: Optional[float] = None,
    has_position: bool = False,
) -> Dict:
    """
    Keep the final recommendation aligned with the analyst model's trend signal.
    """
    normalized_signal = (signal or "Neutral").strip().title()
    computed_score = float(score if score is not None else calculate_recommendation_score(expected_return, risk))

    bullish_setup = normalized_signal == "Up"
    bearish_setup = normalized_signal == "Down"

    if bullish_setup:
        recommendation = "BUY"
        color = "green"
        reason = (
            f"ML trend model is bullish ({normalized_signal}) with {confidence*100:.1f}% confidence. "
            f"Modeled return is {expected_return:.2f}% with risk {risk:.2f}/10, so the setup supports a buy."
        )
    elif bearish_setup:
        recommendation = "SELL" if has_position else "AVOID"
        color = "red"
        reason = (
            f"ML trend model is bearish ({normalized_signal}) with {confidence*100:.1f}% confidence. "
            f"Modeled return is {expected_return:.2f}%. Avoid fresh entry; if already holding, consider SELL/EXIT."
        )
    else:
        recommendation = "HOLD"
        color = "yellow"
        reason = (
            f"ML trend model is {normalized_signal.lower()} with {confidence*100:.1f}% confidence. "
            f"Current return/risk profile ({expected_return:.2f}% / {risk:.2f}) is not strong enough for a decisive buy."
        )

    return {
        "recommendation": recommendation,
        "color": color,
        "reason": reason,
        "score": round(float(computed_score), 2),
        "expected_return": round(float(expected_return), 2),
        "risk": round(float(risk), 1),
        "confidence": round(float(confidence * 100), 1),
        "signal": normalized_signal,
        "alternate_action": "AVOID fresh entry; SELL/EXIT if already holding." if normalized_signal == "Down" else None,
    }


def get_auditor_recommendation(expected_return: float, risk_score: float) -> str:
    """
    Get conservative Auditor Agent recommendation for Indian market
    This matches the auditor recommendation logic in /api/analyze-investment
    """
    if expected_return >= EXPECTED_RETURN_STRONG_BUY and risk_score <= RISK_SCORE_STRONG_BUY:
        recommendation = f"BUY: Strong expected return ({expected_return:.2f}%) with low risk."
    elif expected_return > 0:
        recommendation = f"BUY: Positive expected return ({expected_return:.2f}%) still supports a buy view."
    else:
        recommendation = f"SELL: Expected return ({expected_return:.2f}%) is below the minimum target."

    return recommendation


def get_trader_action(signal: str, confidence: float) -> str:
    """
    Get Trader Agent action using the same logic as Trader Agent
    This matches the TraderAgent._make_decision method (simplified version)
    """
    expected_return = calculate_expected_return(signal, confidence)
    estimated_risk = max(1.0, calculate_risk_score(DEFAULT_VOLATILITY))
    score = calculate_recommendation_score(expected_return, estimated_risk)
    if expected_return > 0 and estimated_risk <= RISK_SCORE_BUY and score > 0:
        return 'Buy'
    if expected_return < 0:
        return 'Sell'
    return 'Hold'


def generate_unified_recommendation(
    signal: str,
    confidence: float,
    volatility: float,
    current_price: float = None,
    investment_amount: float = None,
    portfolio_value: float = None,
    sentiment_score: float = 0.0,
    sentiment_label: str = "Neutral",
    base_expected_return: Optional[float] = None,
) -> Dict:
    """
    Generate unified recommendation using the same logic as all agents
    This ensures consistency across all endpoints
    
    Args:
        signal: Stock signal ('Up', 'Down', 'Neutral')
        confidence: Confidence level (0-1)
        volatility: Volatility (standard deviation of returns)
        current_price: Current stock price (optional)
        investment_amount: Investment amount (optional)
        portfolio_value: Portfolio value (optional)
    
    Returns:
        Dictionary with recommendation, risk assessment, and all metrics
    """
    sentiment_score = float(np.clip(sentiment_score or 0.0, -1.0, 1.0))
    base_return = (
        float(base_expected_return)
        if base_expected_return is not None
        else calculate_expected_return(signal, confidence)
    )
    sentiment_impact = dampen_sentiment_impact(sentiment_score, signal)
    expected_return = float(np.clip(base_return + sentiment_impact, -12.0, 12.0))

    # Calculate risk score
    risk, risk_level, risk_alerts = calculate_effective_risk(
        volatility,
        expected_return=expected_return,
        confidence=confidence,
    )

    # Calculate recommendation score
    score = calculate_recommendation_score(expected_return, risk)
    
    # Get recommendation
    recommendation_data = get_recommendation_from_score(score, confidence, expected_return, risk)
    
    # Get trader action
    trader_action = get_trader_action(signal, confidence)
    
    # Get auditor recommendation
    auditor_recommendation = get_auditor_recommendation(expected_return, risk)
    
    # Check position size if investment amount and portfolio value provided
    position_size_percent = None
    if investment_amount and portfolio_value and portfolio_value > 0:
        position_size_percent = (investment_amount / portfolio_value * 100)
        
        if position_size_percent > MAX_POSITION_SIZE * 100:
            risk_level = "High"
            risk_alerts.append(f"Position size ({position_size_percent:.1f}%) exceeds recommended {MAX_POSITION_SIZE*100:.0f}% limit.")
        elif position_size_percent > POSITION_SIZE_WARNING * 100:
            risk_alerts.append(f"Position size ({position_size_percent:.1f}%) is above {POSITION_SIZE_WARNING*100:.0f}% threshold.")

    if abs(sentiment_impact) >= 0.1:
        direction = "boosts" if sentiment_impact > 0 else "reduces"
        risk_alerts.append(
            f"{sentiment_label} news sentiment {direction} expected return by {abs(sentiment_impact):.2f}%."
        )
    
    return {
        "signal": signal,
        "confidence": confidence,
        "volatility": volatility,
        "risk": risk,
        "risk_level": risk_level,
        "risk_alerts": risk_alerts,
        "expected_return": expected_return,
        "score": score,
        "recommendation": recommendation_data["recommendation"],
        "recommendation_color": recommendation_data["color"],
        "recommendation_reason": recommendation_data["reason"],
        "trader_action": trader_action,
        "auditor_recommendation": auditor_recommendation,
        "position_size_percent": position_size_percent,
        "sentiment_score": round(sentiment_score, 3),
        "sentiment_label": sentiment_label,
        "sentiment_impact": round(sentiment_impact, 2),
        "base_expected_return": round(base_return, 2),
    }

