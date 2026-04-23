import React, { useState, useEffect, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3,
  Brain,
  Search,
  Clock,
  X
} from 'lucide-react'
import toast from 'react-hot-toast'
import { 
  getPredictions, 
  analyzeStockInvestment,
  getHistoricalAnalysis,
  getStocksByMarket,
  getRealtimePrice,
  initializeEcosystem,
  getStatus,
  getCompanyInfo,
  getOHLCData,
  getRecommendation,
  getPortfolio,
  addWatchlistItem,
  BACKEND_DISPLAY_URL
} from '../services/api'
import StockAnalysisReport from './StockAnalysisReport'
import HistoricalAnalysis from './HistoricalAnalysis'
import CandlestickChart from './CandlestickChart'
import RecommendationCard from './RecommendationCard'
import CompanyInfo from './CompanyInfo'
import StockPriceChart from './StockPriceChart'
import NewsSentiment from './NewsSentiment'
import PortfolioSummary from './PortfolioSummary'
import ComparisonTable from './ComparisonTable'
import AIPrediction from './AIPrediction'
import TradingCall from './TradingCall'
import StockComparison from './StockComparison'

const buildDecisionFromModel = (signal, expectedReturn, risk, confidence = 0.5, score = null, hasPosition = false) => {
  const normalizedSignal = String(signal || 'Neutral').trim()
  const computedScore = Number(score ?? (expectedReturn / Math.max(risk, 0.5)))
  const bullishSetup = normalizedSignal === 'Up'
  const bearishSetup = normalizedSignal === 'Down'

  if (bullishSetup) {
    return {
      recommendation: 'BUY',
      color: 'green',
      action: 'Buy',
      reason: `ML trend model is bullish with ${Math.round(confidence * 100)}% confidence, so up-trending stocks are treated as BUY instead of HOLD.`
    }
  }

  if (bearishSetup) {
    const alternateAction = 'Avoid fresh entry; if already holding, consider SELL/EXIT.'

    return {
      recommendation: hasPosition ? 'SELL' : 'AVOID',
      color: 'red',
      action: hasPosition ? 'Sell' : 'Avoid',
      reason: hasPosition
        ? `ML trend model is bearish with ${Math.round(confidence * 100)}% confidence. ${alternateAction}`
        : `ML trend model is bearish with ${Math.round(confidence * 100)}% confidence. ${alternateAction}`,
      alternateAction
    }
  }

  return {
    recommendation: 'HOLD',
    color: 'yellow',
    action: 'Hold',
    reason: `ML trend model is neutral or not strong enough yet: score ${computedScore.toFixed(2)}, expected return ${expectedReturn.toFixed(2)}%, risk ${risk.toFixed(1)}/10.`
  }
}

const StockScreener = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedStock, setSelectedStock] = useState(null)
  const [investmentAmount, setInvestmentAmount] = useState('10000')
  const [investmentPeriod, setInvestmentPeriod] = useState('30') // days
  const [analysisResult, setAnalysisResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [market, setMarket] = useState('IN') // 'US' or 'IN'
  const [stockPrices, setStockPrices] = useState({})
  const [showHistorical, setShowHistorical] = useState(false)
  const [showChart, setShowChart] = useState(false)
  const [selectedStockForAnalysis, setSelectedStockForAnalysis] = useState(null)
  const [backendStatus, setBackendStatus] = useState({ connected: false, checking: true, initialized: false })
  const [selectedStockData, setSelectedStockData] = useState(null) // Store detailed stock data for display
  const [priceHistory, setPriceHistory] = useState([])
  const [companyInfo, setCompanyInfo] = useState(null)
  const [predictionMetrics, setPredictionMetrics] = useState(null)
  const [recommendation, setRecommendation] = useState(null)
  const [portfolio, setPortfolio] = useState(null)
  const [showComparisonModal, setShowComparisonModal] = useState(false)
  const [comparisonStocks, setComparisonStocks] = useState([])
  const activeSearchRequestRef = useRef(0)

  // Check backend status on mount and periodically
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const status = await getStatus()
        setBackendStatus({ connected: true, initialized: status.initialized || false, checking: false })
      } catch (error) {
        setBackendStatus({ connected: false, initialized: false, checking: false })
      }
    }

    checkBackend()
    // Check every 30 seconds
    const interval = setInterval(checkBackend, 30000)
    return () => clearInterval(interval)
  }, [])

  // Fallback stock lists
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

  // Available stocks for search (from API or fallback) - initialize with fallback
  const [availableStocks, setAvailableStocks] = useState(fallbackStocks.IN)

  const comparisonCandidates = useMemo(() => {
    if (!selectedStockData) return []

    const mergedStocks = [
      selectedStockData,
      ...searchResults.filter((stock) => stock.symbol !== selectedStockData.symbol)
    ]

    return mergedStocks
      .filter((stock) => stock?.symbol)
      .slice(0, 5)
      .map((stock) => {
        const isCurrent = stock.symbol === selectedStockData.symbol
        const effectivePrediction = isCurrent ? selectedStockData.prediction : stock.prediction
        const effectiveExpectedReturn = isCurrent
          ? (predictionMetrics?.expectedReturn ?? recommendation?.expected_return ?? effectivePrediction?.expected_return ?? 0)
          : (stock.prediction?.expected_return ?? 0)
        const effectiveRisk = isCurrent
          ? (predictionMetrics?.risk ?? recommendation?.risk ?? effectivePrediction?.risk ?? 5)
          : (stock.prediction?.risk ?? 5)
        const current = Number(stock.price || stockPrices[stock.symbol] || 0)
        const predicted = current * (1 + (effectiveExpectedReturn / 100))

        return {
          symbol: stock.symbol,
          current_price: current,
          predicted_price: predicted,
          prediction: effectivePrediction || { signal: 'Neutral', confidence: 0.5 },
          expected_return: effectiveExpectedReturn,
          risk_score: effectiveRisk,
          profit_loss: predicted - current,
          profit_loss_percent: effectiveExpectedReturn
        }
      })
  }, [selectedStockData, searchResults, stockPrices, predictionMetrics, recommendation])

  useEffect(() => {
    document.title = 'Equisense - Stock Screener & Investment Analyzer'
    
    // Immediately set fallback stocks for the current market
    const fallback = fallbackStocks[market] || fallbackStocks.US
    setAvailableStocks(fallback)
    
    // Load available stocks for search suggestions from API (will update if successful)
    const loadAvailableStocks = async () => {
      try {
        console.log(`[StockScreener] Loading stocks for market: ${market}`)
        const stocksData = await getStocksByMarket(market)
        console.log(`[StockScreener] Received stocks data:`, stocksData)
        
        if (stocksData && stocksData.success && Array.isArray(stocksData.stocks) && stocksData.stocks.length > 0) {
          console.log(`[StockScreener] Setting ${stocksData.stocks.length} stocks from API`)
          setAvailableStocks(stocksData.stocks)
        } else {
          // Keep fallback list if API returns invalid data
          console.warn(`[StockScreener] Invalid API response, keeping fallback stocks for ${market}`)
        }
      } catch (error) {
        console.error('[StockScreener] Error loading stocks:', error)
        // Keep fallback list on error (already set above)
        console.log(`[StockScreener] Using fallback stocks for ${market} due to error`)
      }
    }
    
    loadAvailableStocks()
  }, [market])

  const refreshPortfolio = async () => {
    try {
      const portfolioData = await getPortfolio()
      if (portfolioData?.success) {
        setPortfolio(portfolioData)
        return portfolioData
      }
    } catch (error) {
      console.log('[StockScreener] Portfolio fetch unavailable:', error?.message || error)
    }
    return null
  }

  const hasOpenPosition = (symbol, portfolioData = portfolio) => {
    const normalized = String(symbol || '').replace(/\.(NS|BO)$/i, '').toUpperCase()
    const holdings = portfolioData?.holdings || []

    return holdings.some((holding) => {
      const holdingSymbol = String(holding?.symbol || '').replace(/\.(NS|BO)$/i, '').toUpperCase()
      return holdingSymbol === normalized && Number(holding?.shares || 0) > 0
    })
  }

  const resolveSearchSymbol = (rawTerm) => {
    const normalized = rawTerm.trim().toUpperCase()
    if (!normalized) {
      return { symbol: '', error: 'Please enter a stock symbol to search' }
    }

    const exactMatch = availableStocks.find(stock => stock === normalized)
    if (exactMatch) {
      return { symbol: exactMatch }
    }

    const prefixMatches = availableStocks.filter(stock => stock.startsWith(normalized))
    if (prefixMatches.length === 1) {
      return { symbol: prefixMatches[0] }
    }

    if (prefixMatches.length > 1 && normalized.length < 3) {
      return { symbol: '', error: 'Type at least 3 letters or choose one exact stock from suggestions' }
    }

    const containsMatches = availableStocks.filter(stock => stock.includes(normalized))
    if (containsMatches.length === 1) {
      return { symbol: containsMatches[0] }
    }

    return { symbol: normalized }
  }

  const buildPredictionFromSignal = (predictionData) => {
    const rawConfidence = Number(predictionData?.confidence ?? 0.5)
    const normalizedConfidence = rawConfidence > 1 ? rawConfidence / 100 : rawConfidence

    return {
      signal: predictionData?.signal || 'Neutral',
      confidence: normalizedConfidence,
      expected_return: predictionData?.expected_return ?? 0.2,
      risk: predictionData?.risk ?? 5.0,
      score: predictionData?.score ?? ((predictionData?.expected_return ?? 0.2) / Math.max(predictionData?.risk ?? 5.0, 0.5)),
      has_position: Boolean(predictionData?.has_position)
    }
  }

  const normalizeRecommendationPayload = (payload, fallbackPrediction = null, symbol = '') => {
    if (!payload) return payload

    const signal = payload.signal || fallbackPrediction?.signal || 'Neutral'
    const confidence = Number(
      payload.confidence != null
        ? Number(payload.confidence) / 100
        : fallbackPrediction?.confidence ?? 0.5
    )
    const expectedReturn = Number(
      payload.expected_return ??
      fallbackPrediction?.expected_return ??
      0.2
    )
    const risk = Number(
      payload.risk ??
      fallbackPrediction?.risk ??
      5.0
    )
    const score = Number(
      payload.score ??
      (expectedReturn / Math.max(risk, 0.5))
    )
    const hasPosition = payload.has_position != null ? payload.has_position : hasOpenPosition(symbol)

    const decision = buildDecisionFromModel(signal, expectedReturn, risk, confidence, score, hasPosition)
    const currentRecommendation = String(payload.recommendation || '').toUpperCase()

    if (currentRecommendation === decision.recommendation) {
      return {
        ...payload,
        signal,
        has_position: hasPosition,
        alternate_action: payload.alternate_action || decision.alternateAction || null,
        confidence: Number((confidence * 100).toFixed(1)),
        expected_return: expectedReturn,
        risk,
        score
      }
    }

    if (decision.recommendation !== 'HOLD') {
        return {
          ...payload,
          recommendation: decision.recommendation,
          reason: decision.reason,
          color: decision.color,
          signal,
          has_position: hasPosition,
          alternate_action: payload.alternate_action || decision.alternateAction || null,
          confidence: Number((confidence * 100).toFixed(1)),
          expected_return: expectedReturn,
          risk,
        score
      }
    }

    return {
      ...payload,
      signal,
      has_position: hasPosition,
      alternate_action: payload.alternate_action || decision.alternateAction || null,
      confidence: Number((confidence * 100).toFixed(1)),
      expected_return: expectedReturn,
      risk,
      score
    }
  }

  const buildLocalAnalysisResult = (symbol) => {
    const currentPrice = selectedStockData?.symbol === symbol
      ? (selectedStockData?.price || stockPrices[symbol])
      : stockPrices[symbol]

    if (!currentPrice || !Number.isFinite(currentPrice) || currentPrice <= 0) {
      return null
    }

    const expectedReturn = predictionMetrics?.expectedReturn ?? recommendation?.expected_return ?? selectedStockData?.prediction?.expected_return ?? 0.2
    const riskScore = predictionMetrics?.risk ?? recommendation?.risk ?? selectedStockData?.prediction?.risk ?? 5.0
    const score = recommendation?.score ?? (expectedReturn / Math.max(riskScore, 0.5))
    const signal = selectedStockData?.prediction?.signal || recommendation?.signal || 'Neutral'
    const confidence = selectedStockData?.prediction?.confidence ?? ((recommendation?.confidence ?? 50) / 100)
    const decision = buildDecisionFromModel(
      signal,
      expectedReturn,
      riskScore,
      confidence,
      score,
      hasOpenPosition(symbol)
    )

    const investmentAmountValue = parseFloat(investmentAmount)
    const investmentPeriodValue = Math.max(1, parseInt(investmentPeriod))
    const forecastHorizonDays = Math.max(1, parseInt(selectedStockData?.prediction?.forecast_horizon_days ?? 10))
    const scaledReturn = Math.pow(1 + (expectedReturn / 100), investmentPeriodValue / forecastHorizonDays) - 1
    const predictedPrice = currentPrice * (1 + scaledReturn)
    const shares = investmentAmountValue / currentPrice
    const predictedValue = shares * predictedPrice
    const profitLoss = predictedValue - investmentAmountValue
    const profitLossPercent = investmentAmountValue > 0 ? (profitLoss / investmentAmountValue) * 100 : 0

    const auditorRecommendation = decision.recommendation === 'BUY'
      ? `BUY: ML trend model supports an upward move with expected return ${expectedReturn.toFixed(2)}%.`
      : decision.recommendation === 'SELL'
        ? `SELL: ML trend model indicates downside risk with expected return ${expectedReturn.toFixed(2)}%.`
        : decision.recommendation === 'AVOID'
          ? `AVOID: ML trend model indicates downside risk, so fresh entries should be avoided.`
          : `HOLD: ML trend model is neutral or not strong enough for a buy yet.`

    return {
      success: true,
      report: {
        symbol,
        current_price: currentPrice,
        predicted_price: predictedPrice,
        price_change_percent: scaledReturn * 100,
        investment_amount: investmentAmountValue,
        investment_period: investmentPeriodValue,
        shares,
        predicted_value: predictedValue,
        profit_loss: profitLoss,
        profit_loss_percent: profitLossPercent,
        prediction: {
          signal,
          confidence,
          expected_return: scaledReturn * 100,
          risk: riskScore,
          score,
          forecast_horizon_days: forecastHorizonDays
        },
        expected_return: scaledReturn * 100,
        risk: riskScore,
        score,
        recommendation: decision.recommendation,
        recommendation_reason: decision.reason,
        model_action: decision.action,
        has_position: hasOpenPosition(symbol),
        agent_reports: {
          analyst: {
            signal,
            confidence,
            expected_return: expectedReturn,
            risk: riskScore,
            score,
            reasoning: 'Built from the latest fetched price history and prediction when backend live analysis was unavailable.'
          },
          trader: {
            action: decision.action,
            recommended_shares: decision.action === 'Buy' ? Math.floor(shares) : 0,
            reasoning: decision.reason
          },
          risk: {
            risk_level: riskScore <= 3 ? 'Low' : riskScore <= 6 ? 'Medium' : 'High',
            volatility: riskScore / 100,
            alerts: [],
            reasoning: 'Risk level estimated from the currently available analysis metrics.'
          },
          auditor: {
            expected_return: expectedReturn,
            risk_score: riskScore,
            recommendation: auditorRecommendation,
            reasoning: auditorRecommendation
          }
        }
      }
    }
  }

  const handleSearch = async (forcedSymbol = null) => {
    const resolved = resolveSearchSymbol(forcedSymbol || searchTerm)
    if (!resolved.symbol) {
      toast.error(resolved.error)
      return
    }

    const symbol = resolved.symbol
    const requestId = Date.now()
    activeSearchRequestRef.current = requestId
    setSearchTerm(symbol)
    setSelectedStockData(null)
    setCompanyInfo(null)
    setPriceHistory([])
    setRecommendation(null)
    setPredictionMetrics(null)

    if (!symbol.trim()) {
      toast.error('Please enter a stock symbol to search')
      return
    }

    setSearching(true)
    try {
      await refreshPortfolio()

      // Fetch real-time price
      const [priceResult, ohlcResult, recommendationResult] = await Promise.allSettled([
        getRealtimePrice(symbol, market),
        getOHLCData(symbol, '1mo', '1d', market),
        getRecommendation(symbol, market),
      ])

      let price = null
      if (priceResult.status === 'fulfilled' && priceResult.value?.success) {
        price = priceResult.value.price || priceResult.value.current_price
      } else if (priceResult.status === 'rejected') {
        console.error('Error fetching price:', priceResult.reason)
      }

      // Fetch predictions for the symbol - always create prediction from price data
      let prediction = null
      let ohlcDataForPrediction = ohlcResult.status === 'fulfilled' ? ohlcResult.value : null
      
      try {
        if (ohlcDataForPrediction && ohlcDataForPrediction.success && ohlcDataForPrediction.data && ohlcDataForPrediction.data.length >= 2) {
          const prices = ohlcDataForPrediction.data.map(d => d.close).filter(p => p > 0)
          if (prices.length >= 2) {
            const recentPrice = prices[prices.length - 1]
            const previousPrice = prices[prices.length - 2]
            const change = (recentPrice - previousPrice) / previousPrice
            const change5 = prices.length >= 6 ? (recentPrice - prices[prices.length - 6]) / prices[prices.length - 6] : change
            const change20 = prices.length >= 21 ? (recentPrice - prices[prices.length - 21]) / prices[prices.length - 21] : change5
            const trendScore = (change * 0.45) + (change5 * 0.35) + (change20 * 0.20)
            
            if (!price) {
              price = recentPrice
            }
            
            if (trendScore >= 0.01) {
              prediction = { signal: 'Up', confidence: Math.min(0.86, 0.52 + Math.abs(trendScore) * 10) }
            } else if (trendScore <= -0.01) {
              prediction = { signal: 'Down', confidence: Math.min(0.86, 0.52 + Math.abs(trendScore) * 10) }
            } else {
              prediction = { signal: 'Neutral', confidence: 0.55 }
            }
          } else if (prices.length === 1 && !price) {
            price = prices[0]
            prediction = { signal: 'Neutral', confidence: 0.5 }
          }
        } else if (ohlcResult.status === 'rejected') {
          console.log('[StockScreener] Could not fetch price data for prediction:', ohlcResult.reason)
        }
        
        if (recommendationResult.status === 'fulfilled') {
          const recommendationPayload = recommendationResult.value
          if (recommendationPayload && recommendationPayload.success) {
            const normalizedRecommendation = normalizeRecommendationPayload(recommendationPayload, null, symbol)
            prediction = buildPredictionFromSignal(normalizedRecommendation)
            setRecommendation(normalizedRecommendation)
          }
        } else {
          console.log('[StockScreener] Recommendation API failed, keeping fallback prediction')
        }
      } catch (error) {
        console.log('[StockScreener] Error in prediction logic:', error)
      }
      
      // Always ensure we have a prediction (default if all methods failed)
      if (!prediction) {
        prediction = buildPredictionFromSignal({ signal: 'Neutral', confidence: 0.5, expected_return: 0.2, risk: 5.0, score: 0.04 })
      }

      // Fetch company info (non-blocking)
      getCompanyInfo(symbol, market)
        .then(companyDataResult => {
          if (activeSearchRequestRef.current === requestId && companyDataResult && companyDataResult.success) {
            setCompanyInfo(companyDataResult)
          }
        })
        .catch(error => {
          console.log('[StockScreener] Company info fetch failed:', error)
        })

      // Fetch price history for chart (reuse data if already fetched)
      if (ohlcDataForPrediction && ohlcDataForPrediction.success && ohlcDataForPrediction.data) {
        // Use the data we already fetched
        const history = ohlcDataForPrediction.data.slice(-180).map(item => ({ // Last 6 months
          date: item.date,
          price: item.close,
          value: item.close
        }))
        if (activeSearchRequestRef.current === requestId) {
          setPriceHistory(history)
        }
      } else {
        // Fetch separately if not already available
        getOHLCData(symbol, '6mo', '1d', market)
          .then(ohlcData => {
            if (ohlcData && ohlcData.success && ohlcData.data) {
              const history = ohlcData.data.map(item => ({
                date: item.date,
                price: item.close,
                value: item.close
              }))
              if (activeSearchRequestRef.current === requestId) {
                setPriceHistory(history)
              }
            }
          })
          .catch(error => {
            console.log('[StockScreener] Price history fetch failed:', error)
          })
      }

      // Fetch recommendation from backend (uses unified recommendation engine)
      let recommendationData = recommendationResult.status === 'fulfilled'
        ? normalizeRecommendationPayload(recommendationResult.value, prediction, symbol)
        : recommendation
      let calculatedExpectedReturn = prediction.expected_return ?? 0
      let calculatedRisk = prediction.risk ?? 5.0
      
      try {
        if (recommendationData && recommendationData.success) {
          if (activeSearchRequestRef.current === requestId) {
            setRecommendation(recommendationData)
          }
          
          calculatedExpectedReturn = recommendationData.expected_return || 0
          calculatedRisk = recommendationData.risk || 5.0
        }
      } catch (recError) {
        console.warn('Recommendation API failed, using prediction-based values:', recError)
      }
      
      // Calculate Sharpe Ratio
      const sharpeRatio = calculatedExpectedReturn > 0 && calculatedRisk > 0
        ? (calculatedExpectedReturn / calculatedRisk)
        : 0
      
      // Always set prediction metrics, even if values are 0
      if (activeSearchRequestRef.current === requestId) {
        setPredictionMetrics({
          expectedReturn: calculatedExpectedReturn,
          risk: calculatedRisk,
          sharpeRatio: sharpeRatio
        })
      }

      // Add to search results if not already there
      const stockData = {
        symbol: symbol,
        price: price,
        timePeriod: investmentPeriod,
        prediction: prediction
      }

      // Check if stock already exists in results
      const existingIndex = searchResults.findIndex(s => s.symbol === symbol)
      if (existingIndex >= 0) {
        // Update existing
        setSearchResults(prev => prev.map((s, idx) => 
          idx === existingIndex ? stockData : s
        ))
      } else {
        // Add new
        setSearchResults(prev => [...prev, stockData])
      }

      // Set as selected stock for detailed view
      if (activeSearchRequestRef.current === requestId) {
        setSelectedStockData(stockData)
        setStockPrices(prev => ({ ...prev, [symbol]: price }))
      }
      
      // Show success message (even if some data is missing)
      if (price) {
        const currencySymbol = market === 'IN' ? '₹' : '$'
        toast.success(`Found ${symbol} - ${currencySymbol}${price.toFixed(2)}`)
      } else {
        toast.success(`Found ${symbol}`)
      }
    } catch (error) {
      console.error('Error searching stock:', error)
      // Don't show error if we at least got the symbol - try to continue
      if (searchTerm.trim()) {
        const symbol = resolved.symbol
        // Create minimal stock data
        const minimalStockData = {
          symbol: symbol,
          price: null,
          timePeriod: investmentPeriod,
          prediction: { signal: 'Neutral', confidence: 0.5 }
        }
        if (activeSearchRequestRef.current === requestId) {
          setSelectedStockData(minimalStockData)
          setPredictionMetrics({
            expectedReturn: 0.2,
            risk: 5.0,
            sharpeRatio: 0.04
          })
        }
        toast.error('Some data unavailable. Please check backend connection.')
      } else {
        toast.error('Failed to search stock. Please try again.')
      }
    } finally {
      setSearching(false)
    }
  }

  const ensureEcosystemInitialized = async (symbolsToInclude = []) => {
    try {
      // Check if backend is reachable first
      let status
      try {
        status = await getStatus()
        console.log('[StockScreener] Backend status:', status)
      } catch (statusError) {
        console.error('Could not check status:', statusError)
        const errorMsg = statusError.message || 'Unknown error'
        if (errorMsg.includes('Network Error') || errorMsg.includes('ECONNREFUSED') || errorMsg.includes('Failed to fetch')) {
          toast.error(`Cannot connect to backend server at ${BACKEND_DISPLAY_URL}`)
        } else {
          toast.error(`Cannot connect to backend: ${errorMsg}`)
        }
        return false
      }

      const normalizedSymbols = (status?.symbols || []).map(sym => sym.replace(/\.(NS|BO)$/i, '').toUpperCase())
      const requestedSymbols = symbolsToInclude.map(sym => sym.replace(/\.(NS|BO)$/i, '').toUpperCase())
      const hasAllSymbols = requestedSymbols.every(sym => normalizedSymbols.includes(sym))

      // If already initialized with the symbols we need, return true
      if (status && status.initialized && hasAllSymbols) {
        console.log('[StockScreener] Ecosystem already initialized')
        return true
      }

      // Include the symbol being analyzed in initialization
      const initSymbols = market === 'IN'
        ? ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'SBIN', 'WIPRO', 'HCLTECH', 'ITC', 'LT', 'BHARTIARTL', 'JSWSTEEL']
        : ['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN']
      symbolsToInclude.forEach(sym => {
        // Remove .NS or .BO suffix if present for initialization
        const baseSymbol = sym.replace(/\.(NS|BO)$/i, '').toUpperCase()
        if (!initSymbols.includes(baseSymbol)) {
          initSymbols.push(baseSymbol)
        }
      })
      
      console.log('[StockScreener] Initializing ecosystem with symbols:', initSymbols)
      toast.loading('Initializing ecosystem... This may take 30-60 seconds', { duration: 60000 })
      
      try {
        const initResult = await initializeEcosystem(initSymbols, 100000)
        toast.dismiss()
        
        if (initResult && initResult.success) {
          toast.success('Ecosystem initialized successfully')
          return true
        } else {
          toast.error('Initialization returned no success. Please try again.')
          return false
        }
      } catch (initError) {
        toast.dismiss()
        console.error('Failed to initialize ecosystem:', initError)
        const errorMsg = initError.response?.data?.detail || initError.message || 'Unknown error'
        
        if (errorMsg.includes('Network Error') || errorMsg.includes('ECONNREFUSED') || errorMsg.includes('Failed to fetch')) {
          toast.error(`Cannot connect to backend server at ${BACKEND_DISPLAY_URL}`)
        } else if (errorMsg.includes('timeout')) {
          toast.error('Initialization timed out. The backend may be slow. Please try again.')
        } else {
          toast.error(`Failed to initialize: ${errorMsg}. Please check backend logs.`)
        }
        return false
      }
    } catch (error) {
      toast.dismiss()
      console.error('Unexpected error in ensureEcosystemInitialized:', error)
      const errorMsg = error.message || 'Unknown error'
      if (errorMsg.includes('Network Error') || errorMsg.includes('ECONNREFUSED') || errorMsg.includes('Failed to fetch')) {
        toast.error(`Cannot connect to backend server at ${BACKEND_DISPLAY_URL}`)
      } else {
        toast.error(`Error: ${errorMsg}. Please check backend logs.`)
      }
      return false
    }
  }

  const handleAnalyze = async (symbol) => {
    if (!investmentAmount || !investmentPeriod) {
      toast.error('Please enter investment amount and period')
      return
    }

    setLoading(true)
    setSelectedStockForAnalysis(symbol)
    
    try {
      // Ensure ecosystem is initialized with this symbol
      const initialized = await ensureEcosystemInitialized([symbol])
      if (!initialized) {
        setLoading(false)
        return
      }

      const latestPortfolio = await refreshPortfolio()

      // Wait a moment for initialization to complete
      await new Promise(resolve => setTimeout(resolve, 1000))

      const result = await analyzeStockInvestment(
        symbol,
        parseFloat(investmentAmount),
        parseInt(investmentPeriod),
        market
      )
      
      if (result.success) {
        setAnalysisResult(result)
        
        // Update prediction metrics from analysis result
        const report = result.report
        if (report) {
          const expectedReturn = report.expected_return ?? report.profit_loss_percent ?? 0.2
          const riskScore = report.risk ?? 5.0
          const sharpeRatio = expectedReturn > 0 && riskScore > 0
            ? (expectedReturn / riskScore)
            : 0
          
          setPredictionMetrics({
            expectedReturn,
            risk: riskScore,
            sharpeRatio
          })

          if (report.prediction) {
            const refreshedStock = {
              symbol,
              price: report.current_price,
              timePeriod: investmentPeriod,
              prediction: report.prediction
            }
            setSelectedStockData(refreshedStock)
            setStockPrices(prev => ({ ...prev, [symbol]: report.current_price }))
            setSearchResults(prev => prev.map(item => item.symbol === symbol ? refreshedStock : item))
          }

          const decision = buildDecisionFromModel(
            report.prediction?.signal || 'Neutral',
            expectedReturn,
            riskScore,
            report.prediction?.confidence || 0.5,
            report.score ?? sharpeRatio,
            report.has_position ?? hasOpenPosition(symbol, latestPortfolio || portfolio)
          )

          setRecommendation(normalizeRecommendationPayload({
            success: true,
            symbol,
            recommendation: report.recommendation || decision.recommendation,
            reason: report.recommendation_reason || report.agent_reports?.trader?.reasoning || decision.reason,
            color: decision.color,
            score: report.score ?? sharpeRatio,
            expected_return: expectedReturn,
            risk: riskScore,
            confidence: (report.prediction?.confidence || 0.5) * 100,
            signal: report.prediction?.signal || 'Neutral',
            has_position: report.has_position ?? hasOpenPosition(symbol, latestPortfolio || portfolio),
            alternate_action: report.alternate_action || decision.alternateAction || null
          }, report.prediction, symbol))
        }
        
        toast.success('Analysis completed!')
      } else {
        const fallbackResult = buildLocalAnalysisResult(symbol)
        if (fallbackResult) {
          setAnalysisResult(fallbackResult)
          toast.success('Analysis completed with cached market data.')
        } else {
          toast.error('Analysis failed: ' + (result.message || 'Unknown error'))
        }
      }
    } catch (error) {
      console.error('Error analyzing stock:', error)
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to analyze stock'
      const fallbackResult = buildLocalAnalysisResult(symbol)
      if (fallbackResult) {
        setAnalysisResult(fallbackResult)
        toast.success('Analysis completed with cached market data.')
      } else if (errorMessage.includes('not initialized') || errorMessage.includes('Ecosystem')) {
        toast.error('Backend not initialized. Please wait a moment and try again.')
      } else if (errorMessage.includes('500') || errorMessage.includes('Internal Server Error')) {
        toast.error('Server error occurred. Please check backend logs and try again.')
      } else {
        toast.error(`Failed to analyze stock: ${errorMessage}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleViewHistorical = async (symbol) => {
    setSelectedStock(symbol)
    
    // Try to ensure ecosystem is initialized, but don't block if it fails
    // Historical analysis can work without full ecosystem initialization
    try {
      const status = await getStatus()
      if (!status.initialized) {
        // Try to initialize, but don't block the UI
        ensureEcosystemInitialized([symbol]).catch(err => {
          console.warn('Ecosystem initialization failed, but proceeding with historical analysis:', err)
        })
      }
    } catch (error) {
      console.warn('Could not check ecosystem status, proceeding anyway:', error)
    }
    
    // Show the modal immediately - it will handle data fetching
    setShowHistorical(true)
  }

  const handleViewChart = async (symbol) => {
    setSelectedStock(symbol)
    
    // Try to ensure ecosystem is initialized, but don't block if it fails
    // Chart can work without full ecosystem initialization
    try {
      const status = await getStatus()
      if (!status.initialized) {
        // Try to initialize, but don't block the UI
        ensureEcosystemInitialized([symbol]).catch(err => {
          console.warn('Ecosystem initialization failed, but proceeding with chart:', err)
        })
      }
    } catch (error) {
      console.warn('Could not check ecosystem status, proceeding anyway:', error)
    }
    
    // Show the modal immediately - it will handle data fetching
    setShowChart(true)
  }

  const handleAddToWatchlist = async (symbol) => {
    const upperSymbol = (symbol || '').toUpperCase()
    if (!upperSymbol) {
      toast.error('No stock selected for watchlist.')
      return
    }

    try {
      await addWatchlistItem(upperSymbol, market)
    } catch (error) {
      console.warn('Watchlist DB add failed, keeping local fallback:', error)
    }

    const existing = JSON.parse(localStorage.getItem('watchlist') || '[]')
    if (!existing.includes(upperSymbol)) {
      localStorage.setItem('watchlist', JSON.stringify([...existing, upperSymbol]))
      toast.success(`${upperSymbol} added to watchlist`)
    } else {
      toast.success(`${upperSymbol} is already in your watchlist`)
    }
  }

  const handleVirtualTrade = (symbol) => {
    const tradeSymbol = (symbol || selectedStockData?.symbol || '').toUpperCase()
    const price = Number(selectedStockData?.price || stockPrices[tradeSymbol] || 0)
    if (!tradeSymbol || !price) {
      toast.error('Stock price is unavailable for virtual trade.')
      return
    }

    const action = recommendation?.recommendation === 'BUY'
      ? 'Buy'
      : recommendation?.recommendation === 'SELL'
        ? 'Sell'
        : recommendation?.recommendation === 'AVOID'
          ? 'Avoid'
        : 'Hold'

    const existingTrades = JSON.parse(localStorage.getItem('paperTrades') || '[]')
    const trade = {
      id: Date.now(),
      symbol: tradeSymbol,
      action,
      price,
      market,
      expectedReturn: Number(predictionMetrics?.expectedReturn ?? recommendation?.expected_return ?? 0),
      risk: Number(predictionMetrics?.risk ?? recommendation?.risk ?? 0),
      createdAt: new Date().toISOString()
    }

    localStorage.setItem('paperTrades', JSON.stringify([trade, ...existingTrades].slice(0, 50)))
    toast.success(`Virtual trade saved for ${tradeSymbol}`)
  }

  const handleOpenComparison = () => {
    if (comparisonCandidates.length < 2) {
      toast.error('At least 2 stocks are needed for comparison.')
      return
    }

    setComparisonStocks(comparisonCandidates)
    setShowComparisonModal(true)
  }

  const handleRemoveComparisonStock = (symbol) => {
    setComparisonStocks((prev) => prev.filter((stock) => stock.symbol !== symbol))
  }

  const handleRemoveFromResults = (symbol) => {
    setSearchResults(prev => prev.filter(s => s.symbol !== symbol))
    setStockPrices(prev => {
      const newPrices = { ...prev }
      delete newPrices[symbol]
      return newPrices
    })
  }

  const filteredSuggestions = React.useMemo(() => {
    if (!searchTerm || searchTerm.length < 1) {
      return []
    }
    
    if (!Array.isArray(availableStocks) || availableStocks.length === 0) {
      console.log('[StockScreener] No available stocks for suggestions')
      return []
    }
    
    const searchLower = searchTerm.toLowerCase().trim()
    const filtered = availableStocks
      .filter(stock => typeof stock === 'string')
      .sort((a, b) => {
        const aExact = a.toLowerCase() === searchLower ? 0 : a.toLowerCase().startsWith(searchLower) ? 1 : 2
        const bExact = b.toLowerCase() === searchLower ? 0 : b.toLowerCase().startsWith(searchLower) ? 1 : 2
        if (aExact !== bExact) return aExact - bExact
        return a.localeCompare(b)
      })
      .filter(stock => stock.toLowerCase().startsWith(searchLower) || stock.toLowerCase().includes(searchLower))
      .slice(0, 5)
    
    console.log(`[StockScreener] Filtered ${filtered.length} suggestions for "${searchTerm}" from ${availableStocks.length} stocks`)
    return filtered
  }, [availableStocks, searchTerm])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-4xl font-bold flex items-center gap-3 text-gray-900">
              <BarChart3 className="w-10 h-10 text-blue-600" />
              Equisense
            </h1>
            {/* Backend Status Indicator */}
            {!backendStatus.checking && (
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${
                backendStatus.connected 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  backendStatus.connected ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                {backendStatus.connected ? 'Backend Connected' : 'Backend Offline'}
              </div>
            )}
          </div>
          <p className="text-gray-600">Search stocks, analyze investments, and predict prices</p>
          {!backendStatus.connected && !backendStatus.checking && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 font-semibold mb-1">⚠️ Backend Server Not Reachable</p>
              <p className="text-yellow-700 text-sm">
                The frontend could not reach <code className="bg-yellow-100 px-1 rounded">{BACKEND_DISPLAY_URL}</code>.
                If this is a deployed app, wait a few seconds for the backend to wake up and refresh once.
              </p>
            </div>
          )}
        </div>

        {/* Investment Parameters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-md p-6 mb-6 border border-gray-200"
        >
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-800">
            <DollarSign className="w-5 h-5 text-green-600" />
            Investment Parameters
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="investment-amount" className="block text-sm font-medium text-gray-700 mb-2">
                Investment Amount (₹)
              </label>
              <input
                id="investment-amount"
                type="number"
                value={investmentAmount}
                onChange={(e) => setInvestmentAmount(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                placeholder="Enter amount"
                min="100"
              />
            </div>
            <div>
              <label htmlFor="investment-period" className="block text-sm font-medium text-gray-700 mb-2">
                Time Period (Days)
              </label>
              <input
                id="investment-period"
                type="number"
                value={investmentPeriod}
                onChange={(e) => {
                  setInvestmentPeriod(e.target.value)
                  // Update time period for all stocks in results
                  setSearchResults(prev => prev.map(s => ({ ...s, timePeriod: e.target.value })))
                }}
                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                placeholder="Enter days"
                min="1"
                max="365"
              />
            </div>
            <div>
              <label htmlFor="market" className="block text-sm font-medium text-gray-700 mb-2">
                Market
              </label>
              <select
                id="market"
                value={market}
                onChange={(e) => setMarket(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              >
                <option value="IN">NSE (India)</option>
                <option value="US">NYSE/NASDAQ (USA)</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-md p-6 mb-6 border border-gray-200"
        >
          <div className="relative">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder={`Search for a company or stock symbol (e.g., ${market === 'IN' ? 'RELIANCE, TCS' : 'AAPL, TSLA'})`}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                />
                {/* Suggestions dropdown */}
                {searchTerm && filteredSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {filteredSuggestions.map((stock) => (
                      <button
                        key={stock}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setSearchTerm(stock)
                          setTimeout(() => handleSearch(stock), 0)
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-blue-50 text-gray-700 border-b border-gray-100 last:border-b-0 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Search className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{stock}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={handleSearch}
                disabled={searching}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg font-semibold text-white transition-colors flex items-center gap-2"
              >
                {searching ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Search
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Main Content Area - Two Column Layout */}
        {selectedStockData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Left Column - Main Content (2/3 width) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Trading Call Card */}
              <TradingCall
                symbol={selectedStockData.symbol}
                currentPrice={selectedStockData.price || stockPrices[selectedStockData.symbol]}
                prediction={selectedStockData.prediction}
                predictionMetrics={predictionMetrics}
                recommendation={recommendation}
                market={market}
                onAddToWatchlist={handleAddToWatchlist}
                onVirtualTrade={handleVirtualTrade}
              />

              {/* Company Info */}
              <CompanyInfo
                symbol={selectedStockData.symbol}
                market={market}
                expectedReturn={predictionMetrics?.expectedReturn}
                confidence={selectedStockData.prediction?.confidence ? 
                  selectedStockData.prediction.confidence >= 0.7 ? 'High confidence' :
                  selectedStockData.prediction.confidence >= 0.5 ? 'Moderate confidence' :
                  'Low confidence' : null}
              />

              {/* Stock Price Chart */}
              <StockPriceChart
                priceData={priceHistory}
                symbol={selectedStockData.symbol}
                currentPrice={selectedStockData.price || stockPrices[selectedStockData.symbol]}
                market={market}
              />

              {/* News Sentiment */}
              <NewsSentiment 
                symbol={selectedStockData.symbol}
                market={market}
                onFullAnalyze={handleAnalyze}
                onViewChart={handleViewChart}
              />
            </div>

            {/* Right Column - Sidebar (1/3 width) */}
            <div className="space-y-6">
              {/* Recommendation Card */}
              <RecommendationCard 
                symbol={selectedStockData.symbol} 
                market={market}
                recommendationData={recommendation}
                predictionMetrics={predictionMetrics}
                prediction={selectedStockData.prediction}
              />

              {/* AI Prediction */}
              <AIPrediction
                expectedReturn={predictionMetrics?.expectedReturn}
                risk={predictionMetrics?.risk}
                sharpeRatio={predictionMetrics?.sharpeRatio}
              />

              {/* Portfolio Summary */}
              <PortfolioSummary
                symbol={selectedStockData.symbol}
                portfolioValue={parseFloat(investmentAmount) || 100000}
                returnPercent={predictionMetrics?.expectedReturn}
              />

              {/* Comparison Table */}
              <ComparisonTable
                currentSymbol={selectedStockData.symbol}
                comparisonStocks={comparisonCandidates}
                market={market}
                onCompare={handleOpenComparison}
              />
            </div>
          </div>
        )}

        {/* Search Results Table */}
        {searchResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Search Results</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Symbol
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Current Price (₹)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time Period (Days)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Prediction
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {searchResults.map((stock, index) => {
                    const signal = stock.prediction?.signal || 'Neutral'
                    const confidence = (stock.prediction?.confidence || 0) * 100
                    const price = stockPrices[stock.symbol] || stock.price || 'N/A'

                    return (
                      <tr key={stock.symbol} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">{stock.symbol}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {typeof price === 'number' ? `₹${price.toFixed(2)}` : price}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{stock.timePeriod} days</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {stock.prediction ? (
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                signal === 'Up' ? 'bg-green-100 text-green-800' :
                                signal === 'Down' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {signal}
                              </span>
                              <span className="text-xs text-gray-600">
                                {confidence.toFixed(0)}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">No prediction</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleAnalyze(stock.symbol)}
                              disabled={loading && selectedStockForAnalysis === stock.symbol}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 disabled:opacity-50"
                              title="Analyze & Predict"
                            >
                              {loading && selectedStockForAnalysis === stock.symbol ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                  Analyzing...
                                </>
                              ) : (
                                <>
                                  <Brain className="w-3 h-3" />
                                  Analyze
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => handleViewChart(stock.symbol)}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                              title="View Chart"
                            >
                              <BarChart3 className="w-3 h-3" />
                              Chart
                            </button>
                            <button
                              onClick={() => handleViewHistorical(stock.symbol)}
                              className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                              title="Historical Analysis"
                            >
                              <Clock className="w-3 h-3" />
                              History
                            </button>
                            <button
                              onClick={() => handleRemoveFromResults(stock.symbol)}
                              className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors"
                              title="Remove"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {searchResults.length === 0 && !searching && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 bg-white rounded-xl shadow-md border border-gray-200"
          >
            <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No stocks searched yet</h3>
            <p className="text-gray-500">Use the search bar above to find and analyze stocks</p>
          </motion.div>
        )}

        {/* Analysis Report Modal */}
        {analysisResult && selectedStockForAnalysis && (
          <StockAnalysisReport
            symbol={selectedStockForAnalysis}
            analysis={analysisResult}
            investmentAmount={parseFloat(investmentAmount)}
            investmentPeriod={parseInt(investmentPeriod)}
            market={market}
            recommendation={recommendation}
            onClose={() => {
              setAnalysisResult(null)
              setSelectedStockForAnalysis(null)
            }}
          />
        )}

        {/* Historical Analysis Modal */}
        {showHistorical && selectedStock && (
          <HistoricalAnalysis
            symbol={selectedStock}
            market={market}
            onClose={() => {
              setShowHistorical(false)
              setSelectedStock(null)
            }}
          />
        )}

        {/* Candlestick Chart Modal */}
        {showChart && selectedStock && (
          <CandlestickChart 
            symbol={selectedStock} 
            market={market}
            isModal={true}
            onClose={() => {
              setShowChart(false)
              setSelectedStock(null)
            }}
          />
        )}

        {showComparisonModal && comparisonStocks.length > 0 && (
          <StockComparison
            stocks={comparisonStocks}
            onClose={() => setShowComparisonModal(false)}
            onRemoveStock={handleRemoveComparisonStock}
          />
        )}
      </div>
    </div>
  )
}

export default StockScreener
