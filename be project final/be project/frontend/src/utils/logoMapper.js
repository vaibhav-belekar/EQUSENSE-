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
  'HDFCBANK': 'HDFCBANK.svg',
  'ICICIBANK': 'ICICIBANK.png',
  'HDFC': 'HDFC.png',
  'HINDUNILVR': 'HINDUNILVR.png',
  'ITC': 'ITC.png',
  'SBIN': 'SBIN.png',
  'BHARTIARTL': 'BHARTIARTL.png',
  'WIPRO': 'WIPRO.png',
  'HCLTECH': 'HCLTECH.png',
  'TECHM': 'TECHM.png',
  'M&M': 'M_M.svg',
  'MARUTI': 'MARUTI.png',
  'TATAMOTORS': 'TATAMOTORS.png',
  'SUNPHARMA': 'SUNPHARMA.png',
  'DRREDDY': 'DRREDDY.png',
  'CIPLA': 'CIPLA.png',
  'ONGC': 'ONGC.png',
  'BPCL': 'BPCL.svg',
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

const availableLocalLogos = new Set(['LT.png', 'HDFCBANK.svg', 'M_M.svg', 'BPCL.svg'])

const companyMeta = {
  RELIANCE: { name: 'Reliance Industries Limited', displaySymbol: 'NSE: RELIANCE', website: 'ril.com' },
  TCS: { name: 'Tata Consultancy Services Limited', displaySymbol: 'NSE: TCS', website: 'tcs.com' },
  INFY: { name: 'Infosys Limited', displaySymbol: 'NSE: INFY', website: 'infosys.com' },
  HDFCBANK: { name: 'HDFC Bank Limited', displaySymbol: 'NSE: HDFCBANK', website: 'hdfcbank.com' },
  ICICIBANK: { name: 'ICICI Bank Limited', displaySymbol: 'NSE: ICICIBANK', website: 'icicibank.com' },
  SBIN: { name: 'State Bank of India', displaySymbol: 'NSE: SBIN', website: 'sbi.co.in' },
  AXISBANK: { name: 'Axis Bank Limited', displaySymbol: 'NSE: AXISBANK', website: 'axisbank.com' },
  TATASTEEL: { name: 'Tata Steel Limited', displaySymbol: 'NSE: TATASTEEL', website: 'tatasteel.com' },
  TATAMOTORS: { name: 'Tata Motors Limited', displaySymbol: 'NSE: TATAMOTORS', website: 'tatamotors.com' },
  TATAPOWER: { name: 'Tata Power Company Limited', displaySymbol: 'NSE: TATAPOWER', website: 'tatapower.com' },
  HINDUNILVR: { name: 'Hindustan Unilever Limited', displaySymbol: 'NSE: HINDUNILVR', website: 'hul.co.in' },
  ITC: { name: 'ITC Limited', displaySymbol: 'NSE: ITC', website: 'itcportal.com' },
  DABUR: { name: 'Dabur India Limited', displaySymbol: 'NSE: DABUR', website: 'dabur.com' },
  COLPAL: { name: 'Colgate-Palmolive India Limited', displaySymbol: 'NSE: COLPAL', website: 'colgatepalmolive.co.in' },
  BHARTIARTL: { name: 'Bharti Airtel Limited', displaySymbol: 'NSE: BHARTIARTL', website: 'airtel.in' },
  WIPRO: { name: 'Wipro Limited', displaySymbol: 'NSE: WIPRO', website: 'wipro.com' },
  HCLTECH: { name: 'HCL Technologies Limited', displaySymbol: 'NSE: HCLTECH', website: 'hcltech.com' },
  TECHM: { name: 'Tech Mahindra Limited', displaySymbol: 'NSE: TECHM', website: 'techmahindra.com' },
  'M&M': { name: 'Mahindra & Mahindra Limited', displaySymbol: 'NSE: M&M', website: 'mahindra.com' },
  MARUTI: { name: 'Maruti Suzuki India Limited', displaySymbol: 'NSE: MARUTI', website: 'marutisuzuki.com' },
  SUNPHARMA: { name: 'Sun Pharmaceutical Industries Limited', displaySymbol: 'NSE: SUNPHARMA', website: 'sunpharma.com' },
  DRREDDY: { name: "Dr. Reddy's Laboratories Limited", displaySymbol: 'NSE: DRREDDY', website: 'drreddys.com' },
  CIPLA: { name: 'Cipla Limited', displaySymbol: 'NSE: CIPLA', website: 'cipla.com' },
  LUPIN: { name: 'Lupin Limited', displaySymbol: 'NSE: LUPIN', website: 'lupin.com' },
  ONGC: { name: 'Oil and Natural Gas Corporation Limited', displaySymbol: 'NSE: ONGC', website: 'ongcindia.com' },
  BPCL: { name: 'Bharat Petroleum Corporation Limited', displaySymbol: 'NSE: BPCL', website: 'bharatpetroleum.in' },
  LT: { name: 'Larsen & Toubro Limited', displaySymbol: 'NSE: LT', website: 'larsentoubro.com' },
  NTPC: { name: 'NTPC Limited', displaySymbol: 'NSE: NTPC', website: 'ntpc.co.in' },
  JSWSTEEL: { name: 'JSW Steel Limited', displaySymbol: 'NSE: JSWSTEEL', website: 'jswsteel.in' },
  ADANIENT: { name: 'Adani Enterprises Limited', displaySymbol: 'NSE: ADANIENT', website: 'adani.com' },
  ADANIPORTS: { name: 'Adani Ports and Special Economic Zone Limited', displaySymbol: 'NSE: ADANIPORTS', website: 'adani.com' },
  ADANIPOWER: { name: 'Adani Power Limited', displaySymbol: 'NSE: ADANIPOWER', website: 'adani.com' },
  ADANIGREEN: { name: 'Adani Green Energy Limited', displaySymbol: 'NSE: ADANIGREEN', website: 'adani.com' },
  ATGL: { name: 'Adani Total Gas Limited', displaySymbol: 'NSE: ATGL', website: 'adani.com' },
  AWL: { name: 'Adani Wilmar Limited', displaySymbol: 'NSE: AWL', website: 'adani.com' },
  AAPL: { name: 'Apple Inc.', displaySymbol: 'NASDAQ: AAPL', website: 'apple.com' },
  TSLA: { name: 'Tesla Inc.', displaySymbol: 'NASDAQ: TSLA', website: 'tesla.com' },
  MSFT: { name: 'Microsoft Corporation', displaySymbol: 'NASDAQ: MSFT', website: 'microsoft.com' },
  GOOGL: { name: 'Alphabet Inc.', displaySymbol: 'NASDAQ: GOOGL', website: 'abc.xyz' },
  AMZN: { name: 'Amazon.com Inc.', displaySymbol: 'NASDAQ: AMZN', website: 'amazon.com' },
  META: { name: 'Meta Platforms Inc.', displaySymbol: 'NASDAQ: META', website: 'meta.com' },
  NVDA: { name: 'NVIDIA Corporation', displaySymbol: 'NASDAQ: NVDA', website: 'nvidia.com' },
  NFLX: { name: 'Netflix Inc.', displaySymbol: 'NASDAQ: NFLX', website: 'netflix.com' },
  AMD: { name: 'Advanced Micro Devices Inc.', displaySymbol: 'NASDAQ: AMD', website: 'amd.com' },
  INTC: { name: 'Intel Corporation', displaySymbol: 'NASDAQ: INTC', website: 'intel.com' },
}

// Supported image extensions
const imageExtensions = ['.png', '.jpg', '.jpeg', '.svg', '.webp']

const normalizeSymbol = (symbol) => String(symbol || '').toUpperCase().replace(/\.(NS|BO)$/i, '')

export const normalizeLogoDomain = (website) => (
  String(website || '')
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .split('/')[0]
)

/**
 * Get local logo path for a stock symbol
 * @param {string} symbol - Stock symbol (e.g., 'TCS', 'AAPL')
 * @returns {string|null} - Local logo path or null if not found
 */
export const getLocalLogoPath = (symbol) => {
  if (!symbol) return null
  
  // Normalize symbol (remove .NS, .BO suffixes, uppercase)
  const normalizedSymbol = normalizeSymbol(symbol)
  
  // Check if logo exists in map
  const logoFilename = logoMap[normalizedSymbol]
  if (!logoFilename || !availableLocalLogos.has(logoFilename)) {
    return null
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
  const normalizedSymbol = normalizeSymbol(symbol)
  const logoFilename = logoMap[normalizedSymbol]
  return Boolean(logoFilename && availableLocalLogos.has(logoFilename))
}

export const getCompanyMeta = (symbol) => {
  const normalizedSymbol = normalizeSymbol(symbol)
  return companyMeta[normalizedSymbol] || null
}

export const getRemoteLogoUrl = (symbol) => {
  const meta = getCompanyMeta(symbol)
  const domain = normalizeLogoDomain(meta?.website)
  return domain ? `https://logo.clearbit.com/${domain}` : null
}

export const getWebsiteLogoSources = (symbol, websiteOverride = null) => {
  const meta = getCompanyMeta(symbol)
  const domain = normalizeLogoDomain(websiteOverride || meta?.website)
  const localLogo = getLocalLogoPath(symbol)
  const sources = []

  if (domain) {
    sources.push(`https://logo.clearbit.com/${domain}`)
    sources.push(`https://www.google.com/s2/favicons?domain=${domain}&sz=256`)
    sources.push(`https://icons.duckduckgo.com/ip3/${domain}.ico`)
  }

  if (localLogo) {
    sources.push(localLogo)
  }

  return Array.from(new Set(sources.filter(Boolean)))
}

export const getDisplaySymbol = (symbol, market = 'US') => {
  const normalizedSymbol = normalizeSymbol(symbol)
  const meta = getCompanyMeta(normalizedSymbol)
  if (meta?.displaySymbol) return meta.displaySymbol
  return `${market === 'IN' ? 'NSE' : 'NASDAQ'}: ${normalizedSymbol || 'STOCK'}`
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
  getCompanyMeta,
  getRemoteLogoUrl,
  getWebsiteLogoSources,
  getDisplaySymbol,
  addLogoMapping,
  getAllLogoMappings,
  loadLogoMappings
}
