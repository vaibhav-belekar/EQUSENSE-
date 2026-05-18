import re

with open('backend/api.py', 'r') as f:
    content = f.read()

# Replace ticker.info access
content = re.sub(
    r'info = ticker\.info',
    r'info = await asyncio.to_thread(getattr, ticker, "info")',
    content
)

# Replace ticker.fast_info access
content = re.sub(
    r"fast_info = getattr\(ticker, 'fast_info', None\)",
    r'fast_info = await asyncio.to_thread(getattr, ticker, "fast_info", None)',
    content
)

with open('backend/api.py', 'w') as f:
    f.write(content)

print("Patched yf property accesses")
