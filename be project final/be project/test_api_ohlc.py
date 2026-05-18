import sys
import os
import asyncio
import json
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from backend.api import get_ohlc_data

async def main():
    try:
        result = await get_ohlc_data('RELIANCE', period='1mo', interval='1d', market='IN')
        try:
            json.dumps(result)
            print("Successfully serialized to JSON")
        except Exception as e:
            print("JSON serialization failed:", type(e), str(e))
    except Exception as e:
        import traceback
        traceback.print_exc()

asyncio.run(main())
