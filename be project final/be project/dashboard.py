"""
Streamlit Dashboard for Multi-Agent Trading Ecosystem
"""

import streamlit as st
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
from datetime import datetime, timedelta
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from main import TradingEcosystem
import time


# Page configuration
st.set_page_config(
    page_title="Multi-Agent Trading Ecosystem",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS
st.markdown("""
    <style>
    .main-header {
        font-size: 2.5rem;
        font-weight: bold;
        color: #1f77b4;
        text-align: center;
        padding: 1rem;
    }
    .metric-card {
        background-color: #f0f2f6;
        padding: 1rem;
        border-radius: 0.5rem;
        border-left: 4px solid #1f77b4;
    }
    .agent-status {
        padding: 0.5rem;
        border-radius: 0.3rem;
        margin: 0.2rem 0;
    }
    </style>
""", unsafe_allow_html=True)


def initialize_ecosystem():
    """Initialize the trading ecosystem"""
    if 'ecosystem' not in st.session_state:
        st.session_state.ecosystem = TradingEcosystem(
            symbols=['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN'],
            initial_capital=100000.0
        )
        st.session_state.ecosystem.initialize()
    return st.session_state.ecosystem


def display_metrics(performance_data):
    """Display key performance metrics"""
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric(
            "Total Profit/Loss",
            f"${performance_data.get('total_profit_loss', 0):,.2f}",
            delta=f"{performance_data.get('total_return_pct', 0):.2f}%"
        )
    
    with col2:
        st.metric(
            "Accuracy",
            f"{performance_data.get('accuracy', 0):.2f}%",
            delta=f"{performance_data.get('metrics', {}).get('win_rate', 0)*100:.2f}% Win Rate"
        )
    
    with col3:
        st.metric(
            "Total Trades",
            f"{performance_data.get('metrics', {}).get('total_trades', 0)}",
            delta=f"{performance_data.get('metrics', {}).get('successful_trades', 0)} Successful"
        )
    
    with col4:
        sharpe = performance_data.get('metrics', {}).get('sharpe_ratio', 0)
        risk_status = "Low" if sharpe > 1.0 else "Medium" if sharpe > 0.5 else "High"
        st.metric(
            "Risk Index",
            risk_status,
            delta=f"Sharpe: {sharpe:.2f}"
        )


def display_portfolio_chart(ecosystem):
    """Display portfolio value over time"""
    if not ecosystem.auditor.performance_history:
        st.info("No performance data available yet. Run a trading cycle to see charts.")
        return
    
    df = pd.DataFrame(ecosystem.auditor.performance_history)
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    
    fig = go.Figure()
    
    fig.add_trace(go.Scatter(
        x=df['timestamp'],
        y=df['portfolio_value'],
        mode='lines+markers',
        name='Portfolio Value',
        line=dict(color='#1f77b4', width=2),
        fill='tonexty',
        fillcolor='rgba(31, 119, 180, 0.1)'
    ))
    
    fig.add_hline(
        y=ecosystem.trader.initial_capital,
        line_dash="dash",
        line_color="gray",
        annotation_text="Initial Capital"
    )
    
    fig.update_layout(
        title="Portfolio Value Over Time",
        xaxis_title="Time",
        yaxis_title="Portfolio Value ($)",
        hovermode='x unified',
        height=400
    )
    
    st.plotly_chart(fig, use_container_width=True)


def display_agent_status(ecosystem):
    """Display status of all agents"""
    st.subheader("🤖 Agent Status")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("""
        <div class="agent-status" style="background-color: #e8f4f8;">
            <strong>📊 Analyst Agent</strong><br>
            Status: Active<br>
            Models: Trained
        </div>
        """, unsafe_allow_html=True)
        
        st.markdown("""
        <div class="agent-status" style="background-color: #e8f4f8;">
            <strong>💰 Trader Agent</strong><br>
            Status: Active<br>
            Capital: ${:,.2f}
        </div>
        """.format(ecosystem.trader.capital), unsafe_allow_html=True)
    
    with col2:
        st.markdown("""
        <div class="agent-status" style="background-color: #e8f4f8;">
            <strong>⚖️ Risk Agent</strong><br>
            Status: Active<br>
            Alerts: {}
        </div>
        """.format(len(ecosystem.risk.get_risk_alerts())), unsafe_allow_html=True)
        
        st.markdown("""
        <div class="agent-status" style="background-color: #e8f4f8;">
            <strong>📊 Auditor Agent</strong><br>
            Status: Active<br>
            Records: {}
        </div>
        """.format(len(ecosystem.auditor.trade_records)), unsafe_allow_html=True)


def display_trade_history(ecosystem):
    """Display recent trade history"""
    st.subheader("📋 Recent Trades")
    
    if not ecosystem.trader.trade_history:
        st.info("No trades executed yet.")
        return
    
    trades_df = pd.DataFrame(ecosystem.trader.trade_history[-20:])  # Last 20 trades
    
    if not trades_df.empty:
        # Format the dataframe for display
        display_df = trades_df[['action', 'symbol', 'shares', 'price']].copy()
        display_df.columns = ['Action', 'Symbol', 'Shares', 'Price']
        display_df['Price'] = display_df['Price'].apply(lambda x: f"${x:.2f}")
        
        st.dataframe(display_df, use_container_width=True, hide_index=True)


def display_predictions(ecosystem):
    """Display current predictions"""
    st.subheader("🔮 Current Predictions")
    
    if not ecosystem.analyst.predictions:
        st.info("No predictions available. Run analysis first.")
        return
    
    predictions_data = []
    for symbol, pred in ecosystem.analyst.predictions.items():
        predictions_data.append({
            'Symbol': symbol,
            'Signal': pred.get('signal', 'Neutral'),
            'Confidence': f"{pred.get('confidence', 0)*100:.2f}%"
        })
    
    df = pd.DataFrame(predictions_data)
    st.dataframe(df, use_container_width=True, hide_index=True)


def display_portfolio_holdings(ecosystem):
    """Display current portfolio holdings"""
    st.subheader("💼 Portfolio Holdings")
    
    portfolio = ecosystem.trader.get_portfolio()
    current_prices = ecosystem.get_current_prices()
    
    if not portfolio:
        st.info("No holdings in portfolio.")
        return
    
    holdings_data = []
    total_value = 0
    
    for symbol, shares in portfolio.items():
        price = current_prices.get(symbol, 0)
        value = shares * price
        total_value += value
        
        holdings_data.append({
            'Symbol': symbol,
            'Shares': shares,
            'Price': f"${price:.2f}",
            'Value': f"${value:,.2f}"
        })
    
    df = pd.DataFrame(holdings_data)
    st.dataframe(df, use_container_width=True, hide_index=True)
    
    st.metric("Total Holdings Value", f"${total_value:,.2f}")


def main():
    """Main dashboard function"""
    st.markdown('<h1 class="main-header">🤖 Multi-Agent Trading Ecosystem</h1>', unsafe_allow_html=True)
    
    # Initialize ecosystem
    ecosystem = initialize_ecosystem()
    
    # Sidebar
    with st.sidebar:
        st.header("⚙️ Controls")
        
        if st.button("🔄 Run Trading Cycle", type="primary", use_container_width=True):
            with st.spinner("Running trading cycle..."):
                try:
                    ecosystem.run_cycle()
                    st.success("Trading cycle completed!")
                    time.sleep(1)
                    st.rerun()
                except Exception as e:
                    st.error(f"Error: {str(e)}")
        
        if st.button("📊 Train Models", use_container_width=True):
            with st.spinner("Training models..."):
                try:
                    ecosystem.analyst.train_models(epochs=10)
                    st.success("Models trained!")
                except Exception as e:
                    st.error(f"Error: {str(e)}")
        
        st.divider()
        
        st.subheader("📈 Symbols")
        symbols = st.multiselect(
            "Select stocks to trade",
            options=['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'NFLX'],
            default=ecosystem.symbols
        )
        
        if st.button("Update Symbols"):
            ecosystem.symbols = symbols
            ecosystem.analyst.symbols = symbols
            st.success("Symbols updated!")
            st.rerun()
        
        st.divider()
        
        st.subheader("📊 Performance Report")
        if st.button("Generate Report"):
            performance = ecosystem.auditor.evaluate_performance(
                ecosystem.trader.get_portfolio_value(ecosystem.get_current_prices()),
                ecosystem.trader.initial_capital,
                ecosystem.trader.trade_history,
                ecosystem.get_current_prices(),
                ecosystem.trader.get_portfolio()
            )
            
            st.text(ecosystem.auditor.generate_report(performance))
    
    # Main content
    tab1, tab2, tab3, tab4 = st.tabs(["📊 Dashboard", "💼 Portfolio", "📈 Predictions", "📋 Reports"])
    
    with tab1:
        st.header("Performance Overview")
        
        # Get performance data
        performance = ecosystem.auditor.evaluate_performance(
            ecosystem.trader.get_portfolio_value(ecosystem.get_current_prices()),
            ecosystem.trader.initial_capital,
            ecosystem.trader.trade_history,
            ecosystem.get_current_prices(),
            ecosystem.trader.get_portfolio()
        )
        
        display_metrics(performance)
        
        st.divider()
        
        display_portfolio_chart(ecosystem)
        
        st.divider()
        
        col1, col2 = st.columns(2)
        
        with col1:
            display_agent_status(ecosystem)
        
        with col2:
            display_trade_history(ecosystem)
    
    with tab2:
        display_portfolio_holdings(ecosystem)
        
        st.divider()
        
        # Portfolio allocation chart
        portfolio = ecosystem.trader.get_portfolio()
        current_prices = ecosystem.get_current_prices()
        
        if portfolio:
            allocation_data = []
            for symbol, shares in portfolio.items():
                price = current_prices.get(symbol, 0)
                value = shares * price
                allocation_data.append({
                    'Symbol': symbol,
                    'Value': value
                })
            
            if allocation_data:
                df = pd.DataFrame(allocation_data)
                fig = px.pie(df, values='Value', names='Symbol', title='Portfolio Allocation')
                st.plotly_chart(fig, use_container_width=True)
    
    with tab3:
        display_predictions(ecosystem)
        
        st.divider()
        
        # Prediction confidence chart
        if ecosystem.analyst.predictions:
            pred_data = []
            for symbol, pred in ecosystem.analyst.predictions.items():
                pred_data.append({
                    'Symbol': symbol,
                    'Confidence': pred.get('confidence', 0) * 100
                })
            
            df = pd.DataFrame(pred_data)
            fig = px.bar(df, x='Symbol', y='Confidence', title='Prediction Confidence by Symbol')
            st.plotly_chart(fig, use_container_width=True)
    
    with tab4:
        st.header("Performance Report")
        
        performance = ecosystem.auditor.evaluate_performance(
            ecosystem.trader.get_portfolio_value(ecosystem.get_current_prices()),
            ecosystem.trader.initial_capital,
            ecosystem.trader.trade_history,
            ecosystem.get_current_prices(),
            ecosystem.trader.get_portfolio()
        )
        
        st.text(ecosystem.auditor.generate_report(performance))
        
        st.divider()
        
        st.subheader("💡 Recommendations")
        for i, rec in enumerate(performance.get('recommendations', []), 1):
            st.markdown(f"{i}. {rec}")


if __name__ == "__main__":
    main()

