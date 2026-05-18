import re

with open('backend/api.py', 'r') as f:
    content = f.read()

# Replace get_ohlc_data calls
content = re.sub(
    r'ecosystem\.data_collector\.get_ohlc_data\((.*?)\)',
    r'await asyncio.to_thread(ecosystem.data_collector.get_ohlc_data, \1)',
    content
)

# Replace fetch_dhan_quote calls
content = re.sub(
    r'fetch_dhan_quote\((.*?)\)',
    r'await asyncio.to_thread(fetch_dhan_quote, \1)',
    content
)

# Replace get_realtime_price ecosystem calls
content = re.sub(
    r'ecosystem\.data_collector\.get_realtime_price\((.*?)\)',
    r'await asyncio.to_thread(ecosystem.data_collector.get_realtime_price, \1)',
    content
)

# Fix double awaits if they happened
content = content.replace('await await', 'await')

with open('backend/api.py', 'w') as f:
    f.write(content)

print("Patched api.py")
