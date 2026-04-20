import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Building2, TrendingUp, AlertCircle } from 'lucide-react'
import { getCompanyInfo } from '../services/api'
import { getLocalLogoPath, hasLocalLogo } from '../utils/logoMapper'

const CompanyInfo = ({ symbol, market, expectedReturn, confidence }) => {
  const [companyData, setCompanyData] = useState(null)
  const [logoError, setLogoError] = useState(false)
  const [loading, setLoading] = useState(true)

  // Fetch company info when symbol changes
  useEffect(() => {
    if (!symbol) return

    const fetchData = async () => {
      setLoading(true)
      setLogoError(false)
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
  }, [symbol, market])

  // Generate logo with first letter as fallback
  const getInitials = (name) => {
    if (!name) return symbol?.[0] || '?'
    const words = name.split(' ')
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  const companyName = companyData?.company_name || symbol
  const initials = getInitials(companyName)
  
  // Priority: 1. Local logo, 2. API logo URL, 3. Fallback to initials
  const localLogoPath = getLocalLogoPath(symbol)
  const apiLogoUrl = companyData?.logo_url
  
  // Use local logo if available, otherwise use API logo URL
  // Store apiLogoUrl separately for fallback in error handler
  const [logoUrl, setLogoUrl] = useState(localLogoPath || apiLogoUrl)
  
  // Update logo URL when companyData changes
  useEffect(() => {
    const newLocalLogo = getLocalLogoPath(symbol)
    const newApiLogo = companyData?.logo_url
    setLogoUrl(newLocalLogo || newApiLogo)
  }, [symbol, companyData?.logo_url])

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
    setLogoError(true)
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
              className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 shadow-lg"
              onError={(e) => {
                // If local logo fails, try API logo as fallback
                if (logoUrl.startsWith('/logos/') && apiLogoUrl && e.target.src !== apiLogoUrl) {
                  e.target.src = apiLogoUrl
                } else {
                  handleLogoError()
                }
              }}
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
              <h2 className="text-2xl font-bold text-gray-900 mb-1">{symbol}</h2>
              {companyData?.company_name && companyData.company_name !== symbol && (
                <p className="text-sm text-gray-600 mb-2 font-medium">{companyData.company_name}</p>
              )}
              {loading && (!companyData || (!companyData.company_name || companyData.company_name === symbol)) && (
                <p className="text-sm text-gray-500 mb-2 italic">Loading company information...</p>
              )}
              {!loading && companyData && (!companyData.sector && !companyData.industry) && (
                <p className="text-sm text-gray-500 mb-2 italic">Company data being fetched...</p>
              )}
              <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                {companyData?.sector && (
                  <span className="flex items-center gap-1">
                    <Building2 className="w-4 h-4" />
                    {companyData.sector}
                  </span>
                )}
                {companyData?.industry && companyData.industry !== companyData?.sector && (
                  <span>{companyData.industry}</span>
                )}
                {companyData?.pe_ratio && (
                  <span>P/E Ratio {companyData.pe_ratio}</span>
                )}
              </div>
              
              {/* Company Description */}
              {companyData?.description && (
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                  {truncateDescription(companyData.description)}
                </p>
              )}
            </div>

            {/* Expected Return Box */}
            {expectedReturn !== undefined && (
              <div className="text-right flex-shrink-0">
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
              </div>
            )}
          </div>

          {/* Market Cap and P/E Ratio */}
          {(companyData?.market_cap || companyData?.pe_ratio) && (
            <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-200">
              {companyData?.market_cap && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Market Cap</p>
                  <p className="text-sm font-semibold text-gray-900">{companyData.market_cap}</p>
                </div>
              )}
              {companyData?.pe_ratio && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">P/E Ratio</p>
                  <p className="text-sm font-semibold text-gray-900">{companyData.pe_ratio}</p>
                </div>
              )}
              {companyData?.website && (
                <div className="ml-auto">
                  <a
                    href={`https://${companyData.website}`}
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
          {(!companyData || ((!companyData.company_name || companyData.company_name === symbol) && !companyData.sector)) && (
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

