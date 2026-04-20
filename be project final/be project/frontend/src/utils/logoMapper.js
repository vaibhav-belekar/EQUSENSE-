/**
 * Logo Mapper Utility
 * Maps stock symbols to local logo file paths
 */

// Map of stock symbols to logo filenames
// This can be extended to include all your logos
const logoMap = {
  // Indian Stocks
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
  'WIPRO': 'WIPRO.png',
  'HCLTECH': 'HCLTECH.png',
  'TECHM': 'TECHM.png',
  'MARUTI': 'MARUTI.png',
  'TATAMOTORS': 'TATAMOTORS.png',
  'SUNPHARMA': 'SUNPHARMA.png',
  'DRREDDY': 'DRREDDY.png',
  'CIPLA': 'CIPLA.png',
  'ONGC': 'ONGC.png',
  'TATASTEEL': 'TATASTEEL.png',
  'LT': 'LT.png',
  'NTPC': 'NTPC.png',
  
  // US Stocks
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

// Supported image extensions
const imageExtensions = ['.png', '.jpg', '.jpeg', '.svg', '.webp']

/**
 * Get local logo path for a stock symbol
 * @param {string} symbol - Stock symbol (e.g., 'TCS', 'AAPL')
 * @returns {string|null} - Local logo path or null if not found
 */
export const getLocalLogoPath = (symbol) => {
  if (!symbol) return null
  
  // Normalize symbol (remove .NS, .BO suffixes, uppercase)
  const normalizedSymbol = symbol.toUpperCase().replace(/\.(NS|BO)$/i, '')
  
  // Check if logo exists in map
  const logoFilename = logoMap[normalizedSymbol]
  if (!logoFilename) {
    // Try to find logo by checking common filename patterns
    // This allows for flexible naming
    return tryFindLogoFile(normalizedSymbol)
  }
  
  // Return path to logo in public directory
  return `/logos/${logoFilename}`
}

/**
 * Try to find logo file by checking common naming patterns
 * @param {string} symbol - Stock symbol
 * @returns {string|null} - Logo path or null
 */
const tryFindLogoFile = (symbol) => {
  // Try common extensions with symbol name
  for (const ext of imageExtensions) {
    const filename = `${symbol}${ext}`
    // In a real app, you might want to check if file exists
    // For now, we'll return the path and let the browser handle 404
    return `/logos/${filename}`
  }
  return null
}

/**
 * Check if a local logo exists for a symbol
 * @param {string} symbol - Stock symbol
 * @returns {boolean}
 */
export const hasLocalLogo = (symbol) => {
  if (!symbol) return false
  const normalizedSymbol = symbol.toUpperCase().replace(/\.(NS|BO)$/i, '')
  return logoMap[normalizedSymbol] !== undefined
}

/**
 * Add or update logo mapping
 * @param {string} symbol - Stock symbol
 * @param {string} filename - Logo filename
 */
export const addLogoMapping = (symbol, filename) => {
  const normalizedSymbol = symbol.toUpperCase().replace(/\.(NS|BO)$/i, '')
  logoMap[normalizedSymbol] = filename
}

/**
 * Get all mapped logos
 * @returns {Object} - Object with symbol as key and filename as value
 */
export const getAllLogoMappings = () => {
  return { ...logoMap }
}

/**
 * Load logo mapping from a JSON file or API
 * This can be used to load a comprehensive logo database
 * @param {Object} mappings - Logo mappings object
 */
export const loadLogoMappings = (mappings) => {
  Object.entries(mappings).forEach(([symbol, filename]) => {
    addLogoMapping(symbol, filename)
  })
}

export default {
  getLocalLogoPath,
  hasLocalLogo,
  addLogoMapping,
  getAllLogoMappings,
  loadLogoMappings
}

