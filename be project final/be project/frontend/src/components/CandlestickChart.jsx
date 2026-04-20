import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, X } from 'lucide-react'
import { createChart, ColorType } from 'lightweight-charts'
import { getOHLCData } from '../services/api'

const CandlestickChart = ({ symbol, market = 'US', onClose, isModal = false }) => {
  const [ohlcData, setOhlcData] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedInterval, setSelectedInterval] = useState('1d')
  const [error, setError] = useState(null)
  const [useTestData, setUseTestData] = useState(false)
  
  const chartContainerRef = useRef(null)
  const chartRef = useRef(null)
  const seriesRef = useRef(null)

  // Interval mappings
  const intervalMap = {
    '5m': { period: '5d', yfInterval: '5m' },
    '15m': { period: '5d', yfInterval: '15m' },
    '1h': { period: '1mo', yfInterval: '1h' },
    '4h': { period: '3mo', yfInterval: '1h' },
    '1d': { period: '1mo', yfInterval: '1d' },
    '1w': { period: '1y', yfInterval: '1wk' },
    '1M': { period: '1y', yfInterval: '1mo' },
    '6M': { period: '6mo', yfInterval: '1d' },
    '1Y': { period: '1y', yfInterval: '1d' },
  }

  // Generate test data for debugging
  const generateTestData = () => {
    const testData = []
    const basePrice = 100
    const now = Math.floor(Date.now() / 1000)
    for (let i = 30; i >= 0; i--) {
      const time = now - (i * 86400) // 1 day intervals
      const variation = (Math.random() - 0.5) * 10
      const open = basePrice + variation
      const close = open + (Math.random() - 0.5) * 5
      const high = Math.max(open, close) + Math.random() * 3
      const low = Math.min(open, close) - Math.random() * 3
      testData.push({
        date: new Date(time * 1000).toISOString(),
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
      })
    }
    return testData
  }

  // Fetch OHLC data
  useEffect(() => {
    if (!symbol) return

    const fetchData = async () => {
      setLoading(true)
      setError(null)
      
      // Use test data if enabled
      if (useTestData) {
        console.log('[Chart] Using test data')
        const testData = generateTestData()
        setOhlcData(testData)
        setLoading(false)
        return
      }
      
      try {
        const { period, yfInterval } = intervalMap[selectedInterval] || intervalMap['1d']
        console.log(`[Chart] Fetching ${symbol}: ${period}, ${yfInterval}, market: ${market}`)
        
        const result = await getOHLCData(symbol, period, yfInterval, market)
        console.log(`[Chart] Response:`, result)
        
        if (result?.success && result?.data && Array.isArray(result.data) && result.data.length > 0) {
          console.log(`[Chart] Received ${result.data.length} data points`)
          setOhlcData(result.data)
          setError(null)
        } else {
          const errorMsg = result?.error || result?.message || result?.detail || 'No data available'
          console.error('[Chart] No data:', errorMsg)
          setError(errorMsg)
          setOhlcData([])
        }
      } catch (err) {
        console.error('[Chart] Fetch error:', err)
        const errorDetail = err.response?.data?.detail || err.message || 'Failed to fetch data'
        setError(errorDetail)
        setOhlcData([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [symbol, market, selectedInterval, useTestData])

  // Format data helper function - moved before createChartInstance
  const formatData = React.useCallback((data) => {
    try {
      const formatted = data
        .map((item, index) => {
          try {
            // Parse date
            const date = new Date(item.date)
            if (isNaN(date.getTime())) {
              console.warn(`[Chart] Invalid date at index ${index}:`, item.date)
              return null
            }

            const time = Math.floor(date.getTime() / 1000)
            
            // Parse OHLC values
            const open = parseFloat(item.open)
            const high = parseFloat(item.high)
            const low = parseFloat(item.low)
            const close = parseFloat(item.close)

            if (isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close) || time <= 0) {
              console.warn(`[Chart] Invalid OHLC at index ${index}:`, item)
              return null
            }

            return { time, open, high, low, close }
          } catch (e) {
            console.warn(`[Chart] Error formatting item at index ${index}:`, e)
            return null
          }
        })
        .filter(Boolean)
        .sort((a, b) => a.time - b.time)

      return formatted
    } catch (err) {
      console.error('[Chart] Error formatting data:', err)
      return []
    }
  }, [])

  // Create chart instance function - moved outside useEffect for callback ref access
  const createChartInstance = React.useCallback((container, w, h) => {
      // Prevent duplicate initialization
      if (chartRef.current) {
        console.log('[Chart] Chart already exists, skipping initialization')
        return
      }

      try {
        console.log(`[Chart] Creating chart: ${w}x${h}`)
        console.log('[Chart] Container element:', container)
        console.log('[Chart] Container style:', window.getComputedStyle(container))
        console.log('[Chart] Container in DOM:', container.isConnected)

        // Create chart
        const chart = createChart(container, {
          layout: {
            background: { type: ColorType.Solid, color: '#ffffff' },
            textColor: '#374151',
          },
          grid: {
            vertLines: { color: '#e5e7eb', visible: true },
            horzLines: { color: '#e5e7eb', visible: true },
          },
          width: w,
          height: h,
          timeScale: {
            timeVisible: true,
            secondsVisible: false,
            borderColor: '#e5e7eb',
          },
          rightPriceScale: {
            borderColor: '#e5e7eb',
          },
          handleScroll: {
            mouseWheel: true,
            pressedMouseMove: true,
          },
          handleScale: {
            axisPressedMouseMove: true,
            mouseWheel: true,
            pinch: true,
          },
        })

        // Add candlestick series
        const candlestickSeries = chart.addCandlestickSeries({
          upColor: '#10b981',
          downColor: '#ef4444',
          borderUpColor: '#10b981',
          borderDownColor: '#ef4444',
          wickUpColor: '#10b981',
          wickDownColor: '#ef4444',
        })

        chartRef.current = chart
        seriesRef.current = candlestickSeries

        console.log('[Chart] Chart created successfully')
        console.log('[Chart] Chart object:', chart)
        console.log('[Chart] Series object:', candlestickSeries)
        console.log('[Chart] Container children:', container.children.length)

        // If we already have data, set it immediately
        if (ohlcData.length > 0) {
          console.log('[Chart] Setting existing data on chart...')
          setTimeout(() => {
            if (seriesRef.current && ohlcData.length > 0) {
              const formatted = formatData(ohlcData)
              if (formatted.length > 0) {
                seriesRef.current.setData(formatted)
                chart.timeScale().fitContent()
                console.log('[Chart] Existing data set successfully')
              }
            }
          }, 100)
        }

        // Handle resize
        const handleResize = () => {
          if (chartRef.current && chartContainerRef.current) {
            const newRect = chartContainerRef.current.getBoundingClientRect()
            const newWidth = newRect.width || chartContainerRef.current.clientWidth || 800
            if (newWidth > 0) {
              chartRef.current.applyOptions({ width: newWidth })
            }
          }
        }

        window.addEventListener('resize', handleResize)

        return () => {
          window.removeEventListener('resize', handleResize)
        }
      } catch (err) {
        console.error('[Chart] Chart creation error:', err)
        console.error('[Chart] Error stack:', err.stack)
        setError(`Chart error: ${err.message}`)
      }
  }, [isModal, ohlcData.length, formatData])

  // Initialize chart - USING CALLBACK REF FOR BETTER TIMING
  useEffect(() => {
    // Don't initialize if we don't have a symbol
    if (!symbol) return

    // Use a callback to ensure container is ready
    const initializeWhenReady = () => {
      if (!chartContainerRef.current) {
        console.log('[Chart] Container ref not available, will retry...')
        setTimeout(initializeWhenReady, 100)
        return
      }

      const container = chartContainerRef.current
      
      // Check if container is in DOM
      if (!container.isConnected) {
        console.log('[Chart] Container not in DOM, will retry...')
        setTimeout(initializeWhenReady, 100)
        return
      }

      const rect = container.getBoundingClientRect()
      const width = rect.width || container.clientWidth || container.offsetWidth || 800
      const height = isModal ? 600 : 500

      console.log(`[Chart] Container dimensions: ${width}x${height}`)
      console.log(`[Chart] Container visible: ${rect.width > 0 && rect.height > 0}`)
      console.log(`[Chart] Container in DOM: ${container.isConnected}`)
      console.log(`[Chart] Container computed style:`, window.getComputedStyle(container).display)

      if (width <= 0 || height <= 0) {
        console.log('[Chart] Container has no dimensions, will retry...')
        setTimeout(initializeWhenReady, 100)
        return
      }

      // Container is ready, create chart
      createChartInstance(container, width, height)
    }

    // For modals, wait longer to ensure modal is fully rendered
    const initialDelay = isModal ? 1500 : 500
    const initTimer = setTimeout(initializeWhenReady, initialDelay)

    return () => {
      clearTimeout(initTimer)
      if (chartRef.current) {
        try {
          chartRef.current.remove()
        } catch (e) {
          console.warn('[Chart] Cleanup error:', e)
        }
        chartRef.current = null
        seriesRef.current = null
      }
    }
  }, [symbol, isModal, createChartInstance])

  // Update chart data
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current) {
      console.log('[Chart] Chart or series not ready:', {
        hasSeries: !!seriesRef.current,
        hasChart: !!chartRef.current,
        dataLength: ohlcData.length
      })
      return
    }

    if (ohlcData.length === 0) {
      console.log('[Chart] No data to display')
      return
    }

    try {
      console.log(`[Chart] Formatting ${ohlcData.length} data points`)

      const formatted = formatData(ohlcData)
      
      if (formatted.length > 0) {
        console.log('[Chart] Setting data on chart...')
        console.log('[Chart] First point:', formatted[0])
        console.log('[Chart] Last point:', formatted[formatted.length - 1])
        
        // Set data on chart
        seriesRef.current.setData(formatted)
        console.log('[Chart] Data set successfully')
        
        // Fit content after a short delay
        setTimeout(() => {
          if (chartRef.current) {
            try {
              chartRef.current.timeScale().fitContent()
              console.log('[Chart] Chart fitted to content')
            } catch (e) {
              console.error('[Chart] Error fitting content:', e)
            }
          }
        }, 300)
      } else {
        console.warn('[Chart] No valid data points after formatting')
        setError('No valid data points to display')
      }
    } catch (err) {
      console.error('[Chart] Error setting data:', err)
      console.error('[Chart] Error stack:', err.stack)
      setError(`Data error: ${err.message}`)
    }
  }, [ohlcData])

  // Loading state
  if (loading) {
    return (
      <div className={`bg-white rounded-lg p-6 border border-gray-200 shadow-md ${isModal ? 'w-full' : ''}`}>
        <div className="h-64 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600">Loading chart data...</p>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error && !useTestData) {
    return (
      <div className={`bg-white rounded-lg p-6 border border-gray-200 shadow-md ${isModal ? 'w-full' : ''}`}>
        <div className="text-center mb-4">
          <p className="text-red-600 font-semibold mb-2">Error Loading Chart Data</p>
          <p className="text-gray-600 text-sm">{error}</p>
          {error.includes('not initialized') && (
            <p className="text-gray-500 text-xs mt-2">Please ensure the backend is running and the ecosystem is initialized.</p>
          )}
        </div>
        <div className="flex gap-2 justify-center flex-wrap">
          <button
            onClick={() => {
              setError(null)
              setLoading(true)
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold"
          >
            Retry
          </button>
          {selectedInterval !== '1d' && (
            <button
              onClick={() => setSelectedInterval('1d')}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold"
            >
              Try Daily (1D)
            </button>
          )}
          <button
            onClick={() => {
              setUseTestData(true)
              setError(null)
            }}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-semibold"
          >
            Use Test Data (Debug)
          </button>
        </div>
      </div>
    )
  }

  // Calculate price change
  const latest = ohlcData.length > 0 ? ohlcData[ohlcData.length - 1] : null
  const previous = ohlcData.length > 1 ? ohlcData[ohlcData.length - 2] : latest
  const currentPrice = latest?.close || 0
  const prevPrice = previous?.close || currentPrice || 0
  const change = currentPrice - prevPrice
  const changePercent = prevPrice > 0 ? (change / prevPrice) * 100 : 0

  const content = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`bg-white rounded-lg p-6 border border-gray-200 shadow-md ${isModal ? 'w-full' : ''}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-1">
            {symbol} • {market === 'IN' ? 'NSE' : 'NYSE'}
          </h3>
          <div className="flex items-center gap-4">
            <p className="text-2xl font-bold text-gray-900">₹{currentPrice.toFixed(2)}</p>
            <div className={`flex items-center gap-1 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span className="font-semibold">
                {change >= 0 ? '+' : ''}{change.toFixed(2)} ({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>

        {/* Interval buttons */}
        <div className="flex gap-2 flex-wrap items-center">
          {Object.keys(intervalMap).map(interval => (
            <button
              key={interval}
              onClick={() => setSelectedInterval(interval)}
              className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${
                selectedInterval === interval
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {interval.toUpperCase()}
            </button>
          ))}
          {useTestData && (
            <button
              onClick={() => setUseTestData(false)}
              className="px-3 py-1 rounded-lg text-sm font-semibold bg-yellow-600 text-white hover:bg-yellow-700"
            >
              Use Real Data
            </button>
          )}
        </div>
      </div>

      {/* Chart container - CRITICAL: Must have explicit dimensions and be visible */}
      <div
        ref={chartContainerRef}
        id={`chart-container-${symbol}`}
        className="w-full"
        style={{
          width: '100%',
          height: isModal ? '600px' : '500px',
          minHeight: isModal ? '600px' : '500px',
          backgroundColor: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          display: 'block',
          visibility: 'visible',
          border: '1px solid #e5e7eb',
        }}
      >
        {!chartRef.current && !loading && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-600">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p>Initializing chart...</p>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className="text-gray-600">Bullish (Close {'>='} Open)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span className="text-gray-600">Bearish (Close {'<'} Open)</span>
        </div>
      </div>
    </motion.div>
  )

  // Modal wrapper
  if (isModal && onClose) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-lg shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-auto border border-gray-200"
        >
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10">
            <h2 className="text-2xl font-bold text-gray-900">Candlestick Chart - {symbol}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>
          <div className="p-6">{content}</div>
        </motion.div>
      </div>
    )
  }

  return content
}

export default CandlestickChart
