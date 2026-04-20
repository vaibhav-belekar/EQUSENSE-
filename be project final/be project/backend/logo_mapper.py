"""
Logo Mapper for Backend
Helps map stock symbols to logo file paths
"""

import os
from pathlib import Path
from typing import Optional

# Logo mappings (can be loaded from a JSON file or database)
LOGO_MAP = {
    # Indian Stocks
    'TCS': 'TCS.png',
    'RELIANCE': 'RELIANCE.png',
    'INFY': 'INFY.png',
    'HDFCBANK': 'HDFCBANK.png',
    'ICICIBANK': 'ICICIBANK.png',
    'HDFC': 'HDFC.png',
    'HINDUNILVR': 'HINDUNILVR.png',
    'ITC': 'ITC.png',
    'SBIN': 'SBIN.png',
    'BHARTIARTL': 'BHARTIARTL.png',
    
    # US Stocks
    'AAPL': 'AAPL.png',
    'TSLA': 'TSLA.png',
    'MSFT': 'MSFT.png',
    'GOOGL': 'GOOGL.png',
    'AMZN': 'AMZN.png',
    'META': 'META.png',
    'NVDA': 'NVDA.png',
    'NFLX': 'NFLX.png',
    'AMD': 'AMD.png',
    'INTC': 'INTC.png',
}

# Supported image extensions
LOGO_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.svg', '.webp']


def get_logo_path(symbol: str, logos_dir: Optional[Path] = None) -> Optional[str]:
    """
    Get local logo path for a stock symbol.
    
    Args:
        symbol: Stock symbol (e.g., 'TCS', 'AAPL')
        logos_dir: Path to logos directory (default: frontend/public/logos)
    
    Returns:
        Logo path relative to public directory (e.g., '/logos/TCS.png') or None
    """
    if not symbol:
        return None
    
    # Normalize symbol (remove .NS, .BO suffixes, uppercase)
    normalized_symbol = symbol.upper().replace('.NS', '').replace('.BO', '')
    
    # Default logos directory
    if logos_dir is None:
        # Get project root (assuming this file is in backend/)
        project_root = Path(__file__).parent.parent
        logos_dir = project_root / 'frontend' / 'public' / 'logos'
    
    # Check if logos directory exists
    if not logos_dir.exists():
        return None
    
    # Check mapped logo first
    logo_filename = LOGO_MAP.get(normalized_symbol)
    if logo_filename:
        logo_path = logos_dir / logo_filename
        if logo_path.exists():
            return f"/logos/{logo_filename}"
    
    # Try to find logo by checking common filename patterns
    for ext in LOGO_EXTENSIONS:
        logo_path = logos_dir / f"{normalized_symbol}{ext}"
        if logo_path.exists():
            return f"/logos/{normalized_symbol}{ext}"
    
    return None


def has_logo(symbol: str, logos_dir: Optional[Path] = None) -> bool:
    """
    Check if a local logo exists for a symbol.
    
    Args:
        symbol: Stock symbol
        logos_dir: Path to logos directory
    
    Returns:
        True if logo exists, False otherwise
    """
    return get_logo_path(symbol, logos_dir) is not None


def load_logo_mappings(mappings: dict):
    """
    Load logo mappings from a dictionary.
    
    Args:
        mappings: Dictionary with symbol as key and filename as value
    """
    LOGO_MAP.update(mappings)


def get_all_logos(logos_dir: Optional[Path] = None) -> dict:
    """
    Get all available logos from the logos directory.
    
    Args:
        logos_dir: Path to logos directory
    
    Returns:
        Dictionary with symbol as key and logo path as value
    """
    if logos_dir is None:
        project_root = Path(__file__).parent.parent
        logos_dir = project_root / 'frontend' / 'public' / 'logos'
    
    if not logos_dir.exists():
        return {}
    
    logos = {}
    for file in logos_dir.iterdir():
        if file.is_file() and file.suffix.lower() in LOGO_EXTENSIONS:
            symbol = file.stem.upper()
            logos[symbol] = f"/logos/{file.name}"
    
    return logos

