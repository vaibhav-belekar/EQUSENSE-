import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { getPerformanceHistory } from '../services/api'

const TradingChart = () => {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await getPerformanceHistory()
        if (response.success) {
          const formatted = response.history.map(item => ({
            ...item,
            timestamp: new Date(item.timestamp).toLocaleDateString(),
          }))
          setHistory(formatted)
        }
      } catch (error) {
        console.error('Error fetching history:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
    const interval = setInterval(fetchHistory, 10000) // Refresh every 10 seconds
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-gray-800 rounded-lg p-6 border border-gray-700"
      >
        <div className="animate-pulse">Loading chart data...</div>
      </motion.div>
    )
  }

  if (history.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-gray-800 rounded-lg p-6 border border-gray-700"
      >
        <h2 className="text-xl font-bold mb-4">Portfolio Value Over Time</h2>
        <p className="text-gray-400">No performance data available yet. Run a trading cycle to see charts.</p>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800 rounded-lg p-6 border border-gray-700"
    >
      <h2 className="text-xl font-bold mb-4">Portfolio Value Over Time</h2>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={history}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="timestamp" 
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
            formatter={(value) => [`$${value.toLocaleString()}`, 'Portfolio Value']}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="portfolio_value"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            name="Portfolio Value"
          />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  )
}

export default TradingChart

