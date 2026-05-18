export const chatDatabase = [
  { q: "can i buy tcs stock now", a: "TCS is showing stable movement. Check RSI, trend strength, and market sentiment before buying. If momentum is bullish and volume increases, it may be a good entry opportunity." },
  { q: "is reliance bullish today", a: "Reliance appears bullish if price is trading above key moving averages with strong buying volume." },
  { q: "should i hold infosys", a: "If Infosys maintains support levels and trend remains positive, holding can be considered. Watch for weakness near resistance." },
  { q: "what is the trend of hdfc bank", a: "HDFC Bank trend depends on price action and moving averages. Current momentum suggests monitoring support and breakout levels." },
  { q: "is it sector strong today", a: "The IT sector is strong when major IT stocks show positive momentum, higher volume, and bullish market sentiment." },
  { q: "which stock is best for swing trading", a: "Stocks with strong momentum, breakout patterns, and volume spikes are generally better for swing trading." },
  { q: "which stock has breakout today", a: "A breakout occurs when price crosses resistance with strong volume confirmation." },
  { q: "is nifty bullish or bearish", a: "NIFTY is bullish if trading above important support and moving averages with positive market breadth." },
  { q: "what is the support level of tcs", a: "Support is the price zone where buying interest increases and prevents further decline." },
  { q: "what is resistance level for reliance", a: "Resistance is the level where selling pressure may increase and slow upward movement." },
  { q: "what is rsi of tcs", a: "RSI measures momentum. Above 70 indicates overbought conditions, below 30 suggests oversold." },
  { q: "is macd bullish for infosys", a: "A bullish MACD crossover suggests upward momentum may continue." },
  { q: "is sbi overbought", a: "If RSI is above 70 and price rises sharply, SBI may be overbought." },
  { q: "which stock has strong volume breakout", a: "Stocks showing sudden price increase with unusually high volume often indicate breakout strength." },
  { q: "is tata motors in uptrend", a: "An uptrend exists when price forms higher highs and higher lows consistently." },
  { q: "which stock has golden crossover", a: "A golden crossover happens when the 50-day moving average crosses above the 200-day moving average." },
  { q: "which stock is oversold", a: "Oversold stocks usually have RSI below 30 and may be near reversal zones." },
  { q: "is banknifty weak today", a: "BankNifty may appear weak if banking stocks show selling pressure and lower highs." },
  { q: "what are best breakout stocks today", a: "Breakout stocks generally have strong momentum, increased volume, and bullish candle formations." },
  { q: "which stock has highest momentum", a: "Momentum leaders are stocks showing rapid price movement with strong buyer participation." },
  { q: "will tcs go up tomorrow", a: "Short-term direction depends on market sentiment, technical indicators, and sector performance." },
  { q: "can reliance hit new high", a: "If bullish momentum and buying volume continue, Reliance may attempt new highs." },
  { q: "is infosys good for long term", a: "Infosys is often considered strong fundamentally with long-term growth potential." },
  { q: "will market crash tomorrow", a: "Market crashes are difficult to predict accurately. Risk management is important." },
  { q: "is this a fake breakout", a: "A fake breakout happens when price crosses resistance but quickly falls back below it." },
  { q: "can nifty recover", a: "If support levels hold and buying momentum returns, NIFTY recovery is possible." },
  { q: "which stock can give 5% move", a: "High volatility and breakout stocks have higher chances of large price movement." },
  { q: "is adani power bullish", a: "Bullish confirmation depends on trend continuation, volume strength, and resistance breakout." },
  { q: "will hdfc bank bounce back", a: "If support levels remain strong and buyers return, a bounce-back is possible." },
  { q: "is tata steel good buy now", a: "Tata Steel may be attractive during bullish commodity cycles and strong technical setups." },
  { q: "what stop loss should i keep", a: "Stop loss should be placed below key support levels to manage downside risk." },
  { q: "what is safe entry price", a: "A safer entry is usually near support zones or confirmed breakouts." },
  { q: "is risk high in this stock", a: "Risk increases when volatility is high and trend direction is unclear." },
  { q: "should i average my loss", a: "Averaging should only be considered if fundamentals and trend remain strong." },
  { q: "when should i exit trade", a: "Consider exiting when target is achieved or technical indicators turn weak." },
  { q: "is this trade safe", a: "No trade is fully safe. Proper position sizing and stop loss are essential." },
  { q: "how much quantity should i buy", a: "Position size should depend on capital, risk tolerance, and stop loss distance." },
  { q: "which stocks are low risk", a: "Large-cap fundamentally strong stocks are generally considered lower risk." },
  { q: "is market volatile today", a: "High volatility is identified through large price swings and increased trading activity." },
  { q: "how to avoid fake breakout", a: "Wait for volume confirmation and candle close above breakout level." },
  { q: "best long term stock in india", a: "Strong companies with consistent growth, profitability, and market leadership are preferred for long-term investing." },
  { q: "which sector is strongest", a: "Sector strength depends on momentum, institutional buying, and economic trends." },
  { q: "is pharma sector good now", a: "Pharma sector strength depends on demand, exports, and defensive market sentiment." },
  { q: "which stocks are undervalued", a: "Undervalued stocks trade below their estimated intrinsic value." },
  { q: "is tcs good for 5 years", a: "TCS is often viewed as a stable long-term IT company with strong fundamentals." },
  { q: "best dividend stock", a: "Companies with stable earnings and regular dividend history are preferred dividend stocks." },
  { q: "which stock has strong fundamentals", a: "Strong fundamentals include revenue growth, profit growth, low debt, and strong cash flow." },
  { q: "is it sector weak now", a: "IT sector weakness can occur due to global slowdown or reduced tech spending." },
  { q: "which stocks fiis are buying", a: "Stocks with strong institutional inflows usually attract FII interest." },
  { q: "which stock is best for sip investment", a: "Stable fundamentally strong companies are commonly preferred for SIP investing." },
  { q: "thank you", a: "You're welcome. It's my pleasure helping traders and investors." },
  { q: "thanks", a: "You're welcome. It's my pleasure helping traders and investors." },
  { q: "ok", a: "Great. I'm always monitoring the market for you." },
  { q: "okay", a: "Great. I'm always monitoring the market for you." },
  { q: "nice", a: "Thank you. I’ll continue providing intelligent market insights." },
  { q: "good bot", a: "Thank you. Helping traders is my work." },
  { q: "bye", a: "Goodbye trader. Stay disciplined and trade smart." },
  { q: "goodbye", a: "Goodbye trader. Stay disciplined and trade smart." }
];

export const findDatabaseResponse = (text) => {
  const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const exactMatch = chatDatabase.find(item => item.q === normalized);
  if (exactMatch) return exactMatch.a;
  
  // Try partial match if no exact match
  const partialMatch = chatDatabase.find(item => normalized.includes(item.q));
  if (partialMatch) return partialMatch.a;

  return null;
};
