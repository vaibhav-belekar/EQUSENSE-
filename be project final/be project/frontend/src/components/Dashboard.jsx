import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Activity,
  BarChart3,
  AlertCircle,
  Play,
  RefreshCw,
  Brain
} from 'lucide-react'
import toast from 'react-hot-toast'
import PortfolioOverview from './PortfolioOverview'
import AgentStatus from './AgentStatus'
import TradingChart from './TradingChart'
import PredictionsPanel from './PredictionsPanel'
import TradeHistory from './TradeHistory'
import PerformanceMetrics from './PerformanceMetrics'
import StockList from './StockList'
import StockDetail from './StockDetail'
import { 
  getStatus, 
  getPortfolio, 
  getPerformance, 
  getPredictions,
  runTradingCycle,
  trainModels,
  getAgentStatus
} from '../services/api'

const Dashboard = ({ initialized }) => {
  const [status, setStatus] = useState(null)
  const [portfolio, setPortfolio] = useState(null)
  const [performance, setPerformance] = useState(null)
  const [predictions, setPredictions] = useState({})
  const [agentStatus, setAgentStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [selectedStock, setSelectedStock] = useState(null)

  const fetchData = async () => {
    try {
      const [statusData, portfolioData, performanceData, predictionsData, agentData] = await Promise.all([
        getStatus(),
        getPortfolio(),
        getPerformance(),
        getPredictions(),
        getAgentStatus(),
      ])

      setStatus(statusData)
      setPortfolio(portfolioData)
      setPerformance(performanceData)
      setPredictions(predictionsData.predictions || {})
      setAgentStatus(agentData)
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to fetch data')
    }
  }

  useEffect(() => {
    if (initialized) {
      fetchData()
    }
  }, [initialized])

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchData, 5000) // Refresh every 5 seconds
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const handleRunCycle = async () => {
    setLoading(true)
    try {
      await runTradingCycle(false, 10)
      toast.success('Trading cycle completed!')
      await fetchData()
    } catch (error) {
      toast.error('Failed to run trading cycle')
    } finally {
      setLoading(false)
    }
  }

  const handleTrainModels = async () => {
    setLoading(true)
    try {
      toast.loading('Training models... This may take a few minutes')
      await trainModels(10)
      toast.dismiss()
      toast.success('Models trained successfully!')
    } catch (error) {
      toast.dismiss()
      toast.error('Failed to train models')
    } finally {
      setLoading(false)
    }
  }

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center text-white">
          <p>Ecosystem not initialized. Please check backend connection.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Brain className="w-8 h-8 text-blue-500" />
                Multi-Agent Trading Ecosystem
              </h1>
              <p className="text-gray-400 text-sm mt-1">AI-Powered Collaborative Trading Bots</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  autoRefresh ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-700 hover:bg-gray-600'
                } transition-colors`}
              >
                <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                Auto Refresh
              </button>
              <button
                onClick={handleTrainModels}
                disabled={loading}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center gap-2 disabled:opacity-50"
              >
                <Brain className="w-4 h-4" />
                Train Models
              </button>
              <button
                onClick={handleRunCycle}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                Run Cycle
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics */}
        {portfolio && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-800 rounded-lg p-6 border border-gray-700"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Portfolio Value</p>
                  <p className="text-2xl font-bold mt-2">
                    ₹{portfolio.portfolio_value?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-500" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gray-800 rounded-lg p-6 border border-gray-700"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total P/L</p>
                  <p className={`text-2xl font-bold mt-2 ${portfolio.profit_loss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    ₹{portfolio.profit_loss?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                {portfolio.profit_loss >= 0 ? (
                  <TrendingUp className="w-8 h-8 text-green-500" />
                ) : (
                  <TrendingDown className="w-8 h-8 text-red-500" />
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gray-800 rounded-lg p-6 border border-gray-700"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Return %</p>
                  <p className={`text-2xl font-bold mt-2 ${portfolio.return_pct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {portfolio.return_pct?.toFixed(2)}%
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-blue-500" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gray-800 rounded-lg p-6 border border-gray-700"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Holdings</p>
                  <p className="text-2xl font-bold mt-2">
                    {portfolio.holdings?.length || 0}
                  </p>
                </div>
                <Activity className="w-8 h-8 text-purple-500" />
              </div>
            </motion.div>
          </div>
        )}

        {/* Stock List */}
        <StockList 
          onStockSelect={setSelectedStock} 
          selectedStock={selectedStock}
        />

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            <TradingChart />
            <PortfolioOverview portfolio={portfolio} />
            <TradeHistory />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <AgentStatus agentStatus={agentStatus} />
            <PredictionsPanel predictions={predictions} />
            {performance && <PerformanceMetrics performance={performance.performance} />}
          </div>
        </div>

        {/* Stock Detail Modal */}
        {selectedStock && (
          <StockDetail 
            symbol={selectedStock} 
            onClose={() => setSelectedStock(null)}
          />
        )}
      </main>
    </div>
  )
}

export default Dashboard

