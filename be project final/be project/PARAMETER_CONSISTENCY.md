# Parameter Consistency - Less Rigorous Settings

## Overview

All parameters for analyzing recommendation logic, analysis reports, and all agents have been standardized to use consistent, less rigorous (more lenient) thresholds throughout the application.

## Centralized Configuration

All parameters are now defined in `backend/config.py` and used consistently across:

1. **Backend API** (`backend/api.py`)
2. **Risk Agent** (`agents/risk.py`)
3. **Trader Agent** (`agents/trader.py`)
4. **Auditor Agent** (`agents/auditor.py`)
5. **Frontend Components** (`frontend/src/components/StockReport.jsx`)

## Parameter Changes (Less Rigorous)

### Confidence Thresholds
- **BUY Threshold**: `0.5` (was `0.7`) - More lenient
- **SELL Threshold**: `0.5` (was `0.7`) - More lenient
- **HIGH Confidence**: `0.6` (was `0.8`) - More lenient
- **MEDIUM Confidence**: `0.45` (was `0.6`) - More lenient

### Risk Thresholds
- **High Volatility**: `0.08` (8%, was `0.05` or 5%) - More lenient
- **Medium Volatility**: `0.05` (5%, was `0.03` or 3%) - More lenient
- **Low Volatility**: `0.03` (3%, was `0.02` or 2%) - More lenient

### Position Size Limits
- **Max Position Size**: `0.40` (40%, was `0.30` or 30%) - More lenient
- **Position Size Warning**: `0.30` (30%, was `0.20` or 20%) - More lenient

### Stop Loss Thresholds
- **Max Loss Threshold**: `0.15` (15%, was `0.10` or 10%) - More lenient
- **Max Portfolio Risk**: `0.30` (30%, was `0.20` or 20%) - More lenient

### Return Thresholds
- **STRONG BUY Expected Return**: `5.0%` (was `10.0%`) - More lenient
- **BUY Expected Return**: `2.0%` (was `5.0%`) - More lenient
- **Risk Score for STRONG BUY**: `7.0` (was `5.0`) - More lenient
- **Risk Score for BUY**: `8.0` (was `7.0`) - More lenient

### Recommendation Score Thresholds
- **BUY Score Threshold**: `1.5` (was `3.0`) - More lenient
- **Risk Penalty**: `0.4` (was `0.5`) - Less penalty for risk
- **Risk Scale Multiplier**: `1.5` (was `2.0`) - Less aggressive scaling

### Price Change Thresholds
- **Signal Threshold**: `0.015` (1.5%, was `0.02` or 2%) - More sensitive
- **Confidence Multiplier**: `12.0` (was `10.0`) - More responsive
- **Expected Return Multiplier**: `12.0%` (was `10.0%`) - Higher potential returns
- **Price Change Percent Multiplier**: `0.18` (18%, was `0.15` or 15%) - More optimistic

### Auditor Thresholds
- **Win Rate Threshold**: `0.40` (40%, was `0.50` or 50%) - More lenient
- **Profit Factor Threshold**: `0.8` (was `1.0`) - More lenient
- **Max Drawdown Threshold**: `0.25` (25%, was `0.15` or 15%) - More lenient
- **Sharpe Ratio Threshold**: `0.5` (was `1.0`) - More lenient

### Trader Agent Parameters
- **High Confidence Threshold**: `0.6` (was `0.75`) - More lenient
- **Capital Percent Per Trade**: `0.25` (25%, was `0.20` or 20%) - More aggressive
- **Exploration Rate**: `0.2` (same) - Unchanged
- **Learning Rate**: `0.1` (same) - Unchanged

## Usage

All components automatically use these parameters from the centralized config file:

```python
from backend.config import (
    CONFIDENCE_BUY_THRESHOLD,
    VOLATILITY_HIGH_THRESHOLD,
    MAX_POSITION_SIZE,
    # ... etc
)
```

## Benefits

1. **Consistency**: All components use the same parameters
2. **Maintainability**: Change parameters in one place (config.py)
3. **Less Rigorous**: More lenient thresholds make recommendations more accessible
4. **Flexibility**: Easy to adjust parameters for different risk profiles

## Files Modified

1. `backend/config.py` - New centralized configuration file
2. `backend/api.py` - Updated to use config parameters
3. `agents/risk.py` - Updated to use config parameters
4. `agents/trader.py` - Updated to use config parameters
5. `agents/auditor.py` - Updated to use config parameters
6. `frontend/src/components/StockReport.jsx` - Updated thresholds to match config

## Testing

After these changes:
- Recommendations should be more frequent (less strict thresholds)
- BUY signals should appear more often (lower confidence threshold)
- Risk assessments should be more lenient
- Analysis reports should use consistent parameters across all agents

## Future Adjustments

To adjust parameters, simply modify `backend/config.py` and restart the backend server. All components will automatically use the new values.

