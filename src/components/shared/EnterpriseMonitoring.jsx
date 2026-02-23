/**
 * Enterprise Monitoring and Observability System
 * Comprehensive monitoring, alerting, and observability for production environments
 */

import { useState, useEffect } from 'react';
import logger from './structuredLogging';
import { performanceMonitor } from './performanceOptimization';
import { base44 } from '@/api/base44Client';

class HealthCheckManager {
  constructor() {
    this.checks = new Map();
    this.status = 'unknown';
    this.lastCheck = null;
    this.checkInterval = 30000;
    this.timeout = 5000;
    
    if (typeof window !== 'undefined') {
      this.initializeDefaultChecks();
      this.startHealthChecking();
    }
  }
  
  initializeDefaultChecks() {
    this.addCheck('memory_usage', async () => {
      if ('memory' in performance) {
        const memInfo = performance.memory;
        const usagePercent = (memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit) * 100;
        
        if (usagePercent > 90) {
          throw new Error(`High memory usage: ${usagePercent.toFixed(2)}%`);
        }
        
        return {
          status: 'healthy',
          usedMemory: memInfo.usedJSHeapSize,
          totalMemory: memInfo.totalJSHeapSize,
          usagePercent: usagePercent.toFixed(2)
        };
      }
      
      return { status: 'healthy', message: 'Memory API not available' };
    });
    
    this.addCheck('local_storage', async () => {
      try {
        const testKey = 'health_check_test';
        const testValue = Date.now().toString();
        
        localStorage.setItem(testKey, testValue);
        const retrieved = localStorage.getItem(testKey);
        localStorage.removeItem(testKey);
        
        if (retrieved !== testValue) {
          throw new Error('Local storage read/write test failed');
        }
        
        return { status: 'healthy' };
      } catch (error) {
        throw new Error(`Local storage check failed: ${error.message}`);
      }
    });
    
    this.addCheck('network_connectivity', async () => {
      if ('onLine' in navigator && !navigator.onLine) {
        throw new Error('Network is offline');
      }
      
      return {
        status: 'healthy',
        online: navigator.onLine
      };
    });
  }
  
  addCheck(name, checkFunction) {
    this.checks.set(name, {
      name,
      check: checkFunction,
      lastResult: null,
      lastRun: null,
      consecutiveFailures: 0
    });
  }
  
  removeCheck(name) {
    this.checks.delete(name);
  }
  
  async runCheck(name) {
    const checkConfig = this.checks.get(name);
    if (!checkConfig) {
      throw new Error(`Health check '${name}' not found`);
    }
    
    const start = Date.now();
    
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Health check timeout')), this.timeout)
      );
      
      const result = await Promise.race([
        checkConfig.check(),
        timeoutPromise
      ]);
      
      const duration = Date.now() - start;
      
      checkConfig.lastResult = {
        status: 'healthy',
        result,
        duration,
        timestamp: new Date().toISOString(),
        error: null
      };
      
      checkConfig.consecutiveFailures = 0;
      checkConfig.lastRun = Date.now();
      
      return checkConfig.lastResult;
    } catch (error) {
      const duration = Date.now() - start;
      
      checkConfig.consecutiveFailures++;
      checkConfig.lastResult = {
        status: 'unhealthy',
        result: null,
        duration,
        timestamp: new Date().toISOString(),
        error: error.message
      };
      
      checkConfig.lastRun = Date.now();
      
      logger.error(`Health check failed: ${name}`, {
        consecutiveFailures: checkConfig.consecutiveFailures,
        duration
      }, error);
      
      return checkConfig.lastResult;
    }
  }
  
  async runAllChecks() {
    const results = {};
    let overallStatus = 'healthy';
    
    for (const [name] of this.checks) {
      try {
        results[name] = await this.runCheck(name);
        if (results[name].status === 'unhealthy') {
          overallStatus = 'unhealthy';
        }
      } catch (error) {
        results[name] = {
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString()
        };
        overallStatus = 'unhealthy';
      }
    }
    
    this.status = overallStatus;
    this.lastCheck = Date.now();
    
    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: results
    };
  }
  
  startHealthChecking() {
    const runChecks = async () => {
      try {
        await this.runAllChecks();
      } catch (error) {
        logger.error('Health check cycle failed', {}, error);
      }
    };
    
    runChecks();
    setInterval(runChecks, this.checkInterval);
  }
  
  getHealthStatus() {
    return {
      status: this.status,
      lastCheck: this.lastCheck,
      checks: Array.from(this.checks.entries()).map(([name, config]) => ({
        name,
        lastResult: config.lastResult,
        consecutiveFailures: config.consecutiveFailures
      }))
    };
  }
}

class AlertManager {
  constructor() {
    this.rules = new Map();
    this.alerts = [];
    this.maxAlerts = 1000;
    this.channels = new Map();
    
    this.initializeDefaultRules();
    this.initializeChannels();
  }
  
  initializeDefaultRules() {
    this.addRule('high_response_time', {
      condition: (metrics) => {
        const avgResponseTime = performanceMonitor.getAverageMetric('apiResponse');
        return avgResponseTime && avgResponseTime > 2000;
      },
      severity: 'warning',
      message: 'High API response time detected',
      cooldown: 180000
    });
    
    this.addRule('high_memory_usage', {
      condition: (metrics) => {
        const memoryUsage = performanceMonitor.getAverageMetric('memoryUsage');
        if (!memoryUsage || !performance.memory) return false;
        
        const usagePercent = (memoryUsage / performance.memory.jsHeapSizeLimit) * 100;
        return usagePercent > 85;
      },
      severity: 'warning',
      message: 'High memory usage detected',
      cooldown: 300000
    });
    
    this.addRule('health_check_failure', {
      condition: (metrics, healthStatus) => {
        return healthStatus && healthStatus.status === 'unhealthy';
      },
      severity: 'critical',
      message: 'Health check failure detected',
      cooldown: 120000
    });
    
    this.addRule('poor_core_web_vitals', {
      condition: (metrics) => {
        const lcp = performanceMonitor.getAverageMetric('largestContentfulPaint');
        const cls = performanceMonitor.getAverageMetric('cumulativeLayoutShift');
        
        return (lcp && lcp > 2500) || (cls && cls > 0.1);
      },
      severity: 'warning',
      message: 'Poor Core Web Vitals detected',
      cooldown: 600000
    });
  }
  
  initializeChannels() {
    this.addChannel('console', {
      send: (alert) => {
        const level = alert.severity === 'critical' ? 'error' : 'warn';
        logger[level](`ALERT: ${alert.message}`, {
          rule: alert.rule,
          severity: alert.severity,
          timestamp: alert.timestamp,
          data: alert.data
        });
      }
    });
    
    this.addChannel('local_storage', {
      send: (alert) => {
        try {
          const alerts = JSON.parse(localStorage.getItem('steelbuild_alerts') || '[]');
          alerts.push(alert);
          
          if (alerts.length > 100) {
            alerts.splice(0, alerts.length - 100);
          }
          
          localStorage.setItem('steelbuild_alerts', JSON.stringify(alerts));
        } catch (error) {
          logger.error('Failed to store alert in localStorage', {}, error);
        }
      }
    });
  }
  
  addRule(name, rule) {
    this.rules.set(name, {
      ...rule,
      lastTriggered: null
    });
  }
  
  removeRule(name) {
    this.rules.delete(name);
  }
  
  addChannel(name, channel) {
    this.channels.set(name, channel);
  }
  
  removeChannel(name) {
    this.channels.delete(name);
  }
  
  async checkRules(metrics, healthStatus) {
    for (const [name, rule] of this.rules) {
      try {
        if (rule.lastTriggered && 
            Date.now() - rule.lastTriggered < rule.cooldown) {
          continue;
        }
        
        if (rule.condition(metrics, healthStatus)) {
          await this.triggerAlert(name, rule, metrics, healthStatus);
        }
      } catch (error) {
        logger.error(`Alert rule evaluation failed: ${name}`, {}, error);
      }
    }
  }
  
  async triggerAlert(ruleName, rule, metrics, healthStatus) {
    const alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      rule: ruleName,
      message: rule.message,
      severity: rule.severity,
      timestamp: new Date().toISOString(),
      data: {
        healthStatus
      }
    };
    
    this.alerts.unshift(alert);
    if (this.alerts.length > this.maxAlerts) {
      this.alerts.pop();
    }
    
    rule.lastTriggered = Date.now();
    
    for (const [channelName, channel] of this.channels) {
      try {
        await channel.send(alert);
      } catch (error) {
        logger.error(`Failed to send alert to channel: ${channelName}`, {}, error);
      }
    }
    
    logger.warn(`Alert triggered: ${ruleName}`, {
      alertId: alert.id,
      severity: alert.severity
    });
  }
  
  getAlerts(limit = 50) {
    return this.alerts.slice(0, limit);
  }
  
  getActiveRules() {
    return Array.from(this.rules.entries()).map(([name, rule]) => ({
      name,
      severity: rule.severity,
      message: rule.message,
      cooldown: rule.cooldown,
      lastTriggered: rule.lastTriggered
    }));
  }
  
  clearAlerts() {
    this.alerts = [];
    localStorage.removeItem('steelbuild_alerts');
  }
}

class EnterpriseMonitoring {
  constructor() {
    this.healthCheck = new HealthCheckManager();
    this.alertManager = new AlertManager();
    this.monitoringInterval = 60000;
    
    if (typeof window !== 'undefined') {
      this.startMonitoring();
    }
  }
  
  startMonitoring() {
    const monitor = async () => {
      try {
        const healthStatus = this.healthCheck.getHealthStatus();
        const metrics = {};
        
        await this.alertManager.checkRules(metrics, healthStatus);
        
        logger.info('Monitoring cycle completed', {
          healthStatus: healthStatus.status,
          alertCount: this.alertManager.getAlerts(1).length
        });
      } catch (error) {
        logger.error('Monitoring cycle failed', {}, error);
      }
    };
    
    monitor();
    setInterval(monitor, this.monitoringInterval);
  }
  
  getSystemStatus() {
    return {
      health: this.healthCheck.getHealthStatus(),
      alerts: this.alertManager.getAlerts(10),
      performance: performanceMonitor.generatePerformanceReport(),
      timestamp: new Date().toISOString()
    };
  }
  
  exportDiagnostics() {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      health: this.healthCheck.getHealthStatus(),
      alerts: this.alertManager.getAlerts(),
      performance: performanceMonitor.generatePerformanceReport(),
      logs: logger.getRecentLogs(100),
      environment: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        memory: performance.memory ? {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit
        } : null
      }
    };
    
    const blob = new Blob([JSON.stringify(diagnostics, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `steelbuild-diagnostics-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

const enterpriseMonitoring = new EnterpriseMonitoring();

export function MonitoringDashboard() {
  const [systemStatus, setSystemStatus] = useState(null);
  const [refreshInterval] = useState(30000);
  
  useEffect(() => {
    const updateStatus = () => {
      setSystemStatus(enterpriseMonitoring.getSystemStatus());
    };
    
    updateStatus();
    const interval = setInterval(updateStatus, refreshInterval);
    
    return () => clearInterval(interval);
  }, [refreshInterval]);
  
  const handleExportDiagnostics = () => {
    enterpriseMonitoring.exportDiagnostics();
  };
  
  const clearAlerts = () => {
    enterpriseMonitoring.alertManager.clearAlerts();
    setSystemStatus(enterpriseMonitoring.getSystemStatus());
  };
  
  if (!systemStatus) return <div>Loading monitoring data...</div>;
  
  return (
    <div className="monitoring-dashboard p-6 bg-zinc-900 rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">System Monitoring</h2>
        <div className="flex gap-2">
          <button
            onClick={clearAlerts}
            className="px-4 py-2 bg-yellow-500 text-black rounded hover:bg-yellow-600">
            Clear Alerts
          </button>
          <button
            onClick={handleExportDiagnostics}
            className="px-4 py-2 bg-amber-500 text-black rounded hover:bg-amber-600">
            Export Diagnostics
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className={`p-4 rounded ${systemStatus.health.status === 'healthy' ? 'bg-green-900/50' : 'bg-red-900/50'}`}>
          <h3 className="font-semibold mb-2 text-white">System Health</h3>
          <div className={`text-lg font-bold ${systemStatus.health.status === 'healthy' ? 'text-green-400' : 'text-red-400'}`}>
            {systemStatus.health.status.toUpperCase()}
          </div>
          <div className="text-sm text-zinc-400">
            Last Check: {systemStatus.health.lastCheck ? new Date(systemStatus.health.lastCheck).toLocaleTimeString() : 'Never'}
          </div>
        </div>
        
        <div className="p-4 rounded bg-blue-900/50">
          <h3 className="font-semibold mb-2 text-white">Active Alerts</h3>
          <div className="text-lg font-bold text-blue-400">
            {systemStatus.alerts.length}
          </div>
          <div className="text-sm text-zinc-400">
            {systemStatus.alerts.filter(a => a.severity === 'critical').length} Critical
          </div>
        </div>
        
        <div className="p-4 rounded bg-purple-900/50">
          <h3 className="font-semibold mb-2 text-white">Performance</h3>
          <div className="text-lg font-bold text-purple-400">
            {systemStatus.performance.coreWebVitals.lcp ? 
              `${systemStatus.performance.coreWebVitals.lcp.toFixed(0)}ms` : 'N/A'}
          </div>
          <div className="text-sm text-zinc-400">LCP Score</div>
        </div>
        
        <div className="p-4 rounded bg-orange-900/50">
          <h3 className="font-semibold mb-2 text-white">Memory Usage</h3>
          <div className="text-lg font-bold text-orange-400">
            {systemStatus.performance.performance.memoryUsage ? 
              `${(systemStatus.performance.performance.memoryUsage / 1024 / 1024).toFixed(1)}MB` : 'N/A'}
          </div>
          <div className="text-sm text-zinc-400">JS Heap</div>
        </div>
      </div>
      
      {systemStatus.alerts.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-white">Recent Alerts</h3>
          <div className="space-y-2">
            {systemStatus.alerts.slice(0, 5).map(alert => (
              <div key={alert.id} className={`p-3 rounded border-l-4 ${
                alert.severity === 'critical' ? 'border-red-500 bg-red-900/30' :
                alert.severity === 'warning' ? 'border-yellow-500 bg-yellow-900/30' :
                'border-blue-500 bg-blue-900/30'
              }`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-white">{alert.message}</div>
                    <div className="text-sm text-zinc-400">
                      Rule: {alert.rule} | {new Date(alert.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    alert.severity === 'critical' ? 'bg-red-500 text-white' :
                    alert.severity === 'warning' ? 'bg-yellow-500 text-black' :
                    'bg-blue-500 text-white'
                  }`}>
                    {alert.severity.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div>
        <h3 className="text-lg font-semibold mb-3 text-white">Health Checks</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {systemStatus.health.checks.map(check => (
            <div key={check.name} className={`p-3 rounded border ${
              check.lastResult?.status === 'healthy' ? 'border-green-800 bg-green-900/30' : 'border-red-800 bg-red-900/30'
            }`}>
              <div className="flex justify-between items-center">
                <div className="font-medium text-white">{check.name.replace(/_/g, ' ').toUpperCase()}</div>
                <div className={`w-3 h-3 rounded-full ${
                  check.lastResult?.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
              </div>
              {check.lastResult && (
                <div className="text-sm text-zinc-400 mt-1">
                  {check.lastResult.error || 'Healthy'} 
                  {check.lastResult.duration && ` (${check.lastResult.duration}ms)`}
                </div>
              )}
              {check.consecutiveFailures > 0 && (
                <div className="text-sm text-red-400 mt-1">
                  {check.consecutiveFailures} consecutive failures
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export {
  HealthCheckManager,
  AlertManager,
  EnterpriseMonitoring,
  enterpriseMonitoring
};

export default enterpriseMonitoring;