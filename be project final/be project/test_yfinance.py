import yfinance as yf
ticker = yf.Ticker("RELIANCE.NS")
print("INFO:", {k: v for k, v in ticker.info.items() if 'held' in k.lower() or 'percent' in k.lower() or 'inst' in k.lower()})
print("\nMAJOR HOLDERS:")
print(ticker.major_holders)
print("\nINSTITUTIONAL HOLDERS:")
print(ticker.institutional_holders)
print("\nMUTUAL FUND HOLDERS:")
print(ticker.mutualfund_holders)
