import React, { useEffect, useState } from 'react'
import { Toaster } from 'react-hot-toast'
import { ExternalLink } from 'lucide-react'
import StockScreener from './components/StockScreener'
import { initializeEcosystem, getRealtimePrice } from './services/api'

const MARKET_TICKER_ITEMS = [
  { symbol: 'BAJAJFINSV', price: 1794.6, change: 1.37, sourceUrl: 'https://dhan.co/stocks/bajaj-finserv-ltd-chart/' },
  { symbol: 'BPCL', price: 298.85, change: -0.98, sourceUrl: 'https://dhan.co/stocks/bharat-petroleum-corporation-ltd-chart/' },
  { symbol: 'NESTLEIND', price: 1477.8, change: 1.42, sourceUrl: 'https://dhan.co/stocks/nestle-india-ltd-chart/' },
  { symbol: 'HDFCLIFE', price: 594.1, change: 0.98, sourceUrl: 'https://dhan.co/stocks/hdfc-life-insurance-company-ltd-chart/' },
  { symbol: 'DMART', price: 4376.5, change: 10.63, sourceUrl: 'https://dhan.co/stocks/avenue-supermarts-ltd-chart/' },
  { symbol: 'ICICIBANK', price: 1432.6, change: 0.83, sourceUrl: 'https://dhan.co/stocks/icici-bank-ltd-chart/' },
  { symbol: 'KOTAKBANK', price: 371.65, change: -11.73, sourceUrl: 'https://dhan.co/stocks/kotak-mahindra-bank-ltd-chart/' },
  { symbol: 'HINDUNILVR', price: 2327.4, change: 0.78, sourceUrl: 'https://dhan.co/stocks/hindustan-unilever-ltd-chart/' },
  { symbol: 'BHARTIARTL', price: 1868.4, change: 0.78, sourceUrl: 'https://dhan.co/stocks/bharti-airtel-ltd-chart/' },
  { symbol: 'M&M', price: 3210.8, change: 3.36, sourceUrl: 'https://dhan.co/stocks/mahindra-mahindra-ltd-chart/' },
  { symbol: 'TCS', price: 3850.5, change: 1.25, sourceUrl: 'https://dhan.co/stocks/tata-consultancy-services-ltd-chart/' },
  { symbol: 'RELIANCE', price: 2950.4, change: 0.50, sourceUrl: 'https://dhan.co/stocks/reliance-industries-ltd-chart/' },
  { symbol: 'SBIN', price: 820.3, change: -0.45, sourceUrl: 'https://dhan.co/stocks/state-bank-of-india-chart/' },
  { symbol: 'INFY', price: 1450.2, change: 0.88, sourceUrl: 'https://dhan.co/stocks/infosys-ltd-chart/' },
  { symbol: 'TATAMOTORS', price: 980.5, change: 2.10, sourceUrl: 'https://dhan.co/stocks/tata-motors-ltd-chart/' },
]

const MarketTicker = () => {
  const [marketTickerItems, setMarketTickerItems] = useState(MARKET_TICKER_ITEMS)

  useEffect(() => {
    let isMounted = true

    const refreshTickerPrices = async () => {
      const results = await Promise.allSettled(
        MARKET_TICKER_ITEMS.map(async (item) => {
          const quote = await getRealtimePrice(item.symbol, 'IN')
          const price = Number(quote?.price ?? quote?.current_price)
          const changePercent = Number(
            quote?.change_percent ??
            quote?.changePercent ??
            quote?.percent_change ??
            quote?.change_pct
          )

          if (!quote?.success || !Number.isFinite(price) || price <= 0) {
            return item
          }

          return {
            ...item,
            price,
            change: Number.isFinite(changePercent) ? changePercent : item.change,
          }
        })
      )

      if (!isMounted) return
      setMarketTickerItems(results.map((result, index) => (
        result.status === 'fulfilled' ? result.value : MARKET_TICKER_ITEMS[index]
      )))
    }

    refreshTickerPrices()
    const intervalId = window.setInterval(refreshTickerPrices, 30000)
    return () => {
      isMounted = false
      window.clearInterval(intervalId)
    }
  }, [])

  const tickerItems = [...marketTickerItems, ...marketTickerItems]

  return (
    <div className="sticky top-0 z-40 overflow-hidden border-b border-gray-800 bg-black text-white">
      <div className="market-ticker-track flex w-max items-center gap-16 py-2">
        {tickerItems.map((item, index) => {
          const isUp = item.change >= 0
          return (
            <a
              key={`${item.symbol}-${index}`}
              href={item.sourceUrl}
              target="_blank"
              rel="noreferrer"
              title={`Open ${item.symbol} chart on Dhan`}
              className="flex shrink-0 flex-col gap-1.5 rounded px-1 transition-opacity hover:opacity-80"
            >
              <div className="flex items-center gap-1.5 text-base font-black leading-none text-gray-100">
                <ExternalLink className="h-3.5 w-3.5" />
                {item.symbol}
              </div>
              <div className={`flex items-center gap-1 text-base font-black leading-none ${isUp ? 'text-green-500' : 'text-red-500'}`}>
                <span>{Number(item.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span>({isUp ? '+' : ''}{item.change.toFixed(2)}%)</span>
                <span className={`h-0 w-0 border-x-[5px] border-x-transparent ${isUp ? 'border-b-[7px] border-b-green-500' : 'border-t-[7px] border-t-red-500'}`} />
              </div>
            </a>
          )
        })}
      </div>
    </div>
  )
}

function App() {
  useEffect(() => {
    // Set document title
    document.title = 'Equisense - Stock Screener & Investment Analyzer'
    
    // Try to initialize ecosystem in background (non-blocking)
    const init = async () => {
      try {
        console.log('Attempting to initialize ecosystem...')
        const result = await initializeEcosystem()
        console.log('Initialization result:', result)
        if (result && result.success) {
          console.log('Ecosystem initialized successfully')
        } else {
          console.warn('Initialization returned no success:', result)
        }
      } catch (error) {
        // Don't block the app if initialization fails - it's optional for the screener
        console.warn('Ecosystem initialization failed (non-blocking):', error.message)
        console.warn('The stock screener will work independently')
      }
    }
    
    // Initialize in background without blocking
    init()
  }, [])

  return (
    <div className="min-h-screen bg-[#f6f9ff]">
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: '#fff',
            color: '#374151',
            border: '1px solid #e5e7eb',
          },
        }}
      />
      <MarketTicker />
      <StockScreener />
    </div>
  )
}

export default App
