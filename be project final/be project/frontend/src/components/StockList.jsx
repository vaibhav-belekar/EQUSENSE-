import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, ChevronRight, DollarSign } from 'lucide-react'
import { getPredictions, getPortfolio } from '../services/api'

const StockList = ({ onStockSelect, selectedStock }) => {
  const [stocks, setStocks] = useState([])
  const [predictions, setPredictions] = useState({})
  const [portfolio, setPortfolio] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [predictionsData, portfolioData] = await Promise.all([
          getPredictions(),
          getPortfolio(),
        ])

        if (predictionsData.success) {
          setPredictions(predictionsData.predictions || {})
        }
        if (portfolioData.success) {
          setPortfolio(portfolioData)
        }

        // Create stock list from predictions
        const stockList = Object.keys(predictionsData.predictions || {}).map(symbol => ({
          symbol,
          prediction: predictionsData.predictions[symbol],
        }))

        setStocks(stockList)
      } catch (error) {
        console.error('Error fetching stock data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 10000) // Refresh every 10 seconds
    return () => clearInterval(interval)
  }, [])

  const getStockProfitLoss = (symbol) => {
    if (!portfolio || !portfolio.holdings) return null
    
    const holding = portfolio.holdings.find(h => h.symbol === symbol)
    if (!holding) return null

    // Calculate profit/loss (simplified - would need entry price in real system)
    const currentValue = holding.value
    const estimatedCost = holding.shares * holding.price * 0.99 // Approximate with 1% transaction cost
    const profitLoss = currentValue - estimatedCost
    
    return {
      value: profitLoss,
      percentage: (profitLoss / estimatedCost) * 100,
      shares: holding.shares,
      currentPrice: holding.price,
    }
  }

  const getSignalColor = (signal) => {
    switch (signal) {
      case 'Up':
        return 'text-green-500 bg-green-500/10 border-green-500/20'
      case 'Down':
        return 'text-red-500 bg-red-500/10 border-red-500/20'
      default:
        return 'text-gray-500 bg-gray-500/10 border-gray-500/20'
    }
  }

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="animate-pulse">Loading stocks...</div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800 rounded-lg p-6 border border-gray-700"
    >
      <h2 className="text-xl font-bold mb-4">Stock List</h2>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {stocks.map((stock, index) => {
          const profitLoss = getStockProfitLoss(stock.symbol)
          const isSelected = selectedStock === stock.symbol
          const signal = stock.prediction?.signal || 'Neutral'
          const confidence = stock.prediction?.confidence || 0

          return (
            <motion.div
              key={stock.symbol}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onStockSelect(stock.symbol)}
              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                isSelected
                  ? 'bg-blue-600/20 border-blue-500 ring-2 ring-blue-500'
                  : 'bg-gray-700 hover:bg-gray-600 border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className={`px-3 py-1 rounded-lg border ${getSignalColor(signal)}`}>
                    <span className="font-bold text-sm">{stock.symbol}</span>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {signal === 'Up' ? (
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      ) : signal === 'Down' ? (
                        <TrendingDown className="w-4 h-4 text-red-500" />
                      ) : null}
                      <span className="text-sm text-gray-300">
                        {signal} ({(confidence * 100).toFixed(0)}%)
                      </span>
                    </div>
                    
                    {profitLoss && (
                      <div className="flex items-center gap-2 mt-1">
                        <DollarSign className={`w-3 h-3 ${profitLoss.value >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                        <span className={`text-xs ${profitLoss.value >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {profitLoss.value >= 0 ? '+' : ''}₹{profitLoss.value.toFixed(2)} 
                          ({profitLoss.percentage >= 0 ? '+' : ''}{profitLoss.percentage.toFixed(2)}%)
                        </span>
                        <span className="text-xs text-gray-400">
                          • {profitLoss.shares} shares @ ₹{profitLoss.currentPrice.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                <ChevronRight className={`w-5 h-5 ${isSelected ? 'text-blue-500' : 'text-gray-400'}`} />
              </div>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}

export default StockList

