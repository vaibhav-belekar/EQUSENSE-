import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Newspaper, ExternalLink } from 'lucide-react'

const NewsSentiment = ({ symbol, onFullAnalyze, onViewChart }) => {
  const [news, setNews] = useState(null)
  const [loading, setLoading] = useState(false)

  // Sample news data - in production, this would come from an API
  useEffect(() => {
    setLoading(true)
    // Simulate API call
    setTimeout(() => {
      const sampleNews = {
        sentiment: 'Positive',
        headline: `${symbol} shares rise as company reports strong quarterly results`,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        source: 'Financial Times'
      }
      setNews(sampleNews)
      setLoading(false)
    }, 500)
  }, [symbol])

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl shadow-md p-6 border border-gray-200"
      >
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </motion.div>
    )
  }

  if (!news) return null

  const sentimentColors = {
    Positive: 'bg-green-100 text-green-800 border-green-300',
    Negative: 'bg-red-100 text-red-800 border-red-300',
    Neutral: 'bg-gray-100 text-gray-800 border-gray-300'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-white rounded-xl shadow-md p-6 border border-gray-200"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">News Sentiment</h3>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${sentimentColors[news.sentiment]}`}>
          {news.sentiment}
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium text-gray-900 mb-1">
            {news.headline}
          </p>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{news.date}</span>
            {news.source && <span>{news.source}</span>}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button 
            onClick={() => onFullAnalyze && onFullAnalyze(symbol)}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <Newspaper className="w-4 h-4" />
            Full Analyze
          </button>
          <button 
            onClick={() => onViewChart && onViewChart(symbol)}
            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            View Chart
          </button>
        </div>
      </div>
    </motion.div>
  )
}

export default NewsSentiment

