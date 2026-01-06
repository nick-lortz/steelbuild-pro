import {
  Building2,
  DollarSign,
  FileText,
  MessageSquareWarning,
  FileCheck,
  Users,
  Hash,
  Sparkles,
  File,
  Calendar,
  Truck,
  Clock,
  TrendingUp,
  Settings,
  BarChart3,
  Package,
} from 'lucide-react';

/**
 * Navigation Configuration
 * Controls all navigation structure, routing, and visibility
 */

export const navigationConfig = {
  sections: [
    {
      id: 'overview',
      title: 'Overview',
      items: [
        {
          id: 'dashboard',
          name: 'Dashboard',
          page: 'Dashboard',
          icon: Building2,
          roles: ['admin', 'user'],
          scope: 'global',
          enabled: true
        }
      ]
    },
    {
      id: 'project-management',
      title: 'Project Management',
      items: [
        {
          id: 'projects',
          name: 'Projects',
          page: 'Projects',
          icon: Building2,
          roles: ['admin', 'user'],
          scope: 'global',
          enabled: true
        },
        {
          id: 'schedule',
          name: 'Schedule',
          page: 'Schedule',
          icon: Calendar,
          roles: ['admin', 'user'],
          scope: 'global',
          enabled: true
        },
        {
          id: 'cost-codes',
          name: 'Cost Codes',
          page: 'CostCodes',
          icon: Hash,
          roles: ['admin', 'user'],
          scope: 'global',
          enabled: true
        },
        {
          id: 'drawings',
          name: 'Drawings',
          page: 'Drawings',
          icon: FileText,
          roles: ['admin', 'user'],
          scope: 'global',
          enabled: true
        },
        {
          id: 'rfis',
          name: 'RFIs',
          page: 'RFIs',
          icon: MessageSquareWarning,
          roles: ['admin', 'user'],
          scope: 'global',
          enabled: true
        },
        {
          id: 'change-orders',
          name: 'Change Orders',
          page: 'ChangeOrders',
          icon: FileCheck,
          roles: ['admin', 'user'],
          scope: 'global',
          enabled: true
        }
      ]
    },
    {
      id: 'operations',
      title: 'Operations',
      items: [
        {
          id: 'fabrication',
          name: 'Fabrication',
          page: 'Fabrication',
          icon: TrendingUp,
          roles: ['admin', 'user'],
          scope: 'global',
          enabled: true
        },
        {
          id: 'deliveries',
          name: 'Deliveries',
          page: 'Deliveries',
          icon: Truck,
          roles: ['admin', 'user'],
          scope: 'global',
          enabled: true
        },
        {
          id: 'equipment',
          name: 'Equipment',
          page: 'Equipment',
          icon: Truck,
          roles: ['admin', 'user'],
          scope: 'global',
          enabled: true
        }
      ]
    },
    {
      id: 'resources',
      title: 'Resources',
      items: [
        {
          id: 'resources',
          name: 'Resources',
          page: 'Resources',
          icon: Users,
          roles: ['admin', 'user'],
          scope: 'global',
          enabled: true
        },
        {
          id: 'labor',
          name: 'Labor',
          page: 'Labor',
          icon: Clock,
          roles: ['admin', 'user'],
          scope: 'global',
          enabled: true
        }
      ]
    },
    {
      id: 'documentation',
      title: 'Documentation',
      items: [
        {
          id: 'documents',
          name: 'Documents',
          page: 'Documents',
          icon: File,
          roles: ['admin', 'user'],
          scope: 'global',
          enabled: true
        },
        {
          id: 'daily-logs',
          name: 'Daily Logs',
          page: 'DailyLogs',
          icon: Calendar,
          roles: ['admin', 'user'],
          scope: 'global',
          enabled: true
        },
        {
          id: 'meetings',
          name: 'Meetings',
          page: 'Meetings',
          icon: Users,
          roles: ['admin', 'user'],
          scope: 'global',
          enabled: true
        },
        {
          id: 'production-notes',
          name: 'Production Notes',
          page: 'ProductionMeetings',
          icon: Calendar,
          roles: ['admin', 'user'],
          scope: 'global',
          enabled: true
        }
      ]
    },
    {
      id: 'financials',
      title: 'Financials',
      items: [
        {
          id: 'financials',
          name: 'Financials',
          page: 'Financials',
          icon: DollarSign,
          roles: ['admin', 'user'],
          scope: 'global',
          enabled: true
        }
      ]
    },
    {
      id: 'analytics',
      title: 'Analytics & Reports',
      items: [
        {
          id: 'analytics',
          name: 'Analytics',
          page: 'Analytics',
          icon: BarChart3,
          roles: ['admin', 'user'],
          scope: 'global',
          enabled: true
        },
        {
          id: 'reports',
          name: 'Reports',
          page: 'Reports',
          icon: FileText,
          roles: ['admin', 'user'],
          scope: 'global',
          enabled: true
        },
        {
          id: 'performance',
          name: 'Performance',
          page: 'Performance',
          icon: TrendingUp,
          roles: ['admin', 'user'],
          scope: 'global',
          enabled: true
        },
        {
          id: 'insights',
          name: 'AI Insights',
          page: 'Insights',
          icon: Sparkles,
          roles: ['admin', 'user'],
          scope: 'global',
          enabled: true
        }
      ]
    },
    {
      id: 'system',
      title: 'System',
      items: [
        {
          id: 'settings',
          name: 'Settings',
          page: 'Settings',
          icon: Settings,
          roles: ['admin'],
          scope: 'global',
          enabled: true
        }
      ]
    }
  ]
};

/**
 * Filter navigation items based on user role and feature flags
 */
export function getVisibleNavigation(userRole, featureFlags = {}) {
  return navigationConfig.sections
    .map(section => ({
      ...section,
      items: section.items.filter(item => {
        // Check if enabled
        if (!item.enabled) return false;
        
        // Check role access
        if (item.roles && !item.roles.includes(userRole)) return false;
        
        // Check feature flags if specified
        if (item.featureFlag && !featureFlags[item.featureFlag]) return false;
        
        return true;
      })
    }))
    .filter(section => section.items.length > 0);
}

/**
 * Get navigation item by page name
 */
export function getNavItemByPage(pageName) {
  for (const section of navigationConfig.sections) {
    const item = section.items.find(i => i.page === pageName);
    if (item) return item;
  }
  return null;
}

/**
 * Check if user has access to a specific page
 */
export function hasPageAccess(pageName, userRole) {
  const item = getNavItemByPage(pageName);
  if (!item) return false;
  if (!item.enabled) return false;
  if (item.roles && !item.roles.includes(userRole)) return false;
  return true;
}