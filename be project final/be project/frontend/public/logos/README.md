# Company Logos Directory

Place your company logo images in this directory.

## File Naming Convention

Use the stock symbol as the filename (case-insensitive):
- `TCS.png` or `TCS.jpg` for Tata Consultancy Services
- `RELIANCE.png` for Reliance Industries
- `AAPL.png` for Apple Inc.
- etc.

## Supported Formats
- PNG (recommended)
- JPG/JPEG
- SVG
- WebP

## Examples
```
logos/
  ├── TCS.png
  ├── RELIANCE.jpg
  ├── INFY.png
  ├── AAPL.png
  ├── TSLA.png
  └── ...
```

## Logo Mapping

The application will automatically map stock symbols to logo files. If a logo is not found in this directory, it will fall back to:
1. Clearbit Logo API
2. yfinance logo URL
3. Initials-based placeholder

