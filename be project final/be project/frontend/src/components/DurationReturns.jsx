import React, { useEffect, useState } from 'react'
import { getOHLCData } from '../services/api'

const DURATIONS = [
  { label: '1 Month', days: 30 },
  { label: '3 Months', days: 90 },
  { label: '6 Months', days: 180 },
  { label: '1 Year', days: 365 },
  { label: '3 Years', days: 365 * 3 },
  { label: '5 Years', days: 365 * 5 },
]

const getClosestOlderPrice = (rows, targetTime) => {
  let best = null
  for (const row of rows) {
    const rowTime = new Date(row.date).getTime()
    if (Number.isFinite(rowTime) && rowTime <= targetTime) {
      best = row
    }
  }
  return best
}

const DurationReturns = ({ symbol, market = 'IN' }) => {
  const [returns, setReturns] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!symbol) return

    let cancelled = false

    const fetchReturns = async () => {
      setLoading(true)
      try {
        const result = await getOHLCData(symbol, '5y', '1d', market)
        if (cancelled) return

        const rows = (result?.data || [])
          .filter((row) => Number(row.close) > 0 && row.date)
          .sort((a, b) => new Date(a.date) - new Date(b.date))

        if (rows.length < 2) {
          setReturns([])
          return
        }

        const latest = rows[rows.length - 1]
        const latestPrice = Number(latest.close)
        const latestTime = new Date(latest.date).getTime()

        const computed = DURATIONS.map((duration) => {
          const targetTime = latestTime - duration.days * 24 * 60 * 60 * 1000
          const reference = getClosestOlderPrice(rows, targetTime) || rows[0]
          const referencePrice = Number(reference.close)
          const value = referencePrice > 0 ? ((latestPrice - referencePrice) / referencePrice) * 100 : null

          return {
            ...duration,
            value,
          }
        })

        setReturns(computed)
      } catch (error) {
        console.error('[DurationReturns] Failed to fetch returns:', error)
        if (!cancelled) setReturns([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchReturns()

    return () => {
      cancelled = true
    }
  }, [symbol, market])

  const formatReturn = (value) => {
    if (value === null || value === undefined || !Number.isFinite(value)) return '-'
    return `${value.toFixed(2)}%`
  }

  return (
    <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="grid grid-cols-2 border-b border-gray-100 bg-white px-4 py-3">
        <h3 className="text-base font-bold text-black">Duration</h3>
        <h3 className="text-right text-base font-bold text-black">Returns</h3>
      </div>

      <div>
        {(loading && returns.length === 0 ? DURATIONS.map((item) => ({ ...item, value: null })) : returns).map((item, index) => {
          const isPositive = Number(item.value) >= 0
          const hasValue = Number.isFinite(Number(item.value))

          return (
            <div
              key={item.label}
              className={`grid grid-cols-2 px-4 py-3 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
            >
              <span className="text-sm font-medium text-black">{item.label}</span>
              <span
                className={`text-right text-sm font-semibold ${
                  !hasValue ? 'text-gray-400' : isPositive ? 'text-emerald-700' : 'text-red-600'
                }`}
              >
                {loading && !hasValue ? '...' : formatReturn(item.value)}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default DurationReturns
