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


def format_inr(number):
    """Format a number in Indian Rupee format"""
    s, *d = str(int(number)).partition(".")
    r = ",".join([s[x-2:x] for x in range(-3, -len(s), -2)][::-1] + [s[-3:]])
    return f"₹{r}"

def display_sip_calculator():
    """Display SIP and Lumpsum Calculator"""
    st.subheader("💰 Investment Calculator")
    
    # Custom CSS for calculator
    st.markdown("""
        <style>
        .calc-result-row {
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 12px; 
            color: #666;
            font-size: 1.1rem;
        }
        .calc-result-val {
            color: #333; 
            font-weight: 600;
        }
        </style>
    """, unsafe_allow_html=True)
    
    calc_type = st.radio("Calculator Type", ["SIP", "Lumpsum"], horizontal=True, label_visibility="collapsed")
    
    st.write("") # Spacing
    
    col1, col2 = st.columns([1.2, 1], gap="large")
    
    with col1:
        st.markdown("<br>", unsafe_allow_html=True)
        if calc_type == "SIP":
            monthly_inv = st.slider("Monthly investment", min_value=500, max_value=100000, value=25000, step=500, format="₹%d")
            rate = st.slider("Expected return rate (p.a)", min_value=1.0, max_value=30.0, value=12.0, step=0.1, format="%.1f%%")
            time_period = st.slider("Time period", min_value=1, max_value=40, value=10, step=1, format="%d Yr")
            
            # SIP Calculation
            # M = P * ({[1 + i]^n - 1} / i) * (1 + i)
            P = monthly_inv
            i = rate / 100 / 12
            n = time_period * 12
            
            invested_amount = P * n
            total_value = P * (((1 + i)**n - 1) / i) * (1 + i)
            est_returns = total_value - invested_amount
            
        else: # Lumpsum
            total_inv = st.slider("Total investment", min_value=500, max_value=10000000, value=100000, step=1000, format="₹%d")
            rate = st.slider("Expected return rate (p.a)", min_value=1.0, max_value=30.0, value=12.0, step=0.1, format="%.1f%%")
            time_period = st.slider("Time period", min_value=1, max_value=40, value=10, step=1, format="%d Yr")
            
            # Lumpsum Calculation
            invested_amount = total_inv
            total_value = invested_amount * ((1 + rate/100) ** time_period)
            est_returns = total_value - invested_amount
            
        st.markdown("<br>", unsafe_allow_html=True)
        
        # Display the results
        st.markdown(f"""
        <div class="calc-result-row">
            <span>Invested amount</span>
            <span class="calc-result-val">{format_inr(invested_amount)}</span>
        </div>
        <div class="calc-result-row">
            <span>Est. returns</span>
            <span class="calc-result-val">{format_inr(est_returns)}</span>
        </div>
        <div class="calc-result-row" style="margin-top: 15px;">
            <span>Total value</span>
            <span class="calc-result-val" style="font-size: 1.2rem;">{format_inr(total_value)}</span>
        </div>
        """, unsafe_allow_html=True)
        
    with col2:
        # Donut Chart
        labels = ['Invested amount', 'Est. returns']
        values = [invested_amount, est_returns]
        colors = ['#e8eaf6', '#5c6bc0'] # Light purple/gray and nice blue/purple
        
        fig = go.Figure(data=[go.Pie(labels=labels, values=values, hole=.7, 
                                     marker_colors=colors, textinfo='none', hoverinfo='label+value')])
        fig.update_layout(
            showlegend=True,
            legend=dict(orientation="h", yanchor="bottom", y=1.1, xanchor="center", x=0.5),
            margin=dict(t=30, b=0, l=0, r=0),
            height=280
        )
        st.plotly_chart(fig, use_container_width=True, config={'displayModeBar': False})
        
        st.markdown("<br>", unsafe_allow_html=True)
        
        # Add custom styling to make the button green like the image
        st.markdown("""
        <style>
        div[data-testid="stButton"] > button {
            background-color: #00bfa5;
            color: white;
            border: none;
            padding: 10px 24px;
            font-weight: bold;
            border-radius: 6px;
        }
        div[data-testid="stButton"] > button:hover {
            background-color: #00a892;
            color: white;
        }
        </style>
        """, unsafe_allow_html=True)
        
        if st.button("INVEST NOW", use_container_width=True):
            st.success("Investment feature coming soon!")


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
    tab1, tab2, tab3, tab4 = st.tabs(["📊 Dashboard", "💰 SIP Calculator", "📈 Predictions", "📋 Reports"])
    
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
        display_sip_calculator()
    
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

