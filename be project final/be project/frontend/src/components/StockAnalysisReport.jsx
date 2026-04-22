import React from 'react'
import { motion } from 'framer-motion'
import {
  X,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Brain,
  Shield,
  BarChart3,
  FileText,
  AlertCircle,
  CheckCircle2
} from 'lucide-react'
import RecommendationCard from './RecommendationCard'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

const normalizeRecommendationLabel = (value) => {
  const normalized = String(value || '').trim().toUpperCase()
  if (normalized === 'BUY') return 'BUY'
  if (normalized === 'AVOID') return 'AVOID'
  if (normalized === 'HOLD') return 'HOLD'
  return ''
}

const StockAnalysisReport = ({ symbol, analysis, investmentAmount, investmentPeriod, market, recommendation, onClose }) => {
  if (!analysis || !analysis.success) return null

  const report = analysis.report || {}
  const prediction = report.prediction || {}
  const agentReports = report.agent_reports || {}
  const effectiveMarket = report.market || market || (/\.NS$|\.BO$/i.test(symbol || '') ? 'IN' : 'US')
  const currencySymbol = effectiveMarket === 'IN' ? 'Rs' : '$'
  const currency = (value) => `${currencySymbol} ${Number(value || 0).toFixed(2)}`

  const expectedReturn = Number(report.expected_return ?? prediction.expected_return ?? agentReports.analyst?.expected_return ?? 0.2)
  const modeledRisk = Number(report.risk ?? prediction.risk ?? agentReports.analyst?.risk ?? 5.0)
  const score = Number(report.score ?? prediction.score ?? agentReports.analyst?.score ?? (expectedReturn / Math.max(modeledRisk, 0.5)))
  const currentPrice = Number(report.current_price ?? 0)
  const predictedPrice = Number(report.predicted_price ?? currentPrice)
  const safeInvestmentAmount = Number(investmentAmount ?? 0)
  const safeInvestmentPeriod = Math.max(1, Number(investmentPeriod ?? 1))
  const hasValidPrice = Number.isFinite(currentPrice) && currentPrice > 0

  const shares = hasValidPrice ? safeInvestmentAmount / currentPrice : 0
  const predictedValue = shares * predictedPrice
  const profitLoss = predictedValue - safeInvestmentAmount
  const profitLossPercent = safeInvestmentAmount > 0 ? (profitLoss / safeInvestmentAmount) * 100 : 0
  const priceChange = predictedPrice - currentPrice
  const priceChangePercent = hasValidPrice ? (priceChange / currentPrice) * 100 : 0

  const reportRecommendation = normalizeRecommendationLabel(
    recommendation?.recommendation ||
    report.recommendation ||
    agentReports.trader?.action
  )

  const recommendationFromReport = reportRecommendation || (
    expectedReturn > 0 && modeledRisk <= 8 && score > 0
      ? 'BUY'
      : expectedReturn < 0
        ? 'AVOID'
        : 'HOLD'
  )

  const recommendationColor =
    recommendationFromReport === 'BUY'
      ? 'green'
      : recommendationFromReport === 'AVOID'
        ? 'red'
        : 'yellow'

  const reportRecommendationData = {
    success: true,
    symbol,
    recommendation: recommendationFromReport,
    reason:
      recommendation?.reason ||
      agentReports.trader?.reasoning ||
      agentReports.auditor?.reasoning ||
      'Recommendation derived from the latest analysis report.',
    color: recommendationColor,
    score,
    expected_return: expectedReturn,
    risk: modeledRisk,
    confidence: Number((prediction.confidence ?? 0.5) * 100),
    signal: prediction.signal || 'Neutral'
  }

  const chartData = []
  for (let day = 0; day <= safeInvestmentPeriod; day += Math.max(1, Math.floor(safeInvestmentPeriod / 20))) {
    const progress = day / safeInvestmentPeriod
    const projectedPrice = currentPrice + (priceChange * progress)
    chartData.push({
      day,
      price: projectedPrice,
      value: shares * projectedPrice
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto border border-gray-200 shadow-xl"
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3 text-gray-900">
              <FileText className="w-6 h-6 text-blue-600" />
              Investment Analysis Report: {symbol}
            </h2>
            <p className="text-gray-600 mt-1">
              Investment: {currency(safeInvestmentAmount)} • Period: {safeInvestmentPeriod} days
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <RecommendationCard
            symbol={symbol}
            market={report.market || 'US'}
            recommendationData={reportRecommendationData}
            predictionMetrics={{
              expectedReturn,
              risk: modeledRisk,
              sharpeRatio: score
            }}
            prediction={prediction}
          />

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-gray-600 text-sm mb-2">Current Price</p>
              <p className="text-2xl font-bold text-gray-900">{hasValidPrice ? currency(currentPrice) : 'N/A'}</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-gray-600 text-sm mb-2">Predicted Price</p>
              <p className="text-2xl font-bold text-gray-900">{hasValidPrice ? currency(predictedPrice) : 'N/A'}</p>
              <p className={`text-sm mt-1 ${priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)} ({priceChangePercent >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%)
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-gray-600 text-sm mb-2">Predicted Value</p>
              <p className="text-2xl font-bold text-gray-900">{currency(predictedValue)}</p>
              <p className="text-sm text-gray-600 mt-1">{shares.toFixed(2)} shares</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={`bg-gray-50 rounded-lg p-4 border ${profitLoss >= 0 ? 'border-green-500/50' : 'border-red-500/50'}`}
            >
              <p className="text-gray-600 text-sm mb-2">Expected P/L</p>
              <div className="flex items-center gap-2">
                {profitLoss >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-green-600" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-600" />
                )}
                <div>
                  <p className={`text-2xl font-bold ${profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {profitLoss >= 0 ? '+' : ''}{currency(profitLoss)}
                  </p>
                  <p className={`text-sm ${profitLossPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {profitLossPercent >= 0 ? '+' : ''}{profitLossPercent.toFixed(2)}%
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Price Projection Over {safeInvestmentPeriod} Days</h3>
            {hasValidPrice ? (
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" stroke="#6b7280" />
                  <YAxis yAxisId="left" stroke="#6b7280" />
                  <YAxis yAxisId="right" orientation="right" stroke="#6b7280" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#374151' }}
                    formatter={(value, name) => {
                      if (name === 'price') return [currency(value), 'Price']
                      if (name === 'value') return [currency(value), 'Portfolio Value']
                      return [value, name]
                    }}
                  />
                  <Legend />
                  <Area yAxisId="left" type="monotone" dataKey="price" stroke="#3b82f6" fillOpacity={1} fill="url(#colorPrice)" name="Stock Price" />
                  <Area yAxisId="right" type="monotone" dataKey="value" stroke="#10b981" fillOpacity={1} fill="url(#colorValue)" name="Portfolio Value" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center rounded-lg border border-dashed border-gray-300 text-sm text-gray-500">
                Price projection is unavailable because the latest stock price could not be loaded.
              </div>
            )}
          </motion.div>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold flex items-center gap-2 text-gray-900">
              <Brain className="w-6 h-6 text-purple-600" />
              Agent Analysis Reports
            </h3>

            {agentReports.analyst && (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                  <Brain className="w-6 h-6 text-purple-600" />
                  <h4 className="text-lg font-semibold text-gray-900">Analyst Agent Report</h4>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between"><span className="text-gray-600">Signal:</span><span className="font-semibold">{agentReports.analyst.signal}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Confidence:</span><span className="font-semibold">{(Number(agentReports.analyst.confidence || 0) * 100).toFixed(1)}%</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Expected Return:</span><span className={`font-semibold ${expectedReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>{expectedReturn >= 0 ? '+' : ''}{expectedReturn.toFixed(2)}%</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Risk:</span><span className="font-semibold">{modeledRisk.toFixed(2)}/10</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Score:</span><span className="font-semibold">{score.toFixed(2)}</span></div>
                  {agentReports.analyst.reasoning && <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200"><p className="text-sm text-gray-700">{agentReports.analyst.reasoning}</p></div>}
                </div>
              </motion.div>
            )}

            {agentReports.trader && (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                  <DollarSign className="w-6 h-6 text-green-600" />
                  <h4 className="text-lg font-semibold text-gray-900">Trader Agent Report</h4>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between"><span className="text-gray-600">Recommended Action:</span><span className="font-semibold">{agentReports.trader.action}</span></div>
                  {agentReports.trader.recommended_shares ? <div className="flex justify-between"><span className="text-gray-600">Recommended Shares:</span><span className="font-semibold">{agentReports.trader.recommended_shares}</span></div> : null}
                  {agentReports.trader.reasoning && <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200"><p className="text-sm text-gray-700">{agentReports.trader.reasoning}</p></div>}
                </div>
              </motion.div>
            )}

            {agentReports.risk && (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="w-6 h-6 text-yellow-600" />
                  <h4 className="text-lg font-semibold text-gray-900">Risk Agent Report</h4>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between"><span className="text-gray-600">Risk Level:</span><span className="font-semibold">{agentReports.risk.risk_level}</span></div>
                  {Number.isFinite(agentReports.risk.volatility) ? <div className="flex justify-between"><span className="text-gray-600">Volatility:</span><span className="font-semibold">{(Number(agentReports.risk.volatility) * 100).toFixed(2)}%</span></div> : null}
                  {agentReports.risk.alerts && agentReports.risk.alerts.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {agentReports.risk.alerts.map((alert, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded">
                          <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5" />
                          <p className="text-sm text-yellow-700">{alert}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {agentReports.risk.reasoning && <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200"><p className="text-sm text-gray-700">{agentReports.risk.reasoning}</p></div>}
                </div>
              </motion.div>
            )}

            {agentReports.auditor && (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                  <h4 className="text-lg font-semibold text-gray-900">Auditor Agent Report</h4>
                </div>
                <div className="space-y-2">
                  {agentReports.auditor.expected_return !== undefined ? <div className="flex justify-between"><span className="text-gray-600">Expected Return:</span><span className={`font-semibold ${Number(agentReports.auditor.expected_return) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{Number(agentReports.auditor.expected_return) >= 0 ? '+' : ''}{Number(agentReports.auditor.expected_return).toFixed(2)}%</span></div> : null}
                  {agentReports.auditor.risk_score !== undefined ? <div className="flex justify-between"><span className="text-gray-600">Risk Score:</span><span className="font-semibold">{Number(agentReports.auditor.risk_score).toFixed(2)}/10</span></div> : null}
                  {agentReports.auditor.recommendation && (
                    <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5" />
                        <p className="text-sm text-gray-700">{agentReports.auditor.recommendation}</p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-gray-900">
              <FileText className="w-5 h-5 text-blue-600" />
              Investment Summary
            </h3>
            <div className="space-y-2 text-sm">
              <p className="text-gray-700">
                Based on the analysis of all agents, investing <span className="font-semibold">{currency(safeInvestmentAmount)}</span> in {symbol} for <span className="font-semibold">{safeInvestmentPeriod} days</span> is expected to result in:
              </p>
              <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600">Decision:</span>
                  <span className={`text-sm font-bold ${recommendationColor === 'green' ? 'text-green-600' : recommendationColor === 'red' ? 'text-red-600' : 'text-yellow-600'}`}>
                    {recommendationFromReport}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Expected Outcome:</span>
                  <span className={`text-xl font-bold ${profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {profitLoss >= 0 ? '+' : ''}{currency(profitLoss)} ({profitLossPercent >= 0 ? '+' : ''}{profitLossPercent.toFixed(2)}%)
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-gray-600">Final Portfolio Value:</span>
                  <span className="text-lg font-semibold text-gray-900">{currency(predictedValue)}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default StockAnalysisReport
