import React from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

const PredictionsPanel = ({ predictions }) => {
  if (!predictions || Object.keys(predictions).length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-gray-800 rounded-lg p-6 border border-gray-700"
      >
        <h2 className="text-xl font-bold mb-4">Predictions</h2>
        <p className="text-gray-400">No predictions available. Run analysis first.</p>
      </motion.div>
    )
  }

  const getSignalIcon = (signal) => {
    switch (signal) {
      case 'Up':
        return <TrendingUp className="w-5 h-5 text-green-500" />
      case 'Down':
        return <TrendingDown className="w-5 h-5 text-red-500" />
      default:
        return <Minus className="w-5 h-5 text-gray-500" />
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800 rounded-lg p-6 border border-gray-700"
    >
      <h2 className="text-xl font-bold mb-4">Current Predictions</h2>
      <div className="space-y-3">
        {Object.entries(predictions).map(([symbol, prediction], index) => (
          <motion.div
            key={symbol}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`p-4 rounded-lg border ${getSignalColor(prediction.signal || 'Neutral')}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getSignalIcon(prediction.signal || 'Neutral')}
                <div>
                  <p className="font-semibold">{symbol}</p>
                  <p className="text-sm text-gray-400">
                    Signal: {prediction.signal || 'Neutral'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold">
                  {(prediction.confidence * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-gray-400">Confidence</p>
              </div>
            </div>
            {/* Confidence Bar */}
            <div className="mt-3">
              <div className="w-full bg-gray-700 rounded-full h-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${prediction.confidence * 100}%` }}
                  transition={{ duration: 0.5 }}
                  className={`h-2 rounded-full ${
                    prediction.signal === 'Up' ? 'bg-green-500' :
                    prediction.signal === 'Down' ? 'bg-red-500' :
                    'bg-gray-500'
                  }`}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

export default PredictionsPanel

