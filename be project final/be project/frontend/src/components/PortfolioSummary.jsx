import React from 'react'
import { motion } from 'framer-motion'
import { PieChart, Wallet } from 'lucide-react'

const PortfolioSummary = ({ symbol, portfolioValue, returnPercent }) => {
  // Default values
  const safePortfolioValue = portfolioValue !== undefined && portfolioValue !== null ? portfolioValue : 100000
  const safeReturnPercent = returnPercent !== undefined && returnPercent !== null ? returnPercent : 0
  
  // Calculate progress for circular indicator (0-100%)
  // Clamp return percent to reasonable range for display
  const displayReturn = Math.min(100, Math.max(-100, safeReturnPercent))
  const progress = Math.min(100, Math.max(0, Math.abs(displayReturn)))
  const circumference = 2 * Math.PI * 45 // radius = 45
  const offset = circumference - (progress / 100) * circumference

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-white rounded-xl shadow-md p-6 border border-gray-200"
    >
      <div className="flex items-center gap-2 mb-4">
        <Wallet className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-900">Portfolio Summary</h3>
      </div>

      <div className="flex items-center gap-6">
        {/* Circular Progress Indicator */}
        <div className="relative w-24 h-24">
          <svg className="transform -rotate-90 w-24 h-24">
            {/* Background circle */}
            <circle
              cx="48"
              cy="48"
              r="45"
              stroke="#e5e7eb"
              strokeWidth="8"
              fill="none"
            />
            {/* Progress circle */}
            <circle
              cx="48"
              cy="48"
              r="45"
              stroke={displayReturn >= 0 ? "#3b82f6" : "#ef4444"}
              strokeWidth="8"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-xl font-bold ${displayReturn >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {displayReturn >= 0 ? '+' : ''}{displayReturn.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Portfolio Details */}
        <div className="flex-1">
          <div className="space-y-2">
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-1">{symbol || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Portfolio Value</p>
              <p className="text-xl font-bold text-gray-900">₹{safePortfolioValue.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Expected Return</p>
              <p className={`text-base font-semibold ${displayReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {displayReturn >= 0 ? '+' : ''}{displayReturn.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Show message if data is not available */}
      {returnPercent === undefined || returnPercent === null ? (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Return data will be available after analyzing the stock
          </p>
        </div>
      ) : null}
    </motion.div>
  )
}

export default PortfolioSummary

