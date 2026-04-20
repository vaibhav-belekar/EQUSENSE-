"""
Main Orchestration Script for Multi-Agent Trading Ecosystem
Coordinates all agents and runs the trading cycle
"""

import sys
import os
from datetime import datetime
from typing import Dict, List, Optional

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from agents.analyst import AnalystAgent
from agents.trader import TraderAgent
from agents.risk import RiskAgent
from agents.auditor import AuditorAgent
from data.collector import DataCollector


class TradingEcosystem:
    """Main orchestration class for the trading ecosystem"""
    
    def __init__(self, symbols: List[str] = None, initial_capital: float = 100000.0, market: str = None):
        """
        Initialize the trading ecosystem
        
        Args:
            symbols: List of stock symbols to trade (Indian market focused)
            initial_capital: Initial capital for trading
        """
        # Focus on major Indian stocks by default
        self.symbols = symbols or [
            'RELIANCE', 'TCS', 'HDFCBANK', 'ICICIBANK', 'HDFC', 'INFY', 'HINDUNILVR', 'ITC',
            'JSWSTEEL', 'TATASTEEL', 'MARUTI', 'SUNPHARMA', 'BHARTIARTL', 'ONGC', 'LT', 'AXISBANK'
        ]
        self.initial_capital = initial_capital
        self.market = market or self._infer_market(self.symbols)
        
        # Initialize agents
        print("[Ecosystem] Initializing agents...")
        self.analyst = AnalystAgent(self.symbols, default_market=self.market)
        self.trader = TraderAgent(initial_capital=initial_capital)
        self.risk = RiskAgent()
        self.auditor = AuditorAgent()
        self.data_collector = DataCollector(self.symbols)
        
        # Track cycle count
        self.cycle_count = 0
    
    def initialize(self):
        """Initialize the ecosystem (fetch initial data)"""
        print("[Ecosystem] Fetching initial market data...")
        for symbol in self.symbols:
            self.data_collector.fetch_data(symbol, period="3mo", market=self.market)
        print("[Ecosystem] Initialization complete!")
    
    def get_current_prices(self) -> Dict[str, float]:
        """
        Get current prices for all symbols
        
        Returns:
            Dictionary mapping symbols to current prices
        """
        prices = {}
        
        for symbol in self.symbols:
            df = self.data_collector.get_latest_data(symbol)
            if df is not None and not df.empty:
                prices[symbol] = float(df['Close'].iloc[-1])
            else:
                # Fetch fresh data if not cached
                df = self.data_collector.fetch_data(symbol, period="5d", market=self.market)
                if not df.empty:
                    prices[symbol] = float(df['Close'].iloc[-1])
        
        return prices
    
    def run_cycle(self):
        """
        Run a complete trading cycle:
        1. Analyst predicts trends
        2. Trader makes decisions
        3. Risk agent evaluates
        4. Trades are executed
        5. Auditor records performance
        """
        self.cycle_count += 1
        print(f"\n{'='*60}")
        print(f"[Ecosystem] Starting Trading Cycle #{self.cycle_count}")
        print(f"{'='*60}\n")
        
        # Step 1: Analyst Agent - Predict trends
        print("[Step 1] Analyst Agent analyzing stocks...")
        analyst_predictions = {
            symbol: self.analyst.analyze(symbol, market=self.market)
            for symbol in self.symbols
        }
        
        if not analyst_predictions:
            print("[Ecosystem] No predictions generated. Skipping cycle.")
            return
        
        # Step 2: Get current prices
        print("\n[Step 2] Fetching current market prices...")
        current_prices = self.get_current_prices()
        
        if not current_prices:
            print("[Ecosystem] No price data available. Skipping cycle.")
            return
        
        # Step 3: Trader Agent - Make decisions
        print("\n[Step 3] Trader Agent making decisions...")
        portfolio_value = self.trader.get_portfolio_value(current_prices)
        trader_decisions = self.trader.process(
            analyst_predictions,
            current_prices,
            risk_agent=self.risk,
            portfolio_value=portfolio_value
        )
        
        # Step 4: Risk Agent - Evaluate risk
        print("\n[Step 4] Risk Agent evaluating risk...")
        risk_evaluation = self.risk.evaluate(
            trader_decisions,
            self.trader.get_portfolio(),
            current_prices,
            portfolio_value,
            predictions=analyst_predictions
        )
        
        # Step 5: Execute trades (using risk-adjusted decisions)
        print("\n[Step 5] Executing trades...")
        risk_adjusted_decisions = risk_evaluation.get("decisions", trader_decisions)
        
        for symbol, action in risk_adjusted_decisions.items():
            if symbol not in current_prices:
                continue
            
            price = current_prices[symbol]
            
            # Execute trade
            trade_result = self.trader.execute_trade(symbol, action, price=price)
            
            if trade_result.get("action") != "Hold":
                print(f"[Trader] {trade_result['action']} {trade_result.get('shares', 0)} shares of {symbol}")
        
        # Step 6: Auditor Agent - Record performance
        print("\n[Step 6] Auditor Agent recording performance...")
        final_portfolio_value = self.trader.get_portfolio_value(current_prices)
        
        self.auditor.record(
            trade_data={
                "cycle": self.cycle_count,
                "decisions": risk_adjusted_decisions,
                "risk_alerts": risk_evaluation.get("alerts", [])
            },
            portfolio_value=final_portfolio_value,
            initial_capital=self.initial_capital,
            timestamp=datetime.now()
        )
        
        # Step 7: Generate performance summary
        print("\n[Step 7] Generating performance summary...")
        performance = self.auditor.evaluate_performance(
            final_portfolio_value,
            self.initial_capital,
            self.trader.trade_history,
            current_prices,
            self.trader.get_portfolio()
        )
        
        # Print summary
        print(f"\n{'='*60}")
        print("PERFORMANCE SUMMARY")
        print(f"{'='*60}")
        print(f"Total P/L: ${performance['total_profit_loss']:,.2f}")
        print(f"Total Return: {performance['total_return_pct']:.2f}%")
        print(f"Accuracy: {performance['accuracy']:.2f}%")
        print(f"Total Trades: {performance['metrics']['total_trades']}")
        print(f"Win Rate: {performance['metrics']['win_rate']*100:.2f}%")
        print(f"Best Stock: {performance['best_stock']}")
        print(f"{'='*60}\n")
        
        # Print risk alerts if any
        if risk_evaluation.get("alerts"):
            print("⚠️  RISK ALERTS:")
            for alert in risk_evaluation["alerts"]:
                print(f"  - {alert}")
            print()
    
    def _infer_market(self, symbols: List[str]) -> str:
        if any(symbol.endswith((".NS", ".BO")) for symbol in symbols):
            return "IN"
        indian_like = sum(1 for symbol in symbols if symbol.isupper() and len(symbol) > 4)
        return "IN" if indian_like >= max(1, len(symbols) // 2) else "US"

    def run_simulation(self, num_cycles: int = 10):
        """
        Run multiple trading cycles
        
        Args:
            num_cycles: Number of cycles to run
        """
        print(f"[Ecosystem] Starting simulation with {num_cycles} cycles...")
        
        for i in range(num_cycles):
            try:
                self.run_cycle()
            except Exception as e:
                print(f"[Ecosystem] Error in cycle {i+1}: {str(e)}")
                continue
        
        # Final report
        print(f"\n{'='*60}")
        print("FINAL PERFORMANCE REPORT")
        print(f"{'='*60}")
        
        final_performance = self.auditor.evaluate_performance(
            self.trader.get_portfolio_value(self.get_current_prices()),
            self.initial_capital,
            self.trader.trade_history,
            self.get_current_prices(),
            self.trader.get_portfolio()
        )
        
        print(self.auditor.generate_report(final_performance))


def main():
    """Main function to run the Indian market trading ecosystem"""
    print("""
    ================================================================
            Multi-Agent AI Trading Ecosystem
            Indian Market Stock Analysis & Trading
    ================================================================
    """)
    
    # Initialize ecosystem with Indian stocks
    ecosystem = TradingEcosystem(
        symbols=[
            'RELIANCE', 'TCS', 'HDFCBANK', 'ICICIBANK', 'HDFC', 'INFY', 'HINDUNILVR', 'ITC',
            'JSWSTEEL', 'TATASTEEL', 'MARUTI', 'SUNPHARMA', 'BHARTIARTL', 'ONGC', 'LT', 'AXISBANK'
        ],
        initial_capital=100000.0,
        market="IN"
    )
    
    # Initialize (fetch data)
    ecosystem.initialize()
    
    # Option 1: Train models first (optional)
    print("\n[Ecosystem] Training prediction models...")
    print("(This may take a few minutes. You can skip this for quick testing.)")
    
    train_models = input("\nTrain models? (y/n): ").lower().strip() == 'y'
    
    if train_models:
        ecosystem.analyst.train_models(epochs=20)
        print("[Ecosystem] Models trained!")
    
    # Option 2: Run cycles
    print("\n[Ecosystem] Ready to run trading cycles.")
    print("Options:")
    print("1. Run single cycle")
    print("2. Run multiple cycles")
    print("3. Run simulation (10 cycles)")
    
    choice = input("\nEnter choice (1/2/3): ").strip()
    
    if choice == "1":
        ecosystem.run_cycle()
    elif choice == "2":
        num_cycles = int(input("Enter number of cycles: "))
        ecosystem.run_simulation(num_cycles)
    elif choice == "3":
        ecosystem.run_simulation(10)
    else:
        print("Invalid choice. Running single cycle...")
        ecosystem.run_cycle()
    
    print("\n[Ecosystem] Trading session complete!")


if __name__ == "__main__":
    main()

