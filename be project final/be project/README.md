# Equisense - Stock Screener & Investment Analyzer

Equisense is an advanced stock analysis platform featuring a multi-agent AI trading ecosystem that simulates real-world market structure with specialized AI agents working together.

## 🤖 Agents

- **Analyst Agent**: Predicts stock trends using ML models (LSTM/XGBoost)
- **Trader Agent**: Makes buy/sell/hold decisions using reinforcement learning
- **Risk Agent**: Manages portfolio risk and limits exposure
- **Auditor Agent**: Evaluates performance and generates reports

## 🏗️ Architecture

```
Stock Market Data → Analyst Agent → Trader Agent → Risk Agent → Auditor Agent → Dashboard
```

## 🚀 Quick Start

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run the dashboard:
```bash
streamlit run dashboard.py
```

3. Or run the ecosystem directly:
```bash
python main.py
```

## 📁 Project Structure

```
.
├── agents/
│   ├── __init__.py
│   ├── analyst.py      # Analyst Agent
│   ├── trader.py       # Trader Agent
│   ├── risk.py         # Risk Agent
│   └── auditor.py      # Auditor Agent
├── data/
│   ├── __init__.py
│   └── collector.py    # Data collection from yfinance
├── models/
│   └── lstm_model.py   # LSTM model for predictions
├── utils/
│   ├── __init__.py
│   └── messaging.py    # Agent communication system
├── dashboard.py        # Streamlit dashboard
├── main.py            # Main orchestration script
└── requirements.txt
```

## 🎯 Features

- Multi-agent collaboration
- ML-based stock predictions
- Reinforcement learning for trading decisions
- Risk management and portfolio protection
- Performance auditing and reporting
- Real-time dashboard visualization

## 📊 Technologies

- **Data**: yfinance
- **ML Models**: LSTM, XGBoost
- **RL**: Stable-Baselines3, Gym
- **Dashboard**: Streamlit, Plotly
- **Analysis**: Pandas, NumPy, TA-Lib

