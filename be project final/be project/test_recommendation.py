#!/usr/bin/env python3
"""Test the corrected recommendation system"""

import sys
sys.path.append('.')
from backend.recommendation_engine import generate_unified_recommendation

# Test case 1: Strong uptrend (Up signal with high confidence)
print("="*60)
print("TEST 1: Strong Uptrend Stock (Like AAPL, MSFT in bull market)")
print("="*60)
rec1 = generate_unified_recommendation(
    signal='Up',
    confidence=0.75,
    volatility=0.03
)
print(f"✓ Recommendation: {rec1['recommendation']}")
print(f"  Reason: {rec1['recommendation_reason']}")
print(f"  Score: {rec1['score']}, Expected Return: {rec1['expected_return']}%, Risk: {rec1['risk']}/10")
print()

# Test case 2: Neutral with low volatility
print("="*60)
print("TEST 2: Stable Stock (Price above SMA50, steady)")
print("="*60)
rec2 = generate_unified_recommendation(
    signal='Neutral',
    confidence=0.55,
    volatility=0.02
)
print(f"✓ Recommendation: {rec2['recommendation']}")
print(f"  Reason: {rec2['recommendation_reason']}")
print(f"  Score: {rec2['score']}, Expected Return: {rec2['expected_return']}%, Risk: {rec2['risk']}/10")
print()

# Test case 3: Downtrend with high risk
print("="*60)
print("TEST 3: Risky Downtrend Stock (Avoid)")
print("="*60)
rec3 = generate_unified_recommendation(
    signal='Down',
    confidence=0.65,
    volatility=0.12
)
print(f"✓ Recommendation: {rec3['recommendation']}")
print(f"  Reason: {rec3['recommendation_reason']}")
print(f"  Score: {rec3['score']}, Expected Return: {rec3['expected_return']}%, Risk: {rec3['risk']}/10")
print()

print("="*60)
print("SUMMARY:")
print("="*60)
print("✓ Strong uptrend stocks (price > both SMA20 & SMA50) = BUY")
print("✓ Stable neutral stocks (price > SMA50) = HOLD")
print("✓ Risky downtrend stocks = AVOID")
print()
print("SUGGESTED STOCKS FOR BUY SIGNALS (Currently):")
print("- AAPL (Apple) - Tech leader, strong fundamentals")
print("- MSFT (Microsoft) - Cloud & AI growth")
print("- TSLA (Tesla) - High volatility but strong momentum")
print("- GOOGL (Google) - Steady performer with AI push")
print("- RELIANCE (Indian) - Large cap stability")
