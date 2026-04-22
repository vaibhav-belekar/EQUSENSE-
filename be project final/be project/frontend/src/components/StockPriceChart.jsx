import React from 'react'
import { motion } from 'framer-motion'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'

const StockPriceChart = ({ priceData, symbol, currentPrice }) => {
  const isIndianSymbol = /\.NS$|\.BO$/i.test(symbol || '')
  const currencySymbol = isIndianSymbol ? 'Rs' : '$'
  const chartData = priceData?.map(item => ({
    date: item.date || item.time,
    price: item.price || item.close || item.value,
    value: item.value || item.price || item.close
  }))?.filter(item => Number.isFinite(item.price)) || []

  const latestPrice = chartData[chartData.length - 1]?.price ?? currentPrice ?? 0
  const previousPrice = chartData[chartData.length - 2]?.price ?? latestPrice
  const change = latestPrice - previousPrice
  const changePercent = previousPrice > 0 ? (change / previousPrice) * 100 : 0
  const hasPrice = Number.isFinite(latestPrice) && latestPrice > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-white rounded-xl shadow-md p-6 border border-gray-200"
    >
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Stock Price</h3>
        {hasPrice ? (
          <div className="flex items-center gap-4">
            <span className="text-2xl font-bold text-gray-900">{currencySymbol} {latestPrice.toFixed(2)}</span>
            <span className={`text-sm font-semibold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change >= 0 ? '+' : ''}{change.toFixed(2)} ({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%)
            </span>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Price history is not available for {symbol} right now.</p>
        )}
      </div>

      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              stroke="#6b7280"
              tick={{ fill: '#6b7280', fontSize: 12 }}
            />
            <YAxis
              stroke="#6b7280"
              tick={{ fill: '#6b7280', fontSize: 12 }}
              domain={['dataMin - 50', 'dataMax + 50']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '8px'
              }}
              formatter={(value) => [`${currencySymbol} ${value.toFixed(2)}`, 'Price']}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[300px] flex items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-500">
          {hasPrice ? 'Current price is available, but historical graph data is not available right now.' : 'Search again or retry once live price history is available.'}
        </div>
      )}
    </motion.div>
  )
}

export default StockPriceChart
