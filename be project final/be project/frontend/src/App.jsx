import React, { useState, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import StockScreener from './components/StockScreener'
import { initializeEcosystem } from './services/api'

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
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
      <StockScreener />
    </div>
  )
}

export default App

