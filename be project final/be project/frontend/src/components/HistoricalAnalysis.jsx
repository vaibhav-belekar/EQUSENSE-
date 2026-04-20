import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Clock, TrendingUp, TrendingDown, BarChart3, CheckCircle2, XCircle } from 'lucide-react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { getHistoricalAnalysis } from '../services/api'

const HistoricalAnalysis = ({ symbol, onClose, market = 'US' }) => {
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!symbol) return

    const fetchAnalysis = async () => {
      setLoading(true)
      try {
        const result = await getHistoricalAnalysis(symbol, market)
        if (result.success) {
          setAnalysis(result.analysis)
        } else {
          console.error('Historical analysis failed:', result)
        }
      } catch (error) {
        console.error('Error fetching historical analysis:', error)
        const errorDetail = error.response?.data?.detail || error.message || 'Failed to fetch historical analysis'
        console.error('Error details:', errorDetail)
        // Set a user-friendly error message
        if (errorDetail.includes('not initialized') || errorDetail.includes('Ecosystem')) {
          console.warn('Ecosystem may need initialization, but this should not block historical analysis')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchAnalysis()
  }, [symbol, market])

  if (!symbol) return null

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      >
        <div className="bg-white rounded-lg p-8 shadow-xl border border-gray-200">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-700">Analyzing historical data...</p>
        </div>
      </motion.div>
    )
  }

  if (!analysis) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-xl max-w-md">
          <p className="text-gray-700">No historical analysis available for {symbol}</p>
          <button
            onClick={onClose}
            className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2"
          >
            Close
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto border border-gray-200 shadow-xl"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3 text-gray-900">
              <Clock className="w-6 h-6 text-blue-600" />
              Historical Analysis: {symbol}
            </h2>
            <p className="text-gray-600 mt-1">Backtesting and accuracy tracking</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XCircle className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Accuracy Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-50 rounded-lg p-4 border border-gray-200"
            >
              <p className="text-gray-600 text-sm mb-2">Prediction Accuracy</p>
              <p className="text-2xl font-bold text-gray-900">
                {analysis.accuracy?.toFixed(1) || 0}%
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gray-50 rounded-lg p-4 border border-gray-200"
            >
              <p className="text-gray-600 text-sm mb-2">Total Predictions</p>
              <p className="text-2xl font-bold text-gray-900">{analysis.total_predictions || 0}</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gray-50 rounded-lg p-4 border border-gray-200"
            >
              <p className="text-gray-600 text-sm mb-2">Correct Predictions</p>
              <p className="text-2xl font-bold text-green-600">{analysis.correct_predictions || 0}</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gray-50 rounded-lg p-4 border border-gray-200"
            >
              <p className="text-gray-600 text-sm mb-2">Avg Error</p>
              <p className="text-2xl font-bold text-gray-900">{analysis.avg_error?.toFixed(2) || 0}%</p>
            </motion.div>
          </div>

          {/* Historical Chart */}
          {analysis.price_history && analysis.price_history.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-50 rounded-lg p-6 border border-gray-200"
            >
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Price vs Predictions Over Time</h3>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={analysis.price_history}>
                  <defs>
                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#374151' }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="actual_price"
                    stroke="#3b82f6"
                    fillOpacity={1}
                    fill="url(#colorActual)"
                    name="Actual Price"
                  />
                  <Area
                    type="monotone"
                    dataKey="predicted_price"
                    stroke="#10b981"
                    fillOpacity={1}
                    fill="url(#colorPredicted)"
                    name="Predicted Price"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {/* Prediction History */}
          {analysis.prediction_history && analysis.prediction_history.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-50 rounded-lg p-6 border border-gray-200"
            >
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Prediction History</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-gray-600 text-sm border-b border-gray-300">
                      <th className="pb-3">Date</th>
                      <th className="pb-3">Predicted</th>
                      <th className="pb-3">Actual</th>
                      <th className="pb-3">Error</th>
                      <th className="pb-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.prediction_history.map((pred, index) => (
                      <tr key={index} className="border-b border-gray-200">
                        <td className="py-3 text-gray-700">{pred.date}</td>
                        <td className="py-3 text-gray-700">₹{pred.predicted_price?.toFixed(2) || 'N/A'}</td>
                        <td className="py-3 text-gray-700">₹{pred.actual_price?.toFixed(2) || 'N/A'}</td>
                        <td className="py-3 text-gray-700">{pred.error?.toFixed(2) || 0}%</td>
                        <td className="py-3">
                          {pred.correct ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

export default HistoricalAnalysis

