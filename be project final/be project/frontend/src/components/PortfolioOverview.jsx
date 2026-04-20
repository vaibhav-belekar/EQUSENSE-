import React from 'react'
import { motion } from 'framer-motion'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

const PortfolioOverview = ({ portfolio }) => {
  if (!portfolio || !portfolio.holdings || portfolio.holdings.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-gray-800 rounded-lg p-6 border border-gray-700"
      >
        <h2 className="text-xl font-bold mb-4">Portfolio Overview</h2>
        <p className="text-gray-400">No holdings in portfolio</p>
      </motion.div>
    )
  }

  const chartData = portfolio.holdings.map((holding, index) => ({
    name: holding.symbol,
    value: holding.value,
    color: COLORS[index % COLORS.length],
  }))

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800 rounded-lg p-6 border border-gray-700"
    >
      <h2 className="text-xl font-bold mb-4">Portfolio Overview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Holdings List */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Holdings</h3>
          <div className="space-y-3">
            {portfolio.holdings.map((holding, index) => (
              <div
                key={holding.symbol}
                className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <div>
                    <p className="font-semibold">{holding.symbol}</p>
                    <p className="text-sm text-gray-400">
                      {holding.shares} shares @ ₹{holding.price.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">₹{holding.value.toLocaleString()}</p>
                  <p className="text-sm text-gray-400">
                    {((holding.value / portfolio.portfolio_value) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="flex justify-between">
              <span className="text-gray-400">Cash:</span>
              <span className="font-semibold">₹{portfolio.cash?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-gray-400">Total Value:</span>
              <span className="font-semibold text-lg">
                ₹{portfolio.portfolio_value?.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default PortfolioOverview

