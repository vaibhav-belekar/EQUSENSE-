import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getTradeHistory } from '../services/api'

const TradeHistory = () => {
  const [trades, setTrades] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const response = await getTradeHistory(20)
        if (response.success) {
          setTrades(response.trades || [])
        }
      } catch (error) {
        console.error('Error fetching trades:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTrades()
    const interval = setInterval(fetchTrades, 10000) // Refresh every 10 seconds
    return () => clearInterval(interval)
  }, [])

  const getActionColor = (action) => {
    switch (action) {
      case 'Buy':
        return 'text-green-500 bg-green-500/10'
      case 'Sell':
        return 'text-red-500 bg-red-500/10'
      default:
        return 'text-gray-500 bg-gray-500/10'
    }
  }

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-gray-800 rounded-lg p-6 border border-gray-700"
      >
        <div className="animate-pulse">Loading trade history...</div>
      </motion.div>
    )
  }

  if (trades.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-gray-800 rounded-lg p-6 border border-gray-700"
      >
        <h2 className="text-xl font-bold mb-4">Trade History</h2>
        <p className="text-gray-400">No trades executed yet.</p>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800 rounded-lg p-6 border border-gray-700"
    >
      <h2 className="text-xl font-bold mb-4">Recent Trades</h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
              <th className="pb-3">Action</th>
              <th className="pb-3">Symbol</th>
              <th className="pb-3">Shares</th>
              <th className="pb-3">Price</th>
              <th className="pb-3">Value</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade, index) => (
              <motion.tr
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="border-b border-gray-700"
              >
                <td className="py-3">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getActionColor(trade.action)}`}>
                    {trade.action}
                  </span>
                </td>
                <td className="py-3 font-semibold">{trade.symbol}</td>
                <td className="py-3 text-gray-300">{trade.shares}</td>
                <td className="py-3 text-gray-300">₹{trade.price?.toFixed(2) || 'N/A'}</td>
                <td className="py-3 text-gray-300">
                  ₹{trade.cost ? trade.cost.toFixed(2) : trade.revenue ? trade.revenue.toFixed(2) : 'N/A'}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  )
}

export default TradeHistory

