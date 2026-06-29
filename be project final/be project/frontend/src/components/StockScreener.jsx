import React, { useState, useEffect, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import { 
  Home,
  TrendingUp, 
  TrendingDown, 
  BarChart3,
  Brain,
  Search,
  Clock,
  X,
  MoreVertical,
  Info,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Users,
  Mail,
  Menu,
  ExternalLink,
  Zap,
  Coins,
  Database,
  Calendar,
  FileText,
  ShieldCheck,
  Flag,
  Globe2,
  Briefcase,
  PieChart,
  Cpu,
  Lightbulb,
  ArrowUpDown
} from 'lucide-react'
import toast from 'react-hot-toast'
import { 
  getPredictions, 
  analyzeStockInvestment,
  getHistoricalAnalysis,
  getStocksByMarket,
  getRealtimePrice,
  getStatus,
  getCompanyInfo,
  getOHLCData,
  getRecommendation,
  getNewsSentiment,
  getPortfolio,
  addWatchlistItem,
  BACKEND_DISPLAY_URL,
  IS_PRODUCTION
} from '../services/api'
import StockAnalysisReport from './StockAnalysisReport'
import HistoricalAnalysis from './HistoricalAnalysis'
import CandlestickChart from './CandlestickChart'
import RecommendationCard from './RecommendationCard'
import CompanyInfo from './CompanyInfo'
import StockPriceChart from './StockPriceChart'
import NewsSentiment from './NewsSentiment'
import StockReturnCalculator from './StockReturnCalculator'
import ComparisonTable from './ComparisonTable'
import AIChat from './AIChat'
import TradingCall from './TradingCall'
import StockComparison from './StockComparison'
// Removed FinancialRatios import
import RecentPerformanceStrip from './RecentPerformanceStrip'
import DurationReturns from './DurationReturns'
import ShareholdingPattern from './ShareholdingPattern'
import { getCompanyMeta, getWebsiteLogoSources } from '../utils/logoMapper'

const buildDecisionFromModel = (signal, expectedReturn, risk, confidence = 0.5, score = null, hasPosition = false) => {
  const normalizedSignal = String(signal || 'Neutral').trim()
  const computedScore = Number(score ?? (expectedReturn / Math.max(risk, 0.5)))
  const bullishSetup = normalizedSignal === 'Up'
  const bearishSetup = normalizedSignal === 'Down'

  if (bullishSetup) {
    return {
      recommendation: 'BUY',
      color: 'green',
      action: 'Buy',
      reason: `ML trend model is bullish with ${Math.round(confidence * 100)}% confidence, so up-trending stocks are treated as BUY instead of HOLD.`
    }
  }

  if (bearishSetup) {
    const alternateAction = 'Avoid fresh entry; if already holding, consider SELL/EXIT.'

    return {
      recommendation: hasPosition ? 'SELL' : 'AVOID',
      color: 'red',
      action: hasPosition ? 'Sell' : 'Avoid',
      reason: hasPosition
        ? `ML trend model is bearish with ${Math.round(confidence * 100)}% confidence. ${alternateAction}`
        : `ML trend model is bearish with ${Math.round(confidence * 100)}% confidence. ${alternateAction}`,
      alternateAction
    }
  }

  return {
    recommendation: 'HOLD',
    color: 'yellow',
    action: 'Hold',
    reason: `ML trend model is neutral or not strong enough yet: score ${computedScore.toFixed(2)}, expected return ${expectedReturn.toFixed(2)}%, risk ${risk.toFixed(1)}/10.`
  }
}

const MARKET_INDEX_FALLBACKS = [
  { name: 'SENSEX', symbol: '^BSESN', price: 77017.79, changePercent: -0.33, sourceUrl: 'https://dhan.co/indices/bse-sensex-chart/' },
  { name: 'NIFTY 50', symbol: '^NSEI', price: 24032.80, changePercent: -0.36, sourceUrl: 'https://dhan.co/indices/nifty-50-chart/' },
  { name: 'NIFTY BANK', symbol: '^NSEBANK', price: 54547.05, changePercent: -0.60, sourceUrl: 'https://dhan.co/indices/nifty-bank-chart/' },
]

const MARKET_MENU_SECTIONS = [
  {
    items: [
      { label: 'FII DII Data', icon: Database, color: 'text-gray-500' },
      { label: 'Stockfact', icon: Info, color: 'text-cyan-500', badge: true },
      { label: 'Gift Nifty', custom: 'gift', color: 'text-orange-500' },
      { label: 'Share Price', icon: BarChart3, color: 'text-emerald-600' },
      { label: 'Weekly Outlook', icon: Calendar, color: 'text-cyan-500' },
      { label: 'Stock Advisory', icon: BarChart3, color: 'text-emerald-600' },
      { label: 'SGX Nifty', custom: 'sgx', color: 'text-indigo-700' },
      { label: 'IPO', icon: FileText, color: 'text-blue-600' },
      { label: 'Unicorn Signals', icon: ShieldCheck, color: 'text-gray-950', darkIcon: true },
    ],
  },
  {
    title: 'Screener',
    icon: Search,
    titleColor: 'text-emerald-600',
    items: [
      { label: 'Top Gainers', icon: TrendingUp, color: 'text-emerald-600' },
      { label: 'Top Losers', icon: TrendingDown, color: 'text-red-500' },
      { label: '52W High', icon: BarChart3, color: 'text-blue-600' },
      { label: '52W Low', icon: BarChart3, color: 'text-gray-500' },
      { label: 'Most Active', icon: Zap, color: 'text-amber-500' },
      { label: 'Penny Stocks', icon: Coins, color: 'text-cyan-500' },
    ],
  },
  {
    title: 'News',
    icon: FileText,
    titleColor: 'text-cyan-500',
    items: [
      { label: 'India', icon: Flag, color: 'text-red-500' },
      { label: 'World', icon: Globe2, color: 'text-emerald-600' },
      { label: 'Business', icon: Briefcase, color: 'text-amber-500' },
      { label: 'Economy', icon: PieChart, color: 'text-blue-600' },
      { label: 'Technology', icon: Cpu, color: 'text-gray-500' },
      { label: 'Startups', icon: Lightbulb, color: 'text-cyan-500' },
    ],
  },
]

const SCREENER_TABS = ['Top Gainers', 'Top Losers', '52W High', '52W Low', 'Most Active', 'Penny Stocks']
const SCREENER_EXCHANGES = ['NSE', 'BSE']
const SCREENER_PERIODS = ['Today', 'Week', 'Month', 'Year']
const SCREENER_PERIOD_MULTIPLIERS = {
  Today: 1,
  Week: 2.4,
  Month: 5.8,
  Year: 18.5,
}

const SCREENER_STOCKS = {
  'Top Gainers': [
    { symbol: 'M&M', name: 'Mahindra & Mahindra Ltd', cmp: 3210.8, change: 104.3, changePct: 3.36, high52: 3839.9, low52: 2896, volume: '42.4L' },
    { symbol: 'ULTRACEMCO', name: 'UltraTech Cement Ltd', cmp: 11963, change: 205, changePct: 1.74, high52: 13110, low52: 10325, volume: '3.1L' },
    { symbol: 'NESTLEIND', name: 'Nestle India Ltd', cmp: 1477.8, change: 20.7, changePct: 1.42, high52: 1480.4, low52: 1084.7, volume: '8.7L' },
    { symbol: 'BAJAJFINSV', name: 'Bajaj Finserv Ltd', cmp: 1794.6, change: 24.2, changePct: 1.37, high52: 2195, low52: 1597, volume: '12.2L' },
    { symbol: 'HINDALCO', name: 'Hindalco Industries Ltd', cmp: 1054.7, change: 12, changePct: 1.15, high52: 1080, low52: 603.75, volume: '96.8L' },
    { symbol: 'HDFCLIFE', name: 'HDFC Life Insurance Company Ltd', cmp: 594.1, change: 5.75, changePct: 0.98, high52: 820.75, low52: 555.1, volume: '45.5L' },
    { symbol: 'BAJFINANCE', name: 'Bajaj Finance Ltd', cmp: 958.6, change: 8.4, changePct: 0.88, high52: 1102.5, low52: 787.9, volume: '59.2L' },
    { symbol: 'INFY', name: 'Infosys Ltd', cmp: 1178.1, change: 9.7, changePct: 0.83, high52: 1728, low52: 1149.8, volume: '84.1L' },
    { symbol: 'HINDUNILVR', name: 'Hindustan Unilever Ltd', cmp: 2327.4, change: 18.1, changePct: 0.78, high52: 2705.09, low52: 2022.5, volume: '16.9L' },
    { symbol: 'GRASIM', name: 'Grasim Industries Ltd', cmp: 2871.5, change: 15.5, changePct: 0.54, high52: 2979, low52: 2502.5, volume: '7.8L' },
  ],
  'Top Losers': [
    { symbol: 'TATASTEEL', name: 'Tata Steel Ltd', cmp: 147.2, change: -4.85, changePct: -3.19, high52: 184.6, low52: 122.62, volume: '2.8Cr' },
    { symbol: 'JSWSTEEL', name: 'JSW Steel Ltd', cmp: 1028.4, change: -25.3, changePct: -2.4, high52: 1075, low52: 761.75, volume: '58.3L' },
    { symbol: 'ADANIENT', name: 'Adani Enterprises Ltd', cmp: 2320.8, change: -52.9, changePct: -2.23, high52: 3743, low52: 2025, volume: '31.6L' },
    { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd', cmp: 663.9, change: -13.7, changePct: -2.02, high52: 1179, low52: 606.3, volume: '1.6Cr' },
    { symbol: 'WIPRO', name: 'Wipro Ltd', cmp: 242.6, change: -4.45, changePct: -1.8, high52: 324.55, low52: 208.5, volume: '92.4L' },
    { symbol: 'SBIN', name: 'State Bank of India', cmp: 789.5, change: -13.95, changePct: -1.74, high52: 912, low52: 680, volume: '1.2Cr' },
    { symbol: 'AXISBANK', name: 'Axis Bank Ltd', cmp: 1064.2, change: -17.6, changePct: -1.63, high52: 1339.65, low52: 934.65, volume: '72.8L' },
    { symbol: 'TITAN', name: 'Titan Company Ltd', cmp: 3312.1, change: -45.2, changePct: -1.35, high52: 3886.95, low52: 3055.65, volume: '11.5L' },
  ],
  '52W High': [
    { symbol: 'NESTLEIND', name: 'Nestle India Ltd', cmp: 1477.8, change: 20.7, changePct: 1.42, high52: 1480.4, low52: 1084.7, volume: '8.7L' },
    { symbol: 'HINDALCO', name: 'Hindalco Industries Ltd', cmp: 1054.7, change: 12, changePct: 1.15, high52: 1080, low52: 603.75, volume: '96.8L' },
    { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd', cmp: 1432.6, change: 11.8, changePct: 0.83, high52: 1460, low52: 1048.2, volume: '1.1Cr' },
    { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd', cmp: 1868.4, change: 14.5, changePct: 0.78, high52: 1918.9, low52: 1280, volume: '42.7L' },
    { symbol: 'POWERGRID', name: 'Power Grid Corporation of India Ltd', cmp: 312.8, change: 2.15, changePct: 0.69, high52: 319.5, low52: 226.25, volume: '93.2L' },
    { symbol: 'NTPC', name: 'NTPC Ltd', cmp: 361.25, change: 2.2, changePct: 0.61, high52: 374.5, low52: 286.7, volume: '1.4Cr' },
  ],
  '52W Low': [
    { symbol: 'INFY', name: 'Infosys Ltd', cmp: 1178.1, change: 9.7, changePct: 0.83, high52: 1728, low52: 1149.8, volume: '84.1L' },
    { symbol: 'HDFCLIFE', name: 'HDFC Life Insurance Company Ltd', cmp: 594.1, change: 5.75, changePct: 0.98, high52: 820.75, low52: 555.1, volume: '45.5L' },
    { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd', cmp: 663.9, change: -13.7, changePct: -2.02, high52: 1179, low52: 606.3, volume: '1.6Cr' },
    { symbol: 'WIPRO', name: 'Wipro Ltd', cmp: 242.6, change: -4.45, changePct: -1.8, high52: 324.55, low52: 208.5, volume: '92.4L' },
    { symbol: 'ASIANPAINT', name: 'Asian Paints Ltd', cmp: 2240.75, change: -11.2, changePct: -0.5, high52: 3422, low52: 2201.1, volume: '13.1L' },
    { symbol: 'DMART', name: 'Avenue Supermarts Ltd', cmp: 3722.8, change: -18.6, changePct: -0.5, high52: 5484, low52: 3540.05, volume: '4.9L' },
  ],
  'Most Active': [
    { symbol: 'RELIANCE', name: 'Reliance Industries Ltd', cmp: 1428.5, change: 6.8, changePct: 0.48, high52: 1608.8, low52: 1115.55, volume: '2.9Cr' },
    { symbol: 'TATASTEEL', name: 'Tata Steel Ltd', cmp: 147.2, change: -4.85, changePct: -3.19, high52: 184.6, low52: 122.62, volume: '2.8Cr' },
    { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd', cmp: 663.9, change: -13.7, changePct: -2.02, high52: 1179, low52: 606.3, volume: '1.6Cr' },
    { symbol: 'NTPC', name: 'NTPC Ltd', cmp: 361.25, change: 2.2, changePct: 0.61, high52: 374.5, low52: 286.7, volume: '1.4Cr' },
    { symbol: 'SBIN', name: 'State Bank of India', cmp: 789.5, change: -13.95, changePct: -1.74, high52: 912, low52: 680, volume: '1.2Cr' },
    { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd', cmp: 1432.6, change: 11.8, changePct: 0.83, high52: 1460, low52: 1048.2, volume: '1.1Cr' },
    { symbol: 'HINDALCO', name: 'Hindalco Industries Ltd', cmp: 1054.7, change: 12, changePct: 1.15, high52: 1080, low52: 603.75, volume: '96.8L' },
    { symbol: 'WIPRO', name: 'Wipro Ltd', cmp: 242.6, change: -4.45, changePct: -1.8, high52: 324.55, low52: 208.5, volume: '92.4L' },
  ],
  'Penny Stocks': [
    { symbol: 'YESBANK', name: 'Yes Bank Ltd', cmp: 19.86, change: 0.34, changePct: 1.74, high52: 32.81, low52: 16.02, volume: '14.8Cr' },
    { symbol: 'SUZLON', name: 'Suzlon Energy Ltd', cmp: 58.42, change: 1.12, changePct: 1.95, high52: 86.04, low52: 35.5, volume: '8.6Cr' },
    { symbol: 'IDEA', name: 'Vodafone Idea Ltd', cmp: 8.91, change: -0.08, changePct: -0.89, high52: 19.18, low52: 6.61, volume: '19.4Cr' },
    { symbol: 'NHPC', name: 'NHPC Ltd', cmp: 82.75, change: 0.95, changePct: 1.16, high52: 118.45, low52: 71.2, volume: '3.7Cr' },
    { symbol: 'IDFCFIRSTB', name: 'IDFC First Bank Ltd', cmp: 62.18, change: 0.42, changePct: 0.68, high52: 92.35, low52: 52.46, volume: '5.1Cr' },
    { symbol: 'IRFC', name: 'Indian Railway Finance Corp Ltd', cmp: 124.6, change: 2.35, changePct: 1.92, high52: 229, low52: 116.65, volume: '4.2Cr' },
    { symbol: 'UCOBANK', name: 'UCO Bank', cmp: 36.9, change: -0.25, changePct: -0.67, high52: 70.66, low52: 33.1, volume: '2.4Cr' },
    { symbol: 'CENTRALBK', name: 'Central Bank of India', cmp: 38.72, change: 0.51, changePct: 1.33, high52: 76.9, low52: 32.85, volume: '1.9Cr' },
    { symbol: 'SOUTHBANK', name: 'The South Indian Bank Ltd', cmp: 25.36, change: 0.19, changePct: 0.75, high52: 36.88, low52: 22.27, volume: '1.6Cr' },
    { symbol: 'JPPOWER', name: 'Jaiprakash Power Ventures Ltd', cmp: 17.82, change: 0.26, changePct: 1.48, high52: 24, low52: 12.11, volume: '3.2Cr' },
  ],
}

const NEWS_CATEGORIES = ['India', 'World', 'Business', 'Economy', 'Technology', 'Startups']

const NEWS_ITEMS = {
  India: [
    { title: 'Indian markets track earnings momentum as large-cap banks stay in focus', source: 'Times of India', url: 'https://timesofindia.indiatimes.com/business/india-business', time: 'Today', summary: 'Investors are watching credit growth, margins, and management commentary as financial stocks guide broader index sentiment.' },
    { title: 'Infrastructure and railway-linked shares see renewed retail interest', source: 'ABP Live', url: 'https://news.abplive.com/business', time: 'Today', summary: 'Order pipelines, budget spending, and execution updates are keeping public-sector infrastructure themes active.' },
    { title: 'Rupee movement and crude prices remain key variables for domestic equities', source: 'Economic Times', url: 'https://economictimes.indiatimes.com/markets', time: 'Today', summary: 'Currency stability and energy costs continue to influence sectors such as aviation, paints, oil marketing, and logistics.' },
  ],
  World: [
    { title: 'Global equities steady as investors wait for central bank signals', source: 'Reuters', url: 'https://www.reuters.com/markets/', time: 'Today', summary: 'Bond yields, inflation readings, and policy commentary remain the main drivers across US, European, and Asian markets.' },
    { title: 'Asian markets trade mixed amid technology and export-stock moves', source: 'CNBC', url: 'https://www.cnbc.com/world-markets/', time: 'Today', summary: 'Chip, auto, and manufacturing names are reacting to demand expectations and currency moves.' },
    { title: 'Commodity prices remain in focus for emerging-market investors', source: 'Bloomberg', url: 'https://www.bloomberg.com/markets', time: 'Today', summary: 'Metals, crude oil, and agricultural commodities are shaping sector rotation across global indices.' },
  ],
  Business: [
    { title: 'Quarterly earnings season puts margins and demand recovery under the spotlight', source: 'Business Standard', url: 'https://www.business-standard.com/markets', time: 'Today', summary: 'Companies with pricing power, operating leverage, and cleaner balance sheets are attracting stronger attention.' },
    { title: 'Consumer companies focus on premium products and rural demand recovery', source: 'Moneycontrol', url: 'https://www.moneycontrol.com/news/business/', time: 'Today', summary: 'FMCG and discretionary firms are balancing volume growth with margin protection.' },
    { title: 'Banking sector watches deposit costs as loan growth remains healthy', source: 'Mint', url: 'https://www.livemint.com/market', time: 'Today', summary: 'Net interest margins and asset quality trends are the key numbers investors are tracking.' },
  ],
  Economy: [
    { title: 'Inflation trajectory remains central to rate-cut expectations', source: 'RBI Bulletin', url: 'https://www.rbi.org.in/Scripts/BS_ViewBulletin.aspx', time: 'Today', summary: 'Food prices, fuel movement, and core inflation will shape monetary policy expectations over the next few months.' },
    { title: 'Manufacturing and services activity keep growth outlook resilient', source: 'Economic Times', url: 'https://economictimes.indiatimes.com/news/economy', time: 'Today', summary: 'High-frequency indicators suggest steady business activity, though export demand remains uneven.' },
    { title: 'Government capex continues to support infrastructure-linked sectors', source: 'The Hindu BusinessLine', url: 'https://www.thehindubusinessline.com/economy/', time: 'Today', summary: 'Roads, railways, power, and defense suppliers remain connected to public investment trends.' },
  ],
  Technology: [
    { title: 'IT services stocks watch deal wins, AI demand, and client spending recovery', source: 'Times Tech', url: 'https://timesofindia.indiatimes.com/technology', time: 'Today', summary: 'Investors are looking for signs that discretionary technology spending is stabilizing.' },
    { title: 'Semiconductor and data-center themes continue to attract global capital', source: 'TechCrunch', url: 'https://techcrunch.com/', time: 'Today', summary: 'AI infrastructure demand remains a long-term driver for chips, cloud, and power equipment companies.' },
    { title: 'Cybersecurity and automation spending becomes a boardroom priority', source: 'Inc42', url: 'https://inc42.com/buzz/', time: 'Today', summary: 'Enterprises are allocating budgets toward resilience, compliance, and productivity tools.' },
  ],
  Startups: [
    { title: 'Fintech startups focus on profitability as funding becomes more selective', source: 'YourStory', url: 'https://yourstory.com/', time: 'Today', summary: 'Investors are rewarding sustainable unit economics, compliance readiness, and strong distribution.' },
    { title: 'AI-first SaaS companies see stronger enterprise pilot activity', source: 'Inc42', url: 'https://inc42.com/', time: 'Today', summary: 'Automation, analytics, and customer-support tools remain popular areas for new product launches.' },
    { title: 'Consumer startups explore offline expansion and premium positioning', source: 'Entrackr', url: 'https://entrackr.com/', time: 'Today', summary: 'Brands are combining online acquisition with stores, marketplaces, and category-focused communities.' },
  ],
}

const MARKET_TOOL_LABELS = ['IPO', 'Share Price', 'Unicorn Signals', 'FII DII Data', 'Stockfact', 'Gift Nifty', 'Weekly Outlook', 'Stock Advisory', 'SGX Nifty']

const IPO_ITEMS = [
  { company: 'Tata Capital', type: 'Mainboard', status: 'Upcoming', priceBand: 'TBA', lot: 'TBA', openDate: 'Expected 2026', issueSize: 'Large cap NBFC' },
  { company: 'NSE India', type: 'Mainboard', status: 'Watchlist', priceBand: 'TBA', lot: 'TBA', openDate: 'Awaiting update', issueSize: 'Exchange listing' },
  { company: 'LG Electronics India', type: 'Mainboard', status: 'Upcoming', priceBand: 'TBA', lot: 'TBA', openDate: 'Expected 2026', issueSize: 'Consumer durables' },
  { company: 'HDB Financial Services', type: 'Mainboard', status: 'Upcoming', priceBand: 'TBA', lot: 'TBA', openDate: 'Expected 2026', issueSize: 'Financial services' },
]

const SHARE_PRICE_ITEMS = [
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd', price: 1428.5, changePct: 0.48 },
  { symbol: 'TCS', name: 'Tata Consultancy Services Ltd', price: 3642.75, changePct: -0.31 },
  { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', price: 1711.2, changePct: 0.72 },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd', price: 1432.6, changePct: 0.83 },
  { symbol: 'INFY', name: 'Infosys Ltd', price: 1178.1, changePct: 0.83 },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd', price: 1868.4, changePct: 0.78 },
  { symbol: 'SBIN', name: 'State Bank of India', price: 789.5, changePct: -1.74 },
  { symbol: 'M&M', name: 'Mahindra & Mahindra Ltd', price: 3210.8, changePct: 3.36 },
]

const HOME_MARKET_SYMBOLS = [
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd', cmp: 1868.4, change: 14.5, changePct: 0.78, volumeRank: 3, sourceUrl: 'https://dhan.co/stocks/bharti-airtel-ltd-chart/' },
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd', cmp: 1428.5, change: 6.8, changePct: 0.48, volumeRank: 1, sourceUrl: 'https://dhan.co/stocks/reliance-industries-ltd-chart/' },
  { symbol: 'SBIN', name: 'State Bank of India', cmp: 789.5, change: -13.95, changePct: -1.74, volumeRank: 5, sourceUrl: 'https://dhan.co/stocks/state-bank-of-india-chart/' },
  { symbol: 'INFY', name: 'Infosys Ltd', cmp: 1178.1, change: 9.7, changePct: 0.83, volumeRank: 4, sourceUrl: 'https://dhan.co/stocks/infosys-ltd-chart/' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', cmp: 1711.2, change: 12.2, changePct: 0.72, volumeRank: 6, sourceUrl: 'https://dhan.co/stocks/hdfc-bank-ltd-chart/' },
  { symbol: 'M&M', name: 'Mahindra & Mahindra Ltd', cmp: 3210.8, change: 104.3, changePct: 3.36, volumeRank: 10, sourceUrl: 'https://dhan.co/stocks/mahindra-mahindra-ltd-chart/' },
  { symbol: 'TECHM', name: 'Tech Mahindra Ltd', cmp: 1370.5, change: 27.1, changePct: 2.02, volumeRank: 12, sourceUrl: 'https://dhan.co/stocks/tech-mahindra-ltd-chart/' },
  { symbol: 'POWERGRID', name: 'Power Grid Corporation of India Ltd', cmp: 312.8, change: 2.15, changePct: 0.69, volumeRank: 8, sourceUrl: 'https://dhan.co/stocks/power-grid-corporation-of-india-ltd-chart/' },
  { symbol: 'ADANIPORTS', name: 'Adani Ports & SEZ Ltd', cmp: 1350.8, change: 16.4, changePct: 1.23, volumeRank: 9, sourceUrl: 'https://dhan.co/stocks/adani-ports-special-economic-zone-ltd-chart/' },
  { symbol: 'TATASTEEL', name: 'Tata Steel Ltd', cmp: 147.2, change: -4.85, changePct: -3.19, volumeRank: 2, sourceUrl: 'https://dhan.co/stocks/tata-steel-ltd-chart/' },
  { symbol: 'JSWSTEEL', name: 'JSW Steel Ltd', cmp: 1028.4, change: -25.3, changePct: -2.4, volumeRank: 7, sourceUrl: 'https://dhan.co/stocks/jsw-steel-ltd-chart/' },
  { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd', cmp: 663.9, change: -13.7, changePct: -2.02, volumeRank: 11, sourceUrl: 'https://dhan.co/stocks/tata-motors-ltd-chart/' },
  { symbol: 'ULTRACEMCO', name: 'UltraTech Cement Ltd', cmp: 11963, change: -205, changePct: -1.75, volumeRank: 15, sourceUrl: 'https://dhan.co/stocks/ultratech-cement-ltd-chart/' },
  { symbol: 'WIPRO', name: 'Wipro Ltd', cmp: 242.6, change: -4.45, changePct: -1.8, volumeRank: 13, sourceUrl: 'https://dhan.co/stocks/wipro-ltd-chart/' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd', cmp: 1432.6, change: 11.8, changePct: 0.83, volumeRank: 14, sourceUrl: 'https://dhan.co/stocks/icici-bank-ltd-chart/' },
]

const HOME_MARKET_SECTIONS = [
  { title: 'Most Active', key: 'Most Active', type: 'active' },
  { title: 'Top Gainers', key: 'Top Gainers', type: 'gainers' },
  { title: 'Top Losers', key: 'Top Losers', type: 'losers' },
]

const STOCK_OUTLOOK_SECTIONS = [
  {
    title: 'Banking Sector',
    stocks: ['ICICIBANK', 'SBIN', 'HDFCBANK', 'AXISBANK'],
  },
  {
    title: 'IT Sector',
    stocks: ['WIPRO', 'TCS', 'INFY', 'HCLTECH'],
  },
  {
    title: 'FMCG Sector',
    stocks: ['ITC', 'HINDUNILVR', 'DABUR', 'COLPAL'],
  },
  {
    title: 'Pharma Sector',
    stocks: ['SUNPHARMA', 'CIPLA', 'LUPIN', 'DRREDDY'],
  },
]

const STOCK_OUTLOOK_BRANDS = {
  ICICIBANK: { label: 'ICICI', bg: 'bg-orange-50', text: 'text-orange-700', accent: 'bg-red-700' },
  SBIN: { label: 'SBI', bg: 'bg-sky-50', text: 'text-sky-700', accent: 'bg-sky-500' },
  HDFCBANK: { label: 'HDFC', bg: 'bg-blue-50', text: 'text-blue-800', accent: 'bg-red-600' },
  AXISBANK: { label: 'Axis', bg: 'bg-pink-50', text: 'text-pink-800', accent: 'bg-pink-800' },
  WIPRO: { label: 'wipro', bg: 'bg-violet-50', text: 'text-violet-800', accent: 'bg-emerald-500' },
  TCS: { label: 'tcs', bg: 'bg-rose-50', text: 'text-rose-600', accent: 'bg-orange-500' },
  INFY: { label: 'Infosys', bg: 'bg-blue-50', text: 'text-blue-500', accent: 'bg-blue-500' },
  HCLTECH: { label: 'HCL', bg: 'bg-sky-50', text: 'text-sky-700', accent: 'bg-sky-600' },
  ITC: { label: 'ITC', bg: 'bg-slate-50', text: 'text-blue-950', accent: 'bg-blue-950' },
  HINDUNILVR: { label: 'HUL', bg: 'bg-indigo-50', text: 'text-indigo-700', accent: 'bg-indigo-700' },
  DABUR: { label: 'Dabur', bg: 'bg-green-50', text: 'text-green-700', accent: 'bg-orange-500' },
  COLPAL: { label: 'Colgate', bg: 'bg-red-50', text: 'text-red-600', accent: 'bg-blue-500' },
  SUNPHARMA: { label: 'Sun', bg: 'bg-orange-50', text: 'text-orange-700', accent: 'bg-orange-500' },
  CIPLA: { label: 'Cipla', bg: 'bg-blue-50', text: 'text-blue-700', accent: 'bg-blue-700' },
  LUPIN: { label: 'Lupin', bg: 'bg-green-50', text: 'text-green-700', accent: 'bg-green-600' },
  DRREDDY: { label: "Dr Reddy's", bg: 'bg-purple-50', text: 'text-purple-800', accent: 'bg-purple-700' },
}

const STOCK_OUTLOOK_COMMONS_LOGOS = {
  ICICIBANK: 'ICICI Bank Logo.svg',
  SBIN: 'State-Bank-of-India-Logo.svg',
  HDFCBANK: 'HDFC Bank Logo.svg',
  AXISBANK: 'Axis Bank logo.svg',
  WIPRO: 'Wipro new logo.svg',
  TCS: 'Tata Consultancy Services old logo.svg',
  INFY: 'Infosys logo.svg',
  HCLTECH: 'HCLTech-new-logo.svg',
  ITC: 'ITC Limited Logo.svg',
  HINDUNILVR: 'Unilever text logo.svg',
  DABUR: 'Dabur logo.svg',
  COLPAL: 'Colgate-Palmolive logo.svg',
  SUNPHARMA: 'Logo Sun Pharmaceutical.png',
  CIPLA: 'Cipla logo.svg',
  LUPIN: 'https://en.wikipedia.org/wiki/Special:FilePath/The_Lupin_Logo.svg',
  DRREDDY: "Dr.Reddy's logo.jpg",
}

const STOCK_DIRECTORY_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

const STOCK_DIRECTORY_SOCIALS = [
  { label: 'Facebook', href: 'https://www.facebook.com/', Icon: Facebook },
  { label: 'Twitter', href: 'https://twitter.com/', Icon: Twitter },
  { label: 'Instagram', href: 'https://www.instagram.com/', Icon: Instagram },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/', Icon: Linkedin },
]

const parseMarketVolume = (volume) => {
  const match = String(volume || '').trim().match(/^([\d.]+)\s*(Cr|L|K)?$/i)
  if (!match) return 0

  const value = Number(match[1])
  const suffix = (match[2] || '').toUpperCase()
  if (!Number.isFinite(value)) return 0
  if (suffix === 'CR') return value * 10000000
  if (suffix === 'L') return value * 100000
  if (suffix === 'K') return value * 1000
  return value
}

const SCREENER_LIVE_UNIVERSE = (() => {
  const rowsBySymbol = new Map()

  Object.values(SCREENER_STOCKS).flat().forEach((stock) => {
    rowsBySymbol.set(stock.symbol, { ...stock })
  })

  HOME_MARKET_SYMBOLS.forEach((stock) => {
    const existing = rowsBySymbol.get(stock.symbol) || {}
    rowsBySymbol.set(stock.symbol, {
      high52: stock.cmp,
      low52: stock.cmp,
      volume: existing.volume || '-',
      ...existing,
      ...stock,
    })
  })

  return Array.from(rowsBySymbol.values())
})()

const fetchQuoteBatches = async (stocks, market, batchSize = 6, batchDelayMs = 180) => {
  const results = []
  for (let index = 0; index < stocks.length; index += batchSize) {
    const batch = stocks.slice(index, index + batchSize)
    const batchResults = await Promise.allSettled(
      batch.map(async (stock) => {
        const payload = await getRealtimePrice(stock.symbol, market)
        return [stock.symbol, payload]
      })
    )
    results.push(...batchResults)
    if (index + batchSize < stocks.length) {
      await new Promise(resolve => setTimeout(resolve, batchDelayMs))
    }
  }
  return results
}

const getCompanyWebsiteUrl = (symbol) => {
  const website = getCompanyMeta(symbol)?.website
  if (!website) return null
  return /^https?:\/\//i.test(website) ? website : `https://${website}`
}

const getStockLogoSources = (symbol) => {
  const commonsLogo = STOCK_OUTLOOK_COMMONS_LOGOS[symbol]
  const sources = getWebsiteLogoSources(symbol)

  if (commonsLogo) {
    sources.unshift(
      /^https?:\/\//i.test(commonsLogo)
        ? commonsLogo
        : `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(commonsLogo)}`
    )
  }

  return Array.from(new Set(sources))
}

const getStockDirectoryItems = () => {
  const rowsBySymbol = new Map()

  const addStock = (stock) => {
    if (!stock?.symbol) return
    const meta = getCompanyMeta(stock.symbol)
    rowsBySymbol.set(stock.symbol, {
      symbol: stock.symbol,
      name: stock.name || meta?.name || stock.symbol,
    })
  }

  SCREENER_LIVE_UNIVERSE.forEach(addStock)
  SHARE_PRICE_ITEMS.forEach(addStock)
  STOCK_OUTLOOK_SECTIONS.flatMap((section) => section.stocks).forEach((symbol) => addStock({ symbol }))

  return Array.from(rowsBySymbol.values()).sort((a, b) => a.symbol.localeCompare(b.symbol))
}

const StockDirectoryFooter = ({ onSearch }) => {
  const directoryItems = useMemo(() => getStockDirectoryItems(), [])
  const [activeLetter, setActiveLetter] = useState(null)
  const selectedStocks = useMemo(() => (
    activeLetter
      ? directoryItems.filter((stock) => (
        stock.symbol.startsWith(activeLetter) ||
        stock.name.toUpperCase().startsWith(activeLetter)
      ))
      : []
  ), [activeLetter, directoryItems])

  return (
    <section className="mb-8 bg-[#202020] px-4 py-6 text-gray-300 shadow-sm sm:px-6" aria-label="Stock directory and disclaimer">
      <div className="flex flex-wrap items-center gap-4">
        {STOCK_DIRECTORY_SOCIALS.map(({ label, href, Icon }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noreferrer"
            className="rounded-md text-gray-300 transition hover:text-white focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label={label}
            title={label}
          >
            <Icon className="h-9 w-9 stroke-[2.6]" />
          </a>
        ))}
      </div>

      <div className="mt-7 flex flex-wrap items-center gap-y-2 text-base sm:text-lg">
        <span className="mr-1 font-medium text-gray-100">Stocks:</span>
        {STOCK_DIRECTORY_LETTERS.map((letter, index) => (
          <React.Fragment key={letter}>
            <button
              type="button"
              onClick={() => setActiveLetter((current) => current === letter ? null : letter)}
              className={`px-1 font-medium transition hover:text-white focus:outline-none focus:ring-2 focus:ring-white/40 ${
                activeLetter === letter ? 'text-white underline underline-offset-4' : 'text-gray-200'
              }`}
              aria-pressed={activeLetter === letter}
            >
              {letter}
            </button>
            {index < STOCK_DIRECTORY_LETTERS.length - 1 && <span className="text-gray-500">|</span>}
          </React.Fragment>
        ))}
      </div>

      {activeLetter && (
        <div className="mt-5 rounded-md border border-white/10 bg-black/20 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-black uppercase tracking-wide text-gray-100">
              {activeLetter} Stocks
            </p>
            <button
              type="button"
              onClick={() => setActiveLetter(null)}
              className="rounded-md p-1 text-gray-400 transition hover:bg-white/10 hover:text-white"
              aria-label="Close stock directory"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {selectedStocks.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {selectedStocks.map((stock) => (
                <button
                  key={stock.symbol}
                  type="button"
                  onClick={() => {
                    onSearch(stock.symbol)
                    setActiveLetter(null)
                  }}
                  className="min-w-0 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-left transition hover:border-cyan-300/60 hover:bg-cyan-400/10"
                >
                  <span className="block truncate text-sm font-black text-white">{stock.symbol}</span>
                  <span className="mt-0.5 block truncate text-xs font-semibold text-gray-400">{stock.name}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm font-semibold text-gray-400">No stocks are available for this letter yet.</p>
          )}
        </div>
      )}

      <p className="mt-4 text-base font-semibold leading-relaxed text-gray-500">
        Data is a real-time snapshot *Data is delayed by at least 15 minutes. StockFact, Market Action Data and Analysis. Data Provider CMOTS Infotech.
      </p>

      <div className="mt-7 border-t border-gray-300/80 pt-7">
        <p className="text-sm font-semibold leading-7 text-gray-500">
          <span className="font-black text-gray-400">Disclaimer :</span> There is no guarantee of profits or no exceptions from losses. The investment advice provided is solely the personal views of the research team. Equisense will not accept any liability for loss or damage as a result of reliance on the information contained within this website including data, quotes, charts and buy/sell signals. Please be fully informed regarding the risks and costs associated with trading the financial markets, it is one of the riskiest investment forms possible. Therefore, Equisense does not bear any responsibility for any trading losses you might incur as a result of using this data.
        </p>
      </div>
    </section>
  )
}

const StockOutlookLogo = ({ symbol }) => {
  const logoSources = useMemo(() => getStockLogoSources(symbol), [symbol])
  const [logoIndex, setLogoIndex] = useState(0)
  const brand = STOCK_OUTLOOK_BRANDS[symbol] || {
    bg: 'bg-gray-100',
    text: 'text-gray-950',
  }
  const currentLogo = logoSources[logoIndex]

  useEffect(() => {
    setLogoIndex(0)
  }, [symbol])

  return (
    <div className="flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-md border border-gray-100 bg-white sm:h-24 sm:w-36">
      {currentLogo ? (
        <img
          src={currentLogo}
          alt={`${symbol} logo`}
          className="h-full w-full object-contain p-3"
          loading="eager"
          referrerPolicy="no-referrer"
          onError={() => setLogoIndex((index) => index + 1)}
        />
      ) : (
        <div className={`flex h-full w-full items-center justify-center ${brand.bg}`}>
          <span className={`text-lg font-black ${brand.text}`}>{symbol}</span>
        </div>
      )}
    </div>
  )
}

const StockOutlook = () => (
  <section className="mb-8 bg-white px-4 py-8 shadow-sm ring-1 ring-gray-200 sm:px-6">
    <h2 className="text-center text-2xl font-black uppercase tracking-normal text-gray-950 sm:text-3xl">
      Stock Outlook
    </h2>

    <div className="mt-8 grid gap-7 lg:grid-cols-4">
      {STOCK_OUTLOOK_SECTIONS.map((section) => (
        <div key={section.title} className="min-w-0 border-t-4 border-gray-950 pt-5">
          <h3 className="text-lg font-black uppercase text-gray-950">{section.title}</h3>

          <div className="mt-4 divide-y divide-gray-200">
            {section.stocks.map((symbol) => {
              const meta = getCompanyMeta(symbol)
              const websiteUrl = getCompanyWebsiteUrl(symbol)
              const label = `${symbol} Outlook for the Week`

              return (
                <a
                  key={symbol}
                  href={websiteUrl || '#'}
                  target={websiteUrl ? '_blank' : undefined}
                  rel={websiteUrl ? 'noreferrer' : undefined}
                  className="group flex min-h-[124px] items-center gap-4 py-4 transition hover:bg-blue-50/70"
                  title={websiteUrl ? `Open ${meta?.name || symbol} website` : `${meta?.name || symbol} website unavailable`}
                  onClick={(event) => {
                    if (!websiteUrl) {
                      event.preventDefault()
                    }
                  }}
                >
                  <StockOutlookLogo symbol={symbol} />
                  <div className="min-w-0">
                    <p className="text-base font-black leading-snug text-gray-950 group-hover:text-blue-700 sm:text-lg">
                      {label}
                    </p>
                    <p className="mt-1 truncate text-xs font-bold text-gray-500">
                      {meta?.name || symbol}
                    </p>
                  </div>
                </a>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  </section>
)

const UNICORN_SIGNAL_ITEMS = [
  { symbol: 'HINDALCO', name: 'Hindalco Industries Ltd', signal: 'BUY', confidence: 86, price: 1054.7, target: 1128, stopLoss: 1012, note: 'Strong trend with 52W breakout momentum.' },
  { symbol: 'NESTLEIND', name: 'Nestle India Ltd', signal: 'BUY', confidence: 82, price: 1477.8, target: 1535, stopLoss: 1438, note: 'Defensive strength and fresh high setup.' },
  { symbol: 'INFY', name: 'Infosys Ltd', signal: 'WATCH', confidence: 68, price: 1178.1, target: 1235, stopLoss: 1148, note: 'Near support; wait for follow-through above resistance.' },
  { symbol: 'TATASTEEL', name: 'Tata Steel Ltd', signal: 'AVOID', confidence: 74, price: 147.2, target: 155, stopLoss: 142, note: 'Weak short-term relative strength.' },
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd', signal: 'HOLD', confidence: 71, price: 1428.5, target: 1488, stopLoss: 1390, note: 'Stable setup; needs volume expansion.' },
]

const EquisenseBrandLogo = () => (
  <div className="flex min-w-0 items-center gap-3">
    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-950 shadow-[0_10px_25px_rgba(8,47,73,0.18)]">
      <svg
        viewBox="0 0 64 64"
        role="img"
        aria-label="Equisense logo mark"
        className="h-12 w-12"
      >
        <defs>
          <linearGradient id="equisenseLogoGradient" x1="9" y1="54" x2="54" y2="8" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#1d4ed8" />
            <stop offset="0.52" stopColor="#14b8a6" />
            <stop offset="1" stopColor="#67e8f9" />
          </linearGradient>
          <filter id="equisenseLogoGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path
          d="M8 48c8-16 14-18 23-8 3 3 5 3 8 0L55 16"
          fill="none"
          stroke="url(#equisenseLogoGradient)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#equisenseLogoGlow)"
        />
        <path
          d="M43 13h14v14"
          fill="none"
          stroke="#67e8f9"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M16 36V22M28 32V14M40 28V8" stroke="#22d3ee" strokeWidth="5" strokeLinecap="round" opacity="0.9" />
        <path d="M51 35c0 8-6 15-15 15" fill="none" stroke="#0891b2" strokeWidth="5" strokeLinecap="round" opacity="0.9" />
      </svg>
    </div>
    <div className="min-w-0">
      <div className="flex items-baseline leading-none">
        <span className="text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">EQUI</span>
        <span className="text-3xl font-black tracking-tight text-cyan-600 sm:text-4xl">SENSE</span>
      </div>
      <p className="mt-1 hidden truncate text-[11px] font-black uppercase tracking-[0.18em] text-gray-500 sm:block">
        Stock Market Price Prediction
      </p>
    </div>
  </div>
)

const MarketMoverCard = ({ section, rows, updatedAt, loading, onViewAll, onSearch }) => (
  <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
    <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-4 py-4">
      <div>
        <div className="mb-1 h-1.5 w-16 rounded-full bg-gray-950" />
        <h2 className="text-xl font-black tracking-tight text-gray-950 sm:text-2xl">{section.title}</h2>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="rounded-lg bg-gray-950 px-4 py-2 text-base font-black text-white">NSE</span>
        <button
          type="button"
          onClick={onViewAll}
          className="rounded-lg px-3 py-2 text-base font-black text-blue-600 transition hover:bg-blue-50"
        >
          BSE
        </button>
      </div>
    </div>

    <div className="grid grid-cols-[1fr_0.78fr_1fr] gap-2 border-b border-gray-200 px-4 py-3 text-xs font-black text-gray-950 sm:grid-cols-[1.1fr_0.8fr_1fr] sm:gap-3 sm:text-sm">
      <span>Stocks</span>
      <span className="text-right">Price</span>
      <span className="text-right">Change</span>
    </div>

    <div className="divide-y divide-gray-200">
      {rows.map((stock) => {
        const isPositive = stock.changePct >= 0
        return (
          <button
            key={`${section.key}-${stock.symbol}`}
            type="button"
            onClick={() => onSearch(stock.symbol)}
            className="grid w-full grid-cols-[1fr_0.78fr_1fr] items-center gap-2 px-4 py-3 text-left transition hover:bg-blue-50 sm:grid-cols-[1.1fr_0.8fr_1fr] sm:gap-3"
          >
            <span className="min-w-0 truncate text-sm font-black text-gray-950 underline underline-offset-2 sm:text-base">
              {stock.symbol}
            </span>
            <span className="whitespace-nowrap text-right text-sm font-semibold text-gray-950 sm:text-base">
              {stock.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={`whitespace-nowrap text-right text-[13px] font-black sm:text-base ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? '+' : ''}{stock.change.toFixed(2)} ({isPositive ? '+' : ''}{stock.changePct.toFixed(2)}%)
            </span>
          </button>
        )
      })}
    </div>

    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="truncate text-xs font-semibold text-gray-500">
        {loading ? 'Refreshing live prices...' : `Live price API updated ${updatedAt || 'just now'}`}
      </span>
      <button
        type="button"
        onClick={onViewAll}
        className="shrink-0 text-sm font-black text-gray-950 underline underline-offset-4 transition hover:text-blue-600"
      >
        View All
      </button>
    </div>
  </section>
)

const StockScreener = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [selectedStock, setSelectedStock] = useState(null)
  const [investmentAmount, setInvestmentAmount] = useState('')
  const [investmentPeriod, setInvestmentPeriod] = useState('')
  const [analysisInput, setAnalysisInput] = useState(null)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [market, setMarket] = useState('IN') // 'US' or 'IN'
  const [stockPrices, setStockPrices] = useState({})
  const [showHistorical, setShowHistorical] = useState(false)
  const [showChart, setShowChart] = useState(false)
  const [selectedChartSymbol, setSelectedChartSymbol] = useState(null)
  const [selectedStockForAnalysis, setSelectedStockForAnalysis] = useState(null)
  const [backendStatus, setBackendStatus] = useState({ connected: false, checking: !IS_PRODUCTION, initialized: false })
  const [selectedStockData, setSelectedStockData] = useState(null) // Store detailed stock data for display
  const [showStockModal, setShowStockModal] = useState(false)
  const [priceHistory, setPriceHistory] = useState([])
  const [dailyTrendHistory, setDailyTrendHistory] = useState([])
  const [companyInfo, setCompanyInfo] = useState(null)
  const [predictionMetrics, setPredictionMetrics] = useState(null)
  const [recommendation, setRecommendation] = useState(null)
  const [newsSentiment, setNewsSentiment] = useState(null)
  const [portfolio, setPortfolio] = useState(null)
  const [showComparisonModal, setShowComparisonModal] = useState(false)
  const [comparisonStocks, setComparisonStocks] = useState([])
  const [showMainMenu, setShowMainMenu] = useState(false)
  const [showHeaderMenu, setShowHeaderMenu] = useState(false)
  const [activeInfoPanel, setActiveInfoPanel] = useState(null)
  const [activeScreener, setActiveScreener] = useState(null)
  const [screenerExchange, setScreenerExchange] = useState('NSE')
  const [screenerPeriod, setScreenerPeriod] = useState('Today')
  const [activeNewsCategory, setActiveNewsCategory] = useState(null)
  const [activeMarketTool, setActiveMarketTool] = useState(null)
  const [marketIndices, setMarketIndices] = useState(MARKET_INDEX_FALLBACKS)
  const [marketMoverQuotes, setMarketMoverQuotes] = useState({})
  const [marketMoversLoading, setMarketMoversLoading] = useState(!IS_PRODUCTION)
  const [marketMoversUpdatedAt, setMarketMoversUpdatedAt] = useState('')
  const activeSearchRequestRef = useRef(0)
  const backendFailureCountRef = useRef(0)

  const selectedAmountValue = Number(investmentAmount)
  const selectedPeriodValue = Number(investmentPeriod)
  const hasValidAnalysisInput = Number.isFinite(selectedAmountValue) && selectedAmountValue > 0 &&
    Number.isFinite(selectedPeriodValue) && selectedPeriodValue > 0
  const normalizedAnalysisPeriod = hasValidAnalysisInput ? Math.max(1, Math.round(selectedPeriodValue)) : null

  // Check backend status on mount and periodically
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const status = await getStatus()
        backendFailureCountRef.current = 0
        setBackendStatus({ connected: true, initialized: status.initialized || false, checking: false })
      } catch (error) {
        backendFailureCountRef.current += 1
        setBackendStatus((prev) => ({
          connected: prev.connected && backendFailureCountRef.current < 3,
          initialized: backendFailureCountRef.current < 3 ? prev.initialized : false,
          checking: false
        }))
      }
    }

    const timer = window.setTimeout(checkBackend, IS_PRODUCTION ? 2500 : 0)
    // Check every 30 seconds
    const interval = setInterval(checkBackend, IS_PRODUCTION ? 120000 : 30000)
    return () => {
      window.clearTimeout(timer)
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const loadMarketIndices = async () => {
      const results = await Promise.allSettled(
        MARKET_INDEX_FALLBACKS.map(async (item) => {
          const payload = await getRealtimePrice(item.symbol, 'US')
          const livePrice = Number(payload?.price || payload?.current_price)
          return Number.isFinite(livePrice) && livePrice > 0
            ? { ...item, price: livePrice }
            : item
        })
      )

      if (!isMounted) return
      setMarketIndices(results.map((result, index) => (
        result.status === 'fulfilled' ? result.value : MARKET_INDEX_FALLBACKS[index]
      )))
    }

    const timer = window.setTimeout(loadMarketIndices, IS_PRODUCTION ? 2000 : 0)
    const interval = window.setInterval(loadMarketIndices, IS_PRODUCTION ? 180000 : 60000)
    return () => {
      isMounted = false
      window.clearTimeout(timer)
      window.clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const loadMarketMovers = async () => {
      if (isMounted) {
        setMarketMoversLoading(true)
      }

      const results = await fetchQuoteBatches(HOME_MARKET_SYMBOLS, 'IN')

      if (!isMounted) return

      const nextQuotes = {}
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          const [symbol, payload] = result.value
          if (payload?.success) {
            nextQuotes[symbol] = payload
          }
        }
      })

      setMarketMoverQuotes(nextQuotes)
      setMarketMoversUpdatedAt(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }))
      setMarketMoversLoading(false)
    }

    const timer = window.setTimeout(loadMarketMovers, IS_PRODUCTION ? 3500 : 0)
    const interval = window.setInterval(loadMarketMovers, IS_PRODUCTION ? 180000 : 45000)
    return () => {
      isMounted = false
      window.clearTimeout(timer)
      window.clearInterval(interval)
    }
  }, [])

  // Fallback stock lists
  const fallbackStocks = {
    US: ['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'NFLX', 'AMD', 'INTC'],
    IN: [
      'RELIANCE', 'TCS', 'HDFCBANK', 'ICICIBANK', 'HDFC', 'SBIN', 'KOTAKBANK', 'AXISBANK', 'INDUSINDBK',
      'INFY', 'WIPRO', 'HCLTECH', 'TECHM', 'LTIM', 'LTTS', 'PERSISTENT', 'MINDTREE',
      'HINDUNILVR', 'ITC', 'NESTLEIND', 'MARICO', 'DABUR', 'BRITANNIA', 'TITAN', 'TATACONSUM',
      'BHARTIARTL', 'RIL', 'MARUTI', 'M&M', 'TATAMOTORS', 'BAJAJ-AUTO', 'HEROMOTOCO', 'EICHERMOT',
      'SUNPHARMA', 'DRREDDY', 'CIPLA', 'LUPIN', 'DIVISLAB', 'BIOCON', 'TORNTPHARM',
      'ONGC', 'IOC', 'BPCL', 'HPCL', 'GAIL', 'ADANIENT', 'ADANIPORTS',
      'LT', 'LARSEN', 'BHEL', 'SIEMENS', 'ABB', 'SCHNEIDER',
      'TATASTEEL', 'JSW', 'JSWSTEEL', 'HINDALCO', 'VEDL', 'NMDC', 'COALINDIA',
      'ULTRACEMCO', 'SHREECEM', 'ACC', 'AMBUJACEM', 'DALBHARAT',
      'NTPC', 'POWERGRID', 'TATAPOWER', 'ADANIPOWER', 'NHPC',
      'DLF', 'GODREJPROP', 'PRESTIGE', 'SOBHA',
      'ZEE', 'SUNTV', 'TV18BRDCST',
      'DMART', 'RELAXO', 'BATAINDIA',
      'UPL', 'RCF', 'GNFC', 'FACT',
      'ASIANPAINT', 'BERGEPAINT', 'PIDILITIND', 'GRASIM', 'ADANIGREEN', 'ADANITRANS'
    ]
  }

  // Available stocks for search (from API or fallback) - initialize with fallback
  const [availableStocks, setAvailableStocks] = useState(fallbackStocks.IN)

  const comparisonCandidates = useMemo(() => {
    if (!selectedStockData) return []

    const mergedStocks = [
      selectedStockData,
      ...searchResults.filter((stock) => stock.symbol !== selectedStockData.symbol)
    ]

    return mergedStocks
      .filter((stock) => stock?.symbol)
      .slice(0, 5)
      .map((stock) => {
        const isCurrent = stock.symbol === selectedStockData.symbol
        const effectivePrediction = isCurrent ? selectedStockData.prediction : stock.prediction
        const effectiveExpectedReturn = isCurrent
          ? (predictionMetrics?.expectedReturn ?? recommendation?.expected_return ?? effectivePrediction?.expected_return ?? 0)
          : (stock.prediction?.expected_return ?? 0)
        const effectiveRisk = isCurrent
          ? (predictionMetrics?.risk ?? recommendation?.risk ?? effectivePrediction?.risk ?? 5)
          : (stock.prediction?.risk ?? 5)
        const current = Number(stock.price || stockPrices[stock.symbol] || 0)
        const predicted = current * (1 + (effectiveExpectedReturn / 100))

        return {
          symbol: stock.symbol,
          current_price: current,
          predicted_price: predicted,
          prediction: effectivePrediction || { signal: 'Neutral', confidence: 0.5 },
          expected_return: effectiveExpectedReturn,
          risk_score: effectiveRisk,
          profit_loss: predicted - current,
          profit_loss_percent: effectiveExpectedReturn
        }
      })
  }, [selectedStockData, searchResults, stockPrices, predictionMetrics, recommendation])

  const filteredSuggestions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return []

    return (availableStocks || [])
      .filter((stock) => typeof stock === 'string')
      .filter((stock) => stock.toLowerCase().startsWith(query) || stock.toLowerCase().includes(query))
      .sort((a, b) => {
        const aLower = a.toLowerCase()
        const bLower = b.toLowerCase()
        const aRank = aLower === query ? 0 : aLower.startsWith(query) ? 1 : 2
        const bRank = bLower === query ? 0 : bLower.startsWith(query) ? 1 : 2
        if (aRank !== bRank) return aRank - bRank
        return a.localeCompare(b)
      })
      .slice(0, 8)
  }, [availableStocks, searchTerm])

  useEffect(() => {
    document.title = 'Equisense - Stock Screener & Investment Analyzer'
    
    // Immediately set fallback stocks for the current market
    const fallback = fallbackStocks[market] || fallbackStocks.US
    setAvailableStocks(fallback)
    
    // Load available stocks for search suggestions from API (will update if successful)
    const loadAvailableStocks = async () => {
      try {
        console.log(`[StockScreener] Loading stocks for market: ${market}`)
        const stocksData = await getStocksByMarket(market)
        console.log(`[StockScreener] Received stocks data:`, stocksData)
        
        if (stocksData && stocksData.success && Array.isArray(stocksData.stocks) && stocksData.stocks.length > 0) {
          console.log(`[StockScreener] Setting ${stocksData.stocks.length} stocks from API`)
          setAvailableStocks(stocksData.stocks)
        } else {
          // Keep fallback list if API returns invalid data
          console.warn(`[StockScreener] Invalid API response, keeping fallback stocks for ${market}`)
        }
      } catch (error) {
        console.error('[StockScreener] Error loading stocks:', error)
        // Keep fallback list on error (already set above)
        console.log(`[StockScreener] Using fallback stocks for ${market} due to error`)
      }
    }
    
    loadAvailableStocks()
  }, [market])

  const refreshPortfolio = async () => {
    try {
      const portfolioData = await getPortfolio()
      if (portfolioData?.success) {
        setPortfolio(portfolioData)
        return portfolioData
      }
    } catch (error) {
      console.log('[StockScreener] Portfolio fetch unavailable:', error?.message || error)
    }
    return null
  }

  const hasOpenPosition = (symbol, portfolioData = portfolio) => {
    const normalized = String(symbol || '').replace(/\.(NS|BO)$/i, '').toUpperCase()
    const holdings = portfolioData?.holdings || []

    return holdings.some((holding) => {
      const holdingSymbol = String(holding?.symbol || '').replace(/\.(NS|BO)$/i, '').toUpperCase()
      return holdingSymbol === normalized && Number(holding?.shares || 0) > 0
    })
  }

  const resolveSearchSymbol = (rawTerm) => {
    const normalized = rawTerm.trim().toUpperCase()
    if (!normalized) {
      return { symbol: '', error: 'Please enter a stock symbol to search' }
    }

    const exactMatch = availableStocks.find(stock => stock === normalized)
    if (exactMatch) {
      return { symbol: exactMatch }
    }

    const prefixMatches = availableStocks.filter(stock => stock.startsWith(normalized))
    if (prefixMatches.length === 1) {
      return { symbol: prefixMatches[0] }
    }

    if (prefixMatches.length > 1 && normalized.length < 3) {
      return { symbol: '', error: 'Type at least 3 letters or choose one exact stock from suggestions' }
    }

    const containsMatches = availableStocks.filter(stock => stock.includes(normalized))
    if (containsMatches.length === 1) {
      return { symbol: containsMatches[0] }
    }

    return { symbol: normalized }
  }

  const buildPredictionFromSignal = (predictionData) => {
    const rawConfidence = Number(predictionData?.confidence ?? 0.5)
    const normalizedConfidence = rawConfidence > 1 ? rawConfidence / 100 : rawConfidence

    return {
      signal: predictionData?.signal || 'Neutral',
      confidence: normalizedConfidence,
      expected_return: predictionData?.expected_return ?? 0.2,
      risk: predictionData?.risk ?? 5.0,
      score: predictionData?.score ?? ((predictionData?.expected_return ?? 0.2) / Math.max(predictionData?.risk ?? 5.0, 0.5)),
      has_position: Boolean(predictionData?.has_position)
    }
  }

  const normalizeRecommendationPayload = (payload, fallbackPrediction = null, symbol = '') => {
    if (!payload) return payload

    const signal = payload.signal || fallbackPrediction?.signal || 'Neutral'
    const confidence = Number(
      payload.confidence != null
        ? Number(payload.confidence) / 100
        : fallbackPrediction?.confidence ?? 0.5
    )
    const expectedReturn = Number(
      payload.expected_return ??
      fallbackPrediction?.expected_return ??
      0.2
    )
    const risk = Number(
      payload.risk ??
      fallbackPrediction?.risk ??
      5.0
    )
    const score = Number(
      payload.score ??
      (expectedReturn / Math.max(risk, 0.5))
    )
    const hasPosition = payload.has_position != null ? payload.has_position : hasOpenPosition(symbol)

    const decision = buildDecisionFromModel(signal, expectedReturn, risk, confidence, score, hasPosition)
    const currentRecommendation = String(payload.recommendation || '').toUpperCase()

    if (currentRecommendation === decision.recommendation) {
      return {
        ...payload,
        signal,
        has_position: hasPosition,
        alternate_action: payload.alternate_action || decision.alternateAction || null,
        confidence: Number((confidence * 100).toFixed(1)),
        expected_return: expectedReturn,
        risk,
        score
      }
    }

    if (decision.recommendation !== 'HOLD') {
        return {
          ...payload,
          recommendation: decision.recommendation,
          reason: decision.reason,
          color: decision.color,
          signal,
          has_position: hasPosition,
          alternate_action: payload.alternate_action || decision.alternateAction || null,
          confidence: Number((confidence * 100).toFixed(1)),
          expected_return: expectedReturn,
          risk,
        score
      }
    }

    return {
      ...payload,
      signal,
      has_position: hasPosition,
      alternate_action: payload.alternate_action || decision.alternateAction || null,
      confidence: Number((confidence * 100).toFixed(1)),
      expected_return: expectedReturn,
      risk,
      score
    }
  }

  const buildLocalAnalysisResult = (symbol) => {
    const currentPrice = selectedStockData?.symbol === symbol
      ? (selectedStockData?.price || stockPrices[symbol])
      : stockPrices[symbol]

    if (!currentPrice || !Number.isFinite(currentPrice) || currentPrice <= 0) {
      return null
    }

    const expectedReturn = predictionMetrics?.expectedReturn ?? recommendation?.expected_return ?? selectedStockData?.prediction?.expected_return ?? 0.2
    const riskScore = predictionMetrics?.risk ?? recommendation?.risk ?? selectedStockData?.prediction?.risk ?? 5.0
    const score = recommendation?.score ?? (expectedReturn / Math.max(riskScore, 0.5))
    const signal = selectedStockData?.prediction?.signal || recommendation?.signal || 'Neutral'
    const confidence = selectedStockData?.prediction?.confidence ?? ((recommendation?.confidence ?? 50) / 100)
    const decision = buildDecisionFromModel(
      signal,
      expectedReturn,
      riskScore,
      confidence,
      score,
      hasOpenPosition(symbol)
    )

    const investmentAmountValue = parseFloat(investmentAmount)
    const investmentPeriodValue = Math.max(1, parseInt(investmentPeriod))
    const forecastHorizonDays = Math.max(1, parseInt(selectedStockData?.prediction?.forecast_horizon_days ?? 10))
    const scaledReturn = Math.pow(1 + (expectedReturn / 100), investmentPeriodValue / forecastHorizonDays) - 1
    const predictedPrice = currentPrice * (1 + scaledReturn)
    const shares = investmentAmountValue / currentPrice
    const predictedValue = shares * predictedPrice
    const profitLoss = predictedValue - investmentAmountValue
    const profitLossPercent = investmentAmountValue > 0 ? (profitLoss / investmentAmountValue) * 100 : 0

    const auditorRecommendation = decision.recommendation === 'BUY'
      ? `BUY: ML trend model supports an upward move with expected return ${expectedReturn.toFixed(2)}%.`
      : decision.recommendation === 'SELL'
        ? `SELL: ML trend model indicates downside risk with expected return ${expectedReturn.toFixed(2)}%.`
        : decision.recommendation === 'AVOID'
          ? `AVOID: ML trend model indicates downside risk, so fresh entries should be avoided.`
          : `HOLD: ML trend model is neutral or not strong enough for a buy yet.`

    return {
      success: true,
      report: {
        symbol,
        current_price: currentPrice,
        predicted_price: predictedPrice,
        price_change_percent: scaledReturn * 100,
        investment_amount: investmentAmountValue,
        investment_period: investmentPeriodValue,
        shares,
        predicted_value: predictedValue,
        profit_loss: profitLoss,
        profit_loss_percent: profitLossPercent,
        prediction: {
          signal,
          confidence,
          expected_return: scaledReturn * 100,
          risk: riskScore,
          score,
          forecast_horizon_days: forecastHorizonDays
        },
        expected_return: scaledReturn * 100,
        risk: riskScore,
        score,
        recommendation: decision.recommendation,
        recommendation_reason: decision.reason,
        model_action: decision.action,
        has_position: hasOpenPosition(symbol),
        agent_reports: {
          analyst: {
            signal,
            confidence,
            expected_return: expectedReturn,
            risk: riskScore,
            score,
            reasoning: 'Built from the latest fetched price history and prediction when backend live analysis was unavailable.'
          },
          trader: {
            action: decision.action,
            recommended_shares: decision.action === 'Buy' ? Math.floor(shares) : 0,
            reasoning: decision.reason
          },
          risk: {
            risk_level: riskScore <= 3 ? 'Low' : riskScore <= 6 ? 'Medium' : 'High',
            volatility: riskScore / 100,
            alerts: [],
            reasoning: 'Risk level estimated from the currently available analysis metrics.'
          },
          auditor: {
            expected_return: expectedReturn,
            risk_score: riskScore,
            recommendation: auditorRecommendation,
            reasoning: auditorRecommendation
          }
        }
      }
    }
  }

  const currencySymbol = market === 'IN' ? '\u20b9' : '$'

  const upsertSearchResult = (stockData) => {
    setSearchResults((prev) => {
      const existingIndex = prev.findIndex((item) => item.symbol === stockData.symbol)
      if (existingIndex >= 0) {
        return prev.map((item, index) => (index === existingIndex ? { ...item, ...stockData } : item))
      }
      return [...prev, stockData]
    })
  }

  const handleSearch = async (forcedSymbol = null) => {
    const resolved = resolveSearchSymbol(forcedSymbol || searchTerm)
    if (!resolved.symbol) {
      toast.error(resolved.error)
      return
    }

    const symbol = resolved.symbol
    const requestId = Date.now()
    activeSearchRequestRef.current = requestId
    setSearchTerm(symbol)
    setSelectedStockData(null)
    setCompanyInfo(null)
    setPriceHistory([])
    setDailyTrendHistory([])
    setRecommendation(null)
    setNewsSentiment(null)
    setPredictionMetrics(null)

    if (!symbol.trim()) {
      toast.error('Please enter a stock symbol to search')
      return
    }

    setSearching(true)

    const placeholderPrediction = buildPredictionFromSignal({
      signal: 'Neutral',
      confidence: 0.5,
      expected_return: 0.2,
      risk: 5.0,
      score: 0.04
    })
    const placeholderStockData = {
      symbol,
      price: stockPrices[symbol] ?? null,
      timePeriod: investmentPeriod,
      prediction: placeholderPrediction,
      isLoading: true
    }

    upsertSearchResult(placeholderStockData)
    setSelectedStockData(placeholderStockData)
    setShowStockModal(true)
    setPredictionMetrics({
      expectedReturn: 0.2,
      risk: 5.0,
      sharpeRatio: 0.04
    })
    setSearching(false)

    getCompanyInfo(symbol, market)
      .then((companyDataResult) => {
        if (activeSearchRequestRef.current === requestId && companyDataResult?.success) {
          setCompanyInfo(companyDataResult)
        }
      })
      .catch((error) => {
        console.log('[StockScreener] Company info fetch failed:', error)
      })

    getNewsSentiment(symbol, market, true)
      .then((payload) => {
        if (activeSearchRequestRef.current === requestId) {
          setNewsSentiment(payload)
        }
      })
      .catch((error) => {
        console.log('[StockScreener] News sentiment fetch failed:', error)
      })

    refreshPortfolio()

    Promise.allSettled([
      getRealtimePrice(symbol, market),
      getOHLCData(symbol, '1d', '5m', market),
      getOHLCData(symbol, '1mo', '1d', market),
      getRecommendation(symbol, market),
    ])
      .then(([priceResult, ohlcResult, dailyTrendResult, recommendationResult]) => {
        if (activeSearchRequestRef.current !== requestId) {
          return
        }

        let price = placeholderStockData.price
        if (priceResult.status === 'fulfilled' && priceResult.value?.success) {
          price = priceResult.value.price || priceResult.value.current_price
        } else if (priceResult.status === 'rejected') {
          console.error('Error fetching price:', priceResult.reason)
        }

        let prediction = null
        const ohlcDataForPrediction = ohlcResult.status === 'fulfilled' ? ohlcResult.value : null

        try {
          if (ohlcDataForPrediction?.success && Array.isArray(ohlcDataForPrediction.data) && ohlcDataForPrediction.data.length >= 2) {
            const prices = ohlcDataForPrediction.data.map((item) => item.close).filter((item) => item > 0)
            if (prices.length >= 2) {
              const recentPrice = prices[prices.length - 1]
              const previousPrice = prices[prices.length - 2]
              const change = (recentPrice - previousPrice) / previousPrice
              const change5 = prices.length >= 6 ? (recentPrice - prices[prices.length - 6]) / prices[prices.length - 6] : change
              const change20 = prices.length >= 21 ? (recentPrice - prices[prices.length - 21]) / prices[prices.length - 21] : change5
              const trendScore = (change * 0.45) + (change5 * 0.35) + (change20 * 0.20)

              if (!price) {
                price = recentPrice
              }

              if (trendScore >= 0.01) {
                prediction = { signal: 'Up', confidence: Math.min(0.86, 0.52 + Math.abs(trendScore) * 10) }
              } else if (trendScore <= -0.01) {
                prediction = { signal: 'Down', confidence: Math.min(0.86, 0.52 + Math.abs(trendScore) * 10) }
              } else {
                prediction = { signal: 'Neutral', confidence: 0.55 }
              }
            } else if (prices.length === 1 && !price) {
              price = prices[0]
              prediction = { signal: 'Neutral', confidence: 0.5 }
            }
          } else if (ohlcResult.status === 'rejected') {
            console.log('[StockScreener] Could not fetch price data for prediction:', ohlcResult.reason)
          }

          if (recommendationResult.status === 'fulfilled' && recommendationResult.value?.success) {
            const normalizedRecommendation = normalizeRecommendationPayload(recommendationResult.value, prediction, symbol)
            prediction = buildPredictionFromSignal(normalizedRecommendation)
            setRecommendation(normalizedRecommendation)
          }
        } catch (error) {
          console.log('[StockScreener] Error in prediction logic:', error)
        }

        if (!prediction) {
          prediction = placeholderPrediction
        }

        if (ohlcDataForPrediction?.success && Array.isArray(ohlcDataForPrediction.data)) {
          const history = ohlcDataForPrediction.data.slice(-180).map((item) => ({
            date: item.date,
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close,
            price: item.close,
            value: item.close,
            volume: item.volume
          }))
          setPriceHistory(history)
        } else {
          getOHLCData(symbol, '6mo', '1d', market)
            .then((ohlcData) => {
              if (activeSearchRequestRef.current === requestId && ohlcData?.success && Array.isArray(ohlcData.data)) {
                const history = ohlcData.data.map((item) => ({
                  date: item.date,
                  open: item.open,
                  high: item.high,
                  low: item.low,
                  close: item.close,
                  price: item.close,
                  value: item.close,
                  volume: item.volume
                }))
                setPriceHistory(history)
              }
            })
            .catch((error) => {
              console.log('[StockScreener] Price history fetch failed:', error)
            })
        }

        if (dailyTrendResult.status === 'fulfilled' && dailyTrendResult.value?.success && Array.isArray(dailyTrendResult.value.data)) {
          const dailyHistory = dailyTrendResult.value.data.slice(-15).map((item) => ({
            date: item.date,
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close,
            price: item.close,
            value: item.close,
            volume: item.volume
          }))
          setDailyTrendHistory(dailyHistory)
        } else {
          getOHLCData(symbol, '1mo', '1d', market)
            .then((ohlcData) => {
              if (activeSearchRequestRef.current === requestId && ohlcData?.success && Array.isArray(ohlcData.data)) {
                const dailyHistory = ohlcData.data.slice(-15).map((item) => ({
                  date: item.date,
                  open: item.open,
                  high: item.high,
                  low: item.low,
                  close: item.close,
                  price: item.close,
                  value: item.close,
                  volume: item.volume
                }))
                setDailyTrendHistory(dailyHistory)
              }
            })
            .catch((error) => {
              console.log('[StockScreener] Daily trend history fetch failed:', error)
            })
        }

        const recommendationData = recommendationResult.status === 'fulfilled'
          ? normalizeRecommendationPayload(recommendationResult.value, prediction, symbol)
          : recommendation
        let calculatedExpectedReturn = prediction.expected_return ?? 0
        let calculatedRisk = prediction.risk ?? 5.0

        try {
          if (recommendationData?.success) {
            calculatedExpectedReturn = recommendationData.expected_return || 0
            calculatedRisk = recommendationData.risk || 5.0
          }
        } catch (recError) {
          console.warn('Recommendation API failed, using prediction-based values:', recError)
        }

        const sharpeRatio = calculatedExpectedReturn > 0 && calculatedRisk > 0
          ? (calculatedExpectedReturn / calculatedRisk)
          : 0

        setPredictionMetrics({
          expectedReturn: calculatedExpectedReturn,
          risk: calculatedRisk,
          sharpeRatio
        })

        const stockData = {
          symbol,
          price,
          timePeriod: investmentPeriod,
          prediction,
          isLoading: false
        }

        upsertSearchResult(stockData)
        setSelectedStockData(stockData)
        if (price) {
          setStockPrices((prev) => ({ ...prev, [symbol]: price }))
        }

        toast.success(price ? `Found ${symbol} - ${currencySymbol}${Number(price).toFixed(2)}` : `Found ${symbol}`)
      })
      .catch((error) => {
        console.error('Error searching stock:', error)
        if (activeSearchRequestRef.current !== requestId) {
          return
        }
        setSelectedStockData({ ...placeholderStockData, isLoading: false })
        toast.error('Some live data is unavailable right now. Showing partial results.')
      })
  }

  const ensureEcosystemInitialized = async (symbolsToInclude = []) => {
    try {
      // Check if backend is reachable first
      let status
      try {
        status = await getStatus()
        console.log('[StockScreener] Backend status:', status)
      } catch (statusError) {
        console.error('Could not check status:', statusError)
        const errorMsg = statusError.message || 'Unknown error'
        if (errorMsg.includes('Network Error') || errorMsg.includes('ECONNREFUSED') || errorMsg.includes('Failed to fetch')) {
          toast.error(`Cannot connect to backend server at ${BACKEND_DISPLAY_URL}`)
        } else {
          toast.error(`Cannot connect to backend: ${errorMsg}`)
        }
        return false
      }

      return Boolean(status?.connected ?? true)
    } catch (error) {
      toast.dismiss()
      console.error('Unexpected error in ensureEcosystemInitialized:', error)
      const errorMsg = error.message || 'Unknown error'
      if (errorMsg.includes('Network Error') || errorMsg.includes('ECONNREFUSED') || errorMsg.includes('Failed to fetch')) {
        toast.error(`Cannot connect to backend server at ${BACKEND_DISPLAY_URL}`)
      } else {
        toast.error(`Error: ${errorMsg}. Please check backend logs.`)
      }
      return false
    }
  }

  const handleAnalyze = async (symbol) => {
    if (!hasValidAnalysisInput) {
      toast.error('Please enter investment amount and period')
      return
    }

    const amountValue = selectedAmountValue
    const periodValue = normalizedAnalysisPeriod
    setLoading(true)
    setSelectedStockForAnalysis(symbol)
    setAnalysisInput({
      investmentAmount: amountValue,
      investmentPeriod: periodValue
    })
    
    try {
      // Ensure ecosystem is initialized with this symbol
      const initialized = await ensureEcosystemInitialized([symbol])
      if (!initialized) {
        setLoading(false)
        return
      }

      const latestPortfolio = await refreshPortfolio()

      const result = await analyzeStockInvestment(
        symbol,
        amountValue,
        periodValue,
        market
      )
      
      if (result.success) {
        setAnalysisResult(result)
        
        // Update prediction metrics from analysis result
        const report = result.report
        if (report) {
          const expectedReturn = report.expected_return ?? report.profit_loss_percent ?? 0.2
          const riskScore = report.risk ?? 5.0
          const sharpeRatio = expectedReturn > 0 && riskScore > 0
            ? (expectedReturn / riskScore)
            : 0
          
          setPredictionMetrics({
            expectedReturn,
            risk: riskScore,
            sharpeRatio
          })

          if (report.prediction) {
            const refreshedStock = {
              symbol,
              price: report.current_price,
              timePeriod: investmentPeriod,
              prediction: report.prediction
            }
            setSelectedStockData(refreshedStock)
            setStockPrices(prev => ({ ...prev, [symbol]: report.current_price }))
            setSearchResults(prev => prev.map(item => item.symbol === symbol ? refreshedStock : item))
          }

          const decision = buildDecisionFromModel(
            report.prediction?.signal || 'Neutral',
            expectedReturn,
            riskScore,
            report.prediction?.confidence || 0.5,
            report.score ?? sharpeRatio,
            report.has_position ?? hasOpenPosition(symbol, latestPortfolio || portfolio)
          )

          setRecommendation(normalizeRecommendationPayload({
            success: true,
            symbol,
            recommendation: report.recommendation || decision.recommendation,
            reason: report.recommendation_reason || report.agent_reports?.trader?.reasoning || decision.reason,
            color: decision.color,
            score: report.score ?? sharpeRatio,
            expected_return: expectedReturn,
            risk: riskScore,
            confidence: (report.prediction?.confidence || 0.5) * 100,
            signal: report.prediction?.signal || 'Neutral',
            has_position: report.has_position ?? hasOpenPosition(symbol, latestPortfolio || portfolio),
            alternate_action: report.alternate_action || decision.alternateAction || null
          }, report.prediction, symbol))
        }
        
        toast.success('Analysis completed!')
      } else {
          const fallbackResult = buildLocalAnalysisResult(symbol)
          if (fallbackResult) {
            setAnalysisResult(fallbackResult)
            toast.success('Backend analysis was unavailable; showing local market-data analysis.')
          } else {
            toast.error('Analysis failed: ' + (result.message || 'Unknown error'))
          }
      }
    } catch (error) {
      console.error('Error analyzing stock:', error)
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to analyze stock'
      const fallbackResult = buildLocalAnalysisResult(symbol)
      if (fallbackResult) {
        setAnalysisResult(fallbackResult)
        toast.success('Backend analysis was unavailable; showing local market-data analysis.')
      } else if (errorMessage.includes('not initialized') || errorMessage.includes('Ecosystem')) {
        toast.error('Backend not initialized. Please wait a moment and try again.')
      } else if (errorMessage.includes('500') || errorMessage.includes('Internal Server Error')) {
        toast.error('Server error occurred. Please check backend logs and try again.')
      } else {
        toast.error(`Failed to analyze stock: ${errorMessage}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleViewHistorical = async (symbol) => {
    setSelectedStock(symbol)
    
    // Try to ensure ecosystem is initialized, but don't block if it fails
    // Historical analysis can work without full ecosystem initialization
    try {
      const status = await getStatus()
      if (!status.initialized) {
        // Try to initialize, but don't block the UI
        ensureEcosystemInitialized([symbol]).catch(err => {
          console.warn('Ecosystem initialization failed, but proceeding with historical analysis:', err)
        })
      }
    } catch (error) {
      console.warn('Could not check ecosystem status, proceeding anyway:', error)
    }
    
    // Show the modal immediately - it will handle data fetching
    setShowHistorical(true)
  }

  const handleViewChart = async (symbol) => {
    const targetSymbol = (symbol || selectedStockData?.symbol || '').toUpperCase()
    if (!targetSymbol) {
      toast.error('Search a stock first to view the technical chart.')
      return
    }

    try {
      const status = await getStatus()
      if (!status.initialized) {
        ensureEcosystemInitialized([targetSymbol]).catch(err => {
          console.warn('Ecosystem initialization failed, but proceeding with chart:', err)
        })
      }
    } catch (error) {
      console.warn('Could not check ecosystem status, proceeding anyway:', error)
    }

    if (selectedStockData?.symbol !== targetSymbol) {
      handleSearch(targetSymbol)
    }

    setSelectedChartSymbol(targetSymbol)
    setShowChart(true)
  }

  const handleAddToWatchlist = async (symbol) => {
    const upperSymbol = (symbol || '').toUpperCase()
    if (!upperSymbol) {
      toast.error('No stock selected for watchlist.')
      return
    }

    try {
      await addWatchlistItem(upperSymbol, market)
    } catch (error) {
      console.warn('Watchlist DB add failed, keeping local fallback:', error)
    }

    const existing = JSON.parse(localStorage.getItem('watchlist') || '[]')
    if (!existing.includes(upperSymbol)) {
      localStorage.setItem('watchlist', JSON.stringify([...existing, upperSymbol]))
      toast.success(`${upperSymbol} added to watchlist`)
    } else {
      toast.success(`${upperSymbol} is already in your watchlist`)
    }
  }

  const handleVirtualTrade = (symbol) => {
    const tradeSymbol = (symbol || selectedStockData?.symbol || '').toUpperCase()
    const price = Number(selectedStockData?.price || stockPrices[tradeSymbol] || 0)
    if (!tradeSymbol || !price) {
      toast.error('Stock price is unavailable for virtual trade.')
      return
    }

    const action = recommendation?.recommendation === 'BUY'
      ? 'Buy'
      : recommendation?.recommendation === 'SELL'
        ? 'Sell'
        : recommendation?.recommendation === 'AVOID'
          ? 'Avoid'
        : 'Hold'

    const existingTrades = JSON.parse(localStorage.getItem('paperTrades') || '[]')
    const trade = {
      id: Date.now(),
      symbol: tradeSymbol,
      action,
      price,
      market,
      expectedReturn: Number(predictionMetrics?.expectedReturn ?? recommendation?.expected_return ?? 0),
      risk: Number(predictionMetrics?.risk ?? recommendation?.risk ?? 0),
      createdAt: new Date().toISOString()
    }

    localStorage.setItem('paperTrades', JSON.stringify([trade, ...existingTrades].slice(0, 50)))
    toast.success(`Virtual trade saved for ${tradeSymbol}`)
  }

  const handleOpenComparison = () => {
    if (comparisonCandidates.length < 2) {
      toast.error('At least 2 stocks are needed for comparison.')
      return
    }

    setComparisonStocks(comparisonCandidates)
    setShowComparisonModal(true)
  }

  const handleRemoveComparisonStock = (symbol) => {
    setComparisonStocks((prev) => prev.filter((stock) => stock.symbol !== symbol))
  }

  const handleRemoveFromResults = (symbol) => {
    setSearchResults(prev => prev.filter(s => s.symbol !== symbol))
    setStockPrices(prev => {
      const newPrices = { ...prev }
      delete newPrices[symbol]
      return newPrices
    })
  }

  const teamMembers = [
    {
      name: 'Vaibhav Belekar',
      email: 'vaibhavsbelekar7@gmail.com',
      linkedin: 'https://www.linkedin.com/in/vaibhav-belekar-302079387'
    },
    {
      name: 'Aditya Daghle',
      email: 'adityadaghle12@gmail.com'
    },
    {
      name: 'Aditya Rajvnshi',
      email: 'aditya.rajvnshi4774@gmail.com'
    },
    {
      name: 'Vaibhav Sable',
      email: 'sablevaibhav18@gmail.com'
    },
    {
      name: 'Darshan Shinde',
      email: 'darshanshinde237@gmail.com'
    }
  ]

  const projectSummary = 'Equisense is an AI-powered stock analysis platform for smart investing. It combines ML-based trend prediction, recommendation signals, news sentiment, charts, and virtual trading to help users understand whether a stock setup looks like BUY, HOLD, SELL, or AVOID.'

  const handleHeaderSearchSubmit = (event) => {
    event.preventDefault()
    setShowSuggestions(false)
    handleSearch()
  }

  const openScreener = (label) => {
    if (NEWS_CATEGORIES.includes(label)) {
      setActiveNewsCategory(label)
      setShowMainMenu(false)
      return
    }

    if (MARKET_TOOL_LABELS.includes(label)) {
      setActiveMarketTool(label)
      setShowMainMenu(false)
      return
    }

    if (!SCREENER_TABS.includes(label)) {
      setShowMainMenu(false)
      return
    }

    setActiveScreener(label)
    setShowMainMenu(false)
    window.setTimeout(() => {
      document.getElementById('market-screener')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }

  const formatMarketNumber = (value) => Number(value).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number.isInteger(Number(value)) ? 0 : 1
  })

  const liveMarketRows = useMemo(() => {
    const exchangeMultiplier = screenerExchange === 'BSE' ? 1.002 : 1
    return SCREENER_LIVE_UNIVERSE.map((stock) => {
      const quote = marketMoverQuotes[stock.symbol] || {}
      const livePrice = Number(quote.price ?? quote.current_price)
      const liveChange = Number(quote.change)
      const liveChangePct = Number(quote.change_percent)
      const fallbackPrice = Number(stock.cmp ?? stock.price ?? 0)
      const cmp = Number.isFinite(livePrice) && livePrice > 0
        ? Number((livePrice * exchangeMultiplier).toFixed(2))
        : Number((fallbackPrice * exchangeMultiplier).toFixed(2))
      const change = Number.isFinite(liveChange) ? liveChange : stock.change
      const changePct = Number.isFinite(liveChangePct) ? liveChangePct : stock.changePct

      return {
        ...stock,
        cmp,
        price: cmp,
        change,
        changePct,
        high52: Number((Math.max(stock.high52 || cmp, cmp) * exchangeMultiplier).toFixed(2)),
        low52: Number((Math.min(stock.low52 || cmp, cmp) * exchangeMultiplier).toFixed(2)),
        volumeValue: parseMarketVolume(stock.volume),
        hasLiveQuote: Boolean(quote.success && Number.isFinite(liveChangePct)),
        sourceUrl: quote.source_url || stock.sourceUrl,
      }
    })
  }, [marketMoverQuotes, screenerExchange])

  const homeMarketRows = useMemo(() => {
    const homeSymbols = new Set(HOME_MARKET_SYMBOLS.map((stock) => stock.symbol))
    const enrichedRows = liveMarketRows.filter((stock) => homeSymbols.has(stock.symbol))
    const liveClassifiedRows = enrichedRows.filter((stock) => stock.hasLiveQuote)
    const classifiedRows = liveClassifiedRows.length ? liveClassifiedRows : enrichedRows

    const rowsBySymbol = new Map(enrichedRows.map((stock) => [stock.symbol, stock]))
    const activeOrder = ['BHARTIARTL', 'RELIANCE', 'SBIN', 'INFY', 'HDFCBANK']

    return {
      'Most Active': activeOrder.map((symbol) => rowsBySymbol.get(symbol)).filter(Boolean),
      'Top Gainers': [...classifiedRows]
        .filter((stock) => stock.changePct >= 0)
        .sort((a, b) => b.changePct - a.changePct)
        .slice(0, 5),
      'Top Losers': [...classifiedRows]
        .filter((stock) => stock.changePct < 0)
        .sort((a, b) => a.changePct - b.changePct)
        .slice(0, 5),
    }
  }, [liveMarketRows])

  const screenerRows = useMemo(() => {
    if (!activeScreener) return []

    const periodMultiplier = SCREENER_PERIOD_MULTIPLIERS[screenerPeriod] || 1
    const todayRows = [...liveMarketRows]
    const liveClassifiedRows = todayRows.filter((stock) => stock.hasLiveQuote)
    const classifiedRows = liveClassifiedRows.length ? liveClassifiedRows : todayRows

    if (screenerPeriod === 'Today') {
      if (activeScreener === 'Top Gainers') {
        return classifiedRows
          .filter((stock) => stock.changePct > 0)
          .sort((a, b) => b.changePct - a.changePct)
      }

      if (activeScreener === 'Top Losers') {
        return classifiedRows
          .filter((stock) => stock.changePct < 0)
          .sort((a, b) => a.changePct - b.changePct)
      }

      if (activeScreener === 'Most Active') {
        return todayRows.sort((a, b) => b.volumeValue - a.volumeValue)
      }

      if (activeScreener === '52W High') {
        return todayRows.sort((a, b) => (b.cmp / Math.max(b.high52, 1)) - (a.cmp / Math.max(a.high52, 1)))
      }

      if (activeScreener === '52W Low') {
        return todayRows.sort((a, b) => (a.cmp / Math.max(a.low52, 1)) - (b.cmp / Math.max(b.low52, 1)))
      }

      if (activeScreener === 'Penny Stocks') {
        return todayRows
          .filter((stock) => stock.cmp <= 100)
          .sort((a, b) => b.changePct - a.changePct)
      }
    }

    const exchangeMultiplier = screenerExchange === 'BSE' ? 1.002 : 1

    return (SCREENER_STOCKS[activeScreener] || []).map((stock) => {
      const change = Number((stock.change * periodMultiplier).toFixed(2))
      const changePct = Number((stock.changePct * periodMultiplier).toFixed(2))
      const cmp = Number((stock.cmp * exchangeMultiplier).toFixed(2))

      return {
        ...stock,
        cmp,
        change,
        changePct,
        high52: Number((stock.high52 * exchangeMultiplier).toFixed(2)),
        low52: Number((stock.low52 * exchangeMultiplier).toFixed(2)),
      }
    })
  }, [activeScreener, liveMarketRows, screenerExchange, screenerPeriod])

  const screenerUpdatedAt = useMemo(() => (
    new Date().toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  ), [activeScreener, screenerExchange, screenerPeriod])

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#dbeafe_0%,_#eef5ff_25%,_#f8fafc_62%,_#ffffff_100%)] text-gray-900">
      <div className="mx-auto max-w-[1808px] px-4 py-7 sm:px-6 lg:px-8 xl:px-10">
        {/* Header */}
        <div className="mb-9">
          <div className="mb-7 flex flex-col gap-5 rounded-2xl border border-gray-200 bg-white/95 px-5 py-5 shadow-[0_12px_35px_rgba(15,23,42,0.08)] 2xl:flex-row 2xl:items-center 2xl:justify-between xl:px-7">
            <div className="flex min-w-0 items-center gap-4">
              <button
                type="button"
                onClick={() => setShowMainMenu((prev) => !prev)}
                className="rounded-lg p-1.5 text-gray-900 transition hover:bg-gray-100"
                aria-label="Open market menu"
              >
                <Menu className="h-7 w-7" />
              </button>
              <EquisenseBrandLogo />
            </div>

            <form onSubmit={handleHeaderSearchSubmit} className="relative w-full max-w-xl 2xl:max-w-2xl">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-900" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value)
                  setShowSuggestions(true)
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => window.setTimeout(() => setShowSuggestions(false), 120)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    setShowSuggestions(false)
                  }
                }}
                placeholder="Search for a company"
                className="h-14 w-full rounded-full border border-gray-300 bg-gray-50 pl-12 pr-4 text-base font-semibold text-gray-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-12 z-50 max-h-72 overflow-y-auto rounded-2xl border border-gray-200 bg-white py-2 shadow-xl">
                  {filteredSuggestions.map((stock) => (
                    <button
                      key={stock}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setSearchTerm(stock)
                        setShowSuggestions(false)
                        handleSearch(stock)
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-semibold text-gray-800 transition hover:bg-blue-50"
                    >
                      <Search className="h-4 w-4 text-gray-400" />
                      <span>{stock}</span>
                    </button>
                  ))}
                </div>
              )}
            </form>

            <div className="grid shrink-0 grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-3 2xl:min-w-[430px] 2xl:justify-items-end">
              {marketIndices.map((item) => {
                const isDown = item.changePercent < 0
                return (
                  <div key={item.name} className="min-w-[130px] text-right">
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mb-0.5 flex items-center justify-end gap-1 text-xs font-bold uppercase text-gray-500 transition-colors hover:text-blue-600"
                      title={`Open ${item.name} chart on Dhan`}
                    >
                      {item.name}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <div className="whitespace-nowrap text-sm font-bold text-gray-950">
                      {item.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      <span className={`ml-2 ${isDown ? 'text-red-500' : 'text-emerald-600'}`}>
                        ({item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mb-2 flex items-center justify-between gap-4">
            <p className="text-lg text-gray-600">Search stocks, analyze investments, and predict prices</p>
            <div className="flex items-center gap-3">
              {!backendStatus.checking && (
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${
                  backendStatus.connected 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    backendStatus.connected ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  {backendStatus.connected ? 'Backend Connected' : 'Backend Offline'}
                </div>
              )}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowHeaderMenu(prev => !prev)}
                  className="p-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                  aria-label="Open Equisense information menu"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
                {showHeaderMenu && (
                  <div className="absolute right-0 top-12 z-50 w-56 rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveInfoPanel('about')
                        setShowHeaderMenu(false)
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-gray-700 hover:bg-blue-50 transition-colors"
                    >
                      <Info className="w-4 h-4 text-blue-600" />
                      About Equisense
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveInfoPanel('team')
                        setShowHeaderMenu(false)
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-gray-700 hover:bg-blue-50 transition-colors border-t border-gray-100"
                    >
                      <Users className="w-4 h-4 text-blue-600" />
                      Our Team
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          {!backendStatus.connected && !backendStatus.checking && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 font-semibold mb-1">Backend server not reachable</p>
              <p className="text-yellow-700 text-sm">
                The frontend could not reach <code className="bg-yellow-100 px-1 rounded">{BACKEND_DISPLAY_URL}</code>.
                If this is a deployed app, set <code className="bg-yellow-100 px-1 rounded">VITE_API_URL</code> to your backend URL or wait a few seconds for the backend to wake up.
              </p>
            </div>
          )}
        </div>

        <div className="mb-8">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-gray-950 sm:text-3xl">Live Market Movers</h1>
              <p className="mt-1 text-sm font-semibold text-gray-600">
                NSE prices refresh from the realtime price API and keep the home screen actionable.
              </p>
            </div>
            <div className="flex w-fit overflow-hidden rounded-lg border border-gray-300 bg-white">
              {SCREENER_EXCHANGES.map((exchange) => (
                <button
                  key={exchange}
                  type="button"
                  onClick={() => setScreenerExchange(exchange)}
                  className={`px-4 py-2 text-sm font-black transition ${
                    screenerExchange === exchange
                      ? 'bg-gray-950 text-white'
                      : 'text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  {exchange}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {HOME_MARKET_SECTIONS.map((section) => (
              <MarketMoverCard
                key={section.key}
                section={section}
                rows={homeMarketRows[section.key] || []}
                updatedAt={marketMoversUpdatedAt}
                loading={marketMoversLoading}
                onViewAll={() => {
                  setActiveScreener(section.key)
                  window.setTimeout(() => {
                    document.getElementById('market-screener')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }, 80)
                }}
                onSearch={(symbol) => {
                  setSearchTerm(symbol)
                  handleSearch(symbol)
                }}
              />
            ))}
          </div>
        </div>

        <StockOutlook />
        <StockDirectoryFooter
          onSearch={(symbol) => {
            setSearchTerm(symbol)
            handleSearch(symbol)
          }}
        />

        {activeInfoPanel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {activeInfoPanel === 'about' ? 'About Equisense' : 'Our Team'}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {activeInfoPanel === 'about' ? 'About the project' : 'Team contact details'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveInfoPanel(null)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <div className="p-5 space-y-5">
                {activeInfoPanel === 'about' ? (
                  <>
                    <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
                      <p className="text-sm leading-6 text-gray-700">{projectSummary}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="rounded-xl border border-gray-200 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">What It Does</p>
                        <p className="text-sm text-gray-700">Shows trend-based stock predictions, recommendations, charts, news sentiment, and virtual trading support.</p>
                      </div>
                      <div className="rounded-xl border border-gray-200 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Inquiry Email</p>
                        <p className="text-sm text-gray-700 break-all">equisense18@gmail.com</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                      <p className="text-sm font-semibold text-gray-800 mb-1">Equisense Project Team</p>
                      <p className="text-sm text-gray-600">Created by our team as an AI-powered stock analysis platform.</p>
                    </div>
                    <div className="space-y-2">
                      {teamMembers.map((member) => (
                        <div key={member.email} className="rounded-xl border border-gray-200 px-4 py-3">
                          <div className="flex items-start gap-3">
                            <Mail className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-gray-800">{member.name}</p>
                              <p className="text-sm text-gray-700 break-all">{member.email}</p>
                              {member.linkedin && (
                                <a
                                  href={member.linkedin}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-block mt-2 text-xs font-medium text-blue-600 hover:text-blue-800 underline"
                                >
                                  LinkedIn
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-xl border border-gray-200 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Project Inquiry</p>
                      <p className="text-sm text-gray-700 break-all">equisense18@gmail.com</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {showMainMenu && (
          <div className="fixed inset-0 z-50 bg-black/20" onClick={() => setShowMainMenu(false)}>
            <motion.aside
              initial={{ x: -420, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 280, damping: 28 }}
              onClick={(event) => event.stopPropagation()}
              className="h-full w-[min(100vw,430px)] overflow-y-auto border-r border-gray-200 bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between px-3 py-3">
                <div className="flex min-w-0 items-center gap-2">
                  <Home className="h-5 w-5 shrink-0 fill-gray-950 text-gray-950" />
                  <p className="truncate text-xl font-black tracking-tight text-gray-950">Equisense</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMainMenu(false)}
                  className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100"
                  aria-label="Close market menu"
                >
                  <X className="h-7 w-7" />
                </button>
              </div>

              <div className="px-2 pb-4">
                {MARKET_MENU_SECTIONS.map((section, sectionIndex) => {
                  const SectionIcon = section.icon
                  return (
                    <div key={section.title || `section-${sectionIndex}`} className={sectionIndex === 0 ? '' : 'mt-7'}>
                      {section.title && (
                        <div className="mb-4 flex items-center gap-2 px-2">
                          <SectionIcon className={`h-4 w-4 ${section.titleColor}`} />
                          <h2 className="text-lg font-black text-gray-500">{section.title}</h2>
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-2">
                        {section.items.map((item) => {
                          const Icon = item.icon
                          return (
                            <button
                              key={item.label}
                              type="button"
                              onClick={() => openScreener(item.label)}
                              className="flex h-[74px] min-w-0 flex-col items-center justify-center rounded-md border border-gray-200 bg-white px-1.5 py-2 text-center shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
                            >
                              {item.custom === 'gift' ? (
                                <span className="mb-1 flex h-8 items-center justify-center text-center text-[20px] font-black leading-[0.82]">
                                  <span>
                                    <span className="block text-orange-500">Gift</span>
                                    <span className="block text-indigo-800">Nifty</span>
                                  </span>
                                </span>
                              ) : item.custom === 'sgx' ? (
                                <span className="mb-1 flex h-8 items-center justify-center text-center text-[18px] font-black leading-[0.82] text-indigo-700">
                                  <span>
                                    <span className="block">SGX</span>
                                    <span className="block">NIFTY</span>
                                  </span>
                                </span>
                              ) : item.darkIcon ? (
                                <span className="mb-1 flex h-8 w-8 items-center justify-center rounded-lg bg-black">
                                  <Icon className="h-5 w-5 text-white" />
                                </span>
                              ) : item.badge ? (
                                <span className="mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500">
                                  <Icon className="h-5 w-5 text-white" />
                                </span>
                              ) : (
                                <Icon className={`mb-1 h-8 w-8 ${item.color}`} />
                              )}
                              <span className="max-w-full truncate text-[13px] font-semibold leading-tight text-gray-600">
                                {item.label}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.aside>
          </div>
        )}

        {activeScreener && (
          <div
            id="market-screener"
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-3 py-5 backdrop-blur-sm sm:px-5"
            onClick={() => setActiveScreener(null)}
          >
            <motion.section
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              onClick={(event) => event.stopPropagation()}
              className="relative flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-white/70 bg-white shadow-2xl"
            >
              <div className="flex flex-col gap-4 border-b border-gray-200 bg-white px-4 py-4 sm:px-6 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <h2 className="text-2xl font-black tracking-tight text-gray-950 sm:text-3xl">
                    {screenerExchange} {activeScreener} {screenerPeriod}
                  </h2>
                  <p className="mt-3 text-base font-semibold text-gray-500">
                    Last Updated At: {screenerUpdatedAt}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex overflow-hidden rounded-lg border border-blue-600">
                    {SCREENER_EXCHANGES.map((exchange) => (
                      <button
                        key={exchange}
                        type="button"
                        onClick={() => setScreenerExchange(exchange)}
                        className={`px-4 py-3 text-sm font-black transition ${
                          screenerExchange === exchange
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-blue-600 hover:bg-blue-50'
                        }`}
                      >
                        {exchange}
                      </button>
                    ))}
                  </div>
                  <div className="flex overflow-hidden rounded-lg border border-blue-600">
                    {SCREENER_PERIODS.map((period) => (
                      <button
                        key={period}
                        type="button"
                        onClick={() => setScreenerPeriod(period)}
                        className={`px-4 py-3 text-sm font-black transition ${
                          screenerPeriod === period
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-blue-600 hover:bg-blue-50'
                        }`}
                      >
                        {period}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveScreener(null)}
                  className="absolute right-5 top-5 shrink-0 rounded-full border border-gray-200 bg-white p-2 text-gray-500 shadow-sm transition hover:bg-gray-100 hover:text-gray-900"
                  aria-label="Close screener"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="border-b border-gray-200 bg-white px-4 pt-6 sm:px-6">
                <div className="flex gap-10 overflow-x-auto">
                  {SCREENER_TABS.map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveScreener(tab)}
                      className={`whitespace-nowrap border-b-2 px-4 py-3 text-lg font-black transition ${
                        activeScreener === tab
                          ? 'border-gray-950 bg-gray-100 text-gray-950'
                          : 'border-transparent text-gray-950 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-auto">
                <table className="min-w-[920px] w-full border-collapse text-left">
                  <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_#e5e7eb]">
                    <tr>
                      {['Company', 'CMP', 'Chg.', 'Chg(%)', '52W High', '52W Low', 'Volume'].map((heading) => (
                        <th key={heading} className="px-5 py-4 text-sm font-black text-gray-950">
                          <span className="inline-flex items-center gap-1">
                            {heading}
                            <ArrowUpDown className="h-3.5 w-3.5 text-gray-800" />
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {screenerRows.map((stock) => {
                      const isPositive = stock.change >= 0
                      return (
                        <tr key={stock.symbol} className="border-b border-gray-200 last:border-b-0 hover:bg-blue-50/50">
                          <td className="px-5 py-4">
                            <button
                              type="button"
                              onClick={() => {
                                setSearchTerm(stock.symbol)
                                setActiveScreener(null)
                                handleSearch(stock.symbol)
                              }}
                              className="text-left"
                            >
                              <span className="block text-base font-black text-blue-600 underline underline-offset-2">
                                {stock.symbol}
                              </span>
                              <span className="mt-1 block text-sm font-semibold text-gray-500">
                                {stock.name}
                              </span>
                            </button>
                          </td>
                          <td className="px-5 py-4 text-base font-semibold text-gray-950">{formatMarketNumber(stock.cmp)}</td>
                          <td className={`px-5 py-4 text-base font-semibold ${isPositive ? 'text-green-700' : 'text-red-600'}`}>
                            {isPositive ? formatMarketNumber(stock.change) : `-${formatMarketNumber(Math.abs(stock.change))}`}
                          </td>
                          <td className={`px-5 py-4 text-base font-semibold ${isPositive ? 'text-green-700' : 'text-red-600'}`}>
                            {isPositive ? '' : '-'}{formatMarketNumber(Math.abs(stock.changePct))}%
                          </td>
                          <td className="px-5 py-4 text-base font-semibold text-gray-950">{formatMarketNumber(stock.high52)}</td>
                          <td className="px-5 py-4 text-base font-semibold text-gray-950">{formatMarketNumber(stock.low52)}</td>
                          <td className="px-5 py-4 text-base font-semibold text-gray-950">{stock.volume}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </motion.section>
          </div>
        )}

        {activeNewsCategory && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-3 py-5 backdrop-blur-sm sm:px-5"
            onClick={() => setActiveNewsCategory(null)}
          >
            <motion.section
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              onClick={(event) => event.stopPropagation()}
              className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-white/70 bg-white shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4 border-b border-gray-200 bg-white px-4 py-4 sm:px-6">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-wide text-cyan-600">Market News</p>
                  <h2 className="mt-1 text-2xl font-black tracking-tight text-gray-950">{activeNewsCategory} News</h2>
                  <p className="mt-1 text-sm font-medium text-gray-500">Latest curated headlines for quick market context</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveNewsCategory(null)}
                  className="shrink-0 rounded-full border border-gray-200 bg-white p-2 text-gray-500 shadow-sm transition hover:bg-gray-100 hover:text-gray-900"
                  aria-label="Close news"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="border-b border-gray-200 bg-gray-50/80 px-3 sm:px-5">
                <div className="flex gap-2 overflow-x-auto py-3">
                  {NEWS_CATEGORIES.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setActiveNewsCategory(category)}
                      className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-black transition ${
                        activeNewsCategory === category
                          ? 'bg-cyan-600 text-white shadow-sm'
                          : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-auto bg-slate-50 p-4 sm:p-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {(NEWS_ITEMS[activeNewsCategory] || []).map((article, index) => (
                    <article
                      key={article.title}
                      className="flex min-h-[220px] flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-md"
                    >
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700">
                          {activeNewsCategory}
                        </span>
                        <span className="text-xs font-bold text-gray-400">{article.time}</span>
                      </div>
                      <h3 className="text-base font-black leading-snug text-gray-950">
                        {article.title}
                      </h3>
                      <p className="mt-3 flex-1 text-sm font-medium leading-6 text-gray-600">
                        {article.summary}
                      </p>
                      <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-3">
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-black text-blue-600 hover:text-blue-800"
                        >
                          {article.source}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <span className="text-xs font-black text-blue-600">#{index + 1}</span>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </motion.section>
          </div>
        )}

        {activeMarketTool && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-3 py-5 backdrop-blur-sm sm:px-5"
            onClick={() => setActiveMarketTool(null)}
          >
            <motion.section
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              onClick={(event) => event.stopPropagation()}
              className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-white/70 bg-white shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4 border-b border-gray-200 bg-white px-4 py-4 sm:px-6">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-wide text-emerald-600">Equisense Tools</p>
                  <h2 className="mt-1 text-2xl font-black tracking-tight text-gray-950">{activeMarketTool}</h2>
                  <p className="mt-1 text-sm font-medium text-gray-500">
                    {activeMarketTool === 'IPO'
                      ? 'Track upcoming IPO watchlist and issue details'
                      : activeMarketTool === 'Share Price'
                        ? 'Quick share price board for popular NSE stocks'
                        : 'AI-style watch signals with targets and risk levels'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveMarketTool(null)}
                  className="shrink-0 rounded-full border border-gray-200 bg-white p-2 text-gray-500 shadow-sm transition hover:bg-gray-100 hover:text-gray-900"
                  aria-label={`Close ${activeMarketTool}`}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="overflow-auto bg-slate-50 p-4 sm:p-6">
                {activeMarketTool === 'IPO' && (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {IPO_ITEMS.map((ipo) => (
                      <article key={ipo.company} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-black text-gray-950">{ipo.company}</h3>
                            <p className="mt-1 text-sm font-semibold text-gray-500">{ipo.type}</p>
                          </div>
                          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">{ipo.status}</span>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                          <div className="rounded-md bg-gray-50 p-3">
                            <p className="font-bold text-gray-500">Price Band</p>
                            <p className="mt-1 font-black text-gray-950">{ipo.priceBand}</p>
                          </div>
                          <div className="rounded-md bg-gray-50 p-3">
                            <p className="font-bold text-gray-500">Lot Size</p>
                            <p className="mt-1 font-black text-gray-950">{ipo.lot}</p>
                          </div>
                          <div className="rounded-md bg-gray-50 p-3">
                            <p className="font-bold text-gray-500">Open Date</p>
                            <p className="mt-1 font-black text-gray-950">{ipo.openDate}</p>
                          </div>
                          <div className="rounded-md bg-gray-50 p-3">
                            <p className="font-bold text-gray-500">Segment</p>
                            <p className="mt-1 font-black text-gray-950">{ipo.issueSize}</p>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}

                {activeMarketTool === 'Share Price' && (
                  <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                    <table className="min-w-[760px] w-full border-collapse text-left">
                      <thead className="bg-white shadow-[0_1px_0_#e5e7eb]">
                        <tr>
                          {['Company', 'Price', 'Change', 'Action'].map((heading) => (
                            <th key={heading} className="px-5 py-4 text-sm font-black text-gray-950">{heading}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {SHARE_PRICE_ITEMS.map((stock) => {
                          const isPositive = stock.changePct >= 0
                          return (
                            <tr key={stock.symbol} className="border-t border-gray-200 hover:bg-blue-50/50">
                              <td className="px-5 py-4">
                                <p className="text-base font-black text-gray-950">{stock.symbol}</p>
                                <p className="mt-1 text-sm font-semibold text-gray-500">{stock.name}</p>
                              </td>
                              <td className="px-5 py-4 text-base font-black text-gray-950">{currencySymbol}{formatMarketNumber(stock.price)}</td>
                              <td className={`px-5 py-4 text-base font-black ${isPositive ? 'text-green-700' : 'text-red-600'}`}>
                                {isPositive ? '+' : ''}{stock.changePct.toFixed(2)}%
                              </td>
                              <td className="px-5 py-4">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSearchTerm(stock.symbol)
                                    setActiveMarketTool(null)
                                    handleSearch(stock.symbol)
                                  }}
                                  className="rounded-md bg-gray-950 px-3 py-2 text-xs font-black text-white transition hover:bg-gray-800"
                                >
                                  Analyze
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeMarketTool === 'Unicorn Signals' && (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {UNICORN_SIGNAL_ITEMS.map((stock) => {
                      const signalClass = stock.signal === 'BUY'
                        ? 'bg-green-50 text-green-700 ring-green-200'
                        : stock.signal === 'AVOID'
                          ? 'bg-red-50 text-red-700 ring-red-200'
                          : stock.signal === 'WATCH'
                            ? 'bg-amber-50 text-amber-700 ring-amber-200'
                            : 'bg-blue-50 text-blue-700 ring-blue-200'
                      return (
                        <article key={stock.symbol} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="text-lg font-black text-gray-950">{stock.symbol}</h3>
                              <p className="mt-1 text-sm font-semibold text-gray-500">{stock.name}</p>
                            </div>
                            <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${signalClass}`}>{stock.signal}</span>
                          </div>
                          <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                            <div className="rounded-md bg-gray-50 p-3">
                              <p className="font-bold text-gray-500">Price</p>
                              <p className="mt-1 font-black text-gray-950">{currencySymbol}{formatMarketNumber(stock.price)}</p>
                            </div>
                            <div className="rounded-md bg-gray-50 p-3">
                              <p className="font-bold text-gray-500">Target</p>
                              <p className="mt-1 font-black text-green-700">{currencySymbol}{formatMarketNumber(stock.target)}</p>
                            </div>
                            <div className="rounded-md bg-gray-50 p-3">
                              <p className="font-bold text-gray-500">Stop Loss</p>
                              <p className="mt-1 font-black text-red-600">{currencySymbol}{formatMarketNumber(stock.stopLoss)}</p>
                            </div>
                          </div>
                          <p className="mt-4 text-sm font-semibold leading-6 text-gray-600">{stock.note}</p>
                          <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                            <span className="text-xs font-black text-gray-500">{stock.confidence}% confidence</span>
                            <button
                              type="button"
                              onClick={() => {
                                setSearchTerm(stock.symbol)
                                setActiveMarketTool(null)
                                handleSearch(stock.symbol)
                              }}
                              className="rounded-md bg-gray-950 px-3 py-2 text-xs font-black text-white transition hover:bg-gray-800"
                            >
                              Open Stock
                            </button>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                )}

                {['FII DII Data', 'Stockfact', 'Gift Nifty', 'Weekly Outlook', 'Stock Advisory', 'SGX Nifty'].includes(activeMarketTool) && (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-gray-50 px-4 py-16 text-center shadow-inner">
                    <Database className="mb-4 h-12 w-12 text-gray-300" />
                    <h3 className="text-xl font-black text-gray-800">Coming Soon</h3>
                    <p className="mt-2 max-w-md text-sm font-medium leading-relaxed text-gray-500">
                      We're currently integrating premium data feeds for {activeMarketTool}. This feature will be available in the next major update.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveMarketTool(null)}
                      className="mt-6 rounded-lg bg-cyan-600 px-6 py-2.5 text-sm font-black text-white shadow-sm hover:bg-cyan-700"
                    >
                      Return to Dashboard
                    </button>
                  </div>
                )}
              </div>
            </motion.section>
          </div>
        )}

        {selectedStockData && showStockModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-3 py-5 backdrop-blur-sm sm:px-5"
            onClick={() => setShowStockModal(false)}
          >
            <motion.section
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              onClick={(event) => event.stopPropagation()}
              className="flex max-h-[92vh] w-full max-w-[1500px] flex-col overflow-hidden rounded-xl border border-white/70 bg-slate-50 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4 border-b border-gray-200 bg-white px-4 py-4 sm:px-6">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-wide text-cyan-600">Stock Analysis</p>
                  <h2 className="mt-1 text-2xl font-black tracking-tight text-gray-950 sm:text-3xl">
                    {selectedStockData.symbol}
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-gray-500">
                    Chart, recommendation, calculator, sentiment, AI chat, and holdings in one popup.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowStockModal(false)}
                  className="shrink-0 rounded-full border border-gray-200 bg-white p-2 text-gray-500 shadow-sm transition hover:bg-gray-100 hover:text-gray-900"
                  aria-label="Close stock analysis"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="overflow-auto px-4 py-5 sm:px-6">
                <div className="mb-6">
                  <StockPriceChart
                    compact
                    priceData={priceHistory}
                    symbol={selectedStockData.symbol}
                    currentPrice={selectedStockData.price || stockPrices[selectedStockData.symbol]}
                    market={market}
                    onOpenTechnicalChart={handleViewChart}
                  />
                </div>

                <div className="mb-6">
                  <RecentPerformanceStrip priceData={dailyTrendHistory} maxItems={13} />
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  <div className="space-y-6 lg:col-span-2">
                    {selectedStockData.isLoading && (
                      <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-800">
                        Live market layers are still loading for {selectedStockData.symbol}. Price and recommendation cards will sharpen automatically.
                      </div>
                    )}

                    <TradingCall
                      symbol={selectedStockData.symbol}
                      currentPrice={selectedStockData.price || stockPrices[selectedStockData.symbol]}
                      prediction={selectedStockData.prediction}
                      predictionMetrics={predictionMetrics}
                      recommendation={recommendation}
                      market={market}
                      onAddToWatchlist={handleAddToWatchlist}
                      onVirtualTrade={handleVirtualTrade}
                    />

                    <CompanyInfo
                      symbol={selectedStockData.symbol}
                      market={market}
                      initialData={companyInfo}
                      expectedReturn={predictionMetrics?.expectedReturn}
                      confidence={selectedStockData.prediction?.confidence
                        ? selectedStockData.prediction.confidence >= 0.7
                          ? 'High confidence'
                          : selectedStockData.prediction.confidence >= 0.5
                            ? 'Moderate confidence'
                            : 'Low confidence'
                        : null}
                    />

                    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">Full Analysis Setup</h3>
                          <p className="text-sm font-medium text-gray-500">Set your amount and holding period before running the report.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAnalyze(selectedStockData.symbol)}
                          disabled={loading || !hasValidAnalysisInput}
                          className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {loading ? 'Analyzing...' : 'Run Full Analysis'}
                        </button>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block">
                          <span className="mb-1 block text-xs font-black uppercase tracking-wide text-gray-500">Investment Amount</span>
                          <div className="flex items-center rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100">
                            <span className="mr-2 text-sm font-bold text-gray-500">₹</span>
                            <input
                              type="number"
                              min="1"
                              step="500"
                              value={investmentAmount}
                              onChange={(event) => setInvestmentAmount(event.target.value)}
                              placeholder="Enter amount"
                              className="w-full bg-transparent text-base font-bold text-gray-950 outline-none"
                            />
                          </div>
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-xs font-black uppercase tracking-wide text-gray-500">Investment Period</span>
                          <div className="flex items-center rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100">
                            <input
                              type="number"
                              min="1"
                              max="3650"
                              step="1"
                              value={investmentPeriod}
                              onChange={(event) => setInvestmentPeriod(event.target.value)}
                              placeholder="Enter days"
                              className="w-full bg-transparent text-base font-bold text-gray-950 outline-none"
                            />
                            <span className="ml-2 text-sm font-bold text-gray-500">days</span>
                          </div>
                        </label>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {[
                          ['₹10k', '10000', null],
                          ['₹50k', '50000', null],
                          ['100k', '100000', null],
                          ['30D', null, '30'],
                          ['90D', null, '90'],
                          ['1Y', null, '365'],
                        ].map(([label, amount, period]) => (
                          <button
                            key={label}
                            type="button"
                            onClick={() => {
                              if (amount) setInvestmentAmount(amount)
                              if (period) setInvestmentPeriod(period)
                            }}
                            className="rounded-full border border-gray-200 px-3 py-1 text-xs font-black text-gray-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      {!hasValidAnalysisInput && (
                        <p className="mt-3 text-xs font-semibold text-amber-700">
                          Enter or select both amount and period to run backend full analysis.
                        </p>
                      )}
                    </div>

                    <NewsSentiment
                      symbol={selectedStockData.symbol}
                      market={market}
                      onFullAnalyze={handleAnalyze}
                      onViewChart={handleViewChart}
                      initialPayload={newsSentiment}
                      analyzing={loading}
                    />

                    <StockReturnCalculator
                      symbol={selectedStockData.symbol}
                      currentPrice={selectedStockData.price || stockPrices[selectedStockData.symbol]}
                      priceHistory={priceHistory}
                    />
                  </div>

                  <div className="space-y-6">
                    <RecommendationCard
                      symbol={selectedStockData.symbol}
                      market={market}
                      recommendationData={recommendation}
                      predictionMetrics={predictionMetrics}
                      prediction={selectedStockData.prediction}
                    />

                    <AIChat
                      symbol={selectedStockData.symbol}
                      currentPrice={selectedStockData.price || stockPrices[selectedStockData.symbol]}
                      recommendationData={recommendation}
                      predictionMetrics={predictionMetrics}
                      companyName={selectedStockData.name}
                    />

                    <ComparisonTable
                      currentSymbol={selectedStockData.symbol}
                      comparisonStocks={comparisonCandidates}
                      market={market}
                      onCompare={handleOpenComparison}
                    />

                    <DurationReturns
                      symbol={selectedStockData.symbol}
                      market={market}
                    />

                    <ShareholdingPattern
                      symbol={selectedStockData.symbol}
                      market={market}
                    />
                  </div>
                </div>
              </div>
            </motion.section>
          </div>
        )}



        {/* Analysis Report Modal */}
        {analysisResult && selectedStockForAnalysis && (
          <StockAnalysisReport
            symbol={selectedStockForAnalysis}
            analysis={analysisResult}
            investmentAmount={analysisInput?.investmentAmount}
            investmentPeriod={analysisInput?.investmentPeriod}
            market={market}
            recommendation={recommendation}
            priceHistory={priceHistory}
            onClose={() => {
              setAnalysisResult(null)
              setSelectedStockForAnalysis(null)
            }}
          />
        )}

        {/* Historical Analysis Modal */}
        {showHistorical && selectedStock && (
          <HistoricalAnalysis
            symbol={selectedStock}
            market={market}
            onClose={() => {
              setShowHistorical(false)
              setSelectedStock(null)
            }}
          />
        )}

        {showChart && selectedChartSymbol && (
          <CandlestickChart
            symbol={selectedChartSymbol}
            market={market}
            isModal
            onClose={() => {
              setShowChart(false)
              setSelectedChartSymbol(null)
            }}
          />
        )}

        {showComparisonModal && comparisonStocks.length > 0 && (
          <StockComparison
            stocks={comparisonStocks}
            onClose={() => setShowComparisonModal(false)}
            onRemoveStock={handleRemoveComparisonStock}
          />
        )}
      </div>
    </div>
  )
}

export default StockScreener
