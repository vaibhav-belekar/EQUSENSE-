import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Bell, BellOff, Plus, X, AlertCircle, CheckCircle2, Settings } from 'lucide-react'
import toast from 'react-hot-toast'

const AlertsPanel = () => {
  const [alerts, setAlerts] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [newAlert, setNewAlert] = useState({
    symbol: '',
    type: 'price',
    value: '',
    condition: 'above'
  })

  // Load alerts from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('alerts')
    if (saved) {
      setAlerts(JSON.parse(saved))
    }
  }, [])

  // Check alerts periodically
  useEffect(() => {
    const checkAlerts = async () => {
      // This would check current prices and trigger alerts
      // For now, we'll simulate it
      alerts.forEach(alert => {
        if (alert.enabled) {
          // Check if alert condition is met
          // If yes, show notification
        }
      })
    }

    const interval = setInterval(checkAlerts, 30000) // Check every 30 seconds
    return () => clearInterval(interval)
  }, [alerts])

  const addAlert = () => {
    if (!newAlert.symbol || !newAlert.value) {
      toast.error('Please fill all fields')
      return
    }

    const alert = {
      id: Date.now(),
      ...newAlert,
      enabled: true,
      created: new Date().toISOString(),
      triggered: false
    }

    const updated = [...alerts, alert]
    setAlerts(updated)
    localStorage.setItem('alerts', JSON.stringify(updated))
    setShowAddModal(false)
    setNewAlert({ symbol: '', type: 'price', value: '', condition: 'above' })
    toast.success('Alert created!')
  }

  const toggleAlert = (id) => {
    const updated = alerts.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a)
    setAlerts(updated)
    localStorage.setItem('alerts', JSON.stringify(updated))
  }

  const deleteAlert = (id) => {
    const updated = alerts.filter(a => a.id !== id)
    setAlerts(updated)
    localStorage.setItem('alerts', JSON.stringify(updated))
    toast.success('Alert deleted')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800 rounded-lg p-6 border border-gray-700"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Bell className="w-5 h-5 text-yellow-500" />
          Alerts & Notifications
        </h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Alert
        </button>
      </div>

      {alerts.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No alerts set</p>
          <p className="text-sm mt-2">Create alerts to get notified about price changes</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-gray-700 rounded-lg p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3 flex-1">
                <button
                  onClick={() => toggleAlert(alert.id)}
                  className={alert.enabled ? 'text-yellow-500' : 'text-gray-500'}
                >
                  {alert.enabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                </button>
                <div>
                  <p className="font-semibold">{alert.symbol}</p>
                  <p className="text-sm text-gray-400">
                    {alert.type === 'price' ? 'Price' : alert.type === 'signal' ? 'Signal Change' : 'Risk'} 
                    {' '}
                    {alert.condition === 'above' ? 'above' : 'below'} ₹{alert.value}
                  </p>
                </div>
              </div>
              <button
                onClick={() => deleteAlert(alert.id)}
                className="text-gray-400 hover:text-red-400"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Alert Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Create New Alert</h3>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="alert-symbol" className="block text-sm text-gray-400 mb-2">Stock Symbol</label>
                <input
                  id="alert-symbol"
                  name="alert-symbol"
                  type="text"
                  value={newAlert.symbol}
                  onChange={(e) => setNewAlert({ ...newAlert, symbol: e.target.value.toUpperCase() })}
                  placeholder="AAPL"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="alert-type" className="block text-sm text-gray-400 mb-2">Alert Type</label>
                <select
                  id="alert-type"
                  name="alert-type"
                  value={newAlert.type}
                  onChange={(e) => setNewAlert({ ...newAlert, type: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="price">Price Alert</option>
                  <option value="signal">Signal Change</option>
                  <option value="risk">Risk Level</option>
                </select>
              </div>

              <div>
                <label htmlFor="alert-condition" className="block text-sm text-gray-400 mb-2">Condition</label>
                <select
                  id="alert-condition"
                  name="alert-condition"
                  value={newAlert.condition}
                  onChange={(e) => setNewAlert({ ...newAlert, condition: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="above">Above</option>
                  <option value="below">Below</option>
                </select>
              </div>

              <div>
                <label htmlFor="alert-value" className="block text-sm text-gray-400 mb-2">Value</label>
                <input
                  id="alert-value"
                  name="alert-value"
                  type="number"
                  value={newAlert.value}
                  onChange={(e) => setNewAlert({ ...newAlert, value: e.target.value })}
                  placeholder={newAlert.type === 'price' ? 'Price' : 'Threshold'}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={addAlert}
                className="flex-1 bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2"
              >
                Create Alert
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setNewAlert({ symbol: '', type: 'price', value: '', condition: 'above' })
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 rounded-lg px-4 py-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}

export default AlertsPanel

