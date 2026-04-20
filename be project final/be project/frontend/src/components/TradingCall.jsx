import React from 'react'
import { motion } from 'framer-motion'
import { Target, TrendingUp, TrendingDown, Minus, Plus, Bookmark, LineChart } from 'lucide-react'

const TradingCall = ({ symbol, currentPrice, prediction, predictionMetrics, recommendation, market }) => {
  if (!currentPrice || !prediction) {
    return null
  }

  const signal = prediction.signal || 'Neutral'
  const confidence = prediction.confidence || 0.5
  const expectedReturn = predictionMetrics?.expectedReturn || 0
  const risk = predictionMetrics?.risk || 5.0

  let tradingCall = expectedReturn > 0 ? 'BUY' : expectedReturn < 0 ? 'SELL' : 'HOLD'
  let callColor = tradingCall === 'BUY' ? 'green' : tradingCall === 'SELL' ? 'red' : 'yellow'
  let callBgColor = tradingCall === 'BUY' ? 'bg-green-50' : tradingCall === 'SELL' ? 'bg-red-50' : 'bg-yellow-50'
  let callBorderColor = tradingCall === 'BUY' ? 'border-green-300' : tradingCall === 'SELL' ? 'border-red-300' : 'border-yellow-300'
  let callTextColor = tradingCall === 'BUY' ? 'text-green-800' : tradingCall === 'SELL' ? 'text-red-800' : 'text-yellow-800'

  // Calculate entry, stop-loss, and target prices
  let entryPrice = currentPrice
  let stopLoss = currentPrice
  let targetPrice = currentPrice
  let riskReward = '1:1'

  if (tradingCall === 'BUY') {
    // For BUY: Entry at current price, Stop-loss below, Target above
    const stopLossPercent = Math.min(risk / 100, 0.05) // Max 5% stop-loss
    const targetPercent = Math.max(Math.abs(expectedReturn) / 100, 0.03) // Min 3% target
    
    entryPrice = currentPrice
    stopLoss = currentPrice * (1 - stopLossPercent)
    targetPrice = currentPrice * (1 + targetPercent)
    
    // Calculate risk/reward ratio
    const riskAmount = entryPrice - stopLoss
    const rewardAmount = targetPrice - entryPrice
    if (riskAmount > 0) {
      const ratio = (rewardAmount / riskAmount).toFixed(1)
      riskReward = `1:${ratio}`
    }
  } else if (tradingCall === 'SELL') {
    // For SELL: Entry at current price, Stop-loss above, Target below
    const stopLossPercent = Math.min(risk / 100, 0.05) // Max 5% stop-loss
    const targetPercent = Math.max(Math.abs(expectedReturn) / 100, 0.03) // Min 3% target
    
    entryPrice = currentPrice
    stopLoss = currentPrice * (1 + stopLossPercent)
    targetPrice = currentPrice * (1 - targetPercent)
    
    // Calculate risk/reward ratio
    const riskAmount = stopLoss - entryPrice
    const rewardAmount = entryPrice - targetPrice
    if (riskAmount > 0) {
      const ratio = (rewardAmount / riskAmount).toFixed(1)
      riskReward = `1:${ratio}`
    }
  } else {
    // HOLD: Show neutral values
    entryPrice = currentPrice
    stopLoss = currentPrice * 0.98 // 2% stop-loss
    targetPrice = currentPrice * 1.02 // 2% target
    riskReward = '1:1'
  }

  // Determine timeframe based on investment period or default
  const getTimeframe = () => {
    if (tradingCall === 'HOLD') {
      return 'Medium Term (1-4 Weeks)'
    }
    if (Math.abs(expectedReturn) > 5) {
      return 'Short Term (5-10 Days)'
    } else if (Math.abs(expectedReturn) > 2) {
      return 'Very Short Term (2-5 Days)'
    } else {
      return 'Short Term (5-10 Days)'
    }
  }

  // Generate rationale based on prediction and metrics
  const getRationale = () => {
    const reasons = []
    
    if (signal === 'Up') {
      reasons.push('Price trend indicates upward momentum.')
      if (confidence >= 0.7) {
        reasons.push('High confidence in bullish signal.')
      }
      if (expectedReturn > 0) {
        reasons.push('Expected return remains positive.')
      }
    } else if (signal === 'Down') {
      reasons.push('Price trend indicates downward momentum.')
      if (confidence >= 0.7) {
        reasons.push('High confidence in bearish signal.')
      }
      if (expectedReturn < -5) {
        reasons.push('Significant downside risk identified.')
      }
    } else {
      reasons.push('Price trend is neutral.')
      reasons.push('Moderate confidence in current levels.')
    }
    
    if (risk > 7) {
      reasons.push('High volatility detected - use appropriate position sizing.')
    } else if (risk < 3) {
      reasons.push('Low volatility - relatively stable price action.')
    }
    
    return reasons
  }

  const rationale = getRationale()
  const timeframe = getTimeframe()

  // Format price based on market
  const currencySymbol = market === 'IN' ? '₹' : '$'
  const formatPrice = (price) => {
    return `${currencySymbol}${price.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className={`bg-white rounded-xl shadow-md p-6 border-2 ${callBorderColor} ${callBgColor}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Target className={`w-6 h-6 ${callTextColor}`} />
          <h3 className="text-xl font-bold text-gray-900">
            Trading Call: <span className={callTextColor}>{tradingCall}</span>
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 border-2 border-blue-500 bg-white text-blue-600 rounded-lg text-sm font-semibold hover:bg-blue-50 transition-colors flex items-center gap-1">
            <Plus className="w-4 h-4" />
            Add to Watchlist
          </button>
          <button className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors flex items-center gap-1">
            <LineChart className="w-4 h-4" />
            Virtual Trade
          </button>
        </div>
      </div>

      {/* Trading Parameters */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-1">Entry Price</p>
          <p className="text-lg font-bold text-gray-900">
            {formatPrice(entryPrice)}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-1">Stop-Loss</p>
          <p className="text-lg font-bold text-red-600">
            {formatPrice(stopLoss)}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-1">Target Price</p>
          <p className="text-lg font-bold text-green-600">
            {formatPrice(targetPrice)}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-1">Risk/Reward</p>
          <p className="text-lg font-bold text-gray-900">{riskReward}</p>
        </div>
      </div>

      {/* Estimated Timeframe */}
      <div className="text-center mb-4">
        <p className="text-xs text-gray-600">
          <span className="font-semibold">Estimated Timeframe:</span> {timeframe}
        </p>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-300 my-4"></div>

      {/* Rationale */}
      <div>
        <p className="text-sm font-bold text-gray-900 mb-2">Rationale:</p>
        <ul className="space-y-1">
          {rationale.map((reason, index) => (
            <li key={index} className="text-xs text-gray-700 flex items-start gap-2">
              <span className="text-gray-400 mt-1">•</span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  )
}

export default TradingCall

