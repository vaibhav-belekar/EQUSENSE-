"""
Centralized Configuration for Trading Ecosystem Parameters
All agents and analysis components use these consistent, less rigorous parameters
"""

# ==========================================
# CONFIDENCE THRESHOLDS (Less Rigorous)
# ==========================================
CONFIDENCE_BUY_THRESHOLD = 0.5  # Lowered from 0.7 - more lenient
CONFIDENCE_SELL_THRESHOLD = 0.5  # Lowered from 0.7 - more lenient
CONFIDENCE_HIGH_THRESHOLD = 0.6  # Lowered from 0.8 - more lenient
CONFIDENCE_MEDIUM_THRESHOLD = 0.45  # Lowered from 0.6 - more lenient

# ==========================================
# RISK THRESHOLDS (Less Rigorous)
# ==========================================
VOLATILITY_HIGH_THRESHOLD = 0.08  # Increased from 0.05 (8% instead of 5%) - more lenient
VOLATILITY_MEDIUM_THRESHOLD = 0.05  # Increased from 0.03 (5% instead of 3%) - more lenient
VOLATILITY_LOW_THRESHOLD = 0.03  # Increased from 0.02 - more lenient

# Position Size Limits (Less Rigorous)
MAX_POSITION_SIZE = 0.40  # Increased from 0.30 (40% instead of 30%) - more lenient
POSITION_SIZE_WARNING = 0.30  # Increased from 0.20 (30% instead of 20%) - more lenient

# Stop Loss Threshold (Less Rigorous)
MAX_LOSS_THRESHOLD = 0.15  # Increased from 0.10 (15% instead of 10%) - more lenient

# Portfolio Risk (Less Rigorous)
MAX_PORTFOLIO_RISK = 0.30  # Increased from 0.20 (30% instead of 20%) - more lenient

# ==========================================
# RETURN THRESHOLDS (Less Rigorous)
# ==========================================
EXPECTED_RETURN_STRONG_BUY = 5.0  # Lowered from 10.0 (5% instead of 10%) - more lenient
EXPECTED_RETURN_BUY = 2.0  # Lowered from 5.0 (2% instead of 5%) - more lenient
EXPECTED_RETURN_HOLD = 0.0  # Same - any positive return is HOLD

# Risk Score Thresholds (Less Rigorous)
RISK_SCORE_STRONG_BUY = 7.0  # Increased from 5.0 (7 instead of 5) - more lenient
RISK_SCORE_BUY = 8.0  # Increased from 7.0 (8 instead of 7) - more lenient

# Recommendation Score Thresholds (Less Rigorous and Balanced)
SCORE_BUY_THRESHOLD = 0.8  # Lowered from 1.5 - easier to get BUY recommendation
SCORE_HOLD_THRESHOLD = 0.0  # Same - any positive score is HOLD

# ==========================================
# PRICE CHANGE THRESHOLDS (Less Rigorous)
# ==========================================
PRICE_CHANGE_SIGNAL_THRESHOLD = 0.015  # Lowered from 0.02 (1.5% instead of 2%) - more lenient
PRICE_CHANGE_CONFIDENCE_MULTIPLIER = 12.0  # Increased from 10.0 - more responsive

# ==========================================
# EXPECTED RETURN CALCULATION (Less Rigorous)
# ==========================================
EXPECTED_RETURN_MULTIPLIER = 12.0  # Increased from 10.0 (up to 12% instead of 10%) - more lenient
PRICE_CHANGE_PERCENT_MULTIPLIER = 0.18  # Increased from 0.15 (18% instead of 15%) - more lenient

# RISK SCORE CALCULATION (Even Less Rigorous)
RISK_SCALE_MULTIPLIER = 1.0  # Decreased from 1.5 (scales volatility less aggressively) - more lenient
SCORE_RISK_PENALTY = 0.25  # Decreased from 0.4 (much less penalty for risk) - more lenient

# ==========================================
# AUDITOR THRESHOLDS (Less Rigorous)
# ==========================================
WIN_RATE_THRESHOLD = 0.40  # Lowered from 0.50 (40% instead of 50%) - more lenient
PROFIT_FACTOR_THRESHOLD = 0.8  # Lowered from 1.0 (0.8 instead of 1.0) - more lenient
MAX_DRAWDOWN_THRESHOLD = 0.25  # Increased from 0.15 (25% instead of 15%) - more lenient
SHARPE_RATIO_THRESHOLD = 0.5  # Lowered from 1.0 (0.5 instead of 1.0) - more lenient

# ==========================================
# DATA PERIODS
# ==========================================
VOLATILITY_WINDOW = 20  # Days for volatility calculation
PRICE_HISTORY_WINDOW = 20  # Days for price history
ANALYSIS_PERIOD = "1mo"  # Period for analysis
HISTORICAL_ANALYSIS_DAYS = 30  # Days for historical analysis

# ==========================================
# TRADER AGENT PARAMETERS
# ==========================================
TRADER_HIGH_CONFIDENCE_THRESHOLD = 0.6  # Lowered from 0.75 - more lenient
TRADER_CAPITAL_PERCENT_PER_TRADE = 0.25  # Increased from 0.20 (25% instead of 20%) - more lenient
TRADER_EXPLORATION_RATE = 0.2  # Same - exploration rate
TRADER_LEARNING_RATE = 0.1  # Same - learning rate

# ==========================================
# DEFAULT VALUES (More Optimistic)
# ==========================================
DEFAULT_CONFIDENCE = 0.5
DEFAULT_VOLATILITY = 0.02  # 2% default volatility
DEFAULT_RISK_SCORE = 3.0  # Lowered from 4.0 - more optimistic
DEFAULT_EXPECTED_RETURN = 2.0  # Decreased from 3.0 but still positive - balanced

