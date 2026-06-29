import axios from 'axios'
import { getCompanyMeta, getRemoteLogoUrl } from '../utils/logoMapper'

const DEFAULT_LOCAL_API_URL = 'http://127.0.0.1:8000'
const IS_PRODUCTION = import.meta.env.PROD
const API_BASE_URL = import.meta.env.VITE_API_URL || (IS_PRODUCTION ? '' : DEFAULT_LOCAL_API_URL)
const BACKEND_DISPLAY_URL = API_BASE_URL
const DEFAULT_TIMEOUT = IS_PRODUCTION ? 45000 : 30000
const FAST_TIMEOUT = IS_PRODUCTION ? 20000 : 10000
const DATA_TIMEOUT = IS_PRODUCTION ? 25000 : 15000
const ANALYSIS_TIMEOUT = IS_PRODUCTION ? 70000 : 120000
const quoteCache = new Map()
const inFlightQuoteRequests = new Map()
const QUOTE_CACHE_TTL_MS = IS_PRODUCTION ? 30000 : 15000
const getRealtimeWebSocketUrl = () => {
  try {
    if (!API_BASE_URL && typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      return `${protocol}//${window.location.host}/ws/realtime-prices`
    }
    const normalized = new URL(API_BASE_URL)
    const protocol = normalized.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${normalized.host}/ws/realtime-prices`
  } catch {
    return 'ws://127.0.0.1:8000/ws/realtime-prices'
  }
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: DEFAULT_TIMEOUT,
})

// Add request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log(`[API] ${config.method.toUpperCase()} ${config.url}`)
    return config
  },
  (error) => {
    console.error('[API] Request error:', error)
    return Promise.reject(error)
  }
)

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log(`[API] Response from ${response.config.url}:`, response.status)
    return response
  },
  (error) => {
    console.error(`[API] Error from ${error.config?.url}:`, error.response?.data || error.message)
    return Promise.reject(error)
  }
)

// Initialize ecosystem
export const initializeEcosystem = async (symbols = ['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN'], initialCapital = 100000) => {
  try {
    console.log(`[API] Initializing ecosystem with symbols: ${symbols}, capital: ${initialCapital}`)
    const response = await api.post('/api/initialize', {
      symbols,
      initial_capital: initialCapital,
    }, { timeout: IS_PRODUCTION ? 45000 : 120000 })
    console.log('[API] Ecosystem initialization response:', response.data)
    return response.data
  } catch (error) {
    console.error('[API] Error initializing ecosystem:', error)
    if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error') || error.message.includes('Failed to fetch')) {
      throw new Error(`Network Error: Cannot connect to backend server at ${BACKEND_DISPLAY_URL}`)
    }
    throw error
  }
}

// Get status with better error handling
export const getStatus = async () => {
  const maxAttempts = IS_PRODUCTION ? 4 : 2
  let lastError

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      console.log(`[API] Checking backend status... (attempt ${attempt}/${maxAttempts})`)
      const response = await api.get('/api/health', { timeout: FAST_TIMEOUT })
      const payload = response.data || {}
      const normalizedStatus = {
        connected: payload.success !== false,
        initialized: Boolean(payload.ecosystem_loaded),
        symbols: [],
        initial_capital: null,
        cycle_count: null,
      }
      console.log('[API] Health response:', payload)
      return normalizedStatus
    } catch (error) {
      lastError = error
      console.error('[API] Error checking status:', error)

      const isNetworkError =
        error.code === 'ECONNREFUSED' ||
        error.code === 'ECONNABORTED' ||
        error.message.includes('Network Error') ||
        error.message.includes('Failed to fetch') ||
        error.message.includes('timeout')

      if (attempt < maxAttempts && isNetworkError) {
        await new Promise(resolve => setTimeout(resolve, IS_PRODUCTION ? 5000 : 3000))
        continue
      }
    }
  }

  try {
    throw lastError
  } catch (error) {
    // Throw error with clear message if backend is not reachable
    if (
      error.code === 'ECONNREFUSED' ||
      error.code === 'ECONNABORTED' ||
      error.message.includes('Network Error') ||
      error.message.includes('Failed to fetch') ||
      error.message.includes('timeout')
    ) {
      const errorMsg = `Cannot connect to backend server at ${BACKEND_DISPLAY_URL}`
      console.error('[API]', errorMsg)
      throw new Error('Network Error: ' + errorMsg)
    }
    throw error
  }
}


// Get predictions (with pagination support)
export const getPredictions = async (market = 'US', limit = 20, offset = 0) => {
  const response = await api.get('/api/predictions', {
    params: { market, limit, offset }
  })
  return response.data
}

// Get stocks by market
export const getStocksByMarket = async (market) => {
  try {
    const response = await api.get(`/api/stocks/${market}`)
    return response.data
  } catch (error) {
    console.error(`[API] Error fetching stocks for market ${market}:`, error)
    // Return fallback stocks if API fails
    const fallbackStocks = {
      US: ['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'NFLX', 'AMD', 'INTC'],
      IN: [
        'RELIANCE', 'TCS', 'HDFCBANK', 'ICICIBANK', 'HDFC', 'SBIN', 'KOTAKBANK', 'AXISBANK', 'INDUSINDBK',
        'INFY', 'WIPRO', 'HCLTECH', 'TECHM', 'LTIM', 'LTTS', 'PERSISTENT', 'MINDTREE',
        'HINDUNILVR', 'ITC', 'NESTLEIND', 'MARICO', 'DABUR', 'BRITANNIA', 'TITAN', 'TATACONSUM',
        'BHARTIARTL', 'RIL', 'MARUTI', 'M&M', 'TATAMOTORS', 'BAJAJ-AUTO', 'HEROMOTOCO', 'EICHERMOT',
        'SUNPHARMA', 'DRREDDY', 'CIPLA', 'LUPIN', 'DIVISLAB', 'BIOCON', 'TORNTPHARM',
        'ONGC', 'IOC', 'BPCL', 'HPCL', 'GAIL', 'ADANIENT', 'ADANIPORTS',
        'LT', 'LARSEN', 'BHEL', 'SIEMENS', 'ABB', 'SCHNEIDER',
        'TATASTEEL', 'JSW', 'JSWSTEEL', 'HINDALCO', 'VEDL', 'NMDC', 'COALINDIA',
        'ULTRACEMCO', 'SHREECEM', 'ACC', 'AMBUJACEM', 'DALBHARAT',
        'NTPC', 'POWERGRID', 'TATAPOWER', 'ADANIPOWER', 'NHPC',
        'DLF', 'GODREJPROP', 'PRESTIGE', 'SOBHA',
        'ZEE', 'SUNTV', 'TV18BRDCST',
        'DMART', 'RELAXO', 'BATAINDIA',
        'UPL', 'RCF', 'GNFC', 'FACT',
        'ASIANPAINT', 'BERGEPAINT', 'PIDILITIND', 'GRASIM', 'ADANIGREEN', 'ADANITRANS'
      ]
    }
    return {
      success: true,
      market: market.toUpperCase(),
      stocks: fallbackStocks[market.toUpperCase()] || fallbackStocks.US
    }
  }
}

// Train models
export const trainModels = async (epochs = 10) => {
  const response = await api.post('/api/train-models', null, {
    params: { epochs },
  })
  return response.data
}

// Run trading cycle
export const runTradingCycle = async (trainModels = false, epochs = 10) => {
  const response = await api.post('/api/run-cycle', {
    train_models: trainModels,
    epochs,
  })
  return response.data
}

// Get portfolio
export const getPortfolio = async () => {
  const response = await api.get('/api/portfolio')
  return response.data
}

// Get performance
export const getPerformance = async () => {
  const response = await api.get('/api/performance')
  return response.data
}

// Get trade history
export const getTradeHistory = async (limit = 50) => {
  const response = await api.get('/api/trade-history', {
    params: { limit },
  })
  return response.data
}

// Get performance history
export const getPerformanceHistory = async () => {
  const response = await api.get('/api/performance-history')
  return response.data
}

// Get risk alerts
export const getRiskAlerts = async () => {
  const response = await api.get('/api/risk-alerts')
  return response.data
}

// Get agent status
export const getAgentStatus = async () => {
  const response = await api.get('/api/agent-status')
  return response.data
}

// Get stock detail
export const getStockDetail = async (symbol) => {
  const response = await api.get(`/api/stock/${symbol}`)
  return response.data
}

// Analyze stock investment
export const analyzeStockInvestment = async (symbol, investmentAmount, investmentPeriod, market = 'US') => {
  const response = await api.post('/api/analyze-investment', {
    symbol,
    market,
    investment_amount: investmentAmount,
    investment_period: investmentPeriod,
  }, { timeout: ANALYSIS_TIMEOUT })
  return response.data
}

// Get historical analysis
export const getHistoricalAnalysis = async (symbol, market = 'US') => {
  const response = await api.get(`/api/historical-analysis/${symbol}`, {
    params: { market },
    timeout: ANALYSIS_TIMEOUT
  })
  return response.data
}

// Get OHLC data for candlestick charts
export const getOHLCData = async (symbol, period = '1mo', interval = '1d', market = 'US') => {
  const response = await api.get(`/api/ohlc/${symbol}`, {
    params: { period, interval, market },
    timeout: DATA_TIMEOUT
  })
  return response.data
}

// Get real-time price
export const getRealtimePrice = async (symbol, market = 'US') => {
  const cacheKey = `${market}:${symbol}`.toUpperCase()
  const cached = quoteCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < QUOTE_CACHE_TTL_MS) {
    return cached.payload
  }
  if (inFlightQuoteRequests.has(cacheKey)) {
    return inFlightQuoteRequests.get(cacheKey)
  }

  const request = (async () => {
    const response = await api.get(`/api/realtime-price/${symbol}`, {
      params: { market },
      timeout: FAST_TIMEOUT
    })
    quoteCache.set(cacheKey, { timestamp: Date.now(), payload: response.data })
    return response.data
  })()

  inFlightQuoteRequests.set(cacheKey, request)

  try {
    return await request
  } catch (error) {
    console.warn('[API] Error fetching real-time price:', error)
    // Return empty result instead of throwing
    return {
      success: false,
      symbol: symbol,
      price: null,
      current_price: null
    }
  } finally {
    inFlightQuoteRequests.delete(cacheKey)
  }
}

// Get stock recommendation (BUY/HOLD/SELL)
export const getRecommendation = async (symbol, market = 'US') => {
  try {
    const response = await api.get(`/api/recommend/${symbol}`, {
      params: { market },
      timeout: DATA_TIMEOUT
    })
    return response.data
  } catch (error) {
    console.error('[API] Error fetching recommendation:', error)
    // Always return default values instead of throwing
    console.warn('[API] Recommendation endpoint failed, returning default values')
    return {
      success: false,
      symbol: symbol,
      recommendation: "HOLD",
      reason: "Recommendation data unavailable. Calculating from price trends.",
      color: "yellow",
      score: 0.0,
      expected_return: 0.0,
      risk: 5.0,
      confidence: 50.0,
      signal: "Neutral"
    }
  }
}

export const getSearchSummary = async (symbol, market = 'US') => {
  try {
    const response = await api.get(`/api/search-summary/${symbol}`, {
      params: { market },
      timeout: DATA_TIMEOUT
    })
    return response.data
  } catch (error) {
    console.error('[API] Error fetching search summary:', error)
    return {
      success: false,
      symbol,
      market,
      price: null,
      ohlc: null,
      recommendation: null,
      company_info: null,
      news_sentiment: null,
    }
  }
}

export const getNewsSentiment = async (symbol, market = 'US', refresh = false) => {
  try {
    const response = await api.get(`/api/news-sentiment/${symbol}`, {
      params: { market, refresh },
      timeout: DATA_TIMEOUT
    })
    return response.data
  } catch (error) {
    console.error('[API] Error fetching news sentiment:', error)
    return {
      success: true,
      symbol,
      market,
      score: 0,
      label: 'Neutral',
      article_count: 0,
      headlines: [],
      message: 'News sentiment is temporarily unavailable.',
      cached: false
    }
  }
}

// Get company information
export const getCompanyInfo = async (symbol, market = 'US') => {
  try {
    const response = await api.get(`/api/company-info/${symbol}`, {
      params: { market },
      timeout: FAST_TIMEOUT
    })
    return response.data
  } catch (error) {
    console.error('[API] Error fetching company info:', error)
    const meta = getCompanyMeta(symbol)
    // Return minimal data instead of throwing
    return {
      success: true,
      symbol: symbol,
      fetch_symbol: symbol,
      company_name: meta?.name || symbol,
      sector: null,
      industry: null,
      market_cap: null,
      pe_ratio: null,
      financial_ratios: {},
      logo_url: getRemoteLogoUrl(symbol),
      description: null,
      website: meta?.website || null,
      market: market
    }
  }
}

export const getAnalysisHistory = async (limit = 20, symbol = null, market = null) => {
  const response = await api.get('/api/analysis-history', {
    params: { limit, symbol, market }
  })
  return response.data
}

export const getWatchlist = async (market = 'IN') => {
  const response = await api.get('/api/watchlist', {
    params: { market }
  })
  return response.data
}

export const addWatchlistItem = async (symbol, market = 'IN', notes = null) => {
  const response = await api.post('/api/watchlist', {
    symbol,
    market,
    notes,
  })
  return response.data
}

export const removeWatchlistItem = async (symbol, market = 'IN') => {
  const response = await api.delete(`/api/watchlist/${symbol}`, {
    params: { market }
  })
  return response.data
}

// WebSocket connection for real-time prices
export const createRealtimePriceConnection = (symbols, market = 'US', interval = 5, onUpdate) => {
  const ws = new WebSocket(getRealtimeWebSocketUrl())
  
  ws.onopen = () => {
    ws.send(JSON.stringify({
      symbols,
      market,
      interval
    }))
  }
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data)
    if (data.type === 'price_update' && onUpdate) {
      onUpdate(data)
    }
  }
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error)
  }
  
  ws.onclose = () => {
    console.log('WebSocket connection closed')
  }
  
  return ws
}

// Get shareholding pattern
export const getShareholdingPattern = async (symbol, market = 'US') => {
  try {
    const response = await api.get(`/api/shareholding/${symbol}`, {
      params: { market }
    })
    return response.data
  } catch (error) {
    console.error(`[API] Error fetching shareholding pattern for ${symbol}:`, error)
    return null
  }
}

export default api
export { API_BASE_URL, BACKEND_DISPLAY_URL, IS_PRODUCTION }
