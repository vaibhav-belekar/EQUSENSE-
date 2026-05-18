import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Building2, TrendingUp, AlertCircle, MoreVertical, Plus } from 'lucide-react'
import { getCompanyInfo } from '../services/api'
import { getCompanyMeta, getDisplaySymbol, getLocalLogoPath, getWebsiteLogoSources } from '../utils/logoMapper'

const companyFallbacks = {
  ADANIPORTS: {
    company_name: 'Adani Ports and Special Economic Zone Limited',
    sector: 'Infrastructure',
    industry: 'Ports & Logistics',
    market_cap: '₹3.1T',
    pe_ratio: '29.8',
    description: 'Adani Ports and Special Economic Zone Limited develops, operates, and maintains ports, logistics parks, and related infrastructure in India.',
    website: 'adaniports.com',
    financial_ratios: {
      market_cap: '3,10,000',
      pe: '29.80',
      pb: '4.35',
      roe: '14.60',
      eps: '45.30',
      dividend_yield: '0.45',
      face_value: '2.00',
      ebitda_growth: '12.20',
      debt_equity: '0.95',
    },
  },
  ADANIENT: {
    company_name: 'Adani Enterprises Limited',
    sector: 'Conglomerates',
    industry: 'Trading & Infrastructure',
    market_cap: '₹2.8T',
    pe_ratio: '75.0',
    description: 'Adani Enterprises Limited is the flagship company of the Adani Group with businesses across energy, infrastructure, mining, airports, and services.',
    website: 'adani.com',
  },
}

const sectorFallbacks = {
  RELIANCE: ['Conglomerates', 'Oil, Retail & Telecom'],
  TCS: ['IT Services', 'IT Services & Consulting'],
  INFY: ['IT Services', 'IT Services & Consulting'],
  WIPRO: ['IT Services', 'IT Services & Consulting'],
  HCLTECH: ['IT Services', 'IT Services & Consulting'],
  TECHM: ['IT Services', 'IT Services & Consulting'],
  HDFCBANK: ['Banking', 'Private Sector Banking'],
  ICICIBANK: ['Banking', 'Private Sector Banking'],
  AXISBANK: ['Banking', 'Private Sector Banking'],
  KOTAKBANK: ['Banking', 'Private Sector Banking'],
  SBIN: ['Banking', 'Public Sector Banking'],
  INDUSINDBK: ['Banking', 'Private Sector Banking'],
  HDFC: ['Financial Services', 'Housing Finance'],
  HDFCLIFE: ['Insurance', 'Life Insurance'],
  BAJFINANCE: ['Financial Services', 'NBFC'],
  BAJAJFINSV: ['Financial Services', 'Financial Holding Company'],
  HINDUNILVR: ['FMCG', 'Consumer Goods'],
  ITC: ['FMCG', 'Consumer Goods'],
  NESTLEIND: ['FMCG', 'Packaged Foods'],
  MARICO: ['FMCG', 'Consumer Goods'],
  DABUR: ['FMCG', 'Consumer Goods'],
  BRITANNIA: ['FMCG', 'Packaged Foods'],
  TATACONSUM: ['FMCG', 'Packaged Foods'],
  BHARTIARTL: ['Telecommunications', 'Telecom Services'],
  MARUTI: ['Automobiles', 'Passenger Vehicles'],
  'M&M': ['Automobiles', 'Auto Manufacturers'],
  TATAMOTORS: ['Automobiles', 'Auto Manufacturers'],
  'BAJAJ-AUTO': ['Automobiles', 'Two Wheelers'],
  HEROMOTOCO: ['Automobiles', 'Two Wheelers'],
  EICHERMOT: ['Automobiles', 'Two Wheelers'],
  SUNPHARMA: ['Pharmaceuticals', 'Drug Manufacturers'],
  DRREDDY: ['Pharmaceuticals', 'Drug Manufacturers'],
  CIPLA: ['Pharmaceuticals', 'Drug Manufacturers'],
  LUPIN: ['Pharmaceuticals', 'Drug Manufacturers'],
  DIVISLAB: ['Pharmaceuticals', 'Drug Manufacturers'],
  BIOCON: ['Pharmaceuticals', 'Biotechnology'],
  ONGC: ['Energy', 'Oil & Gas Exploration'],
  IOC: ['Energy', 'Oil Marketing'],
  BPCL: ['Energy', 'Oil Marketing'],
  HPCL: ['Energy', 'Oil Marketing'],
  GAIL: ['Energy', 'Gas Transmission'],
  ADANIENT: ['Conglomerates', 'Trading & Infrastructure'],
  ADANIPORTS: ['Infrastructure', 'Ports & Logistics'],
  LT: ['Infrastructure', 'Engineering & Construction'],
  BHEL: ['Capital Goods', 'Electrical Equipment'],
  SIEMENS: ['Capital Goods', 'Electrical Equipment'],
  ABB: ['Capital Goods', 'Electrical Equipment'],
  TATASTEEL: ['Metals & Mining', 'Steel'],
  JSWSTEEL: ['Metals & Mining', 'Steel'],
  HINDALCO: ['Metals & Mining', 'Aluminium'],
  VEDL: ['Metals & Mining', 'Diversified Metals'],
  NMDC: ['Metals & Mining', 'Iron Ore'],
  COALINDIA: ['Metals & Mining', 'Coal'],
  ULTRACEMCO: ['Cement', 'Cement & Building Materials'],
  SHREECEM: ['Cement', 'Cement & Building Materials'],
  ACC: ['Cement', 'Cement & Building Materials'],
  AMBUJACEM: ['Cement', 'Cement & Building Materials'],
  NTPC: ['Power', 'Power Generation'],
  POWERGRID: ['Power', 'Power Transmission'],
  TATAPOWER: ['Power', 'Integrated Power'],
  ADANIPOWER: ['Power', 'Power Generation'],
  ADANIGREEN: ['Power', 'Renewable Energy'],
  DLF: ['Real Estate', 'Real Estate Development'],
  GODREJPROP: ['Real Estate', 'Real Estate Development'],
  PRESTIGE: ['Real Estate', 'Real Estate Development'],
  DMART: ['Retail', 'Food & Grocery Retail'],
  ASIANPAINT: ['Paints', 'Paints & Coatings'],
  BERGEPAINT: ['Paints', 'Paints & Coatings'],
  PIDILITIND: ['Chemicals', 'Specialty Chemicals'],
  GRASIM: ['Conglomerates', 'Cement & Chemicals'],
  AAPL: ['Technology', 'Consumer Electronics'],
  TSLA: ['Automotive', 'Electric Vehicles'],
  MSFT: ['Technology', 'Software & Cloud Services'],
  GOOGL: ['Technology', 'Internet Services'],
  AMZN: ['E-commerce', 'Online Retail'],
  META: ['Technology', 'Social Media'],
  NVDA: ['Technology', 'Semiconductors'],
  NFLX: ['Communication Services', 'Streaming Entertainment'],
  AMD: ['Technology', 'Semiconductors'],
  INTC: ['Technology', 'Semiconductors'],
}

const buildCompanyFallback = (symbol, market = 'US') => {
  const normalizedSymbol = String(symbol || '').toUpperCase().replace(/\.(NS|BO)$/i, '')
  const meta = getCompanyMeta(normalizedSymbol)
  const [sector, industry] = sectorFallbacks[normalizedSymbol] || [
    market === 'IN' ? 'Equity' : 'Stock',
    market === 'IN' ? 'NSE Listed Company' : 'Listed Company',
  ]

  return {
    success: true,
    symbol: normalizedSymbol,
    fetch_symbol: normalizedSymbol,
    company_name: meta?.name || normalizedSymbol,
    sector,
    industry,
    market_cap: null,
    pe_ratio: null,
    financial_ratios: {},
    logo_url: null,
    description: meta?.name
      ? `${meta.name} is a listed company${market === 'IN' ? ' on the NSE' : ''}. Live fundamentals update when market data is available.`
      : null,
    website: meta?.website || null,
    market,
    is_fallback: true,
  }
}

const BritanniaLogo = () => (
  <svg
    viewBox="0 0 180 70"
    role="img"
    aria-label="Britannia logo"
    className="h-[58px] w-[104px]"
  >
    <path
      d="M12 18C50 8 130 8 168 18L172 49C124 43 80 47 40 52C29 53 19 53 8 52L12 18Z"
      fill="#ed1c24"
    />
    <path
      d="M8 51C58 49 91 50 112 67C123 60 142 51 172 50L172 57C142 56 123 63 112 70C92 55 57 53 8 58Z"
      fill="#ffd500"
    />
    <path
      d="M112 67C128 56 148 51 172 50L172 56C146 56 126 62 113 70C110 70 108 69 105 67C107 68 110 68 112 67Z"
      fill="#70bf44"
    />
    <text
      x="90"
      y="42"
      textAnchor="middle"
      fontFamily="Arial, Helvetica, sans-serif"
      fontSize="25"
      fontWeight="900"
      fill="#ffffff"
      letterSpacing="1"
    >
      BRITANNIA
    </text>
  </svg>
)

const TcsLogo = () => (
  <svg
    viewBox="0 0 260 92"
    role="img"
    aria-label="TCS logo"
    className="h-[58px] w-[160px]"
  >
    <defs>
      <linearGradient id="tcsTGradient" x1="20" y1="10" x2="38" y2="78" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#ffc400" />
        <stop offset="0.48" stopColor="#ff1744" />
        <stop offset="1" stopColor="#ec4899" />
      </linearGradient>
      <linearGradient id="tcsCGradient" x1="55" y1="72" x2="105" y2="24" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#ec4899" />
        <stop offset="0.5" stopColor="#ff3d00" />
        <stop offset="1" stopColor="#ff7a1a" />
      </linearGradient>
      <linearGradient id="tcsSGradient" x1="120" y1="75" x2="160" y2="20" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#7c00d9" />
        <stop offset="0.45" stopColor="#a100ff" />
        <stop offset="1" stopColor="#ff7a1a" />
      </linearGradient>
    </defs>
    <path
      d="M24 15v43c0 15 8 23 22 23c7 0 13-2 18-7"
      fill="none"
      stroke="url(#tcsTGradient)"
      strokeWidth="12"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M24 31h29"
      fill="none"
      stroke="#ff1744"
      strokeWidth="12"
      strokeLinecap="round"
    />
    <path
      d="M101 30c-8-6-24-8-36 0c-16 10-17 35-1 45c14 9 31 3 39-8"
      fill="none"
      stroke="url(#tcsCGradient)"
      strokeWidth="12"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M156 30c-7-5-22-7-29 1c-10 12 28 19 21 34c-5 12-25 11-35 2"
      fill="none"
      stroke="url(#tcsSGradient)"
      strokeWidth="12"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <text x="176" y="39" fontFamily="Arial, Helvetica, sans-serif" fontSize="23" fontWeight="900" fill="#0784c8">
      TATA
    </text>
    <text x="176" y="62" fontFamily="Arial, Helvetica, sans-serif" fontSize="19" fontWeight="900" fill="#0784c8">
      CONSULTANCY
    </text>
    <text x="176" y="84" fontFamily="Arial, Helvetica, sans-serif" fontSize="19" fontWeight="900" fill="#0784c8">
      SERVICES
    </text>
  </svg>
)

const SbiLogo = () => (
  <svg
    viewBox="0 0 220 82"
    role="img"
    aria-label="SBI logo"
    className="h-[58px] w-[150px]"
  >
    <circle cx="40" cy="40" r="30" fill="#16afe5" />
    <circle cx="40" cy="40" r="8" fill="#ffffff" />
    <path d="M36 48h8v25h-8z" fill="#ffffff" />
    <text
      x="82"
      y="61"
      fontFamily="Arial, Helvetica, sans-serif"
      fontSize="58"
      fontWeight="900"
      fill="#28247b"
    >
      SBI
    </text>
  </svg>
)

const WiproLogo = () => {
  const dots = [
    [134, 18, 7, '#00a886'], [153, 16, 8, '#2ca3bd'], [173, 22, 8, '#3c7fc6'], [193, 33, 9, '#204f91'],
    [113, 26, 7, '#34b36b'], [133, 35, 5, '#12a8a0'], [153, 35, 6, '#3493b7'], [173, 42, 7, '#3970aa'], [193, 55, 9, '#204076'],
    [96, 40, 7, '#6fbe4a'], [119, 50, 4, '#5fbd54'], [139, 49, 5, '#0ea590'], [158, 51, 5, '#2d7dac'], [178, 60, 8, '#275187'], [199, 75, 11, '#223c73'],
    [82, 58, 6, '#7fbf3f'], [107, 64, 4, '#72bb43'], [132, 64, 4, '#1a9e81'], [154, 67, 4, '#346f9d'], [176, 76, 7, '#294778'], [197, 95, 10, '#25366b'],
    [74, 78, 6, '#32135d'], [104, 84, 4, '#8bbd3c'], [130, 84, 3, '#07977c'], [155, 87, 4, '#386794'], [176, 101, 8, '#514374'], [195, 119, 10, '#5f5687'],
    [93, 108, 6, '#ffd51e'], [117, 106, 4, '#f9af20'], [139, 105, 4, '#f27a22'], [160, 108, 5, '#d94f51'], [179, 122, 8, '#a64a86'], [193, 143, 10, '#8d3f7f'],
    [103, 129, 8, '#ffbf1f'], [126, 128, 5, '#f59320'], [148, 127, 5, '#ef6b32'], [170, 129, 7, '#d94e58'], [188, 149, 9, '#bd2172'],
    [118, 150, 8, '#ff8f1f'], [142, 149, 6, '#f06f2e'], [165, 149, 8, '#dc5347'], [188, 169, 9, '#c21864'],
  ]

  return (
    <svg
      viewBox="0 0 220 178"
      role="img"
      aria-label="Wipro logo"
      className="h-[58px] w-[150px]"
    >
      <text x="8" y="95" fontFamily="Arial, Helvetica, sans-serif" fontSize="44" fontWeight="900" fill="#32135d">
        wipro
      </text>
      {dots.map(([cx, cy, r, fill]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill={fill} />
      ))}
    </svg>
  )
}

const TataMotorsLogo = () => (
  <svg
    viewBox="0 0 220 150"
    role="img"
    aria-label="Tata Motors logo"
    className="h-[58px] w-[150px]"
  >
    <ellipse cx="110" cy="54" rx="76" ry="48" fill="#176db4" />
    <path
      d="M36 42C77 31 143 31 184 42"
      fill="none"
      stroke="#ffffff"
      strokeWidth="8"
      strokeLinecap="round"
    />
    <path
      d="M104 32c-2 34-5 63-17 91M116 32c2 34 5 63 17 91M110 34v90"
      fill="none"
      stroke="#ffffff"
      strokeWidth="8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <text
      x="110"
      y="142"
      textAnchor="middle"
      fontFamily="Arial, Helvetica, sans-serif"
      fontSize="34"
      fontWeight="900"
      fill="#176db4"
      letterSpacing="1"
    >
      TATA MOTORS
    </text>
  </svg>
)

const AdaniLogo = () => (
  <svg
    viewBox="0 0 200 80"
    role="img"
    aria-label="Adani logo"
    className="h-[58px] w-[140px]"
  >
    <text x="10" y="56" fontFamily="Trebuchet MS, Arial, sans-serif" fontSize="52" fontWeight="bold" fill="#0088ce">a</text>
    <text x="42" y="56" fontFamily="Trebuchet MS, Arial, sans-serif" fontSize="52" fontWeight="bold" fill="#4a3e8e">d</text>
    <text x="76" y="56" fontFamily="Trebuchet MS, Arial, sans-serif" fontSize="52" fontWeight="bold" fill="#712e87">a</text>
    <text x="108" y="56" fontFamily="Trebuchet MS, Arial, sans-serif" fontSize="52" fontWeight="bold" fill="#9e1b76">n</text>
    <text x="140" y="56" fontFamily="Trebuchet MS, Arial, sans-serif" fontSize="52" fontWeight="bold" fill="#c31c4a">i</text>
  </svg>
)

const CompanyInfo = ({ symbol, market, expectedReturn, confidence, initialData = null, onAddToWatchlist }) => {
  const [companyData, setCompanyData] = useState(() => initialData || buildCompanyFallback(symbol, market))
  const [logoError, setLogoError] = useState(false)
  const [logoIndex, setLogoIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  useEffect(() => {
    setCompanyData(initialData || buildCompanyFallback(symbol, market))
    setLoading(false)
  }, [initialData, symbol])

  // Fetch company info when symbol changes
  useEffect(() => {
    if (!symbol) return
    if (initialData?.success && initialData?.symbol?.toUpperCase() === symbol?.toUpperCase()) {
      return
    }

    const fetchData = async () => {
      setLogoError(false)
      setLogoIndex(0)
      try {
        const data = await getCompanyInfo(symbol, market || 'US')
        if (data.success) {
          setCompanyData(data)
        }
      } catch (error) {
        console.error('Error fetching company info:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [symbol, market, initialData])

  // Generate logo with first letter as fallback
  const getInitials = (name) => {
    if (!name) return symbol?.[0] || '?'
    const words = name.split(' ')
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  const meta = getCompanyMeta(symbol)
  const normalizedSymbol = String(symbol || '').toUpperCase().replace(/\.(NS|BO)$/i, '')
  const fallbackData = companyFallbacks[normalizedSymbol] || buildCompanyFallback(symbol, market)
  const enrichedCompanyData = {
    ...fallbackData,
    ...companyData,
    company_name: companyData?.company_name && companyData.company_name !== symbol ? companyData.company_name : fallbackData.company_name,
    sector: companyData?.sector || fallbackData.sector,
    industry: companyData?.industry || fallbackData.industry,
    market_cap: companyData?.market_cap || fallbackData.market_cap,
    pe_ratio: companyData?.pe_ratio || fallbackData.pe_ratio,
    description: companyData?.description || fallbackData.description,
    website: companyData?.website || fallbackData.website,
    financial_ratios: {
      ...(fallbackData.financial_ratios || {}),
      ...(companyData?.financial_ratios || {}),
    },
  }
  const companyName = companyData?.company_name && companyData.company_name !== symbol
    ? companyData.company_name
    : meta?.name || normalizedSymbol || symbol
  const displaySymbol = getDisplaySymbol(symbol, market)
  const initials = getInitials(companyName)
  const isBritannia = normalizedSymbol === 'BRITANNIA'
  const isTcs = normalizedSymbol === 'TCS'
  const isSbi = normalizedSymbol === 'SBIN' || normalizedSymbol === 'SBI'
  const isWipro = normalizedSymbol === 'WIPRO'
  const isTataMotors = normalizedSymbol === 'TATAMOTORS'
  const isAdani = normalizedSymbol.startsWith('ADANI') || ['AWL', 'ATGL', 'AMBUJACEM', 'ACC', 'NDTV'].includes(normalizedSymbol)
  
  // Priority: 1. Local logo, 2. API logo URL, 3. Known company website logo, 4. Fallback initials
  const localLogoPath = getLocalLogoPath(symbol)
  const apiLogoUrl = enrichedCompanyData?.logo_url
  const websiteLogoSources = getWebsiteLogoSources(symbol, enrichedCompanyData?.website)
  const logoSources = [
    ...websiteLogoSources,
    apiLogoUrl,
    localLogoPath,
  ].filter(Boolean).filter((source, index, sources) => sources.indexOf(source) === index)
  const logoUrl = logoSources[logoIndex] || null
  
  useEffect(() => {
    setLogoError(false)
    setLogoIndex(0)
  }, [symbol, enrichedCompanyData?.logo_url, enrichedCompanyData?.website])

  // Color palette for logos - more varied colors
  const logoColors = [
    'bg-amber-600', 'bg-amber-700', 'bg-orange-600', 'bg-orange-700',
    'bg-blue-600', 'bg-blue-700', 'bg-indigo-600', 'bg-indigo-700',
    'bg-green-600', 'bg-green-700', 'bg-teal-600', 'bg-teal-700',
    'bg-purple-600', 'bg-purple-700', 'bg-pink-600', 'bg-pink-700',
    'bg-red-600', 'bg-red-700', 'bg-rose-600', 'bg-rose-700'
  ]
  // Use a hash function to get consistent colors for the same symbol
  const hash = symbol?.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) || 0
  const colorIndex = hash % logoColors.length
  const logoColor = logoColors[colorIndex]

  // Handle logo load error
  const handleLogoError = () => {
    setLogoIndex((currentIndex) => {
      const nextIndex = currentIndex + 1
      if (nextIndex < logoSources.length) {
        return nextIndex
      }
      setLogoError(true)
      return currentIndex
    })
  }

  // Truncate description to 2 lines (approximately 150 characters)
  const truncateDescription = (text, maxLength = 150) => {
    if (!text) return null
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength).trim() + '...'
  }

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-md p-6 border border-gray-200"
      >
        <div className="animate-pulse">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-3">
              <div className="h-6 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-md p-6 border border-gray-200"
    >
      <div className="flex items-start gap-4">
        {/* Company Logo */}
        <div className="relative flex-shrink-0">
          {logoUrl && !logoError ? (
            <img
              src={logoUrl}
              alt={`${companyName} logo`}
              className="h-16 w-28 rounded-lg object-contain border border-gray-200 bg-white p-2 shadow-lg"
              onError={handleLogoError}
              onLoad={() => setLogoError(false)}
            />
          ) : (
            <div className={`${logoColor} w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg`}>
              {initials}
            </div>
          )}
        </div>

        {/* Company Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-3 gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-gray-900 mb-1">{companyName}</h2>
              <p className="text-sm text-gray-600 mb-2 font-semibold tracking-wide">{displaySymbol}</p>
              {loading && (!enrichedCompanyData || (!enrichedCompanyData.company_name || enrichedCompanyData.company_name === symbol)) && (
                <p className="text-sm text-gray-500 mb-2 italic">Loading company information...</p>
              )}
              {!loading && enrichedCompanyData && (!enrichedCompanyData.sector && !enrichedCompanyData.industry) && (
                <p className="text-sm text-gray-500 mb-2 italic">Company data being fetched...</p>
              )}
              <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                {enrichedCompanyData?.sector && (
                  <span className="flex items-center gap-1">
                    <Building2 className="w-4 h-4" />
                    {enrichedCompanyData.sector}
                  </span>
                )}
                {enrichedCompanyData?.industry && enrichedCompanyData.industry !== enrichedCompanyData?.sector && (
                  <span>{enrichedCompanyData.industry}</span>
                )}
                {enrichedCompanyData?.pe_ratio && (
                  <span>P/E Ratio {enrichedCompanyData.pe_ratio}</span>
                )}
              </div>
              
              {/* Company Description */}
              {enrichedCompanyData?.description && (
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                  {truncateDescription(enrichedCompanyData.description)}
                </p>
              )}
            </div>

            {/* Expected Return Box and Actions */}
            <div className="text-right flex-shrink-0 flex items-start gap-2">
              {expectedReturn !== undefined && (
                <div className="bg-blue-50 border-2 border-blue-500 rounded-lg px-4 py-2">
                  <div className="flex items-center gap-1 text-blue-700 font-bold">
                    <TrendingUp className="w-4 h-4" />
                    Expected {expectedReturn > 0 ? '+' : ''}{expectedReturn.toFixed(1)}%
                  </div>
                  {confidence && (
                    <p className="text-xs text-gray-600 mt-1">
                      ({confidence})
                    </p>
                  )}
                </div>
              )}

              {/* Action Menu (Three Lines/Dots) */}
              {onAddToWatchlist && (
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 border border-transparent hover:border-gray-200"
                    title="More actions"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  {showMenu && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl py-1 border border-gray-200 z-50">
                      <button
                        onClick={() => {
                          onAddToWatchlist(symbol)
                          setShowMenu(false)
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 font-medium"
                      >
                        <Plus className="w-4 h-4" />
                        Add to Watchlist
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Market Cap and P/E Ratio */}
          {(enrichedCompanyData?.market_cap || enrichedCompanyData?.pe_ratio) && (
            <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-200">
              {enrichedCompanyData?.market_cap && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Market Cap</p>
                  <p className="text-sm font-semibold text-gray-900">{enrichedCompanyData.market_cap}</p>
                </div>
              )}
              {enrichedCompanyData?.pe_ratio && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">P/E Ratio</p>
                  <p className="text-sm font-semibold text-gray-900">{enrichedCompanyData.pe_ratio}</p>
                </div>
              )}
              {enrichedCompanyData?.website && (
                <div className="ml-auto">
                  <a
                    href={`https://${enrichedCompanyData.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    Visit Website
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Data Unavailable Notice */}
          {(!enrichedCompanyData || ((!enrichedCompanyData.company_name || enrichedCompanyData.company_name === symbol) && !enrichedCompanyData.sector)) && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 text-xs text-yellow-600 bg-yellow-50 px-3 py-2 rounded">
                <AlertCircle className="w-4 h-4" />
                <span>Limited company data available. Additional details will appear after analysis.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default CompanyInfo
