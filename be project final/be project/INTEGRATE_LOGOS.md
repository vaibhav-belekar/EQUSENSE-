# Integrating Company Logo Dataset

This guide explains how to integrate your company logo dataset into the Equisense application.

## 📁 Directory Structure

Place your logo images in the following directory:
```
frontend/public/logos/
```

## 📝 File Naming Convention

Name your logo files using the stock symbol (uppercase):
- `TCS.png` for Tata Consultancy Services
- `RELIANCE.jpg` for Reliance Industries
- `AAPL.png` for Apple Inc.
- `INFY.png` for Infosys
- etc.

## ✅ Supported Formats

- PNG (recommended - best quality)
- JPG/JPEG
- SVG (scalable)
- WebP (modern, efficient)

## 🔧 How It Works

### Priority Order:
1. **Local Logo** (from `frontend/public/logos/`) - Highest Priority
2. **API Logo URL** (from yfinance/Clearbit) - Fallback
3. **Initials Placeholder** (colored circle with initials) - Final Fallback

### Automatic Detection:
- The system automatically checks for logos when you search for a stock
- Logos are matched by stock symbol (case-insensitive)
- Supports both `.NS` and `.BO` suffixes for Indian stocks (e.g., `TCS.NS` → `TCS.png`)

## 📋 Step-by-Step Integration

### 1. Create Logos Directory
```bash
# Navigate to project root
cd "d:\be project"

# Create logos directory (if it doesn't exist)
mkdir -p frontend/public/logos
```

### 2. Add Your Logo Files
Copy your logo files to `frontend/public/logos/` with the naming convention:
```
frontend/public/logos/
  ├── TCS.png
  ├── RELIANCE.jpg
  ├── INFY.png
  ├── AAPL.png
  ├── TSLA.png
  └── ... (more logos)
```

### 3. Update Logo Mapping (Optional)
If your logo filenames don't match the stock symbols exactly, you can update the mapping in:
- **Frontend**: `frontend/src/utils/logoMapper.js`
- **Backend**: `backend/logo_mapper.py`

Example:
```javascript
// frontend/src/utils/logoMapper.js
const logoMap = {
  'TCS': 'TCS.png',
  'RELIANCE': 'RELIANCE.jpg',
  // Add more mappings...
}
```

### 4. Test the Integration
1. Start the application:
   ```bash
   # Run the start script
   start_all.bat
   ```

2. Search for a stock (e.g., "TCS")
3. Check if the logo appears in the Company Info card
4. If the logo doesn't appear, check:
   - File name matches stock symbol
   - File is in `frontend/public/logos/` directory
   - File format is supported (PNG, JPG, SVG, WebP)
   - Browser console for any errors

## 🔍 Troubleshooting

### Logo Not Showing?
1. **Check File Path**: Ensure logos are in `frontend/public/logos/`
2. **Check File Name**: Must match stock symbol (e.g., `TCS.png` for TCS stock)
3. **Check File Format**: Use PNG, JPG, SVG, or WebP
4. **Check Browser Console**: Look for 404 errors or loading issues
5. **Clear Browser Cache**: Sometimes cached versions prevent new logos from loading

### Logo Appears Broken?
1. **Check Image Dimensions**: Recommended size: 256x256px or larger (square format)
2. **Check File Size**: Keep logos under 500KB for faster loading
3. **Check File Format**: PNG with transparency works best
4. **Try Different Format**: Convert to PNG if JPG isn't working

### Adding Multiple Formats?
The system will check for these extensions in order:
1. `.png`
2. `.jpg`
3. `.jpeg`
4. `.svg`
5. `.webp`

## 📊 Logo Mapping Examples

### Indian Stocks (NSE)
```
TCS.png          → TCS
RELIANCE.jpg     → RELIANCE
INFY.png         → INFY
HDFCBANK.png     → HDFCBANK
ICICIBANK.png    → ICICIBANK
```

### US Stocks
```
AAPL.png         → AAPL
TSLA.png         → TSLA
MSFT.png         → MSFT
GOOGL.png        → GOOGL
AMZN.png         → AMZN
```

## 🎨 Logo Recommendations

### Best Practices:
- **Size**: 256x256px to 512x512px (square)
- **Format**: PNG with transparency
- **Background**: Transparent or white
- **Aspect Ratio**: 1:1 (square)
- **File Size**: Under 500KB
- **Quality**: High resolution for crisp display

### Tools for Logo Preparation:
- **Resize**: Use online tools like `squoosh.app` or `tinypng.com`
- **Format Conversion**: Use `cloudconvert.com` or ImageMagick
- **Optimization**: Use `svgomg` for SVG optimization

## 🚀 Advanced: Batch Logo Integration

If you have many logos, you can:

1. **Create a script** to rename files to match stock symbols
2. **Use the logo mapper** to add custom mappings
3. **Load from API/database** if you have a logo service

## 📝 Notes

- Logos are served from the `public` directory, so they're accessible at `/logos/FILENAME`
- The system automatically falls back to API logos if local logos aren't found
- Initials placeholder is shown as a final fallback if no logo is available
- Logos are cached by the browser for performance

## ✅ Verification Checklist

- [ ] Logos directory exists: `frontend/public/logos/`
- [ ] Logo files are named correctly (e.g., `TCS.png`)
- [ ] Logo files are in supported formats (PNG, JPG, SVG, WebP)
- [ ] Logo mapping is updated (if needed)
- [ ] Application is restarted after adding logos
- [ ] Browser cache is cleared (if testing)
- [ ] Logos appear in Company Info card when searching stocks

## 🆘 Need Help?

If you encounter issues:
1. Check the browser console for errors
2. Verify file paths and naming
3. Check backend logs for logo lookup errors
4. Ensure Vite dev server is running (for frontend)
5. Verify logos are accessible at `http://localhost:5173/logos/SYMBOL.png`

