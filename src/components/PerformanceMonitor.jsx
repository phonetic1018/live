import React, { useState, useEffect, useRef } from 'react'
import { performanceUtils, rateLimiter, errorHandler } from '../utils/supabaseClient'

const PerformanceMonitor = ({ isAdmin = false }) => {
  const [metrics, setMetrics] = useState({
    connectionHealth: true,
    activeConnections: 0,
    responseTime: 0,
    errorRate: 0,
    memoryUsage: 0,
    cpuUsage: 0
  })
  const [isVisible, setIsVisible] = useState(false)
  const [alerts, setAlerts] = useState([])
  const intervalRef = useRef(null)
  const healthCheckRef = useRef(null)

  useEffect(() => {
    // Start monitoring
    startMonitoring()
    
    return () => {
      stopMonitoring()
    }
  }, [])

  const startMonitoring = () => {
    // Check connection health every 30 seconds
    healthCheckRef.current = setInterval(async () => {
      try {
        const isHealthy = await performanceUtils.checkConnectionHealth()
        setMetrics(prev => ({ ...prev, connectionHealth: isHealthy }))
        
        if (!isHealthy) {
          addAlert('Connection health check failed', 'error')
        }
      } catch (error) {
        setMetrics(prev => ({ ...prev, connectionHealth: false }))
        addAlert('Connection health check error', 'error')
      }
    }, 30000)

    // Update metrics every 5 seconds
    intervalRef.current = setInterval(() => {
      updateMetrics()
    }, 5000)
  }

  const stopMonitoring = () => {
    if (healthCheckRef.current) {
      clearInterval(healthCheckRef.current)
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
  }

  const updateMetrics = () => {
    // Simulate metrics for demo (in real app, get from actual monitoring)
    const newMetrics = {
      ...metrics,
      activeConnections: Math.floor(Math.random() * 50) + 10, // Simulated
      responseTime: Math.floor(Math.random() * 200) + 50, // Simulated
      errorRate: Math.random() * 5, // Simulated
      memoryUsage: performance.memory ? (performance.memory.usedJSHeapSize / performance.memory.totalJSHeapSize) * 100 : 0,
      cpuUsage: Math.random() * 30 // Simulated
    }

    setMetrics(newMetrics)

    // Check for performance alerts
    checkPerformanceAlerts(newMetrics)
  }

  const checkPerformanceAlerts = (currentMetrics) => {
    if (currentMetrics.responseTime > 500) {
      addAlert('High response time detected', 'warning')
    }
    
    if (currentMetrics.errorRate > 2) {
      addAlert('High error rate detected', 'error')
    }
    
    if (currentMetrics.memoryUsage > 80) {
      addAlert('High memory usage detected', 'warning')
    }
    
    if (currentMetrics.activeConnections > 150) {
      addAlert('High connection count detected', 'info')
    }
  }

  const addAlert = (message, type = 'info') => {
    const alert = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date().toISOString()
    }
    
    setAlerts(prev => [alert, ...prev.slice(0, 4)]) // Keep only last 5 alerts
    
    // Auto-remove alert after 10 seconds
    setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.id !== alert.id))
    }, 10000)
  }

  const getStatusColor = (value, thresholds) => {
    if (value <= thresholds.good) return 'text-green-600'
    if (value <= thresholds.warning) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getStatusIcon = (value, thresholds) => {
    if (value <= thresholds.good) return '🟢'
    if (value <= thresholds.warning) return '🟡'
    return '🔴'
  }

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className="bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
          title="Show Performance Monitor"
        >
          📊
        </button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-80 max-h-96 overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <h3 className="font-semibold text-gray-900">Performance Monitor</h3>
          <div className="flex items-center space-x-2">
            <span className={`w-2 h-2 rounded-full ${metrics.connectionHealth ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Metrics */}
        <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
          {/* Connection Health */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Connection Health</span>
            <span className={`text-sm font-medium ${metrics.connectionHealth ? 'text-green-600' : 'text-red-600'}`}>
              {metrics.connectionHealth ? 'Healthy' : 'Unhealthy'}
            </span>
          </div>

          {/* Active Connections */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Active Connections</span>
            <span className={`text-sm font-medium ${getStatusColor(metrics.activeConnections, { good: 50, warning: 100 })}`}>
              {getStatusIcon(metrics.activeConnections, { good: 50, warning: 100 })} {metrics.activeConnections}
            </span>
          </div>

          {/* Response Time */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Response Time</span>
            <span className={`text-sm font-medium ${getStatusColor(metrics.responseTime, { good: 200, warning: 500 })}`}>
              {getStatusIcon(metrics.responseTime, { good: 200, warning: 500 })} {metrics.responseTime}ms
            </span>
          </div>

          {/* Error Rate */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Error Rate</span>
            <span className={`text-sm font-medium ${getStatusColor(metrics.errorRate, { good: 1, warning: 2 })}`}>
              {getStatusIcon(metrics.errorRate, { good: 1, warning: 2 })} {metrics.errorRate.toFixed(1)}%
            </span>
          </div>

          {/* Memory Usage */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Memory Usage</span>
            <span className={`text-sm font-medium ${getStatusColor(metrics.memoryUsage, { good: 60, warning: 80 })}`}>
              {getStatusIcon(metrics.memoryUsage, { good: 60, warning: 80 })} {metrics.memoryUsage.toFixed(1)}%
            </span>
          </div>

          {/* CPU Usage */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">CPU Usage</span>
            <span className={`text-sm font-medium ${getStatusColor(metrics.cpuUsage, { good: 20, warning: 50 })}`}>
              {getStatusIcon(metrics.cpuUsage, { good: 20, warning: 50 })} {metrics.cpuUsage.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Recent Alerts</h4>
            <div className="space-y-2">
              {alerts.map(alert => (
                <div key={alert.id} className={`text-xs p-2 rounded ${
                  alert.type === 'error' ? 'bg-red-100 text-red-800' :
                  alert.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {alert.message}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="border-t border-gray-200 p-3 bg-gray-50">
          <div className="flex space-x-2">
            <button
              onClick={() => {
                performanceUtils.cleanupCache()
                addAlert('Cache cleared', 'info')
              }}
              className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
            >
              Clear Cache
            </button>
            <button
              onClick={() => {
                rateLimiter.cleanup()
                addAlert('Rate limiter cleaned', 'info')
              }}
              className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
            >
              Clean Rate Limiter
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PerformanceMonitor
