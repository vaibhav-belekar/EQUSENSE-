import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { X, TrendingUp, TrendingDown, BarChart3, DollarSign } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

const StockComparison = ({ stocks, onClose, onRemoveStock }) => {
  const [selectedMetric, setSelectedMetric] = useState('price')

  if (!stocks || stocks.length === 0) {
    return null
  }

  // Prepare comparison data
  const comparisonData = stocks.map(stock => ({
    symbol: stock.symbol,
    currentPrice: stock.current_price || 0,
    predictedPrice: stock.predicted_price || 0,
    signal: stock.prediction?.signal || 'Neutral',
    confidence: (stock.prediction?.confidence || 0) * 100,
    expectedReturn: stock.expected_return || 0,
    riskScore: stock.risk_score || 0,
    profitLoss: stock.profit_loss || 0,
    profitLossPercent: stock.profit_loss_percent || 0,
  }))

  // Find best investment
  const bestInvestment = comparisonData.reduce((best, current) => {
    return current.expectedReturn > best.expectedReturn ? current : best
  }, comparisonData[0])

  // Chart data for price comparison
  const chartData = stocks.map(stock => ({
    symbol: stock.symbol,
    current: stock.current_price || 0,
    predicted: stock.predicted_price || 0,
  }))

  const getSignalColor = (signal) => {
    switch (signal) {
      case 'Up': return 'text-green-500 bg-green-500/10'
      case 'Down': return 'text-red-500 bg-red-500/10'
      default: return 'text-gray-500 bg-gray-500/10'
    }
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
        className="bg-gray-900 rounded-lg w-full max-w-7xl max-h-[90vh] overflow-y-auto border border-gray-700"
      >
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-blue-500" />
              Stock Comparison
            </h2>
            <p className="text-gray-400 mt-1">Compare {stocks.length} stocks side-by-side</p>
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
          {/* Best Investment Highlight */}
          {bestInvestment && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-500/10 border border-green-500/20 rounded-lg p-4"
            >
              <div className="flex items-center gap-3">
                <TrendingUp className="w-6 h-6 text-green-500" />
                <div>
                  <p className="text-green-500 font-semibold">Best Investment Opportunity</p>
                  <p className="text-white">
                    <span className="font-bold">{bestInvestment.symbol}</span> - Expected Return: {bestInvestment.expectedReturn.toFixed(2)}%
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Comparison Table */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left p-4 text-gray-400">Symbol</th>
                  <th className="text-left p-4 text-gray-400">Current Price</th>
                  <th className="text-left p-4 text-gray-400">Predicted Price</th>
                  <th className="text-left p-4 text-gray-400">Signal</th>
                  <th className="text-left p-4 text-gray-400">Confidence</th>
                  <th className="text-left p-4 text-gray-400">Expected Return</th>
                  <th className="text-left p-4 text-gray-400">Risk Score</th>
                  <th className="text-left p-4 text-gray-400">Expected P/L</th>
                  <th className="text-left p-4 text-gray-400">Action</th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((stock, index) => (
                  <motion.tr
                    key={stock.symbol}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`border-b border-gray-700 hover:bg-gray-700 ${
                      stock.symbol === bestInvestment?.symbol ? 'bg-green-500/5' : ''
                    }`}
                  >
                    <td className="p-4 font-bold">{stock.symbol}</td>
                    <td className="p-4">₹{stock.currentPrice.toFixed(2)}</td>
                    <td className="p-4">₹{stock.predictedPrice.toFixed(2)}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getSignalColor(stock.signal)}`}>
                        {stock.signal}
                      </span>
                    </td>
                    <td className="p-4">{stock.confidence.toFixed(1)}%</td>
                    <td className={`p-4 font-semibold ${stock.expectedReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {stock.expectedReturn >= 0 ? '+' : ''}{stock.expectedReturn.toFixed(2)}%
                    </td>
                    <td className="p-4">
                      <span className={`font-semibold ${
                        stock.riskScore < 3 ? 'text-green-500' :
                        stock.riskScore < 7 ? 'text-yellow-500' :
                        'text-red-500'
                      }`}>
                        {stock.riskScore.toFixed(1)}/10
                      </span>
                    </td>
                    <td className={`p-4 font-semibold ${stock.profitLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {stock.profitLoss >= 0 ? '+' : ''}₹{stock.profitLoss.toFixed(2)} ({stock.profitLossPercent >= 0 ? '+' : ''}{stock.profitLossPercent.toFixed(2)}%)
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => onRemoveStock(stock.symbol)}
                        className="text-red-500 hover:text-red-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Comparison Chart */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold mb-4">Price Comparison</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="symbol" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                />
                <Legend />
                <Line type="monotone" dataKey="current" stroke="#3b82f6" name="Current Price" />
                <Line type="monotone" dataKey="predicted" stroke="#10b981" name="Predicted Price" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Summary Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <p className="text-gray-400 text-sm">Avg Expected Return</p>
              <p className="text-2xl font-bold mt-2">
                {(comparisonData.reduce((sum, s) => sum + s.expectedReturn, 0) / comparisonData.length).toFixed(2)}%
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <p className="text-gray-400 text-sm">Avg Risk Score</p>
              <p className="text-2xl font-bold mt-2">
                {(comparisonData.reduce((sum, s) => sum + s.riskScore, 0) / comparisonData.length).toFixed(1)}/10
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <p className="text-gray-400 text-sm">Best Return</p>
              <p className="text-2xl font-bold mt-2 text-green-500">
                {bestInvestment?.expectedReturn.toFixed(2)}%
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <p className="text-gray-400 text-sm">Lowest Risk</p>
              <p className="text-2xl font-bold mt-2 text-green-500">
                {Math.min(...comparisonData.map(s => s.riskScore)).toFixed(1)}/10
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default StockComparison

