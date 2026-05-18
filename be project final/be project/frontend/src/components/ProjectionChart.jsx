import React, { useEffect, useRef, useMemo } from 'react'
import { ColorType, createChart } from 'lightweight-charts'

const ProjectionChart = ({ historicalData = [], currentPrice, projectedPrice, investmentPeriod, currencySymbol }) => {
  const containerRef = useRef(null)
  const chartRef = useRef(null)
  
  const chartData = useMemo(() => {
    const data = []
    
    // Add historical data (last 30 days to keep it focused on projection context)
    const recentHistory = historicalData.slice(-45)
    
    recentHistory.forEach(item => {
      const date = new Date(item.date || item.time)
      const close = Number(item.close ?? item.price ?? item.value)
      const volume = Number(item.volume ?? 0)
      if (Number.isFinite(date.getTime()) && Number.isFinite(close)) {
        data.push({
          time: date.toISOString().slice(0, 10),
          value: close,
          volume: volume,
          isHistorical: true
        })
      }
    })
    
    let lastDate = new Date()
    let lastPrice = currentPrice
    
    if (data.length > 0) {
      const lastItem = data[data.length - 1]
      lastDate = new Date(lastItem.time)
      lastPrice = lastItem.value
    } else if (Number.isFinite(currentPrice)) {
      data.push({
        time: lastDate.toISOString().slice(0, 10),
        value: currentPrice,
        volume: 0,
        isHistorical: true
      })
    } else {
        return []
    }

    // Generate future projection points
    const futureDays = Math.max(1, investmentPeriod)
    const priceChange = projectedPrice - lastPrice
    
    for (let day = 1; day <= futureDays; day++) {
      const progress = day / futureDays
      const price = lastPrice + (priceChange * progress)
      
      const nextDate = new Date(lastDate)
      nextDate.setDate(lastDate.getDate() + day)
      
      data.push({
        time: nextDate.toISOString().slice(0, 10),
        value: price,
        volume: 0, // No volume for projection
        isHistorical: false
      })
    }
    
    return data.filter((item, index, array) => index === 0 || item.time !== array[index - 1].time)
  }, [historicalData, currentPrice, projectedPrice, investmentPeriod])

  const lineData = useMemo(() => chartData.map(d => ({ time: d.time, value: d.value })), [chartData])
  const volumeData = useMemo(() => chartData.map(d => ({ time: d.time, value: d.volume, color: 'rgba(148, 163, 184, 0.18)' })), [chartData])

  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      autoSize: true,
      height: 400,
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#64748b',
        fontFamily: 'Inter, Arial, sans-serif',
      },
      grid: {
        vertLines: { color: '#eef2f7' },
        horzLines: { color: '#eef2f7' },
      },
      crosshair: {
        mode: 0,
        vertLine: { color: '#94a3b8', labelBackgroundColor: '#111827', style: 2 },
        horzLine: { color: '#94a3b8', labelBackgroundColor: '#111827', style: 2 },
      },
      rightPriceScale: {
        borderColor: '#6b7280',
        scaleMargins: { top: 0.1, bottom: 0.2 },
      },
      timeScale: {
        borderColor: '#6b7280',
        rightOffset: 5,
        timeVisible: true,
        fixLeftEdge: true,
      },
      localization: {
        priceFormatter: (price) => `${currencySymbol}${Number(price).toFixed(2)}`,
      },
    })

    const areaSeries = chart.addAreaSeries({
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
    })

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    })
    
    chart.priceScale('').applyOptions({
      scaleMargins: { top: 0.72, bottom: 0 },
      borderVisible: false,
    })

    chartRef.current = { chart, areaSeries, volumeSeries }

    const handleResize = () => {
        if (containerRef.current) {
            chart.applyOptions({ height: 400 })
        }
    }
    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      chart.remove()
      chartRef.current = null
    }
  }, [currencySymbol])

  useEffect(() => {
    if (!chartRef.current || chartData.length === 0) return

    const { chart, areaSeries, volumeSeries } = chartRef.current
    const isUp = projectedPrice >= currentPrice

    areaSeries.applyOptions({
      lineColor: isUp ? '#16b916' : '#ef4444',
      topColor: isUp ? 'rgba(34, 197, 94, 0.18)' : 'rgba(239, 68, 68, 0.16)',
      bottomColor: isUp ? 'rgba(34, 197, 94, 0.03)' : 'rgba(239, 68, 68, 0.03)',
      priceLineColor: isUp ? '#26a69a' : '#ef5350',
    })

    areaSeries.setData(lineData)
    volumeSeries.setData(volumeData)

    const todayIndex = chartData.findIndex(d => !d.isHistorical)
    if (todayIndex > 0) {
      const todayTime = chartData[todayIndex - 1].time
      areaSeries.setMarkers([
        {
          time: todayTime,
          position: 'aboveBar',
          color: '#3b82f6',
          shape: 'arrowDown',
          text: 'Today',
        }
      ])
    } else {
      areaSeries.setMarkers([])
    }

    chart.timeScale().fitContent()
  }, [chartData, lineData, volumeData, projectedPrice, currentPrice])

  if (chartData.length === 0) {
      return (
          <div className="h-[400px] flex items-center justify-center rounded-lg border border-dashed border-gray-300 text-sm text-gray-500">
              Price projection is unavailable.
          </div>
      )
  }

  return (
    <div className="w-full relative rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      <div ref={containerRef} className="w-full h-[400px]" />
    </div>
  )
}

export default ProjectionChart
