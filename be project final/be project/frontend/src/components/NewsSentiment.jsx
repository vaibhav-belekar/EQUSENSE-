import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Newspaper, ExternalLink, RefreshCcw } from 'lucide-react'
import { getNewsSentiment } from '../services/api'

const sentimentColors = {
  Positive: 'bg-green-100 text-green-800 border-green-300',
  Negative: 'bg-red-100 text-red-800 border-red-300',
  Neutral: 'bg-gray-100 text-gray-800 border-gray-300'
}

const formatDate = (value) => {
  if (!value) return 'Latest'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Latest'
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const formatDateTime = (value) => {
  if (!value) return 'Just now'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Just now'
  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

const buildSummary = (payload) => {
  const label = (payload?.label || 'Neutral').toLowerCase()
  const count = payload?.article_count || 0
  const score = Number(payload?.score || 0).toFixed(2)
  const symbol = payload?.symbol || 'This stock'

  if (count === 0) {
    return `No recent stock-specific news was found for ${symbol}, so the sentiment is being kept neutral for now.`
  }

  if (label === 'positive') {
    return `${symbol} is showing a positive recent news tone. The aggregate sentiment score across ${count} latest articles is ${score}.`
  }

  if (label === 'negative') {
    return `${symbol} is showing caution or pressure in recent headlines. The aggregate sentiment score across ${count} latest articles is ${score}.`
  }

  return `${symbol} has mixed recent news signals, so the overall sentiment remains neutral. The aggregate score across ${count} recent articles is ${score}.`
}

const NewsSentiment = ({ symbol, market = 'US', onFullAnalyze, onViewChart }) => {
  const [newsPayload, setNewsPayload] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    const fetchNews = async (refresh = false) => {
      if (!symbol) {
        setNewsPayload(null)
        return
      }

      setLoading(true)
      setError('')
      const payload = await getNewsSentiment(symbol, market, refresh)

      if (!active) return

      setNewsPayload(payload)
      setLoading(false)

      if (!payload?.success) {
        setError('Unable to load live news sentiment right now.')
      }
    }

    fetchNews(false)
    const intervalId = window.setInterval(() => fetchNews(true), 10 * 60 * 1000)

    return () => {
      active = false
      window.clearInterval(intervalId)
    }
  }, [symbol, market])

  const handleRefresh = async () => {
    setLoading(true)
    setError('')
    const payload = await getNewsSentiment(symbol, market, true)
    setNewsPayload(payload)
    setLoading(false)
  }

  if (loading && !newsPayload) {
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

  if (!newsPayload) return null

  const articles = newsPayload.headlines || []
  const leadArticle = articles[0]
  const badgeClass = sentimentColors[newsPayload.label] || sentimentColors.Neutral
  const summaryText = buildSummary(newsPayload)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-white rounded-xl shadow-md p-6 border border-gray-200"
    >
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">News Sentiment</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${badgeClass}`}>
            {newsPayload.label}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="text-sm text-gray-500">Last updated</p>
              <p className="text-sm font-semibold text-gray-900">{formatDateTime(newsPayload.last_updated)}</p>
            </div>
            <div className="text-right text-xs text-gray-500">
              <p>{newsPayload.article_count || 0} article{(newsPayload.article_count || 0) === 1 ? '' : 's'}</p>
              <p>{newsPayload.cached ? 'Cached result' : 'Fresh result'}</p>
            </div>
          </div>

          <p className="text-sm text-gray-700 mb-3 leading-6">{summaryText}</p>

          {leadArticle ? (
            <div className="rounded-lg border border-white/60 bg-white p-3">
              <div className="flex items-start justify-between gap-3 mb-1">
                <p className="text-sm font-medium text-gray-900">{leadArticle.title}</p>
                <span className={`shrink-0 px-2 py-1 rounded-full text-[11px] font-semibold border ${sentimentColors[leadArticle.sentiment_label] || sentimentColors.Neutral}`}>
                  {leadArticle.sentiment_label}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 gap-2 mb-3">
                <span>{formatDate(leadArticle.published_at)}</span>
                <span>{leadArticle.source || 'Source unavailable'}</span>
              </div>
              {leadArticle.url && (
                <a
                  href={leadArticle.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open source article
                </a>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              {newsPayload.message || 'No recent headlines found for this stock.'}
            </p>
          )}
        </div>

        {articles.length > 1 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-900">Top 5 latest news</h4>
              <span className="text-xs text-gray-500">Most recent stock-related headlines</span>
            </div>
            {articles.slice(0, 5).map((article, index) => {
              const articleBadge = sentimentColors[article.sentiment_label] || sentimentColors.Neutral
              const content = (
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{article.title}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {article.source || 'Source unavailable'} • {formatDate(article.published_at)}
                    </p>
                  </div>
                  <span className={`shrink-0 px-2 py-1 rounded-full text-[11px] font-semibold border ${articleBadge}`}>
                    {article.sentiment_label}
                  </span>
                </div>
              )

              if (article.url) {
                return (
                  <a
                    key={`${article.url}-${index}`}
                    href={article.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-lg border border-gray-100 p-3 hover:bg-gray-50 transition-colors"
                  >
                    {content}
                  </a>
                )
              }

              return (
                <div
                  key={`${article.title}-${index}`}
                  className="rounded-lg border border-gray-100 p-3"
                >
                  {content}
                </div>
              )
            })}
          </div>
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}

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
