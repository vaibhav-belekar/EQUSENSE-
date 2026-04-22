import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react'
import { getRecommendation } from '../services/api'

const buildRecommendationFromMetrics = (metrics, pred, sym) => {
  const expectedReturn = Number(metrics?.expectedReturn ?? pred?.expected_return ?? 0.2)
  const risk = Number(metrics?.risk ?? pred?.risk ?? 5.0)
  const confidence = Number(pred?.confidence ?? 0.5)
  const signal = pred?.signal || 'Neutral'
  const score = Number((expectedReturn / Math.max(risk, 0.5)).toFixed(2))

  let recommendation = 'HOLD'
  let color = 'yellow'
  let reason = `ML trend model is neutral or not strong enough yet: expected return ${expectedReturn.toFixed(2)}%, risk ${risk.toFixed(1)}/10, score ${score.toFixed(2)}.`

  if (signal === 'Up' && expectedReturn >= 0.6 && confidence >= 0.42 && risk <= 8.5) {
    recommendation = 'BUY'
    color = 'green'
    reason = `ML trend model is bullish with ${(confidence * 100).toFixed(1)}% confidence and ${expectedReturn.toFixed(2)}% expected return.`
  } else if (signal === 'Down' && expectedReturn <= -0.4) {
    recommendation = 'AVOID'
    color = 'red'
    reason = `ML trend model is bearish with ${(confidence * 100).toFixed(1)}% confidence and ${expectedReturn.toFixed(2)}% expected return.`
  }

  return {
    success: true,
    symbol: sym,
    recommendation,
    reason,
    color,
    score,
    expected_return: Number(expectedReturn.toFixed(2)),
    risk: Number(risk.toFixed(1)),
    confidence: Number((confidence * 100).toFixed(1)),
    signal
  }
}

const RecommendationCard = ({ symbol, market = 'US', onRecommendationChange, predictionMetrics, prediction, recommendationData }) => {
  const [recommendation, setRecommendation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showTooltip, setShowTooltip] = useState(false)

  useEffect(() => {
    if (!symbol) {
      setLoading(false)
      return
    }

    if (recommendationData?.recommendation) {
      setRecommendation(recommendationData)
      onRecommendationChange?.(recommendationData)
      setLoading(false)
      return
    }

    const fetchRecommendation = async () => {
      setLoading(true)
      try {
        const result = await getRecommendation(symbol, market)
        if (result && result.success && result.recommendation) {
          setRecommendation(result)
          onRecommendationChange?.(result)
          return
        }
      } catch (error) {
        console.error('Error fetching recommendation:', error)
      }

      const fallback = buildRecommendationFromMetrics(
        predictionMetrics,
        prediction || { signal: 'Neutral', confidence: 0.5, expected_return: 0.2, risk: 5.0 },
        symbol
      )
      setRecommendation(fallback)
      onRecommendationChange?.(fallback)
      setLoading(false)
    }

    fetchRecommendation().finally(() => setLoading(false))
  }, [symbol, market, onRecommendationChange, predictionMetrics, prediction, recommendationData])

  if (!symbol) return null

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Analyzing recommendation...</p>
        </div>
      </motion.div>
    )
  }

  if (!recommendation) {
    return null
  }

  const { recommendation: rec, reason, color, score, expected_return, risk, confidence, signal } = recommendation

  const colorClasses = {
    green: 'bg-green-50 border-green-200 text-green-800',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    red: 'bg-red-50 border-red-200 text-red-800'
  }

  const iconClasses = {
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    red: 'text-red-600'
  }

  const bgClasses = {
    green: 'bg-green-100',
    yellow: 'bg-yellow-100',
    red: 'bg-red-100'
  }

  const Icon = rec === 'BUY' ? CheckCircle2 : rec === 'HOLD' ? AlertTriangle : XCircle

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className={`rounded-xl shadow-lg p-6 border-2 ${colorClasses[color]} relative`}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${bgClasses[color]}`}>
              <Icon className={`w-6 h-6 ${iconClasses[color]}`} />
            </div>
            <div>
              <h3 className="text-2xl font-bold">{rec}</h3>
              <p className="text-sm opacity-75 mt-1">{symbol}</p>
            </div>
          </div>

          <div className="relative">
            <button
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              className="p-1 rounded-full hover:bg-white/20 transition-colors"
            >
              <Info className="w-5 h-5 opacity-60" />
            </button>

            <AnimatePresence>
              {showTooltip && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute right-0 top-8 w-64 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl z-50"
                >
                  <p className="font-semibold mb-2">Recommendation Logic:</p>
                  <ul className="space-y-1 list-disc list-inside text-gray-300">
                    <li>Score = Expected Return / Risk</li>
                    <li>BUY: Positive return with acceptable risk</li>
                    <li>AVOID: Negative expected return or clear downside setup</li>
                    <li>HOLD: Mixed setup that is not clearly bullish or bearish</li>
                  </ul>
                  <div className="mt-2 pt-2 border-t border-gray-700">
                    <p className="text-gray-400">
                      Current: Score {Number(score).toFixed(2)}, Return {Number(expected_return).toFixed(2)}%, Risk {Number(risk).toFixed(1)}/10, Confidence {Number(confidence).toFixed(1)}%
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <p className="text-base font-medium mb-4 leading-relaxed">{reason}</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-current/20">
          <div>
            <p className="text-xs opacity-75 mb-1">Expected Return</p>
            <p className="text-lg font-bold">{Number(expected_return) >= 0 ? '+' : ''}{Number(expected_return).toFixed(2)}%</p>
          </div>
          <div>
            <p className="text-xs opacity-75 mb-1">Risk Level</p>
            <p className="text-lg font-bold">{Number(risk).toFixed(1)}/10</p>
          </div>
          <div>
            <p className="text-xs opacity-75 mb-1">Confidence</p>
            <p className="text-lg font-bold">{Number(confidence).toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-xs opacity-75 mb-1">Signal Bias</p>
            <p className="text-lg font-bold">{signal || 'Neutral'}</p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

export default RecommendationCard
