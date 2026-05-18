import asyncio
from backend.api import app
from fastapi.testclient import TestClient

client = TestClient(app)
response = client.get("/api/ohlc/SBIN?period=1y&interval=1d&market=IN")
print("Status Code:", response.status_code)
if response.status_code == 500:
    print("Content:", response.content)
