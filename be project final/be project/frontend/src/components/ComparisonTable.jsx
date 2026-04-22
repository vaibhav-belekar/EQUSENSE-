import React from 'react'
import { motion } from 'framer-motion'
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react'

const ComparisonTable = ({ currentSymbol, comparisonStocks = [], market = 'IN', onCompare }) => {
  const defaultStocks = [
    { symbol: 'INFY', price: 1440.50, change: -2.1, volatility: 'Medium' },
    { symbol: 'TATASTEEL', price: 161.90, change: 3.8, volatility: 'Medium' },
    { symbol: 'TCS', price: 3420.00, change: 1.2, volatility: 'Low' }
  ]

  const stocks = comparisonStocks.length > 0 ? comparisonStocks : defaultStocks
  const currencySymbol = market === 'IN' ? '₹' : '$'
  const hasComparableData = stocks.length >= 2

  const getGrowthValue = (stock) => {
    if (typeof stock.change === 'number') return stock.change
    return Number(stock.expected_return || stock.profit_loss_percent || 0)
  }

  const getPriceValue = (stock) => Number(stock.price ?? stock.current_price ?? 0)

  const getVolatilityLabel = (stock) => {
    if (stock.volatility) return stock.volatility
    const riskScore = Number(stock.risk_score ?? 5)
    if (riskScore < 3) return 'Low'
    if (riskScore < 7) return 'Medium'
    return 'High'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-white rounded-xl shadow-md p-6 border border-gray-200"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Comparison</h3>
        </div>
        <button
          onClick={() => onCompare && onCompare()}
          disabled={!hasComparableData}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-colors"
        >
          Compare
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase">SYMBOL</th>
              <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase">PRICE</th>
              <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase">GROWTH</th>
              <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase">VOLATILITY</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map((stock) => {
              const growth = getGrowthValue(stock)
              const volatility = getVolatilityLabel(stock)
              return (
                <tr key={stock.symbol} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-2">
                    <span className="text-sm font-semibold text-gray-900">{stock.symbol}</span>
                    {stock.symbol === currentSymbol && (
                      <span className="ml-2 text-xs text-blue-600 font-medium">(Current)</span>
                    )}
                  </td>
                  <td className="py-3 px-2">
                    <span className="text-sm text-gray-900">{currencySymbol}{getPriceValue(stock).toFixed(2)}</span>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-1">
                      {growth >= 0 ? (
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-600" />
                      )}
                      <span className={`text-sm font-semibold ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {growth >= 0 ? '+' : ''}{growth.toFixed(2)}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      volatility === 'Low' ? 'bg-green-100 text-green-800' :
                      volatility === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {volatility}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  )
}

export default ComparisonTable
