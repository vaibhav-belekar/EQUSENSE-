```md
# Equisense

### AI-Powered Stock Screener and Investment Analysis Platform

Equisense is a full-stack stock analysis platform that helps users study stocks, evaluate risk, track market trends, and make smarter investment decisions. It combines machine learning, technical indicators, real-time market data, and news sentiment analysis to generate realistic stock predictions and recommendations.

## Features

- AI-based stock return prediction
- Stock screener for Indian and US markets
- Investment analysis with predicted return, risk, and confidence
- News sentiment analysis with live headlines
- Buy / Hold / Avoid recommendation engine
- Interactive charts and historical analysis
- Watchlist management
- Comparison of multiple stocks
- Paper trade / virtual trade support
- Supabase/PostgreSQL support for storing analysis history and watchlist data

## Tech Stack

### Frontend
- React
- Vite
- Tailwind CSS
- Axios
- Framer Motion
- Recharts / chart components

### Backend
- FastAPI
- Python
- Pandas
- NumPy
- Scikit-learn
- XGBoost
- yFinance

### Database
- Supabase / PostgreSQL

## How It Works

Equisense collects historical stock market data and generates technical indicators such as RSI, MACD, ATR, momentum, volatility, and trend strength. These features are used by machine learning models like XGBoost and Random Forest to estimate short-term stock returns.

The system then combines:
- ML model output
- Technical indicator signals
- Risk analysis
- News sentiment

to produce a realistic stock recommendation and investment insight.

## Machine Learning Models Used

- XGBoost Regressor
- Random Forest Regressor
- HistGradientBoosting Regressor (fallback)

## Prediction Inputs

The prediction engine uses:
- Open, High, Low, Close, Volume
- RSI
- MACD
- ATR
- Momentum
- Volatility
- Trend strength
- Volume ratio
- News sentiment adjustment

## Project Structure

```bash
be project/
│
├── agents/                 # Analyst and agent logic
├── backend/                # FastAPI backend APIs
├── data/                   # Data collection and feature engineering
├── frontend/               # React frontend
├── models/                 # ML model code
├── backend/sql/            # Database schema
├── main.py
├── run_api.py
└── requirements.txt
```

## Installation

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd Equisense
```

### 2. Install backend dependencies
```bash
pip install -r requirements.txt
```

### 3. Install frontend dependencies
```bash
cd "be project final/be project/frontend"
npm install
```

## Running the Project

### Start Backend
```bash
cd "be project final/be project"
python -m uvicorn backend.api:app --host 127.0.0.1 --port 8000
```

### Start Frontend
```bash
cd "be project final/be project/frontend"
npm run dev
```

If `vite` gives an `esbuild spawn EPERM` issue on your machine, build and serve the frontend manually:

```bash
npm run build
cd dist
python -m http.server 8090 --bind 127.0.0.1
```

## Supabase Setup

Create a `.env` file in the backend/project root and add:

```env
DATABASE_PROVIDER=supabase
DATABASE_URL=your_supabase_connection_string
DIRECT_DATABASE_URL=your_supabase_direct_connection_string
DATABASE_SSL_MODE=require
```

Apply the database schema using:

```sql
backend/sql/schema.sql
```

## Data Stored in Supabase

Equisense can store:
- User profiles
- Watchlists
- Watchlist items
- Analysis history
- Prediction snapshots

This helps in tracking previous analyses, saving stocks, and monitoring prediction trends over time.

## Use Cases

- Stock screening for investment opportunities
- Short-term return prediction
- Risk-aware stock recommendation
- Technical and sentiment-based decision support
- Educational/demo investment analysis platform

## Future Improvements

- User authentication
- Portfolio tracking
- Alert system
- More advanced ML models
- Better model retraining workflow
- Deployment with CI/CD

## Author

**vaibhav belekar, aditya rajvanshi, vaibhav sable, aditya daghale, darshan shinde **  
Final Year Project - Equisense
```


