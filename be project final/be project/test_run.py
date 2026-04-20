"""
Quick Test Script for Multi-Agent Trading Ecosystem
Demonstrates the system working end-to-end
"""

from main import TradingEcosystem

def main():
    print("\n" + "="*60)
    print("Multi-Agent Trading Ecosystem - Test Run")
    print("="*60 + "\n")
    
    # Initialize ecosystem with 2 stocks for quick testing
    print("Initializing ecosystem...")
    ecosystem = TradingEcosystem(
        symbols=['AAPL', 'TSLA'],
        initial_capital=100000.0
    )
    
    # Initialize (fetch data)
    print("Fetching market data...")
    ecosystem.initialize()
    print("Data fetched successfully\n")
    
    # Run a trading cycle
    print("Running trading cycle...")
    print("-" * 60)
    ecosystem.run_cycle()
    print("-" * 60)
    
    # Show portfolio status
    print("\nPortfolio Status:")
    portfolio = ecosystem.trader.get_portfolio()
    current_prices = ecosystem.get_current_prices()
    portfolio_value = ecosystem.trader.get_portfolio_value(current_prices)
    
    print(f"Current Portfolio Value: ${portfolio_value:,.2f}")
    print(f"Initial Capital: ${ecosystem.trader.initial_capital:,.2f}")
    print(f"Profit/Loss: ${portfolio_value - ecosystem.trader.initial_capital:,.2f}")
    
    if portfolio:
        print("\nHoldings:")
        for symbol, shares in portfolio.items():
            price = current_prices.get(symbol, 0)
            value = shares * price
            print(f"  {symbol}: {shares} shares @ ${price:.2f} = ${value:,.2f}")
    else:
        print("\nNo holdings in portfolio")
    
    print("\n" + "="*60)
    print("Test completed successfully!")
    print("="*60 + "\n")

if __name__ == "__main__":
    main()

