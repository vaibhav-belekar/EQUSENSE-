import React, { useEffect, useMemo, useRef, useState } from 'react'
import { LayoutGroup, motion } from 'framer-motion'
import { BarChart3, Clock, Download, LineChart, TrendingDown, TrendingUp } from 'lucide-react'
import { ColorType, createChart } from 'lightweight-charts'
import { getOHLCData } from '../services/api'
import { getCompanyMeta, getDisplaySymbol } from '../utils/logoMapper'

const REFRESH_INTERVAL_MS = 30000
const CHART_REVEAL_DURATION_MS = 2500
const TIMEFRAME_ACTIVE_COLOR = '#32277f'
const TIMEFRAME_IDLE_COLOR = '#ece8ff'
const CHART_RANGES = [
  { key: '1D', label: '1D', period: '5d', interval: '5m' },
  { key: '1M', label: '1M', period: '1mo', interval: '1d' },
  { key: '3M', label: '3M', period: '3mo', interval: '1d' },
  { key: '6M', label: '6M', period: '6mo', interval: '1d' },
  { key: '1Y', label: '1Yr', period: '1y', interval: '1d' },
  { key: '3Y', label: '3Yrs', period: '3y', interval: '1wk' },
  { key: '5Y', label: '5Yrs', period: '5y', interval: '1wk' },
]

const StockPriceChart = ({ priceData = [], symbol, currentPrice, market = 'US', compact = false, projection = null, onOpenTechnicalChart }) => {
  const containerRef = useRef(null)
  const chartRef = useRef(null)
  const areaSeriesRef = useRef(null)
  const projectionSeriesRef = useRef(null)
  const volumeSeriesRef = useRef(null)
  const resizeObserverRef = useRef(null)
  const [liveData, setLiveData] = useState(priceData)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeRange, setActiveRange] = useState('1Y')
  const [rangeGesture, setRangeGesture] = useState({ key: '1Y', direction: 0 })
  const [isChartRevealing, setIsChartRevealing] = useState(false)
  const [hoverData, setHoverData] = useState(null)
  const [canonicalQuote, setCanonicalQuote] = useState(null)

  const isIndianSymbol = market === 'IN' || /\.NS$|\.BO$/i.test(symbol || '')
  const currencySymbol = isIndianSymbol ? '₹' : '$'
  const selectedRange = CHART_RANGES.find((item) => item.key === activeRange) || CHART_RANGES[4]
  const chartHeight = compact ? 430 : 520
  const containerHeight = compact ? 455 : 560
  const cleanSymbol = String(symbol || 'Stock').replace(/\.(NS|BO)$/i, '').toUpperCase()
  const companyMeta = getCompanyMeta(symbol)
  const companyName = companyMeta?.name || cleanSymbol
  const displaySymbol = getDisplaySymbol(symbol, market)

  useEffect(() => {
    if (activeRange === '1Y' && priceData?.length > 1) {
      setLiveData(priceData || [])
    }
  }, [priceData, symbol, activeRange])

  const chartData = useMemo(() => {
    const isDailyLike = selectedRange.interval === '1d' || selectedRange.interval === '1wk' || selectedRange.interval === '1mo'

    const historical = (liveData || [])
      .map((item) => {
        const date = new Date(item.date || item.time)
        const close = Number(item.close ?? item.price ?? item.value)
        const open = Number(item.open ?? close)
        const high = Number(item.high ?? Math.max(open, close))
        const low = Number(item.low ?? Math.min(open, close))
        const volume = Number(item.volume ?? item.Volume ?? 0)

        if (!Number.isFinite(date.getTime()) || !Number.isFinite(close)) return null

        return {
          time: isDailyLike ? date.toISOString().slice(0, 10) : Math.floor(date.getTime() / 1000),
          date,
          open,
          high,
          low,
          close,
          volume: Number.isFinite(volume) ? volume : 0,
          timestamp: date.getTime(),
          isHistorical: true
        }
      })
      .filter(Boolean)
      .sort((a, b) => a.timestamp - b.timestamp)
      .filter((item, index, array) => index === 0 || item.time !== array[index - 1].time)
      .map(({ timestamp, ...item }) => item)

    if (!projection || historical.length === 0) return historical

    const lastItem = historical[historical.length - 1]
    let lastDate = new Date(lastItem.date)
    let lastPrice = lastItem.close

    const futureDays = Math.max(1, projection.investmentPeriod || 30)
    const priceChange = (projection.predictedPrice || lastPrice) - lastPrice

    let seed = 0
    for (let i = 0; i < (symbol || '').length; i++) {
        seed += (symbol || '').charCodeAt(i)
    }
    seed += futureDays + Math.floor(lastPrice)

    const random = () => {
        seed = (seed * 16807) % 2147483647
        return (seed - 1) / 2147483646
    }

    const walk = [0]
    for (let day = 1; day <= futureDays; day++) {
        const step = (random() * 2) - 1
        walk.push(walk[day - 1] + step)
    }
    
    const wN = walk[futureDays]
    const volatility = lastPrice * 0.012 // 1.2% daily volatility scaling

    for (let day = 1; day <= futureDays; day++) {
        const progress = day / futureDays
        const nextDate = new Date(lastDate)
        nextDate.setDate(lastDate.getDate() + day)
        
        const basePrice = lastPrice + (priceChange * progress)
        const bridge = walk[day] - (progress * wN)
        const price = basePrice + (bridge * volatility)

        historical.push({
            time: isDailyLike ? nextDate.toISOString().slice(0, 10) : Math.floor(nextDate.getTime() / 1000),
            date: nextDate,
            open: price,
            high: price,
            low: price,
            close: price,
            volume: 0,
            isHistorical: false
        })
    }

    return historical
  }, [liveData, selectedRange.interval, projection])

  const lineData = useMemo(() => chartData.map((item) => ({
    time: item.time,
    value: item.close,
  })), [chartData])

  const volumeData = useMemo(() => chartData.map((item) => ({
    time: item.time,
    value: item.volume,
    color: 'rgba(148, 163, 184, 0.18)',
  })), [chartData])

  const dataByTime = useMemo(() => {
    const map = new Map()
    chartData.forEach((item) => map.set(String(item.time), item))
    return map
  }, [chartData])

  const dataByTimeRef = useRef(dataByTime)
  useEffect(() => {
    dataByTimeRef.current = dataByTime
  }, [dataByTime])

  const latest = chartData[chartData.length - 1]
  const first = chartData[0]
  const latestPrice = currentPrice && currentPrice > 0 ? currentPrice : (canonicalQuote?.price ?? latest?.close ?? 0)
  const firstPrice = first?.open ?? latestPrice
  const rangeChange = latestPrice - firstPrice
  const rangeChangePercent = firstPrice > 0 ? (rangeChange / firstPrice) * 100 : 0
  const change = canonicalQuote ? (canonicalQuote.source === 'dhan' ? canonicalQuote.change : (latestPrice - (canonicalQuote.prevClose || firstPrice))) : rangeChange
  const changePercent = canonicalQuote ? (canonicalQuote.source === 'dhan' ? canonicalQuote.changePercent : ((change / (canonicalQuote.prevClose || firstPrice)) * 100)) : rangeChangePercent
  const isUp = change >= 0
  const hasPrice = Number.isFinite(latestPrice) && latestPrice > 0
  const returnsLabel = `${cleanSymbol} ${selectedRange.label} Returns`

  const formatVolume = (value) => {
    const number = Number(value || 0)
    if (number >= 10000000) return `${(number / 10000000).toFixed(1)}Cr`
    if (number >= 100000) return `${(number / 100000).toFixed(1)}L`
    if (number >= 1000) return `${(number / 1000).toFixed(1)}K`
    return String(Math.round(number))
  }

  const formatDate = (date) => {
    if (!date) return ''
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const handleRangeClick = (rangeKey) => {
    if (rangeKey === activeRange) return
    const currentIndex = CHART_RANGES.findIndex((range) => range.key === activeRange)
    const nextIndex = CHART_RANGES.findIndex((range) => range.key === rangeKey)
    setRangeGesture({
      key: rangeKey,
      direction: nextIndex > currentIndex ? 1 : -1,
    })
    setHoverData(null)
    setIsChartRevealing(true)
    setActiveRange(rangeKey)
  }

  const downloadHistoricalData = () => {
    if (!chartData.length) return
    const rows = [
      ['Date', 'Open', 'High', 'Low', 'Close', 'Volume'],
      ...chartData.map((item) => [
        item.date.toISOString(),
        item.open,
        item.high,
        item.low,
        item.close,
        item.volume,
      ]),
    ]
    const csv = rows.map((row) => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${cleanSymbol}-${activeRange}-historical-data.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    if (!symbol) return undefined

    const refreshCanonicalQuote = async () => {
      try {
        const result = await getOHLCData(symbol, '1y', '1d', market)
        if (result?.success && Array.isArray(result.data) && result.data.length > 0) {
          const firstCandle = result.data[0]
          const latestCandle = result.data[result.data.length - 1]
          const price = Number(latestCandle?.close ?? latestCandle?.price)
          const firstOpen = Number(firstCandle?.open ?? firstCandle?.close ?? firstCandle?.price)
          const dhanQuote = result.latest_quote?.source === 'dhan' ? result.latest_quote : null
          const dhanPrice = Number(dhanQuote?.price ?? dhanQuote?.current_price)
          const dhanChange = Number(dhanQuote?.change)
          const dhanChangePercent = Number(dhanQuote?.change_percent)

          if (Number.isFinite(dhanPrice) && dhanPrice > 0) {
            setCanonicalQuote({
              price: dhanPrice,
              change: Number.isFinite(dhanChange) ? dhanChange : 0,
              changePercent: Number.isFinite(dhanChangePercent) ? dhanChangePercent : 0,
              source: 'dhan',
              sourceUrl: dhanQuote?.source_url,
            })
            setLastUpdated(new Date())
            return
          }

          if (Number.isFinite(price) && price > 0) {
            const prevCandle = result.data.length > 1 ? result.data[result.data.length - 2] : firstCandle
            const prevClose = Number(prevCandle?.close ?? prevCandle?.price ?? price)
            setCanonicalQuote({
              price,
              prevClose,
              source: 'yfinance'
            })
            setLastUpdated(new Date())
          }
        }
      } catch (error) {
        console.warn('[StockPriceChart] Canonical quote refresh failed:', error?.message || error)
      }
    }

    const refreshData = async () => {
      setLoading(true)
      try {
        const result = await getOHLCData(symbol, selectedRange.period, selectedRange.interval, market)
        if (result?.success && Array.isArray(result.data) && result.data.length > 0) {
          setLiveData(result.data)
          setLastUpdated(new Date())
        }
      } catch (error) {
        console.warn('[StockPriceChart] Refresh failed:', error?.message || error)
      } finally {
        setLoading(false)
      }
    }

    refreshCanonicalQuote()
    refreshData()

    const intervalId = window.setInterval(() => {
      refreshCanonicalQuote()
      refreshData()
    }, REFRESH_INTERVAL_MS)
    return () => window.clearInterval(intervalId)
  }, [symbol, market, selectedRange.period, selectedRange.interval])

  useEffect(() => {
    if (!containerRef.current || chartRef.current) return undefined

    const chart = createChart(containerRef.current, {
      autoSize: true,
      height: chartHeight,
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#64748b',
        fontFamily: 'Inter, Arial, sans-serif',
      },
      grid: {
        vertLines: { color: '#eef2f7', visible: true },
        horzLines: { color: '#eef2f7', visible: true },
      },
      crosshair: {
        mode: 0,
        vertLine: { color: '#94a3b8', labelBackgroundColor: '#111827', style: 2 },
        horzLine: { color: '#94a3b8', labelBackgroundColor: '#111827', style: 2 },
      },
      rightPriceScale: {
        borderColor: '#6b7280',
        scaleMargins: { top: 0.08, bottom: 0.23 },
      },
      timeScale: {
        borderColor: '#6b7280',
        timeVisible: selectedRange.interval !== '1d' && selectedRange.interval !== '1wk' && selectedRange.interval !== '1mo',
        secondsVisible: false,
        rightOffset: projection ? Math.max(12, projection.investmentPeriod + 5) : 12,
        barSpacing: activeRange === '1D' ? 14 : 6,
      },
      localization: {
        priceFormatter: (price) => `${currencySymbol}${Number(price).toFixed(2)}`,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    })

    const areaSeries = chart.addAreaSeries({
      lineColor: '#16b916',
      topColor: 'rgba(34, 197, 94, 0.18)',
      bottomColor: 'rgba(34, 197, 94, 0.03)',
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      priceLineColor: isUp ? '#16a34a' : '#ef4444',
      priceLineStyle: 2,
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
    })

    const projectionSeries = chart.addLineSeries({
      color: '#eab308',
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
    })

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    })
    chart.priceScale('').applyOptions({
      scaleMargins: { top: 0.72, bottom: 0 },
      borderVisible: false,
    })

    chart.subscribeCrosshairMove((param) => {
      if (!param?.point || !param.time || param.point.x < 0 || param.point.y < 0) {
        setHoverData(null)
        return
      }

      const item = dataByTimeRef.current.get(String(param.time))
      if (!item) {
        setHoverData(null)
        return
      }

      setHoverData({
        x: Math.min(param.point.x + 14, Math.max(16, (containerRef.current?.clientWidth || 0) - 220)),
        y: Math.max(12, param.point.y - 72),
        item,
      })
    })

    chartRef.current = chart
    areaSeriesRef.current = areaSeries
    projectionSeriesRef.current = projectionSeries
    volumeSeriesRef.current = volumeSeries

    return () => {
      chart.remove()
      chartRef.current = null
      areaSeriesRef.current = null
      projectionSeriesRef.current = null
      volumeSeriesRef.current = null
    }
  }, [currencySymbol, activeRange, selectedRange.interval, chartHeight, isUp, projection])

  useEffect(() => {
    if (!chartRef.current || !areaSeriesRef.current || !volumeSeriesRef.current || chartData.length === 0) return

    const histData = lineData.filter((_, i) => chartData[i].isHistorical)
    const projData = lineData.filter((_, i) => !chartData[i].isHistorical)

    if (projData.length > 0 && histData.length > 0) {
      projData.unshift(histData[histData.length - 1])
    }

    areaSeriesRef.current.setData(histData)
    if (projectionSeriesRef.current) {
      projectionSeriesRef.current.setData(projData)
    }

    areaSeriesRef.current.applyOptions({
      lineColor: isUp ? '#16b916' : '#ef4444',
      topColor: isUp ? 'rgba(34, 197, 94, 0.18)' : 'rgba(239, 68, 68, 0.16)',
      bottomColor: isUp ? 'rgba(34, 197, 94, 0.03)' : 'rgba(239, 68, 68, 0.03)',
      priceLineColor: isUp ? '#26a69a' : '#ef5350',
    })
    volumeSeriesRef.current.setData(volumeData)

    if (projection) {
        if (histData.length > 0) {
            areaSeriesRef.current.setMarkers([
                {
                    time: histData[histData.length - 1].time,
                    position: 'aboveBar',
                    color: '#3b82f6',
                    shape: 'arrowDown',
                    text: 'Today',
                }
            ])
        }
    } else {
        areaSeriesRef.current.setMarkers([])
    }

    chartRef.current.timeScale().fitContent()
    setIsChartRevealing(true)
    const revealTimer = window.setTimeout(() => setIsChartRevealing(false), CHART_REVEAL_DURATION_MS + 120)
    return () => window.clearTimeout(revealTimer)
  }, [chartData, lineData, volumeData, isUp, projection])

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className={`overflow-hidden rounded-lg border border-gray-200 bg-white ${compact ? 'shadow-sm' : 'shadow-md'}`}
    >
      <div className={`${compact ? 'px-5 py-5' : 'px-5 py-5'}`}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <h3 className={`truncate font-bold text-gray-900 ${compact ? 'text-2xl' : 'text-3xl'}`}>
              {companyName}
            </h3>
            {hasPrice && (
              <div className={`mt-3 flex flex-wrap items-center ${compact ? 'gap-3' : 'gap-4'}`}>
                <span className={`font-bold text-gray-950 ${compact ? 'text-4xl' : 'text-5xl'}`}>
                  {latestPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className={`inline-flex items-center gap-1 font-bold ${compact ? 'text-base' : 'text-xl'} ${isUp ? 'text-emerald-700' : 'text-red-600'}`}>
                  {isUp ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  ({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%) {Math.abs(change).toFixed(2)}
                </span>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-gray-500">
                  <Clock className="h-4 w-4" />
                  {lastUpdated ? lastUpdated.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }) : 'Live'}{' '}
                  {lastUpdated ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={downloadHistoricalData}
                disabled={!chartData.length}
                className="inline-flex items-center gap-2 rounded border border-emerald-700 px-3 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Download Historical Data
              </button>
              <button
                type="button"
                onClick={() => onOpenTechnicalChart && onOpenTechnicalChart(symbol)}
                className="inline-flex items-center gap-2 rounded border border-emerald-700 px-3 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
              >
                <LineChart className="h-4 w-4" />
                Technical Chart
              </button>
            </div>
          </div>

          <div className="flex flex-col items-start gap-6 xl:items-end">
            <div className="flex flex-wrap items-center gap-4 text-sm font-semibold text-gray-500">
              <span>{displaySymbol}</span>
              {companyMeta?.isin && <span>ISIN : {companyMeta.isin}</span>}
              {companyMeta?.sector && <span>Sector : {companyMeta.sector}</span>}
            </div>
            <LayoutGroup id="stock-price-timeframes">
              <div className="flex items-center gap-2">
                {CHART_RANGES.map((range) => (
                  <motion.button
                    key={range.key}
                    type="button"
                    onClick={() => handleRangeClick(range.key)}
                    whileHover={{ y: -2, scale: activeRange === range.key ? 1 : 1.03 }}
                    whileTap={{ scale: 0.88 }}
                    animate={activeRange === range.key ? { scale: [1, 1.1, 1], y: [0, -3, 0] } : { scale: 1, y: 0 }}
                    transition={{ duration: 0.34, ease: 'easeOut' }}
                    className={`relative min-w-20 overflow-hidden rounded-2xl px-5 py-2 text-base font-semibold shadow-sm transition-colors ${
                      activeRange === range.key ? 'text-white' : 'text-gray-900'
                    }`}
                    style={{
                      backgroundColor: activeRange === range.key ? TIMEFRAME_ACTIVE_COLOR : TIMEFRAME_IDLE_COLOR,
                    }}
                  >
                    {activeRange === range.key && (
                      <>
                        <motion.span
                          layoutId="stock-price-active-range"
                          className="absolute inset-0 rounded-2xl shadow-lg"
                          style={{ backgroundColor: TIMEFRAME_ACTIVE_COLOR, boxShadow: '0 10px 22px rgba(50, 39, 127, 0.24)' }}
                          transition={{ type: 'spring', stiffness: 320, damping: 24, mass: 0.8 }}
                        />
                        <motion.span
                          key={`stock-price-ripple-${rangeGesture.key}`}
                          className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/45"
                          initial={{ opacity: 0.8, scale: 0.15 }}
                          animate={{ opacity: 0, scale: 2.8 }}
                          transition={{ duration: 0.55, ease: 'easeOut' }}
                        />
                        <motion.span
                          key={`stock-price-ring-${rangeGesture.key}`}
                          className="absolute inset-0 rounded-2xl border-2 border-white/65"
                          initial={{ opacity: 0.9, scale: 0.86 }}
                          animate={{ opacity: 0, scale: 1.28 }}
                          transition={{ duration: 0.5, ease: 'easeOut' }}
                        />
                      </>
                    )}
                    <span className="relative z-10">{range.label}</span>
                  </motion.button>
                ))}
              <button
                type="button"
                className="ml-1 rounded px-3 py-2 text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-950"
                title="Technical indicators"
              >
                <BarChart3 className="h-4 w-4" />
              </button>
              </div>
            </LayoutGroup>
          </div>
        </div>

        <div className="mt-4 text-center text-base font-bold text-gray-900">
          {returnsLabel}{' '}
          <span className={rangeChange >= 0 ? 'text-emerald-700' : 'text-red-600'}>
            {rangeChangePercent >= 0 ? '+' : ''}{rangeChangePercent.toFixed(2)}%
          </span>
        </div>
      </div>

      <div
        className={`relative flex bg-white ${compact ? 'min-h-[455px] px-3 pb-3 pt-1' : 'min-h-[560px] px-5 pb-4 pt-2'}`}
        style={{ minHeight: containerHeight }}
      >
        <div className="relative min-w-0 flex-1">
          <div
            ref={containerRef}
            className="w-full"
            style={{ height: chartHeight }}
          />
          {isChartRevealing && (
            <motion.div
              key={`stock-chart-reveal-${rangeGesture.key}`}
              className="pointer-events-none absolute right-0 top-0 z-10 bg-white"
              style={{ bottom: compact ? 34 : 42 }}
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: CHART_REVEAL_DURATION_MS / 1000, ease: [0.22, 1, 0.36, 1] }}
            />
          )}
          {hoverData && (
            <div
              className="pointer-events-none absolute z-20 rounded bg-gray-900 px-3 py-2 text-xs font-semibold text-white shadow-xl"
              style={{ left: hoverData.x, top: hoverData.y }}
            >
              <div className="mb-1 text-sm">{formatDate(hoverData.item.date)}</div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm bg-emerald-400" />
                Price: {currencySymbol}{hoverData.item.close.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm bg-slate-300" />
                {hoverData.item.isHistorical === false ? 'Projected Volume: N/A' : `Volume: ${formatVolume(hoverData.item.volume)}`}
              </div>
              {hoverData.item.isHistorical === false && (
                <div className="mt-1 text-xs text-blue-400 font-bold">Projected Future Price</div>
              )}
            </div>
          )}
          {chartData.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 text-sm font-medium text-gray-500">
              Loading chart data...
            </div>
          )}
        </div>
      </div>

      <div className={`flex items-center justify-center border-t border-gray-100 px-5 text-gray-600 ${compact ? 'gap-5 py-2 text-xs' : 'gap-8 py-3 text-sm'}`}>
        <div className="flex items-center gap-2">
          <span className="h-4 w-4 rounded bg-emerald-500" />
          Price
        </div>
        <div className="flex items-center gap-2">
          <span className="h-4 w-4 rounded bg-slate-200" />
          Volume
        </div>
      </div>
    </motion.section>
  )
}

export default StockPriceChart
