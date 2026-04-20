import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  X, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Calendar,
  Brain,
  Shield,
  FileText,
  BarChart3,
  Activity
} from 'lucide-react'
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
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts'

const StockReport = ({ stock, onClose }) => {
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (stock) {
      generateReport()
    }
  }, [stock])

  const generateReport = async () => {
    setLoading(true)
    try {
      // Calculate predicted outcome
      const currentPrice = stock.current_price || 0
      const signal = stock.prediction?.signal || 'Neutral'
      const confidence = stock.prediction?.confidence || 0.5
      const investmentAmount = stock.investmentAmount || 10000
      const period = stock.investmentPeriod || 30

      // Predict future price based on signal and confidence
      let priceChange = 0
      if (signal === 'Up') {
        // Optimistic: 2-10% gain based on confidence
        priceChange = 0.02 + (confidence * 0.08)
      } else if (signal === 'Down') {
        // Pessimistic: -2% to -10% loss based on confidence
        priceChange = -0.02 - (confidence * 0.08)
      }

      // Calculate predicted price after period
      const predictedPrice = currentPrice * (1 + priceChange * (period / 30))
      const shares = investmentAmount / currentPrice
      const predictedValue = shares * predictedPrice
      const profitLoss = predictedValue - investmentAmount
      const profitLossPercent = (profitLoss / investmentAmount) * 100

      // Generate price projection chart data
      const projectionData = []
      for (let day = 0; day <= period; day += 5) {
        const dayPriceChange = priceChange * (day / period)
        const dayPrice = currentPrice * (1 + dayPriceChange)
        projectionData.push({
          day,
          price: dayPrice,
          value: (investmentAmount / currentPrice) * dayPrice,
        })
      }

      // Agent reports
      const agentReports = {
        analyst: {
          status: 'active',
          prediction: signal,
          confidence: confidence * 100,
          recommendation: signal === 'Up' ? 'BUY' : signal === 'Down' ? 'SELL' : 'HOLD',
          reasoning: `Based on technical analysis, the stock shows a ${signal.toLowerCase()} trend with ${(confidence * 100).toFixed(1)}% confidence.`,
        },
        trader: {
          status: 'active',
          // Using less rigorous thresholds: 0.5 instead of 0.7
          action: signal === 'Up' && confidence >= 0.5 ? 'BUY' : signal === 'Down' && confidence >= 0.5 ? 'SELL' : 'HOLD',
          shares: Math.floor(shares),
          entryPrice: currentPrice,
          reasoning: `Recommended ${signal === 'Up' && confidence >= 0.5 ? 'buying' : signal === 'Down' && confidence >= 0.5 ? 'selling' : 'holding'} ${Math.floor(shares)} shares at current price.`,
        },
        risk: {
          status: 'active',
          // Using less rigorous thresholds: 0.6 for HIGH, 0.45 for MEDIUM
          riskLevel: confidence > 0.6 ? 'HIGH' : confidence > 0.45 ? 'MEDIUM' : 'LOW',
          volatility: 'MODERATE',
          recommendation: confidence > 0.6 ? 'Proceed with caution' : 'Acceptable risk level',
          reasoning: `Risk assessment indicates ${confidence > 0.6 ? 'high' : confidence > 0.45 ? 'medium' : 'low'} risk based on prediction confidence.`,
        },
        auditor: {
          status: 'active',
          expectedReturn: profitLossPercent,
          expectedValue: predictedValue,
          riskAdjustedReturn: profitLossPercent * (1 - confidence),
          recommendation: profitLoss > 0 ? 'Favorable investment' : 'Unfavorable investment',
          reasoning: `Based on current analysis, expected return is ${profitLossPercent.toFixed(2)}% over ${period} days.`,
        },
      }

      setReportData({
        symbol: stock.symbol,
        currentPrice,
        predictedPrice,
        investmentAmount,
        period,
        shares: Math.floor(shares),
        predictedValue,
        profitLoss,
        profitLossPercent,
        projectionData,
        agentReports,
        priceHistory: stock.price_history || [],
      })
    } catch (error) {
      console.error('Error generating report:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !reportData) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      >
        <div className="bg-gray-800 rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-white">Generating comprehensive report...</p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-gray-900 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto border border-gray-700"
      >
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-3xl font-bold">{reportData.symbol}</h2>
            <p className="text-gray-400 mt-1">Comprehensive AI Agent Analysis Report</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Investment Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-800 rounded-lg p-4 border border-gray-700"
            >
              <p className="text-gray-400 text-sm">Investment</p>
              <p className="text-2xl font-bold mt-2">₹{reportData.investmentAmount.toLocaleString()}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gray-800 rounded-lg p-4 border border-gray-700"
            >
              <p className="text-gray-400 text-sm">Current Price</p>
              <p className="text-2xl font-bold mt-2">₹{reportData.currentPrice.toFixed(2)}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gray-800 rounded-lg p-4 border border-gray-700"
            >
              <p className="text-gray-400 text-sm">Predicted Price</p>
              <p className="text-2xl font-bold mt-2">₹{reportData.predictedPrice.toFixed(2)}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={`bg-gray-800 rounded-lg p-4 border ${
                reportData.profitLoss >= 0 ? 'border-green-500/50' : 'border-red-500/50'
              }`}
            >
              <p className="text-gray-400 text-sm">Expected P/L</p>
              <div className="flex items-center gap-2 mt-2">
                {reportData.profitLoss >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-green-500" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-500" />
                )}
                <div>
                  <p className={`text-2xl font-bold ${reportData.profitLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {reportData.profitLoss >= 0 ? '+' : ''}₹{reportData.profitLoss.toFixed(2)}
                  </p>
                  <p className={`text-sm ${reportData.profitLossPercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {reportData.profitLossPercent >= 0 ? '+' : ''}{reportData.profitLossPercent.toFixed(2)}%
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Price Projection Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800 rounded-lg p-6 border border-gray-700"
          >
            <h3 className="text-xl font-bold mb-4">Price Projection ({reportData.period} Days)</h3>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={reportData.projectionData}>
                <defs>
                  <linearGradient id="colorProjection" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="day" stroke="#9ca3af" label={{ value: 'Days', position: 'insideBottom', offset: -5 }} />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                  formatter={(value, name) => {
                    if (name === 'price') return [`₹${value.toFixed(2)}`, 'Price']
                    if (name === 'value') return [`₹${value.toFixed(2)}`, 'Portfolio Value']
                    return [value, name]
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorProjection)"
                  name="Predicted Price"
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Portfolio Value"
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Agent Reports */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Analyst Agent */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-800 rounded-lg p-6 border border-gray-700"
            >
              <div className="flex items-center gap-3 mb-4">
                <Brain className="w-6 h-6 text-purple-500" />
                <h3 className="text-xl font-bold">Analyst Agent Report</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-gray-400 text-sm">Prediction</p>
                  <p className="font-semibold">{reportData.agentReports.analyst.prediction}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Confidence</p>
                  <p className="font-semibold">{reportData.agentReports.analyst.confidence.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Recommendation</p>
                  <p className="font-semibold text-green-500">{reportData.agentReports.analyst.recommendation}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Reasoning</p>
                  <p className="text-sm text-gray-300">{reportData.agentReports.analyst.reasoning}</p>
                </div>
              </div>
            </motion.div>

            {/* Trader Agent */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gray-800 rounded-lg p-6 border border-gray-700"
            >
              <div className="flex items-center gap-3 mb-4">
                <DollarSign className="w-6 h-6 text-green-500" />
                <h3 className="text-xl font-bold">Trader Agent Report</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-gray-400 text-sm">Action</p>
                  <p className="font-semibold">{reportData.agentReports.trader.action}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Recommended Shares</p>
                  <p className="font-semibold">{reportData.agentReports.trader.shares}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Entry Price</p>
                  <p className="font-semibold">₹{reportData.agentReports.trader.entryPrice.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Reasoning</p>
                  <p className="text-sm text-gray-300">{reportData.agentReports.trader.reasoning}</p>
                </div>
              </div>
            </motion.div>

            {/* Risk Agent */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gray-800 rounded-lg p-6 border border-gray-700"
            >
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-6 h-6 text-yellow-500" />
                <h3 className="text-xl font-bold">Risk Agent Report</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-gray-400 text-sm">Risk Level</p>
                  <p className={`font-semibold ${
                    reportData.agentReports.risk.riskLevel === 'HIGH' ? 'text-red-500' :
                    reportData.agentReports.risk.riskLevel === 'MEDIUM' ? 'text-yellow-500' :
                    'text-green-500'
                  }`}>
                    {reportData.agentReports.risk.riskLevel}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Volatility</p>
                  <p className="font-semibold">{reportData.agentReports.risk.volatility}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Recommendation</p>
                  <p className="font-semibold">{reportData.agentReports.risk.recommendation}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Reasoning</p>
                  <p className="text-sm text-gray-300">{reportData.agentReports.risk.reasoning}</p>
                </div>
              </div>
            </motion.div>

            {/* Auditor Agent */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gray-800 rounded-lg p-6 border border-gray-700"
            >
              <div className="flex items-center gap-3 mb-4">
                <FileText className="w-6 h-6 text-blue-500" />
                <h3 className="text-xl font-bold">Auditor Agent Report</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-gray-400 text-sm">Expected Return</p>
                  <p className={`font-semibold ${reportData.agentReports.auditor.expectedReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {reportData.agentReports.auditor.expectedReturn >= 0 ? '+' : ''}{reportData.agentReports.auditor.expectedReturn.toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Expected Value</p>
                  <p className="font-semibold">₹{reportData.agentReports.auditor.expectedValue.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Risk-Adjusted Return</p>
                  <p className="font-semibold">{reportData.agentReports.auditor.riskAdjustedReturn.toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Recommendation</p>
                  <p className="font-semibold">{reportData.agentReports.auditor.recommendation}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Reasoning</p>
                  <p className="text-sm text-gray-300">{reportData.agentReports.auditor.reasoning}</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-600/10 border border-blue-500/50 rounded-lg p-6"
          >
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-blue-500" />
              Investment Summary
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Investment</p>
                <p className="text-lg font-semibold">₹{reportData.investmentAmount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Period</p>
                <p className="text-lg font-semibold">{reportData.period} days</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Expected Value</p>
                <p className="text-lg font-semibold">₹{reportData.predictedValue.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Net Return</p>
                <p className={`text-lg font-semibold ${reportData.profitLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {reportData.profitLoss >= 0 ? '+' : ''}₹{reportData.profitLoss.toFixed(2)}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default StockReport

