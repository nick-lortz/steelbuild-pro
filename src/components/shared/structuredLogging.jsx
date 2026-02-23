/**
 * Enterprise Logging System
 * Structured logging with multiple levels and outputs
 */

class EnterpriseLogger {
  constructor() {
    this.logLevel = this.getLogLevel();
    this.sessionId = this.generateSessionId();
    this.userId = null;
    this.projectId = null;
    this.logBuffer = [];
    this.maxBufferSize = 1000;
    
    // Initialize log shipping if configured
    this.initializeLogShipping();
  }
  
  getLogLevel() {
    const env = import.meta.env?.MODE || 'production';
    const levels = {
      development: 'debug',
      staging: 'info',
      production: 'warn'
    };
    return levels[env] || 'warn';
  }
  
  generateSessionId() {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  
  setContext(context) {
    if (context.userId) this.userId = context.userId;
    if (context.projectId) this.projectId = context.projectId;
  }
  
  createLogEntry(level, message, data = {}, error = null) {
    const timestamp = new Date().toISOString();
    const entry = {
      timestamp,
      level,
      message,
      sessionId: this.sessionId,
      userId: this.userId,
      projectId: this.projectId,
      url: window?.location?.href,
      userAgent: navigator?.userAgent,
      data,
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
          cause: error.cause
        }
      })
    };
    
    return entry;
  }
  
  shouldLog(level) {
    const levels = ['debug', 'info', 'warn', 'error', 'critical'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }
  
  log(level, message, data = {}, error = null) {
    if (!this.shouldLog(level)) return;
    
    const entry = this.createLogEntry(level, message, data, error);
    
    // Add to buffer
    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }
    
    // Console output (formatted for readability)
    this.outputToConsole(entry);
    
    // Ship to external service if configured
    this.shipLog(entry);
    
    // Store critical errors locally
    if (level === 'error' || level === 'critical') {
      this.storeErrorLocally(entry);
    }
  }
  
  outputToConsole(entry) {
    const { level, timestamp, message, data, error } = entry;
    const timeStr = new Date(timestamp).toLocaleTimeString();
    const prefix = `[${timeStr}] [${level.toUpperCase()}]`;
    
    switch (level) {
      case 'debug':
        console.debug(prefix, message, data);
        break;
      case 'info':
        console.info(prefix, message, data);
        break;
      case 'warn':
        console.warn(prefix, message, data);
        break;
      case 'error':
      case 'critical':
        console.error(prefix, message, data, error);
        break;
      default:
        console.log(prefix, message, data);
    }
  }
  
  initializeLogShipping() {
    this.logEndpoint = import.meta.env?.VITE_LOG_ENDPOINT;
    this.logApiKey = import.meta.env?.VITE_LOG_API_KEY;
    
    if (this.logEndpoint && this.logApiKey) {
      setInterval(() => this.flushLogs(), 30000);
      window.addEventListener('beforeunload', () => this.flushLogs());
    }
  }
  
  async shipLog(entry) {
    if (!this.logEndpoint || entry.level === 'debug') return;
    
    try {
      if (navigator.sendBeacon) {
        const payload = JSON.stringify(entry);
        navigator.sendBeacon(this.logEndpoint, payload);
      } else {
        fetch(this.logEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.logApiKey}`
          },
          body: JSON.stringify(entry),
          keepalive: true
        }).catch(() => {});
      }
    } catch (e) {
      // Ignore shipping errors
    }
  }
  
  flushLogs() {
    if (!this.logEndpoint || this.logBuffer.length === 0) return;
    
    const logsToShip = this.logBuffer.filter(entry => entry.level !== 'debug');
    if (logsToShip.length === 0) return;
    
    try {
      const payload = JSON.stringify({ logs: logsToShip });
      if (navigator.sendBeacon) {
        navigator.sendBeacon(this.logEndpoint + '/batch', payload);
      }
    } catch (e) {
      // Ignore
    }
  }
  
  storeErrorLocally(entry) {
    try {
      const key = `steelbuild_error_${Date.now()}`;
      const stored = { ...entry, stored_at: new Date().toISOString() };
      localStorage.setItem(key, JSON.stringify(stored));
      
      const errorKeys = Object.keys(localStorage)
        .filter(key => key.startsWith('steelbuild_error_'))
        .sort()
        .slice(0, -50);
      
      errorKeys.forEach(key => localStorage.removeItem(key));
    } catch (e) {
      // Ignore
    }
  }
  
  debug(message, data = {}) {
    this.log('debug', message, data);
  }
  
  info(message, data = {}) {
    this.log('info', message, data);
  }
  
  warn(message, data = {}) {
    this.log('warn', message, data);
  }
  
  error(message, data = {}, error = null) {
    this.log('error', message, data, error);
  }
  
  critical(message, data = {}, error = null) {
    this.log('critical', message, data, error);
  }
  
  performance(operation, duration, data = {}) {
    this.info(`Performance: ${operation}`, {
      ...data,
      duration_ms: duration,
      type: 'performance'
    });
  }
  
  security(event, data = {}) {
    this.warn(`Security: ${event}`, { ...data, type: 'security' });
  }
  
  business(event, data = {}) {
    this.info(`Business: ${event}`, { ...data, type: 'business' });
  }
  
  userAction(action, data = {}) {
    this.info(`User Action: ${action}`, { ...data, type: 'user_action' });
  }
  
  apiCall(method, url, status, duration, data = {}) {
    const level = status >= 400 ? 'error' : 'info';
    this.log(level, `API Call: ${method} ${url}`, {
      ...data,
      method,
      url,
      status,
      duration_ms: duration,
      type: 'api_call'
    });
  }
  
  getRecentLogs(count = 100) {
    return this.logBuffer.slice(-count);
  }
  
  exportLogs() {
    const logs = this.getRecentLogs();
    const blob = new Blob([JSON.stringify(logs, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `steelbuild-logs-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

const logger = new EnterpriseLogger();

if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    logger.error('Uncaught Error', {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    }, event.error);
  });

  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled Promise Rejection', {
      reason: event.reason
    });
  });
}

export default logger;