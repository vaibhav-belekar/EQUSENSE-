import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Info } from 'lucide-react'
import { getCompanyInfo } from '../services/api'

const RATIO_ROWS = [
  [
    { key: 'market_cap', label: 'Market Cap' },
    { key: 'pe', label: 'PE' },
  ],
  [
    { key: 'pb', label: 'P/B' },
    { key: 'roe', label: 'ROE' },
  ],
  [
    { key: 'eps', label: 'EPS' },
    { key: 'dividend_yield', label: 'Dividend Yield' },
  ],
  [
    { key: 'face_value', label: 'Face Value' },
    { key: 'ebitda_growth', label: 'Ebitda Growth' },
  ],
  [
    { key: 'debt_equity', label: 'Debt/Equity' },
    null,
  ],
]

const EMPTY_RATIOS = {
  market_cap: null,
  pe: null,
  pb: null,
  roe: null,
  eps: null,
  dividend_yield: null,
  face_value: null,
  ebitda_growth: null,
  debt_equity: null,
}

const FinancialRatios = ({ symbol, market = 'IN', initialData = null }) => {
  const [companyData, setCompanyData] = useState(initialData)
  const [loading, setLoading] = useState(!initialData)

  const hasRatioValues = (data) => {
    const ratios = data?.financial_ratios || {}
    return Object.values(ratios).some((value) => value !== null && value !== undefined && value !== '')
  }

  useEffect(() => {
    setCompanyData(initialData)
    setLoading(!initialData)
  }, [initialData, symbol])

  useEffect(() => {
    if (!symbol || hasRatioValues(initialData)) return

    const fetchRatios = async () => {
      setLoading(true)
      try {
        const data = await getCompanyInfo(symbol, market)
        if (data?.success) {
          setCompanyData(data)
        }
      } catch (error) {
        console.error('[FinancialRatios] Error fetching ratios:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRatios()
  }, [symbol, market, initialData])

  const ratios = {
    ...EMPTY_RATIOS,
    market_cap: companyData?.market_cap,
    pe: companyData?.pe_ratio,
    ...(companyData?.financial_ratios || {}),
  }

  const displaySymbol = String(symbol || companyData?.symbol || 'STOCK')
    .replace(/\.(NS|BO)$/i, '')
    .toUpperCase()

  const renderValue = (value) => {
    if (value === null || value === undefined || value === '') {
      return loading ? '...' : '-'
    }
    return value
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
    >
      <div className="relative flex items-center gap-2 px-4 py-3">
        <div className="absolute left-0 top-2 h-9 w-1 rounded-r bg-blue-600" />
        <h3 className="text-lg font-bold text-gray-950 sm:text-xl">{displaySymbol} Key Financial Ratios</h3>
        <span
          className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-white"
          title="Key ratios are fetched from live market fundamentals when available."
        >
          <Info className="h-3 w-3" />
        </span>
      </div>

      <div className="divide-y divide-white">
        {RATIO_ROWS.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className={`grid grid-cols-1 md:grid-cols-2 ${rowIndex % 2 === 0 ? 'bg-gray-100' : 'bg-white'}`}
          >
            {row.map((item, colIndex) => (
              <div
                key={item?.key || `empty-${rowIndex}-${colIndex}`}
                className={`grid min-h-[42px] grid-cols-[minmax(96px,1fr)_auto] items-center gap-3 px-4 ${
                  !item ? 'hidden md:block' : ''
                }`}
              >
                {item && (
                  <>
                    <span className="text-sm font-medium text-gray-600 sm:text-base">{item.label}</span>
                    <span className="text-right text-base font-semibold tabular-nums text-black sm:text-lg">
                      {renderValue(ratios[item.key])}
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </motion.section>
  )
}

export default FinancialRatios
