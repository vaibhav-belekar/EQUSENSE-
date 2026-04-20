import React from 'react'
import { motion } from 'framer-motion'
import { BarChart3, Target, TrendingUp, AlertTriangle } from 'lucide-react'

const PerformanceMetrics = ({ performance }) => {
  if (!performance) {
    return null
  }

  const metrics = [
    {
      label: 'Total Trades',
      value: performance.metrics?.total_trades || 0,
      icon: BarChart3,
      color: 'text-blue-500',
    },
    {
      label: 'Win Rate',
      value: `${((performance.metrics?.win_rate || 0) * 100).toFixed(1)}%`,
      icon: Target,
      color: 'text-green-500',
    },
    {
      label: 'Accuracy',
      value: `${(performance.accuracy || 0).toFixed(1)}%`,
      icon: TrendingUp,
      color: 'text-purple-500',
    },
    {
      label: 'Sharpe Ratio',
      value: (performance.metrics?.sharpe_ratio || 0).toFixed(2),
      icon: AlertTriangle,
      color: 'text-yellow-500',
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800 rounded-lg p-6 border border-gray-700"
    >
      <h2 className="text-xl font-bold mb-4">Performance Metrics</h2>
      <div className="grid grid-cols-2 gap-4">
        {metrics.map((metric, index) => {
          const Icon = metric.icon
          return (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="bg-gray-700 rounded-lg p-4"
            >
              <div className="flex items-center gap-3 mb-2">
                <Icon className={`w-5 h-5 ${metric.color}`} />
                <span className="text-sm text-gray-400">{metric.label}</span>
              </div>
              <p className="text-2xl font-bold">{metric.value}</p>
            </motion.div>
          )
        })}
      </div>
      
      {performance.recommendations && performance.recommendations.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-700">
          <h3 className="text-lg font-semibold mb-3">Recommendations</h3>
          <ul className="space-y-2">
            {performance.recommendations.map((rec, index) => (
              <li key={index} className="text-sm text-gray-300 flex items-start gap-2">
                <span className="text-blue-500">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  )
}

export default PerformanceMetrics

