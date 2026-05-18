import sys
import os
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from data.collector import DataCollector
import pandas as pd

try:
    collector = DataCollector(['RELIANCE'])
    df = collector.get_ohlc_data('RELIANCE', period='1mo', interval='1d', market='IN')
    print("Columns:", df.columns)
    print("Head:", df.head())
except Exception as e:
    import traceback
    traceback.print_exc()
