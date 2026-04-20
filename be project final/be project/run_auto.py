"""
Auto-run script for Multi-Agent Trading Ecosystem
Runs automatically without user input
"""

from main import TradingEcosystem

def main():
    """Run the ecosystem automatically"""
    print("""
    ================================================================
            Multi-Agent AI Trading Ecosystem
            Collaborative Trading Bots
    ================================================================
    """)
    
    # Initialize ecosystem
    ecosystem = TradingEcosystem(
        symbols=['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN'],
        initial_capital=100000.0
    )
    
    # Initialize (fetch data)
    ecosystem.initialize()
    
    # Skip model training for quick run (set to True to train)
    train_models = False
    
    if train_models:
        print("\n[Ecosystem] Training prediction models...")
        ecosystem.analyst.train_models(epochs=10)  # Quick training with 10 epochs
        print("[Ecosystem] Models trained!")
    else:
        print("\n[Ecosystem] Skipping model training (using heuristics)")
        print("[Ecosystem] Set train_models=True to train LSTM models")
    
    # Run 3 trading cycles
    print("\n[Ecosystem] Running 3 trading cycles...")
    print("="*60)
    
    for i in range(3):
        print(f"\n--- Cycle {i+1} ---")
        try:
            ecosystem.run_cycle()
        except Exception as e:
            print(f"Error in cycle {i+1}: {str(e)}")
            continue
    
    # Final report
    print("\n" + "="*60)
    print("FINAL PERFORMANCE REPORT")
    print("="*60)
    
    final_performance = ecosystem.auditor.evaluate_performance(
        ecosystem.trader.get_portfolio_value(ecosystem.get_current_prices()),
        ecosystem.initial_capital,
        ecosystem.trader.trade_history,
        ecosystem.get_current_prices(),
        ecosystem.trader.get_portfolio()
    )
    
    print(ecosystem.auditor.generate_report(final_performance))
    
    # Show portfolio
    print("\n" + "="*60)
    print("FINAL PORTFOLIO")
    print("="*60)
    portfolio = ecosystem.trader.get_portfolio()
    current_prices = ecosystem.get_current_prices()
    portfolio_value = ecosystem.trader.get_portfolio_value(current_prices)
    
    print(f"Portfolio Value: ${portfolio_value:,.2f}")
    print(f"Initial Capital: ${ecosystem.trader.initial_capital:,.2f}")
    print(f"Total P/L: ${portfolio_value - ecosystem.trader.initial_capital:,.2f}")
    print(f"Return: {((portfolio_value - ecosystem.trader.initial_capital) / ecosystem.trader.initial_capital * 100):.2f}%")
    
    if portfolio:
        print("\nHoldings:")
        for symbol, shares in portfolio.items():
            price = current_prices.get(symbol, 0)
            value = shares * price
            print(f"  {symbol}: {shares} shares @ ${price:.2f} = ${value:,.2f}")
    else:
        print("\nNo holdings in portfolio")
    
    print("\n" + "="*60)
    print("[Ecosystem] Trading session complete!")
    print("="*60 + "\n")


if __name__ == "__main__":
    main()

