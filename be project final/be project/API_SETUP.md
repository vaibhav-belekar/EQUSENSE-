# API Integration Setup Guide

## Current Status

✅ **yfinance** - Connected (Free, no API key needed)
- Works out of the box
- Fetches historical data from Yahoo Finance
- No rate limits for basic usage

⚠️ **Alpha Vantage** - Available but requires API key
- Free tier: 5 calls/min, 500 calls/day
- Get API key: https://www.alphavantage.co/support/#api-key

⚠️ **Alpaca** - Available but requires API keys
- Free paper trading account
- Get API keys: https://alpaca.markets/
- Supports real-time data and paper trading

## Quick Setup

### 1. Using yfinance (Default - No Setup Needed)

The project works immediately with yfinance. No API keys required!

```bash
python main.py
# or
streamlit run dashboard.py
```

### 2. Setting Up Alpha Vantage API

1. **Get API Key:**
   - Visit: https://www.alphavantage.co/support/#api-key
   - Sign up for free account
   - Copy your API key

2. **Set Environment Variable:**
   ```bash
   # Windows PowerShell
   $env:ALPHA_VANTAGE_API_KEY="your_api_key_here"
   
   # Windows CMD
   set ALPHA_VANTAGE_API_KEY=your_api_key_here
   
   # Linux/Mac
   export ALPHA_VANTAGE_API_KEY="your_api_key_here"
   ```

3. **Or use .env file:**
   ```bash
   # Copy example file
   copy .env.example .env
   
   # Edit .env and add your key
   ALPHA_VANTAGE_API_KEY=your_api_key_here
   ```

4. **Update code to use Alpha Vantage:**
   ```python
   from data.api_integrations import APIDataCollector
   
   collector = APIDataCollector(['AAPL'], api_source='alpha_vantage')
   ```

### 3. Setting Up Alpaca API (Paper Trading)

1. **Create Account:**
   - Visit: https://alpaca.markets/
   - Sign up for free paper trading account
   - Go to Dashboard → API Keys

2. **Get API Keys:**
   - Copy API Key ID
   - Copy Secret Key

3. **Set Environment Variables:**
   ```bash
   # Windows PowerShell
   $env:ALPHA_VANTAGE_API_KEY="your_api_key"
   $env:ALPACA_SECRET_KEY="your_secret_key"
   $env:ALPACA_BASE_URL="https://paper-api.alpaca.markets"
   
   # Linux/Mac
   export ALPACA_API_KEY="your_api_key"
   export ALPACA_SECRET_KEY="your_secret_key"
   export ALPACA_BASE_URL="https://paper-api.alpaca.markets"
   ```

4. **Use Alpaca for Real-Time Trading:**
   ```python
   from data.api_integrations import APIDataCollector
   
   collector = APIDataCollector(['AAPL'], api_source='alpaca')
   
   # Get real-time price
   price = collector.get_real_time_price('AAPL')
   
   # Execute paper trade
   result = collector.execute_trade_alpaca('AAPL', qty=10, side='buy')
   ```

## API Comparison

| Feature | yfinance | Alpha Vantage | Alpaca |
|---------|----------|---------------|--------|
| **Cost** | Free | Free (limited) | Free (paper) |
| **API Key** | Not needed | Required | Required |
| **Rate Limits** | None (basic) | 5/min, 500/day | Higher limits |
| **Real-Time Data** | ❌ | ❌ | ✅ |
| **Paper Trading** | ❌ | ❌ | ✅ |
| **Historical Data** | ✅ | ✅ | ✅ |
| **Setup Difficulty** | Easy | Easy | Medium |

## Integration with Existing Code

The new `APIDataCollector` class is backward compatible. You can:

1. **Keep using existing code** (uses yfinance by default)
2. **Switch to Alpha Vantage** by setting environment variable
3. **Switch to Alpaca** for real-time trading

### Example: Update main.py

```python
# Option 1: Use yfinance (default)
from data.collector import DataCollector
collector = DataCollector(['AAPL'])

# Option 2: Use Alpha Vantage
from data.api_integrations import APIDataCollector
collector = APIDataCollector(['AAPL'], api_source='alpha_vantage')

# Option 3: Use Alpaca
collector = APIDataCollector(['AAPL'], api_source='alpaca')
```

## Testing API Connections

Run the test script:

```bash
python data/api_integrations.py
```

This will test all available APIs and show which ones are configured.

## Troubleshooting

### "API key not found"
- Make sure environment variables are set
- Check `.env` file exists and has correct keys
- Restart terminal/IDE after setting environment variables

### "Rate limit exceeded" (Alpha Vantage)
- Free tier: 5 calls per minute, 500 per day
- Add delays between calls
- Consider upgrading to premium tier

### "Alpaca client not initialized"
- Verify API keys are correct
- Check base URL (use paper trading URL for testing)
- Ensure `alpaca-trade-api` package is installed

## Next Steps

1. **For Development/Testing:** Use yfinance (no setup needed)
2. **For More Data:** Set up Alpha Vantage (free)
3. **For Real Trading:** Set up Alpaca paper trading account

## Security Notes

⚠️ **Never commit API keys to git!**
- Use `.env` file (already in `.gitignore`)
- Use environment variables
- Never hardcode keys in source code

