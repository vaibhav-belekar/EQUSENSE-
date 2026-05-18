import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { getShareholdingPattern } from '../services/api'
import { PieChart } from 'lucide-react'

const ShareholdingPattern = ({ symbol, market = 'IN' }) => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    const fetchData = async () => {
      setLoading(true)
      try {
        const response = await getShareholdingPattern(symbol, market)
        if (isMounted && response?.success && response.data) {
          // Filter out categories with 0 value to keep it clean, but keep major ones
          const filtered = response.data.filter(item => item.value > 0.05 || ['Promoters', 'FIIs', 'Mutual Fund'].includes(item.label))
          setData(filtered)
        }
      } catch (error) {
        console.error('Failed to load shareholding pattern:', error)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    if (symbol) {
      fetchData()
    }

    return () => {
      isMounted = false
    }
  }, [symbol, market])

  if (loading) {
    return (
      <div className="mt-6 flex min-h-[300px] flex-col rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="h-6 w-1.5 rounded-full bg-blue-600" />
          <h3 className="text-xl font-bold text-gray-900">{symbol} Shareholding Pattern</h3>
        </div>
        <div className="flex flex-1 animate-pulse flex-col justify-center space-y-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <div className="h-4 w-24 rounded bg-gray-200"></div>
                <div className="h-4 w-12 rounded bg-gray-200"></div>
              </div>
              <div className="h-2.5 w-full rounded-full bg-gray-100"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return null
  }

  return (
    <div className="mt-6 flex flex-col rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center gap-3">
        <div className="h-6 w-1.5 rounded-full bg-blue-600" />
        <h3 className="text-xl font-bold text-gray-900">{symbol} Shareholding Pattern</h3>
      </div>

      <div className="flex flex-col space-y-5">
        {data.map((item, index) => (
          <div key={item.label} className="group flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-800">{item.label}</span>
              <span className="text-sm font-medium text-gray-500">{item.value.toFixed(2)}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${item.value}%` }}
                transition={{ duration: 1, delay: index * 0.1, ease: 'easeOut' }}
                className="h-full rounded-full bg-[#3b5998]"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ShareholdingPattern
