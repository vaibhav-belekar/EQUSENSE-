import React from 'react'
import { motion } from 'framer-motion'
import { Brain, TrendingUp, Shield } from 'lucide-react'

const AIPrediction = ({ expectedReturn, risk, sharpeRatio }) => {
  // Handle undefined/null values
  const safeExpectedReturn = expectedReturn !== undefined && expectedReturn !== null ? expectedReturn : null
  const safeRisk = risk !== undefined && risk !== null ? risk : null
  const safeSharpeRatio = sharpeRatio !== undefined && sharpeRatio !== null ? sharpeRatio : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="bg-white rounded-xl shadow-md p-6 border border-gray-200"
    >
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-5 h-5 text-purple-600" />
        <h3 className="text-lg font-semibold text-gray-900">AI Prediction</h3>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Expected Return</span>
          <span className="text-lg font-bold text-gray-900">
            {safeExpectedReturn !== null ? `${safeExpectedReturn > 0 ? '+' : ''}${safeExpectedReturn.toFixed(1)}%` : 'N/A'}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Risk (Std Deviation)</span>
          <span className="text-lg font-bold text-gray-900">
            {safeRisk !== null ? `${safeRisk.toFixed(1)}%` : 'N/A'}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Sharpe Ratio</span>
          <span className="text-lg font-bold text-gray-900">
            {safeSharpeRatio !== null ? safeSharpeRatio.toFixed(2) : 'N/A'}
          </span>
        </div>
      </div>
      
      {/* Show message if data is not available */}
      {safeExpectedReturn === null && safeRisk === null && safeSharpeRatio === null && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Prediction data will be available after analyzing the stock
          </p>
        </div>
      )}
    </motion.div>
  )
}

export default AIPrediction

