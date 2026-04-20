import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Calculator, DollarSign, TrendingUp, Calendar, Percent } from 'lucide-react'

const InvestmentCalculator = () => {
  const [inputs, setInputs] = useState({
    principal: '10000',
    rate: '10',
    time: '1',
    compoundFrequency: '12', // monthly
    additionalContribution: '0',
    contributionFrequency: 'monthly'
  })

  const [results, setResults] = useState(null)

  const calculate = () => {
    const P = parseFloat(inputs.principal) || 0
    const r = parseFloat(inputs.rate) / 100 || 0
    const t = parseFloat(inputs.time) || 0
    const n = parseFloat(inputs.compoundFrequency) || 12
    const PMT = parseFloat(inputs.additionalContribution) || 0
    const freq = inputs.contributionFrequency === 'monthly' ? 12 : 
                 inputs.contributionFrequency === 'quarterly' ? 4 :
                 inputs.contributionFrequency === 'yearly' ? 1 : 12

    // Compound interest formula: A = P(1 + r/n)^(nt)
    const compoundAmount = P * Math.pow(1 + r / n, n * t)

    // Future value of annuity (additional contributions)
    let annuityValue = 0
    if (PMT > 0) {
      const periods = t * freq
      const periodicRate = r / freq
      if (periodicRate > 0) {
        annuityValue = PMT * ((Math.pow(1 + periodicRate, periods) - 1) / periodicRate)
      } else {
        annuityValue = PMT * periods
      }
    }

    const totalValue = compoundAmount + annuityValue
    const totalInvested = P + (PMT * t * freq)
    const totalInterest = totalValue - totalInvested
    const roi = totalInvested > 0 ? (totalInterest / totalInvested) * 100 : 0

    setResults({
      totalValue,
      totalInvested,
      totalInterest,
      roi,
      compoundAmount,
      annuityValue
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800 rounded-lg p-6 border border-gray-700"
    >
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Calculator className="w-5 h-5 text-blue-500" />
        Investment Calculator
      </h2>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="principal-amount" className="block text-sm text-gray-400 mb-2">Principal Amount (₹)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                id="principal-amount"
                name="principal-amount"
                type="number"
                value={inputs.principal}
                onChange={(e) => setInputs({ ...inputs, principal: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="10000"
              />
            </div>
          </div>

          <div>
            <label htmlFor="interest-rate" className="block text-sm text-gray-400 mb-2">Annual Interest Rate (%)</label>
            <div className="relative">
              <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                id="interest-rate"
                name="interest-rate"
                type="number"
                value={inputs.rate}
                onChange={(e) => setInputs({ ...inputs, rate: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="10"
                step="0.1"
              />
            </div>
          </div>

          <div>
            <label htmlFor="time-period" className="block text-sm text-gray-400 mb-2">Time Period (Years)</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                id="time-period"
                name="time-period"
                type="number"
                value={inputs.time}
                onChange={(e) => setInputs({ ...inputs, time: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="1"
                step="0.1"
              />
            </div>
          </div>

          <div>
            <label htmlFor="compound-frequency" className="block text-sm text-gray-400 mb-2">Compound Frequency</label>
            <select
              id="compound-frequency"
              name="compound-frequency"
              value={inputs.compoundFrequency}
              onChange={(e) => setInputs({ ...inputs, compoundFrequency: e.target.value })}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1">Annually</option>
              <option value="2">Semi-Annually</option>
              <option value="4">Quarterly</option>
              <option value="12">Monthly</option>
              <option value="365">Daily</option>
            </select>
          </div>

          <div>
            <label htmlFor="additional-contribution" className="block text-sm text-gray-400 mb-2">Additional Contribution (₹)</label>
            <input
              id="additional-contribution"
              name="additional-contribution"
              type="number"
              value={inputs.additionalContribution}
              onChange={(e) => setInputs({ ...inputs, additionalContribution: e.target.value })}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
          </div>

          <div>
            <label htmlFor="contribution-frequency" className="block text-sm text-gray-400 mb-2">Contribution Frequency</label>
            <select
              id="contribution-frequency"
              name="contribution-frequency"
              value={inputs.contributionFrequency}
              onChange={(e) => setInputs({ ...inputs, contributionFrequency: e.target.value })}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        </div>

        <button
          onClick={calculate}
          className="w-full bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2 font-semibold flex items-center justify-center gap-2"
        >
          <Calculator className="w-4 h-4" />
          Calculate
        </button>

        {/* Results */}
        {results && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-700 rounded-lg p-6 border border-gray-600 mt-4"
          >
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Calculation Results
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Total Value</p>
                <p className="text-2xl font-bold mt-2">₹{results.totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              
              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Total Invested</p>
                <p className="text-2xl font-bold mt-2">₹{results.totalInvested.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              
              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Total Interest</p>
                <p className={`text-2xl font-bold mt-2 ${results.totalInterest >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  ₹{results.totalInterest.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              
              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-gray-400 text-sm">ROI</p>
                <p className={`text-2xl font-bold mt-2 ${results.roi >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {results.roi >= 0 ? '+' : ''}{results.roi.toFixed(2)}%
                </p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-600">
              <p className="text-sm text-gray-400">
                From principal: ₹{results.compoundAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              {results.annuityValue > 0 && (
                <p className="text-sm text-gray-400 mt-1">
                  From contributions: ₹{results.annuityValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

export default InvestmentCalculator

