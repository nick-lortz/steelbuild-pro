// Crash Reporter - Platform agnostic integration point
class CrashReporter {
  constructor() {
    this.provider = null;
    this.context = {};
    this.breadcrumbs = [];
    this.maxBreadcrumbs = 50;
    
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  init() {
    // Auto-detect and initialize crash reporting provider
    // Priority: Sentry > Firebase Crashlytics > Bugsnag > Local
    
    if (window.Sentry) {
      this.provider = 'sentry';
      console.log('Crash reporting: Sentry detected');
    } else if (window.firebase?.crashlytics) {
      this.provider = 'firebase';
      console.log('Crash reporting: Firebase Crashlytics detected');
    } else if (window.Bugsnag) {
      this.provider = 'bugsnag';
      console.log('Crash reporting: Bugsnag detected');
    } else {
      this.provider = 'local';
      console.log('Crash reporting: Using local fallback');
      this.setupLocalReporting();
    }
  }

  setupLocalReporting() {
    // Local crash reporting fallback
    this.crashes = [];
    
    window.addEventListener('error', (event) => {
      this.reportCrash({
        message: event.message,
        source: event.filename,
        line: event.lineno,
        column: event.colno,
        stack: event.error?.stack,
        type: 'error'
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.reportCrash({
        message: event.reason?.message || 'Unhandled Promise Rejection',
        stack: event.reason?.stack,
        type: 'unhandledrejection'
      });
    });
  }

  setUser(user) {
    this.context.user = {
      id: user.id || user.email,
      email: user.email,
      role: user.role
    };

    switch (this.provider) {
      case 'sentry':
        window.Sentry?.setUser(this.context.user);
        break;
      case 'firebase':
        window.firebase?.crashlytics()?.setUserId(this.context.user.id);
        break;
      case 'bugsnag':
        window.Bugsnag?.setUser(this.context.user.id, this.context.user.email);
        break;
    }
  }

  setContext(key, value) {
    this.context[key] = value;

    switch (this.provider) {
      case 'sentry':
        window.Sentry?.setContext(key, value);
        break;
      case 'firebase':
        window.firebase?.crashlytics()?.setCustomKey(key, JSON.stringify(value));
        break;
      case 'bugsnag':
        window.Bugsnag?.addMetadata(key, value);
        break;
    }
  }

  addBreadcrumb(message, data = {}, level = 'info') {
    const breadcrumb = {
      message,
      data,
      level,
      timestamp: Date.now()
    };

    this.breadcrumbs.push(breadcrumb);
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }

    switch (this.provider) {
      case 'sentry':
        window.Sentry?.addBreadcrumb({
          message,
          data,
          level
        });
        break;
      case 'firebase':
        window.firebase?.crashlytics()?.log(`${level}: ${message}`);
        break;
      case 'bugsnag':
        window.Bugsnag?.leaveBreadcrumb(message, data);
        break;
    }
  }

  reportCrash(error, context = {}) {
    const crashReport = {
      ...error,
      context: { ...this.context, ...context },
      breadcrumbs: this.breadcrumbs.slice(-10), // Last 10 breadcrumbs
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    switch (this.provider) {
      case 'sentry':
        window.Sentry?.captureException(new Error(error.message), {
          contexts: crashReport.context,
          extra: { breadcrumbs: crashReport.breadcrumbs }
        });
        break;
        
      case 'firebase':
        window.firebase?.crashlytics()?.recordError(new Error(error.message));
        break;
        
      case 'bugsnag':
        window.Bugsnag?.notify(new Error(error.message), (event) => {
          event.context = crashReport.context;
          event.addMetadata('breadcrumbs', crashReport.breadcrumbs);
        });
        break;
        
      case 'local':
        this.crashes.push(crashReport);
        console.error('Crash reported:', crashReport);
        this.persistCrash(crashReport);
        break;
    }
  }

  persistCrash(crash) {
    try {
      const crashes = JSON.parse(localStorage.getItem('app_crashes') || '[]');
      crashes.push(crash);
      
      // Keep last 20 crashes
      if (crashes.length > 20) {
        crashes.shift();
      }
      
      localStorage.setItem('app_crashes', JSON.stringify(crashes));
    } catch (e) {
      console.error('Failed to persist crash', e);
    }
  }

  getLocalCrashes() {
    try {
      return JSON.parse(localStorage.getItem('app_crashes') || '[]');
    } catch (e) {
      return [];
    }
  }

  clearLocalCrashes() {
    try {
      localStorage.removeItem('app_crashes');
    } catch (e) {
      console.error('Failed to clear crashes', e);
    }
  }

  trackNavigation(to, from) {
    this.addBreadcrumb('Navigation', { to, from }, 'info');
  }

  trackApiCall(endpoint, status, duration) {
    this.addBreadcrumb('API Call', { endpoint, status, duration }, 
      status >= 400 ? 'error' : 'info');
  }

  trackUserAction(action, data = {}) {
    this.addBreadcrumb('User Action', { action, ...data }, 'info');
  }
}

// Global singleton
if (typeof window !== 'undefined' && !window.crashReporter) {
  window.crashReporter = new CrashReporter();
}

export default typeof window !== 'undefined' ? window.crashReporter : null;