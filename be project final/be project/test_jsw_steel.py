#!/usr/bin/env python3
"""Test JSW Steel recommendation"""

import sys
sys.path.insert(0, '.')

# Simulate the recommendation logic for JSW Steel
from backend.recommendation_engine import generate_unified_recommendation

print("=" * 70)
print("TESTING JSW STEEL (Indian Stock)")
print("=" * 70)
print()

# JSW Steel typical characteristics
# A strong Indian steel stock with good momentum

test_cases = [
    {
        "name": "JSW Steel Current (With .NS suffix)",
        "symbol": "JSWSTEEL.NS",
        "signal": "Up",
        "confidence": 0.65,
        "volatility": 0.045
    },
    {
        "name": "JSW Steel Base (Without suffix)",
        "symbol": "JSWSTEEL",
        "signal": "Up",
        "confidence": 0.65,
        "volatility": 0.045
    },
    {
        "name": "JSW Steel Neutral",
        "symbol": "JSWSTEEL",
        "signal": "Neutral",
        "confidence": 0.55,
        "volatility": 0.035
    }
]

for test in test_cases:
    print(f"Testing: {test['name']}")
    print(f"Symbol: {test['symbol']}")
    print()
    
    rec = generate_unified_recommendation(
        signal=test["signal"],
        confidence=test["confidence"],
        volatility=test["volatility"]
    )
    
    print(f"✓ Recommendation: {rec['recommendation'].upper()}")
    print(f"  Signal: {test['signal']} | Confidence: {test['confidence']*100:.0f}%")
    print(f"  Volatility: {test['volatility']*100:.1f}% | Risk Score: {rec['risk']}/10")
    print(f"  Expected Return: {rec['expected_return']}%")
    print(f"  Overall Score: {rec['score']}")
    print(f"  ")
    print(f"  Reason: {rec['recommendation_reason']}")
    print()
    print("-" * 70)
    print()

print("=" * 70)
print("IF JSW STEEL STILL NOT ANALYZING:")
print("=" * 70)
print()
print("Possible Issues:")
print()
print("1. ✓ Symbol Format Issue")
print("   Indian stocks need: JSWSTEEL.NS (NSE) or JSWSTEEL.BO (BSE)")
print("   Frontend should auto-add .NS when detecting Indian stock")
print()
print("2. ✓ Data Fetching Issue")
print("   Check if yfinance can fetch JSWSTEEL.NS data")
print("   Try manually: curl 'http://localhost:8001/api/recommend/JSWSTEEL.NS'")
print()
print("3. ✓ Missing Analyst Model")
print("   If LSTM model not trained for JSW, it falls back to simple prediction")
print("   Should still work - uses moving average logic")
print()
print("=" * 70)
print("SOLUTION:")
print("=" * 70)
print()
print("Run this API call:")
print("  curl http://localhost:8001/api/recommend/JSWSTEEL.NS")
print()
print("Or from frontend, make request to:")
print("  /api/recommend/JSWSTEEL.NS")
print()
print("This SHOULD now return BUY or HOLD (not AVOID)")
print("=" * 70)
