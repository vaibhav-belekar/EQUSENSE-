import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Star, StarOff, Plus, X, TrendingUp, TrendingDown } from 'lucide-react'
import { getPredictions } from '../services/api'

const Watchlist = ({ onStockSelect, onCompare }) => {
  const [watchlist, setWatchlist] = useState([])
  const [predictions, setPredictions] = useState({})
  const [showAddModal, setShowAddModal] = useState(false)
  const [newSymbol, setNewSymbol] = useState('')

  // Load watchlist from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('watchlist')
    if (saved) {
      setWatchlist(JSON.parse(saved))
    }
  }, [])

  // Fetch predictions for watchlist stocks
  useEffect(() => {
    const fetchPredictions = async () => {
      if (watchlist.length === 0) return
      
      try {
        const predictionsData = await getPredictions()
        if (predictionsData.success) {
          setPredictions(predictionsData.predictions || {})
        }
      } catch (error) {
        console.error('Error fetching predictions:', error)
      }
    }

    fetchPredictions()
    const interval = setInterval(fetchPredictions, 10000) // Refresh every 10 seconds
    return () => clearInterval(interval)
  }, [watchlist])

  const addToWatchlist = (symbol) => {
    const upperSymbol = symbol.toUpperCase()
    if (!watchlist.includes(upperSymbol)) {
      const updated = [...watchlist, upperSymbol]
      setWatchlist(updated)
      localStorage.setItem('watchlist', JSON.stringify(updated))
    }
  }

  const removeFromWatchlist = (symbol) => {
    const updated = watchlist.filter(s => s !== symbol)
    setWatchlist(updated)
    localStorage.setItem('watchlist', JSON.stringify(updated))
  }

  const handleAddSymbol = () => {
    if (newSymbol.trim()) {
      addToWatchlist(newSymbol.trim())
      setNewSymbol('')
      setShowAddModal(false)
    }
  }

  const getSignalColor = (signal) => {
    switch (signal) {
      case 'Up': return 'text-green-500 bg-green-500/10 border-green-500/20'
      case 'Down': return 'text-red-500 bg-red-500/10 border-red-500/20'
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20'
    }
  }

  if (watchlist.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800 rounded-lg p-6 border border-gray-700"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            My Watchlist
          </h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Stock
          </button>
        </div>
        <div className="text-center py-8 text-gray-400">
          <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Your watchlist is empty</p>
          <p className="text-sm mt-2">Add stocks to track them easily</p>
        </div>

        {/* Add Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Add Stock to Watchlist</h3>
              <label htmlFor="watchlist-symbol" className="sr-only">Stock Symbol</label>
              <input
                id="watchlist-symbol"
                name="watchlist-symbol"
                type="text"
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                placeholder="Enter stock symbol (e.g., AAPL)"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && handleAddSymbol()}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddSymbol}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowAddModal(false)
                    setNewSymbol('')
                  }}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 rounded-lg px-4 py-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800 rounded-lg p-6 border border-gray-700"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500" />
          My Watchlist ({watchlist.length})
        </h2>
        <div className="flex gap-2">
          {watchlist.length >= 2 && (
            <button
              onClick={() => onCompare(watchlist)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm"
            >
              Compare All
            </button>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {watchlist.map((symbol, index) => {
          const prediction = predictions[symbol]
          const signal = prediction?.signal || 'Neutral'
          const confidence = prediction?.confidence || 0

          return (
            <motion.div
              key={symbol}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <button
                    onClick={() => removeFromWatchlist(symbol)}
                    className="text-yellow-500 hover:text-yellow-400"
                  >
                    <StarOff className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => onStockSelect(symbol)}
                    className="font-bold text-lg hover:text-blue-400 transition-colors"
                  >
                    {symbol}
                  </button>
                  {prediction && (
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getSignalColor(signal)}`}>
                      {signal} ({(confidence * 100).toFixed(0)}%)
                    </span>
                  )}
                </div>
                <button
                  onClick={() => removeFromWatchlist(symbol)}
                  className="text-gray-400 hover:text-red-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Add Stock to Watchlist</h3>
            <input
              type="text"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
              placeholder="Enter stock symbol (e.g., AAPL)"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => e.key === 'Enter' && handleAddSymbol()}
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddSymbol}
                className="flex-1 bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setNewSymbol('')
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 rounded-lg px-4 py-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}

export default Watchlist

