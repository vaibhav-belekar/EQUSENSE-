import asyncio, json
from backend.api import get_ohlc_data
from fastapi.encoders import jsonable_encoder
import math

async def main():
    data = await get_ohlc_data('SBIN', '1y', '1d', 'IN')
    try:
        encoded = jsonable_encoder(data)
        json.dumps(encoded)
        print("SUCCESS")
    except Exception as e:
        print("ERROR:", type(e), str(e))

asyncio.run(main())
