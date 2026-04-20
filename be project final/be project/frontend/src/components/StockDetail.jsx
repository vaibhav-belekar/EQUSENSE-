import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3,
  Activity,
  AlertCircle,
  X
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
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { getPredictions, getPortfolio, getPerformance, getTradeHistory, getStockDetail } from '../services/api'

const StockDetail = ({ symbol, onClose }) => {
  const [stockData, setStockData] = useState(null)
  const [prediction, setPrediction] = useState(null)
  const [portfolio, setPortfolio] = useState(null)
  const [performance, setPerformance] = useState(null)
  const [tradeHistory, setTradeHistory] = useState([])
  const [priceHistory, setPriceHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!symbol) return

    const fetchStockData = async () => {
      setLoading(true)
      try {
        const [stockDetailData, predictionsData, portfolioData, performanceData, tradesData] = await Promise.all([
          getStockDetail(symbol),
          getPredictions(),
          getPortfolio(),
          getPerformance(),
          getTradeHistory(100),
        ])

        // Use stock detail data if available
        if (stockDetailData.success) {
          setStockData({
            symbol: stockDetailData.symbol,
            shares: stockDetailData.shares,
            price: stockDetailData.current_price,
            value: stockDetailData.value,
            percentage: (stockDetailData.value / (portfolioData?.portfolio_value || 1)) * 100,
          })
          setPrediction(stockDetailData.prediction)
          
          // Use price history from stock detail
          if (stockDetailData.price_history) {
            setPriceHistory(stockDetailData.price_history.map(item => ({
              date: item.date,
              price: item.price,
              value: item.price * stockDetailData.shares,
            })))
          }
        } else if (predictionsData.success && predictionsData.predictions[symbol]) {
          setPrediction(predictionsData.predictions[symbol])
        }

        if (portfolioData.success) {
          setPortfolio(portfolioData)
        }

        if (performanceData.success) {
          setPerformance(performanceData.performance)
        }

        if (tradesData.success) {
          const stockTrades = tradesData.trades.filter(t => t.symbol === symbol)
          setTradeHistory(stockTrades)
          
          // Use trades from stock detail if available
          if (stockDetailData.success && stockDetailData.recent_trades) {
            setTradeHistory(stockDetailData.recent_trades)
          }
        }
      } catch (error) {
        console.error('Error fetching stock data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStockData()
    const interval = setInterval(fetchStockData, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [symbol])

  if (!symbol) return null

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      >
        <div className="bg-gray-800 rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-white">Loading {symbol} data...</p>
        </div>
      </motion.div>
    )
  }

  const holding = portfolio?.holdings?.find(h => h.symbol === symbol)
  const profitLoss = holding ? {
    value: holding.value - (holding.shares * holding.price * 0.99),
    percentage: ((holding.value - (holding.shares * holding.price * 0.99)) / (holding.shares * holding.price * 0.99)) * 100,
  } : null

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']

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
        className="bg-gray-900 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto border border-gray-700"
      >
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              {symbol}
              {prediction && (
                <span className={`px-3 py-1 rounded-lg text-sm ${
                  prediction.signal === 'Up' ? 'bg-green-500/20 text-green-500' :
                  prediction.signal === 'Down' ? 'bg-red-500/20 text-red-500' :
                  'bg-gray-500/20 text-gray-500'
                }`}>
                  {prediction.signal} ({(prediction.confidence * 100).toFixed(0)}%)
                </span>
              )}
            </h2>
            {stockData && (
              <p className="text-gray-400 mt-1">
                {stockData.shares > 0 ? `${stockData.shares} shares` : 'Not in portfolio'}
              </p>
            )}
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
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-800 rounded-lg p-4 border border-gray-700"
            >
              <p className="text-gray-400 text-sm">Current Price</p>
              <p className="text-2xl font-bold mt-2">
                ₹{stockData?.price?.toFixed(2) || '0.00'}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gray-800 rounded-lg p-4 border border-gray-700"
            >
              <p className="text-gray-400 text-sm">Holdings Value</p>
              <p className="text-2xl font-bold mt-2">
                ₹{stockData?.value?.toLocaleString() || '0.00'}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={`bg-gray-800 rounded-lg p-4 border border-gray-700 ${
                profitLoss?.value >= 0 ? 'border-green-500/50' : 'border-red-500/50'
              }`}
            >
              <p className="text-gray-400 text-sm">Profit/Loss</p>
              <div className="flex items-center gap-2 mt-2">
                {profitLoss?.value >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-green-500" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-500" />
                )}
                <div>
                  <p className={`text-2xl font-bold ${profitLoss?.value >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {profitLoss?.value >= 0 ? '+' : ''}₹{profitLoss?.value?.toFixed(2) || '0.00'}
                  </p>
                  <p className={`text-sm ${profitLoss?.percentage >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {profitLoss?.percentage >= 0 ? '+' : ''}{profitLoss?.percentage?.toFixed(2) || '0.00'}%
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gray-800 rounded-lg p-4 border border-gray-700"
            >
              <p className="text-gray-400 text-sm">Portfolio %</p>
              <p className="text-2xl font-bold mt-2">
                {stockData?.percentage?.toFixed(2) || '0.00'}%
              </p>
            </motion.div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Price History Chart */}
            {priceHistory.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-800 rounded-lg p-6 border border-gray-700"
              >
                <h3 className="text-lg font-semibold mb-4">Price History</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={priceHistory}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="date" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke="#3b82f6"
                      fillOpacity={1}
                      fill="url(#colorPrice)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>
            )}

            {/* Trade Distribution */}
            {tradeHistory.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-800 rounded-lg p-6 border border-gray-700"
              >
                <h3 className="text-lg font-semibold mb-4">Trade Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Buy', value: tradeHistory.filter(t => t.action === 'Buy').length },
                        { name: 'Sell', value: tradeHistory.filter(t => t.action === 'Sell').length },
                        { name: 'Hold', value: tradeHistory.filter(t => t.action === 'Hold').length },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[0, 1, 2].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </motion.div>
            )}
          </div>

          {/* Trade History */}
          {tradeHistory.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-800 rounded-lg p-6 border border-gray-700"
            >
              <h3 className="text-lg font-semibold mb-4">Trade History for {symbol}</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
                      <th className="pb-3">Action</th>
                      <th className="pb-3">Shares</th>
                      <th className="pb-3">Price</th>
                      <th className="pb-3">Value</th>
                      <th className="pb-3">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tradeHistory.map((trade, index) => (
                      <tr key={index} className="border-b border-gray-700">
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            trade.action === 'Buy' ? 'bg-green-500/20 text-green-500' :
                            trade.action === 'Sell' ? 'bg-red-500/20 text-red-500' :
                            'bg-gray-500/20 text-gray-500'
                          }`}>
                            {trade.action}
                          </span>
                        </td>
                        <td className="py-3 text-gray-300">{trade.shares}</td>
                        <td className="py-3 text-gray-300">₹{trade.price?.toFixed(2) || 'N/A'}</td>
                        <td className="py-3 text-gray-300">
                          ₹{(trade.cost || trade.revenue || 0).toFixed(2)}
                        </td>
                        <td className="py-3 text-gray-400 text-sm">
                          {trade.timestamp ? new Date(trade.timestamp).toLocaleString() : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {tradeHistory.length === 0 && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 text-center text-gray-400">
              No trades for {symbol} yet. Run a trading cycle to see activity.
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

export default StockDetail

