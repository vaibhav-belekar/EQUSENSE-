import React from 'react'
import { motion } from 'framer-motion'
import { Brain, DollarSign, Shield, BarChart3, CheckCircle2 } from 'lucide-react'

const AgentStatus = ({ agentStatus }) => {
  if (!agentStatus) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-gray-800 rounded-lg p-6 border border-gray-700"
      >
        <h2 className="text-xl font-bold mb-4">Agent Status</h2>
        <p className="text-gray-400">Loading agent status...</p>
      </motion.div>
    )
  }

  const agents = [
    {
      name: 'Analyst Agent',
      icon: Brain,
      status: agentStatus.agents?.analyst?.status || 'unknown',
      details: [
        { label: 'Predictions', value: agentStatus.agents?.analyst?.predictions_count || 0 },
        { label: 'Models Trained', value: agentStatus.agents?.analyst?.models_trained ? 'Yes' : 'No' },
      ],
      color: 'text-purple-500',
    },
    {
      name: 'Trader Agent',
      icon: DollarSign,
      status: agentStatus.agents?.trader?.status || 'unknown',
      details: [
        { label: 'Capital', value: `$${agentStatus.agents?.trader?.capital?.toLocaleString() || 0}` },
        { label: 'Total Trades', value: agentStatus.agents?.trader?.total_trades || 0 },
      ],
      color: 'text-green-500',
    },
    {
      name: 'Risk Agent',
      icon: Shield,
      status: agentStatus.agents?.risk?.status || 'unknown',
      details: [
        { label: 'Alerts', value: agentStatus.agents?.risk?.alerts_count || 0 },
        { label: 'Status', value: 'Monitoring' },
      ],
      color: 'text-yellow-500',
    },
    {
      name: 'Auditor Agent',
      icon: BarChart3,
      status: agentStatus.agents?.auditor?.status || 'unknown',
      details: [
        { label: 'Records', value: agentStatus.agents?.auditor?.records_count || 0 },
        { label: 'Status', value: 'Tracking' },
      ],
      color: 'text-blue-500',
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800 rounded-lg p-6 border border-gray-700"
    >
      <h2 className="text-xl font-bold mb-4">Agent Status</h2>
      <div className="space-y-4">
        {agents.map((agent, index) => {
          const Icon = agent.icon
          return (
            <motion.div
              key={agent.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-gray-700 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${agent.color}`} />
                  <span className="font-semibold">{agent.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-500 capitalize">{agent.status}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {agent.details.map((detail, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span className="text-gray-400">{detail.label}:</span>
                    <span className="font-medium">{detail.value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}

export default AgentStatus

