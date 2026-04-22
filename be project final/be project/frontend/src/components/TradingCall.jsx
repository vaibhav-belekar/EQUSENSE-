import React from 'react'
import { motion } from 'framer-motion'
import { Target, Plus, LineChart } from 'lucide-react'

const TradingCall = ({
  symbol,
  currentPrice,
  prediction,
  predictionMetrics,
  recommendation,
  market,
  onAddToWatchlist,
  onVirtualTrade,
}) => {
  if (!currentPrice || !prediction) {
    return null
  }

  const signal = prediction.signal || 'Neutral'
  const confidence = prediction.confidence || 0.5
  const expectedReturn = Number(predictionMetrics?.expectedReturn || 0)
  const risk = Number(predictionMetrics?.risk || 5.0)
  const recommendationLabel = recommendation?.recommendation || 'HOLD'

  const tradingCall = recommendationLabel === 'BUY' ? 'BUY' : recommendationLabel === 'AVOID' ? 'AVOID' : 'HOLD'
  const callBgColor = tradingCall === 'BUY' ? 'bg-green-50' : tradingCall === 'AVOID' ? 'bg-red-50' : 'bg-yellow-50'
  const callBorderColor = tradingCall === 'BUY' ? 'border-green-300' : tradingCall === 'AVOID' ? 'border-red-300' : 'border-yellow-300'
  const callTextColor = tradingCall === 'BUY' ? 'text-green-800' : tradingCall === 'AVOID' ? 'text-red-800' : 'text-yellow-800'
  const hasTradePlan = tradingCall === 'BUY'

  let entryPrice = currentPrice
  let stopLoss = currentPrice
  let targetPrice = currentPrice
  let riskReward = 'N/A'

  if (tradingCall === 'BUY') {
    const stopLossPercent = Math.min(Math.max(risk / 150, 0.012), 0.03)
    const targetPercent = Math.min(Math.max(Math.abs(expectedReturn) / 100, 0.02), 0.06)

    stopLoss = currentPrice * (1 - stopLossPercent)
    targetPrice = currentPrice * (1 + targetPercent)

    const riskAmount = entryPrice - stopLoss
    const rewardAmount = targetPrice - entryPrice
    if (riskAmount > 0) {
      riskReward = `1:${(rewardAmount / riskAmount).toFixed(1)}`
    }
  } else if (tradingCall === 'AVOID') {
    riskReward = 'No trade'
  } else {
    riskReward = 'Wait'
  }

  const timeframe = tradingCall === 'AVOID'
    ? 'Wait for Better Setup'
    : tradingCall === 'HOLD'
      ? 'Medium Term (1-4 Weeks)'
      : Math.abs(expectedReturn) > 3
        ? 'Short Term (5-10 Days)'
        : Math.abs(expectedReturn) > 1.5
          ? 'Swing Window (1-2 Weeks)'
          : 'Swing Window (1-3 Weeks)'

  const rationale = []
  if (signal === 'Up') {
    rationale.push('Price trend indicates upward momentum.')
    if (confidence >= 0.65) rationale.push('Confidence is supportive for a bullish setup.')
    if (expectedReturn > 0) rationale.push('Expected return remains positive after calibration.')
  } else if (signal === 'Down') {
    rationale.push('Price trend indicates downward momentum.')
    if (confidence >= 0.65) rationale.push('Confidence is relatively high for a bearish signal.')
    if (expectedReturn < -1.5) rationale.push('Downside risk is stronger than near-term reward.')
  } else {
    rationale.push('Price trend is neutral.')
    rationale.push('The setup is not strong enough for an aggressive trade.')
  }

  if (risk > 7) rationale.push('High volatility detected, so position sizing should stay conservative.')
  else if (risk < 3) rationale.push('Volatility is relatively contained at current levels.')

  if (tradingCall === 'AVOID') rationale.push('No fresh long entry is recommended until the setup improves.')
  else if (tradingCall === 'HOLD') rationale.push('Waiting for cleaner confirmation is safer than forcing an entry here.')

  const currencySymbol = market === 'IN' ? '₹' : '$'
  const formatPrice = (price) => `${currencySymbol}${Number(price).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`
  const planStatusText = tradingCall === 'AVOID'
    ? 'Avoid fresh long entries for now.'
    : tradingCall === 'HOLD'
      ? 'Wait for a cleaner confirmation before entering.'
      : riskReward

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className={`bg-white rounded-xl shadow-md p-6 border-2 ${callBorderColor} ${callBgColor}`}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Target className={`w-6 h-6 ${callTextColor}`} />
          <h3 className="text-xl font-bold text-gray-900">
            Trading Call: <span className={callTextColor}>{tradingCall}</span>
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onAddToWatchlist && onAddToWatchlist(symbol)}
            className="px-3 py-1.5 border-2 border-blue-500 bg-white text-blue-600 rounded-lg text-sm font-semibold hover:bg-blue-50 transition-colors flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add to Watchlist
          </button>
          <button
            onClick={() => onVirtualTrade && onVirtualTrade(symbol)}
            className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors flex items-center gap-1"
          >
            <LineChart className="w-4 h-4" />
            Virtual Trade
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-4">
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-1">{hasTradePlan ? 'Entry Price' : 'Current Price'}</p>
          <p className="text-lg font-bold text-gray-900">{formatPrice(hasTradePlan ? entryPrice : currentPrice)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-1">{hasTradePlan ? 'Stop-Loss' : 'Trade Setup'}</p>
          <p className={`text-lg font-bold ${hasTradePlan ? 'text-red-600' : callTextColor}`}>
            {hasTradePlan ? formatPrice(stopLoss) : tradingCall}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-1">{hasTradePlan ? 'Target Price' : 'Action'}</p>
          <p className={`text-lg font-bold ${hasTradePlan ? 'text-green-600' : 'text-gray-900'}`}>
            {hasTradePlan ? formatPrice(targetPrice) : riskReward}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-1">{hasTradePlan ? 'Risk/Reward' : 'Status'}</p>
          <p className="text-lg font-bold text-gray-900">{planStatusText}</p>
        </div>
      </div>

      <div className="text-center mb-4">
        <p className="text-xs text-gray-600">
          <span className="font-semibold">Estimated Timeframe:</span> {timeframe}
        </p>
      </div>

      <div className="border-t border-gray-300 my-4"></div>

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
