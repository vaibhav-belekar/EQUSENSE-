# Quick Start Guide

## Installation

1. **Install Python dependencies:**
```bash
pip install -r requirements.txt
```

2. **Verify installation:**
```bash
python -c "import yfinance, pandas, numpy, tensorflow, streamlit; print('All packages installed!')"
```

## Running the System

### Option 1: Streamlit Dashboard (Recommended)

Launch the interactive dashboard:
```bash
streamlit run dashboard.py
```

The dashboard will open in your browser at `http://localhost:8501`

**Features:**
- Real-time trading cycle execution
- Performance metrics visualization
- Portfolio holdings display
- Agent status monitoring
- Trade history tracking

### Option 2: Command Line Interface

Run the ecosystem directly:
```bash
python main.py
```

**Interactive Options:**
- Train models (optional, recommended for better predictions)
- Run single trading cycle
- Run multiple cycles
- Run full simulation (10 cycles)

## First Run

1. **Start with Dashboard:**
   ```bash
   streamlit run dashboard.py
   ```

2. **Click "Train Models"** in the sidebar (optional but recommended)

3. **Click "Run Trading Cycle"** to execute a complete cycle

4. **View results** in the Dashboard tabs:
   - **Dashboard**: Overview and metrics
   - **Portfolio**: Current holdings
   - **Predictions**: Analyst predictions
   - **Reports**: Performance reports

## Understanding the Flow

1. **Analyst Agent** → Analyzes stocks and predicts trends
2. **Trader Agent** → Makes buy/sell/hold decisions
3. **Risk Agent** → Evaluates and adjusts for risk
4. **Trades Executed** → Based on risk-adjusted decisions
5. **Auditor Agent** → Records and evaluates performance

## Configuration

### Change Stock Symbols

Edit `main.py` or use the dashboard sidebar:
```python
ecosystem = TradingEcosystem(
    symbols=['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN'],
    initial_capital=100000.0
)
```

### Adjust Risk Parameters

Edit `agents/risk.py`:
```python
risk_agent = RiskAgent(
    max_position_size=0.30,  # Max 30% in single stock
    max_loss_threshold=0.10,  # Stop loss at 10%
    max_portfolio_risk=0.20   # Max 20% portfolio risk
)
```

### Adjust Trading Parameters

Edit `agents/trader.py`:
```python
trader = TraderAgent(
    initial_capital=100000.0,
    transaction_cost=0.001  # 0.1% transaction cost
)
```

## Troubleshooting

### Issue: "No data fetched for [SYMBOL]"
- **Solution**: Check internet connection and symbol validity
- Some symbols may not be available on yfinance

### Issue: "Model not trained"
- **Solution**: Click "Train Models" in dashboard or run training in CLI
- Models will use simple heuristics if not trained

### Issue: "Insufficient data"
- **Solution**: Wait for more data to accumulate or use longer period
- Default period is 3 months, can be increased

## Performance Tips

1. **Train models first** for better predictions
2. **Start with fewer symbols** (2-3) for faster execution
3. **Use shorter periods** for testing (1mo instead of 1y)
4. **Monitor risk alerts** in the dashboard

## Next Steps

- Experiment with different stock symbols
- Adjust risk parameters
- Train models with more epochs for better accuracy
- Review performance reports regularly
- Customize agent strategies

## Support

For issues or questions:
1. Check the README.md for detailed documentation
2. Review agent code in `agents/` directory
3. Check console logs for detailed execution flow

