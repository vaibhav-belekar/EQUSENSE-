import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getOHLCData } from '../services/api'

const StockReturnCalculator = ({ symbol, currentPrice, market = 'IN' }) => {
  const [investment, setInvestment] = useState(1000)
  const [historyIndex, setHistoryIndex] = useState(0)
  const [localHistory, setLocalHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true;
    const fetchHistory = async () => {
      if (!symbol) return;
      setLoading(true);
      try {
        // Fetch up to 5 years of historical data for the calculator
        const ohlcData = await getOHLCData(symbol, '5y', '1d', market);
        if (isMounted && ohlcData?.success && Array.isArray(ohlcData.data) && ohlcData.data.length > 0) {
          const validHistory = ohlcData.data.filter(item => item.close > 0);
          setLocalHistory(validHistory);
          // Set index to roughly 1 year ago, or oldest if less than 1 year
          const targetIndex = Math.max(0, validHistory.length - 252);
          setHistoryIndex(targetIndex);
        }
      } catch (error) {
        console.error("Error fetching OHLC data for calculator:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchHistory();
    return () => { isMounted = false; };
  }, [symbol, market]);

  // Ensure we have valid data
  const hasHistory = localHistory.length > 0
  const safeSymbol = symbol || 'Stock'
  const safeCurrentPrice = currentPrice || (hasHistory ? localHistory[localHistory.length - 1].close : 0)
  
  // Get selected historical data point
  let buyDate = 'N/A'
  let dateLine1 = 'N/A'
  let dateLine2 = ''
  let buyPrice = 0
  
  if (hasHistory) {
    // Make sure index is within bounds
    const safeIndex = Math.min(Math.max(0, historyIndex), localHistory.length - 1)
    const dataPoint = localHistory[safeIndex]
    
    buyPrice = dataPoint.close || dataPoint.price || 0
    
    // Format date
    try {
      const dateObj = new Date(dataPoint.date)
      buyDate = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      dateLine1 = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      dateLine2 = dateObj.getFullYear().toString()
    } catch (e) {
      buyDate = dataPoint.date
      dateLine1 = dataPoint.date
    }
  }

  // Calculate returns
  let currentValue = 0
  if (buyPrice > 0 && safeCurrentPrice > 0) {
    const shares = investment / buyPrice
    currentValue = shares * safeCurrentPrice
  } else {
    currentValue = investment // Fallback
  }

  // Format INR
  const formatINR = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value)
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 min-h-[250px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!hasHistory || safeCurrentPrice === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex items-center mb-6">
          <div className="w-1.5 h-6 bg-blue-600 mr-3 rounded-sm"></div>
          <h2 className="text-lg font-bold text-gray-900">{safeSymbol} Return Calculator</h2>
        </div>
        <div className="text-center text-gray-500 py-8">
          Not enough historical data available to calculate returns.
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-white rounded-xl shadow-sm p-6 border border-gray-200"
    >
      {/* Title */}
      <div className="flex items-center mb-6">
        <div className="w-1.5 h-6 bg-blue-600 mr-3 rounded-sm"></div>
        <h2 className="text-lg font-bold text-gray-900">{safeSymbol} Return Calculator</h2>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-center">
        {/* Left Side: Sliders */}
        <div className="w-full lg:w-2/5 space-y-6">
          {/* Investment Amount */}
          <div>
            <div className="flex justify-between items-end mb-2">
              <label className="text-sm text-gray-500 font-medium">Invested</label>
              <div className="flex items-center bg-gray-50 border border-gray-200 rounded px-2 py-0.5 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
                <span className="text-gray-500 font-medium mr-1">₹</span>
                <input
                  type="number"
                  min="0"
                  value={investment}
                  onChange={(e) => setInvestment(Number(e.target.value))}
                  className="bg-transparent border-none outline-none text-right text-base font-medium text-gray-900 p-0 w-24 focus:ring-0"
                  style={{ MozAppearance: 'textfield' }}
                />
              </div>
            </div>
            <div className="relative pt-1">
              <input
                type="range"
                min={1000}
                max={1000000}
                step={1000}
                value={investment}
                onChange={(e) => setInvestment(Number(e.target.value))}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>
          </div>

          {/* Date / Price */}
          <div>
            <div className="flex justify-between items-end mb-2">
              <div className="flex flex-col text-sm text-gray-500 font-medium leading-snug">
                <span>{dateLine1}</span>
                <span>{dateLine2}</span>
              </div>
              <span className="text-base font-medium text-gray-900">₹{buyPrice.toFixed(2)}</span>
            </div>
            <div className="relative pt-1">
              <input
                type="range"
                min={0}
                max={localHistory.length - 1}
                step={1}
                value={historyIndex}
                onChange={(e) => setHistoryIndex(Number(e.target.value))}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>
          </div>
        </div>

        {/* Right Side: Result Box */}
        <div className="w-full lg:w-3/5">
          <div className="border border-gray-200 rounded-xl p-4 sm:p-6 h-full flex flex-col justify-center bg-gray-50/50 overflow-hidden">
            <p className="text-center text-sm text-gray-800 font-medium mb-4 sm:mb-6 leading-relaxed">
              <span className="font-bold">{formatINR(investment)}</span> invested in {safeSymbol} on <span className="font-bold">{buyDate}</span> is now <span className="font-bold">{formatINR(currentValue)}</span>
            </p>
            
            <div className="flex items-center justify-between gap-2">
              <span className="text-lg sm:text-xl font-bold text-gray-800 truncate" title={formatINR(investment)}>
                {formatINR(investment)}
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600 flex-shrink-0 mx-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
              <span className="text-lg sm:text-xl font-bold text-gray-900 truncate" title={formatINR(currentValue)}>
                {formatINR(currentValue)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default StockReturnCalculator
