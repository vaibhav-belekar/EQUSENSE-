import React, { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Send, X, Bot } from 'lucide-react'
import { findDatabaseResponse } from '../utils/chatDatabase'

const AIChat = ({ symbol, currentPrice, recommendationData, predictionMetrics, companyName, onClose }) => {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesContainerRef = useRef(null)

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

  const handleSend = (text) => {
    const userText = text || input
    if (!userText.trim()) return

    setMessages(prev => [...prev, { text: userText, sender: 'user' }])
    setInput('')
    setIsTyping(true)

    // Mock AI response with real-time data context
    setTimeout(() => {
      try {
        let response = "I'm analyzing the latest data."
        const lowerText = userText.toLowerCase()
        const predictionMetrics = recommendationData?.predictionMetrics || null;
        
        const priceStr = currentPrice ? `₹${currentPrice}` : 'unavailable'
      let recStr = 'HOLD'
      if (recommendationData && recommendationData.recommendation) {
          recStr = String(recommendationData.recommendation).toUpperCase()
      }
      
      const dbResponse = findDatabaseResponse(userText);
      
      if (dbResponse) {
          response = dbResponse;
      } else if (lowerText === 'hello' || lowerText === 'hi' || lowerText === 'hey') {
          response = "Hello trader. Which stock would you like to analyze today?"
      } else if (lowerText === 'how are you' || lowerText === 'how are you?') {
          response = "I'm actively monitoring market trends and ready to assist you."
      } else if (lowerText === 'thank you' || lowerText === 'thanks' || lowerText === 'thanks!') {
          response = "You're welcome. It's my pleasure helping traders and investors."
      } else if (lowerText === 'ok' || lowerText === 'okay') {
          response = "Great. I'm always monitoring the market for you."
      } else if (lowerText === 'nice') {
          response = "Thank you. I’ll continue providing intelligent market insights."
      } else if (lowerText === 'good bot' || lowerText === 'great bot') {
          response = "Thank you. Helping traders is my work."
      } else if (lowerText.includes('should i invest all money')) {
          response = "Diversification is important. Investing all capital into one stock increases risk."
      } else if (lowerText.includes('guaranteed profit stock')) {
          response = "No stock can guarantee profit. Proper risk management is essential."
      } else if (lowerText.includes('who made you') || lowerText.includes('who created you') || lowerText.includes('who is your creator')) {
          response = "I was designed as an AI-powered stock market assistant for intelligent trading support."
      } else if (lowerText.includes('panic') || lowerText.includes('crash')) {
          response = "Please stay calm. The market is naturally volatile. Panicking often leads to poor emotional decisions. Let's review the data logically and see if your stop-loss or fundamental thesis has changed."
      } else if (lowerText.includes('best stock today') || lowerText.includes('top bullish') || lowerText.includes('strong')) {
          response = "Based on volume breakouts, RSI strength, and positive momentum, some strong sectors right now include IT and Banking. However, I always recommend verifying trend continuation before entry."
      } else if (lowerText === 'rsi' || lowerText === 'what is rsi' || lowerText === 'what is rsi?') {
          response = "RSI measures momentum. Above 70 means overbought. Below 30 means oversold."
      } else if (lowerText === 'macd' || lowerText === 'what is macd' || lowerText === 'what is macd?') {
          response = "MACD helps detect trend changes and momentum."
      } else if (lowerText.includes('moving average')) {
          response = "Moving averages help identify overall market direction."
      } else if (lowerText.match(/buy|purchase|invest|analyze|analysis|acquire|get|adding|add|what about/)) {
          const conf = predictionMetrics?.confidence ? predictionMetrics.confidence : 71.6;
          const rsiVal = recStr === 'BUY' ? '58 (Bullish)' : recStr === 'SELL' ? '78 (Overbought)' : '50 (Neutral)';
          const macdVal = recStr === 'BUY' ? 'Bullish Crossover' : recStr === 'SELL' ? 'Bearish Crossover' : 'Flat';
          const volVal = recStr === 'BUY' ? 'High Volume Breakout' : 'Average';
          const maVal = recStr === 'BUY' ? 'Price above 50 EMA' : 'Price below 50 EMA';
          
          const entry = currentPrice ? Number(currentPrice) : 1000.00;
          const expReturn = Number(predictionMetrics?.expectedReturn || 0.05);
          const riskLevelNum = Number(predictionMetrics?.risk || 5);
          
          const stopLossPercent = Math.min(Math.max(riskLevelNum / 150, 0.012), 0.03);
          const targetPercent = Math.min(Math.max(Math.abs(expReturn) / 100, 0.02), 0.06);

          let target, stopLoss;
          if (recStr === 'SELL') {
              stopLoss = (entry * (1 + stopLossPercent)).toFixed(2);
              target = (entry * (1 - targetPercent)).toFixed(2);
          } else {
              stopLoss = (entry * (1 - stopLossPercent)).toFixed(2);
              target = (entry * (1 + targetPercent)).toFixed(2);
          }
          
          const entryStr = entry.toFixed(2);
          const riskLevelStr = riskLevelNum < 4 ? 'Low' : riskLevelNum > 7 ? 'High' : 'Medium';
          
          const trend = recStr === 'BUY' ? 'Bullish' : recStr === 'SELL' ? 'Bearish' : 'Sideways';
          
          let reason = "Current signals are unclear. I suggest waiting for confirmation.";
          if (recStr === 'BUY') reason = "Price trend indicates upward momentum. Confidence is supportive for a bullish setup.";
          if (recStr === 'SELL') reason = "Momentum is weakening and risk levels suggest caution. Better to avoid new positions.";
          
          response = `Stock: ${symbol}

Current Trend:
- ${trend}

ML Trend Confidence:
- ${conf}%

Indicators:
- RSI: ${rsiVal}
- MACD: ${macdVal}
- Volume: ${volVal}
- Moving Average Trend: ${maVal}

Recommendation:
- ${recStr}

Suggested Entry:
₹${entryStr}

Target:
₹${target}

Stop Loss:
₹${stopLoss}

Risk Level:
${riskLevelStr}

Reason:
${reason}

Disclaimer:
This AI analysis is for educational purposes only and not financial advice.`;
      } else if (lowerText.match(/price|cost|value|worth/)) {
          response = `The current real-time price of ${symbol} is ${priceStr}.`
      } else if (lowerText.match(/trend|direction|outlook|future|predict/)) {
          const trend = recStr === 'BUY' ? 'Bullish' : recStr === 'SELL' ? 'Bearish' : 'Sideways';
          response = `The current trend for ${symbol} aligns with a ${trend} (${recStr}) recommendation based on our latest real-time technical analysis layers.`
      } else if (lowerText.match(/risk|safe|dangerous|volatile|sharpe/)) {
          response = `The calculated risk (Std Dev) is ${predictionMetrics?.risk?.toFixed(1) || 'N/A'}% with a Sharpe Ratio of ${predictionMetrics?.sharpeRatio?.toFixed(2) || 'N/A'}.`
      } else if (lowerText.match(/iran|war|peace|geopolitics|gold/)) {
          response = `Geopolitical tensions typically drive investors towards safe-haven assets like Gold. However, their impact on ${symbol} depends on its sector exposure. Expect heightened market volatility.`
      } else {
          response = `I'm an AI assistant monitoring ${symbol} at ${priceStr}. My models suggest a ${recStr} stance right now. You can ask me if it's a good time to buy, sell, or ask about the current trend.`
      }

      setMessages(prev => [...prev, { text: response, sender: 'ai' }])
      } catch (err) {
        console.error("AI Chat Engine Error:", err)
        setMessages(prev => [...prev, { text: "I'm sorry, I ran into an error analyzing that. Please try asking again.", sender: 'ai' }])
      } finally {
        setIsTyping(false)
      }
    }, 1200)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden flex flex-col h-[420px]"
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-[#2563eb]" />
          <h3 className="text-lg font-bold text-gray-900">AI Chat</h3>
        </div>
        {onClose && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
            </button>
        )}
      </div>

      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 flex flex-col bg-gray-50/50 scroll-smooth">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center pb-4">
            <motion.div 
              animate={{ 
                y: [0, -15, 0],
                scale: [1, 1.1, 1],
              }}
              transition={{ 
                repeat: Infinity, 
                duration: 2.5, 
                ease: "easeInOut" 
              }}
              className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 via-pink-300 to-blue-400 opacity-90 blur-[1px] mb-6 shadow-lg shadow-purple-200" 
            />
            <h4 className="text-xl font-bold text-gray-900 mb-6">What can I help with?</h4>
            <div className="flex flex-col gap-3 w-full">
              <button 
                onClick={() => handleSend(`How does U.S.-Iran peace deal talk affect GOLD prices?`)}
                className="bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 p-3 rounded-xl border border-gray-200 text-center shadow-sm"
              >
                How does U.S.-Iran peace deal talk affect GOLD prices?
              </button>
              <button 
                onClick={() => handleSend(`What is the real-time trend for ${symbol}?`)}
                className="bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 p-3 rounded-xl border border-gray-200 text-center shadow-sm"
              >
                What is the real-time trend for {symbol}?
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap ${
                  msg.sender === 'user' 
                    ? 'bg-[#2563eb] text-white rounded-tr-sm' 
                    : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-100 shadow-sm px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1.5 items-center h-10">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div />
          </div>
        )}
      </div>

      <div className="p-3 border-t border-gray-100 bg-white">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask a question"
            className="w-full pl-4 pr-12 py-3 bg-white border-2 border-blue-100 rounded-full text-sm font-medium text-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors shadow-sm"
          />
          <button 
            onClick={() => handleSend()}
            disabled={!input.trim()}
            className="absolute right-1.5 w-9 h-9 bg-[#2563eb] text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-[#2563eb] transition-colors flex items-center justify-center shadow-md"
          >
            <Send className="w-4 h-4 ml-[-2px]" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

export default AIChat
