import React from 'react'
import { motion } from 'framer-motion'

const parseDate = (value) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const formatDate = (value) => {
  const date = parseDate(value)
  if (!date) return ''
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

const formatPrice = (value) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return '-'
  return numeric.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const getTileTone = (changePercent) => {
  if (!Number.isFinite(changePercent)) return 'bg-gray-100 text-gray-500'

  if (changePercent >= 2.2) return 'bg-emerald-600 text-black'
  if (changePercent >= 1) return 'bg-emerald-300 text-black'
  if (changePercent >= 0) return 'bg-emerald-100 text-black'
  if (changePercent <= -2.2) return 'bg-red-500 text-black'
  if (changePercent <= -1) return 'bg-red-300 text-black'
  return 'bg-red-100 text-black'
}

const RecentPerformanceStrip = ({ priceData = [], maxItems = 15 }) => {
  const dailyItems = React.useMemo(() => {
    const byDay = new Map()

    priceData.forEach((item) => {
      const date = parseDate(item.date || item.time)
      const close = Number(item.close ?? item.price ?? item.value)
      if (!date || !Number.isFinite(close)) return

      const dayKey = date.toISOString().slice(0, 10)
      byDay.set(dayKey, {
        date: item.date || item.time,
        close,
        previousClose: Number(item.open ?? item.previousClose ?? item.prev_close),
      })
    })

    const sorted = Array.from(byDay.values()).sort((a, b) => parseDate(b.date) - parseDate(a.date))

    return sorted.slice(0, maxItems).map((item, index, array) => {
      const nextOlder = array[index + 1]
      const reference = Number.isFinite(item.previousClose) && item.previousClose > 0
        ? item.previousClose
        : nextOlder?.close
      const changePercent = reference > 0 ? ((item.close - reference) / reference) * 100 : 0

      return {
        ...item,
        changePercent,
      }
    })
  }, [priceData, maxItems])

  if (dailyItems.length === 0) return null

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-x-auto rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
    >
      <div className="flex min-w-max gap-1.5">
        {dailyItems.map((item) => (
          <div
            key={`${item.date}-${item.close}`}
            className={`flex h-[112px] w-[118px] shrink-0 flex-col items-center justify-center px-2 text-center ${getTileTone(item.changePercent)}`}
          >
            <div className="text-lg font-extrabold leading-tight">{formatDate(item.date)}</div>
            <div className="mt-2 text-lg font-medium leading-tight">{formatPrice(item.close)}</div>
            <div className="mt-2 text-lg font-medium leading-tight">
              ({item.changePercent >= 0 ? '' : '-'}{Math.abs(item.changePercent).toFixed(2)}%)
            </div>
          </div>
        ))}
      </div>
    </motion.section>
  )
}

export default RecentPerformanceStrip
