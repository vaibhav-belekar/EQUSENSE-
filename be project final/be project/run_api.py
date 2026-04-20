#!/usr/bin/env python3
"""Start the FastAPI backend server"""
import sys
import os

# Add current directory to path
current_dir = os.path.dirname(__file__)
sys.path.insert(0, current_dir)
sys.path.insert(0, os.path.join(current_dir, 'backend'))

import uvicorn
from backend.api import app

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")
