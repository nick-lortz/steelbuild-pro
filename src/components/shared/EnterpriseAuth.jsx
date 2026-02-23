/**
 * Enterprise Authentication System
 * Enhanced authentication with session management and permissions
 */

import { createContext, useContext, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import logger from './structuredLogging';

const EnterpriseAuthContext = createContext();

const ROLE_HIERARCHY = {
  'admin': 1000,
  'project_manager': 800,
  'user': 400
};

const PERMISSIONS = {
  'project.create': ['admin'],
  'project.edit': ['admin', 'project_manager'],
  'project.delete': ['admin'],
  'project.view': ['admin', 'project_manager', 'user'],
  'finance.view': ['admin', 'project_manager'],
  'finance.edit': ['admin'],
  'budget.approve': ['admin', 'project_manager'],
  'users.manage': ['admin'],
  'documents.upload': ['admin', 'project_manager', 'user'],
  'documents.delete': ['admin', 'project_manager'],
  'rfi.create': ['admin', 'project_manager', 'user'],
  'rfi.respond': ['admin', 'project_manager'],
  'schedule.edit': ['admin', 'project_manager'],
  'system.settings': ['admin'],
  'audit.view': ['admin']
};

class SessionManager {
  constructor() {
    this.sessionTimeout = 8 * 60 * 60 * 1000; // 8 hours
    this.warningTime = 15 * 60 * 1000;
    this.checkInterval = 60 * 1000;
    this.lastActivity = Date.now();
    this.warningShown = false;
    
    this.startSessionMonitoring();
    this.trackUserActivity();
  }
  
  startSessionMonitoring() {
    setInterval(() => {
      const now = Date.now();
      const timeSinceActivity = now - this.lastActivity;
      
      if (timeSinceActivity > this.sessionTimeout) {
        this.handleSessionExpiry();
      } else if (timeSinceActivity > (this.sessionTimeout - this.warningTime) && !this.warningShown) {
        this.showSessionWarning();
      }
    }, this.checkInterval);
  }
  
  trackUserActivity() {
    const events = ['mousedown', 'keypress', 'scroll', 'touchstart', 'click'];
    const updateActivity = () => {
      this.lastActivity = Date.now();
      this.warningShown = false;
    };
    
    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });
  }
  
  showSessionWarning() {
    this.warningShown = true;
    const remainingTime = Math.ceil((this.sessionTimeout - (Date.now() - this.lastActivity)) / 60000);
    logger.warn('Session expiring soon', { remainingMinutes: remainingTime });
    
    if (window.confirm(`Your session will expire in ${remainingTime} minutes. Click OK to continue.`)) {
      this.extendSession();
    }
  }
  
  extendSession() {
    this.lastActivity = Date.now();
    this.warningShown = false;
    logger.info('Session extended');
  }
  
  handleSessionExpiry() {
    logger.warn('Session expired');
    window.dispatchEvent(new CustomEvent('session-expired'));
  }
  
  resetSession() {
    this.lastActivity = Date.now();
    this.warningShown = false;
  }
}

export function EnterpriseAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionManager] = useState(() => new SessionManager());

  useEffect(() => {
    initializeAuth();
    
    const handleSessionExpiry = () => {
      handleLogout();
    };
    
    window.addEventListener('session-expired', handleSessionExpiry);
    return () => window.removeEventListener('session-expired', handleSessionExpiry);
  }, []);

  const initializeAuth = async () => {
    try {
      setLoading(true);
      const userData = await base44.auth.me();
      if (userData) {
        setUser(userData);
        sessionManager.resetSession();
        logger.setContext({ userId: userData.email });
        logger.info('User session initialized', { role: userData.role });
      }
    } catch (error) {
      logger.warn('No active session');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (user) {
        logger.info('User logged out', { userId: user.email });
      }
      await base44.auth.logout();
      setUser(null);
      logger.setContext({ userId: null });
    } catch (error) {
      logger.error('Logout failed', {}, error);
    }
  };

  const hasPermission = (permission, projectId = null) => {
    if (!user) return false;
    
    const allowedRoles = PERMISSIONS[permission];
    if (!allowedRoles) return false;
    
    const hasRolePermission = allowedRoles.includes(user.role);
    
    if (projectId && hasRolePermission) {
      return user.project_ids?.includes(projectId) || user.role === 'admin';
    }
    
    return hasRolePermission;
  };

  const hasRole = (role) => {
    if (!user) return false;
    return user.role === role;
  };

  const hasMinimumRole = (minimumRole) => {
    if (!user) return false;
    const userRoleLevel = ROLE_HIERARCHY[user.role] || 0;
    const minimumRoleLevel = ROLE_HIERARCHY[minimumRole] || 0;
    return userRoleLevel >= minimumRoleLevel;
  };

  const canAccessProject = (projectId) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return user.project_ids?.includes(projectId) || false;
  };

  const value = {
    user,
    loading,
    logout: handleLogout,
    hasPermission,
    hasRole,
    hasMinimumRole,
    canAccessProject,
    sessionManager
  };

  return (
    <EnterpriseAuthContext.Provider value={value}>
      {children}
    </EnterpriseAuthContext.Provider>
  );
}

export const useEnterpriseAuth = () => {
  const context = useContext(EnterpriseAuthContext);
  if (!context) {
    throw new Error('useEnterpriseAuth must be used within EnterpriseAuthProvider');
  }
  return context;
};

export const withAuth = (Component, requiredPermission = null, requiredRole = null) => {
  return function AuthenticatedComponent(props) {
    const { user, hasPermission, hasRole, loading } = useEnterpriseAuth();
    
    if (loading) return <div>Loading...</div>;
    
    if (!user) {
      base44.auth.redirectToLogin();
      return null;
    }
    
    if (requiredPermission && !hasPermission(requiredPermission)) {
      logger.security('Access denied - insufficient permissions', {
        userId: user.email,
        requiredPermission,
        userRole: user.role
      });
      return <div className="p-8 text-center text-red-400">Access Denied - Insufficient Permissions</div>;
    }
    
    if (requiredRole && !hasRole(requiredRole)) {
      logger.security('Access denied - insufficient role', {
        userId: user.email,
        requiredRole,
        userRole: user.role
      });
      return <div className="p-8 text-center text-red-400">Access Denied - Insufficient Role</div>;
    }
    
    return <Component {...props} />;
  };
};

export const usePermissions = () => {
  const { hasPermission, hasRole, hasMinimumRole, canAccessProject } = useEnterpriseAuth();
  
  return {
    hasPermission,
    hasRole,
    hasMinimumRole,
    canAccessProject,
    can: hasPermission,
    is: hasRole
  };
};

export default EnterpriseAuthContext;