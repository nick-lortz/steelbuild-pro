import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { initSentry } from '@/components/providers/SentryProvider';
import { useRenderCount, useMountLogger } from '@/components/shared/diagnostics';
import { useAuth, useAuthActions } from '@/components/shared/hooks/useAuth';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Building,
  DollarSign,
  FileText,
  MessageSquareWarning,
  FileCheck,
  Users,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  Hash,
  Sparkles,
  File,
  Calendar,
  Truck,
  Clock,
  TrendingUp,
  LogOut,
  Settings,
  UserCircle,
  BarChart3,
  Camera,
  CheckCircle2,
  LayoutDashboard,
  Wrench,
  Package,
  MessageSquare,
  Gauge,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger } from
'@/components/ui/dropdown-menu';
import { Toaster } from '@/components/ui/toaster';
import { ConfirmProvider } from '@/components/providers/ConfirmProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { ActiveProjectProvider, useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { TabNavigationProvider } from '@/components/shared/hooks/useTabNavigation';
import { SkipToMainContent } from '@/components/shared/accessibility';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import NotificationPanel from '@/components/notifications/NotificationPanel';
import { showErrorToast, isAuthError } from '@/components/shared/errorHandling';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import MobileNav from '@/components/layout/MobileNav';
import OfflineIndicator from '@/components/shared/OfflineIndicator';
import CommandPalette from '@/components/shared/CommandPalette';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { SECURITY_HEADERS } from '@/components/shared/securityHeaders';
import PullToRefresh from '@/components/shared/PullToRefresh';

const navGroups = [
{
  name: 'Dashboard',
  icon: LayoutDashboard,
  items: [
  { name: 'Project Dashboard', page: 'ProjectDashboard', icon: LayoutDashboard },
  { name: 'Projects', page: 'Projects', icon: Building },
  { name: 'Calendar', page: 'Calendar', icon: Calendar },
  { name: 'Alerts', page: 'Alerts', icon: AlertCircle },
  { name: 'To-Do List', page: 'ToDoList', icon: CheckCircle2 }],

  roles: ['admin', 'user']
},
{
  name: 'Job Setup',
  icon: FileCheck,
  items: [
  { name: 'Contracts', page: 'Contracts', icon: FileText },
  { name: 'Job Setup', page: 'PMJobSetup', icon: CheckCircle2 },
  { name: 'Scope & Exclusions', page: 'PMScopeExclusions', icon: FileText },
  { name: 'Contacts', page: 'PMContacts', icon: Users }],

  roles: ['admin', 'user']
},
{
  name: 'Detailing & Drawings',
  icon: FileText,
  items: [
  { name: 'Drawings', page: 'Drawings', icon: FileText },
  { name: 'Detailing', page: 'Detailing', icon: FileCheck },
  { name: 'Documents', page: 'Documents', icon: File }],

  roles: ['admin', 'user']
},
{
  name: 'Communications',
  icon: MessageSquare,
  items: [
  { name: 'RFI Hub', page: 'RFIHub', icon: MessageSquareWarning },
  { name: 'Submittals', page: 'Submittals', icon: FileCheck },
  { name: 'Messages', page: 'Messages', icon: MessageSquare },
  { name: 'Production Notes', page: 'ProductionMeetings', icon: Calendar },
  { name: 'Meetings', page: 'Meetings', icon: Users },
  { name: 'My Action Items', page: 'MyActionItems', icon: CheckCircle2 }],

  roles: ['admin', 'user']
},
{
  name: 'Fabrication',
  icon: Wrench,
  items: [
  { name: 'Fabrication', page: 'Fabrication', icon: Wrench },
  { name: 'Work Packages', page: 'WorkPackages', icon: Package }],

  roles: ['admin', 'user']
},
{
  name: 'Logistics & Deliveries',
  icon: Truck,
  items: [
  { name: 'Deliveries', page: 'Deliveries', icon: Truck },
  { name: 'Look-Ahead Planning', page: 'LookAheadPlanning', icon: Calendar },
  { name: 'Shipping & Travel', page: 'PMShippingTravel', icon: Truck }],

  roles: ['admin', 'user']
},
{
  name: 'Field Execution',
  icon: Camera,
  items: [
  { name: 'Schedule', page: 'Schedule', icon: Calendar },
  { name: 'Weekly Schedule', page: 'WeeklySchedule', icon: Calendar },
  { name: 'Field Tools', page: 'FieldTools', icon: Camera },
  { name: 'Daily Logs', page: 'DailyLogs', icon: FileText },
  { name: 'Photos', page: 'ProjectPhotos', icon: Camera }],

  roles: ['admin', 'user']
},
{
  name: 'Cost Control',
  icon: DollarSign,
  items: [
  { name: 'Financials', page: 'FinancialsRedesign', icon: DollarSign },
  { name: 'Budget Control', page: 'BudgetControl', icon: BarChart3 },
  { name: 'Change Orders', page: 'ChangeOrders', icon: FileCheck },
  { name: 'Cost Codes', page: 'CostCodes', icon: Hash },
  { name: 'Labor & Scope', page: 'LaborScope', icon: Clock }],

  roles: ['admin', 'user']
},
{
  name: 'Resources',
  icon: Users,
  items: [
  { name: 'Resources', page: 'Resources', icon: Users },
  { name: 'Resource Management', page: 'ResourceManagement', icon: Package },
  { name: 'Equipment', page: 'Equipment', icon: Truck },
  { name: 'Labor', page: 'Labor', icon: Clock }],

  roles: ['admin', 'user']
},
{
  name: 'Reporting & Analytics',
  icon: BarChart3,
  items: [
  { name: 'Portfolio Pulse', page: 'PortfolioPulse', icon: Gauge },
  { name: 'Executive Roll-Up', page: 'ExecutiveRollUp', icon: TrendingUp },
  { name: 'Project Analytics', page: 'ProjectAnalyticsDashboard', icon: BarChart3 },
  { name: 'Job Status Report', page: 'JobStatusReport', icon: FileText },
  { name: 'Reports', page: 'Reports', icon: FileText },
  { name: 'AI Insights', page: 'Insights', icon: Sparkles },
  { name: 'Feedback Loop', page: 'FeedbackLoop', icon: TrendingUp },
  { name: 'Performance', page: 'Performance', icon: Gauge }],

  roles: ['admin', 'user']
},
{
  name: 'Settings',
  icon: Settings,
  items: [
  { name: 'Profile', page: 'Profile', icon: UserCircle, roles: ['admin', 'user'] },
  { name: 'Notifications', page: 'NotificationSettings', icon: Settings, roles: ['admin', 'user'] },
  { name: 'Admin Panel', page: 'Admin', icon: Settings, roles: ['admin'] },
  { name: 'Data Management', page: 'DataManagement', icon: LayoutDashboard, roles: ['admin'] },
  { name: 'App Audit', page: 'AuditDashboard', icon: AlertCircle, roles: ['admin'] },
  { name: 'Fix Queue', page: 'AuditFixQueue', icon: CheckCircle2, roles: ['admin'] },
  { name: 'Integrations', page: 'Integrations', icon: Sparkles, roles: ['admin'] },
  { name: 'Settings', page: 'Settings', icon: Settings, roles: ['admin'] }],

  roles: ['admin', 'user']
}];



function LayoutContent({ children, currentPageName }) {
  useRenderCount('LayoutContent');
  useMountLogger('LayoutContent');

  // Initialize Sentry on app load
  useEffect(() => {
    initSentry();
  }, []);

  const { activeProjectId } = useActiveProject();
  const queryClient = useQueryClient();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState(() => {
    const saved = localStorage.getItem('nav_expanded_groups');
    return saved ? JSON.parse(saved) : ['Overview', 'Project Execution'];
  });

  const handleRefresh = async () => {
    await queryClient.invalidateQueries();
  };

  const toggleGroup = (groupName) => {
    setExpandedGroups((prev) => {
      const newExpanded = prev.includes(groupName) ?
      prev.filter((g) => g !== groupName) :
      [...prev, groupName];
      localStorage.setItem('nav_expanded_groups', JSON.stringify(newExpanded));
      return newExpanded;
    });
  };

  // Single source of truth - imported from useAuth hook
  const { user: currentUser, isLoading: userLoading, isEnvError } = useAuth();
  const { logout } = useAuthActions();

  // Set Sentry user context when authenticated
  useEffect(() => {
    if (!currentUser) return;
    import('@/components/providers/SentryProvider').then(({ setSentryUser, setSentryContext }) => {
      setSentryUser(currentUser);
      if (activeProjectId) {
        setSentryContext('project', { project_id: activeProjectId });
      }
    });
  }, [currentUser, activeProjectId]);

  const { data: activeProject } = useQuery({
    queryKey: ['activeProject', activeProjectId],
    queryFn: async () => {
      if (!activeProjectId) return null;
      return await base44.entities.Project.filter({ id: activeProjectId });
    },
    enabled: !!activeProjectId,
    select: (data) => data?.[0] || null,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const handleLogout = () => logout();

  const projectPhase = activeProject?.phase || 'fabrication';

  const visibleNavGroups = React.useMemo(() => {
    if (!currentUser) return navGroups;
    return navGroups.map((group) => ({
      ...group,
      items: group.items.filter((item) =>
      !item.roles || item.roles.includes(currentUser.role)
      )
    })).filter((group) =>
    (!group.roles || group.roles.includes(currentUser.role)) && group.items.length > 0
    );
  }, [currentUser]);

  if (userLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (isEnvError) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">App Configuration Error</h2>
          <p className="text-zinc-400 text-sm mb-4">
            The app returned a "Not Found" response. This usually means the environment is misconfigured
            or the app hasn't been published yet.
          </p>
          <p className="text-zinc-600 text-xs font-mono">{window.location.hostname}</p>
        </div>
      </div>
    );
  }

  // Apply security headers (documented in Layout)
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {

    // CSP headers applied server-side; CSP documented in components/shared/securityHeaders.js
  }
  return (
    <div style={{ background: 'var(--page-bg)' }} className="min-h-screen relative">
      {/* Vignette overlay */}
      <div className="fixed inset-0 pointer-events-none z-0"
           style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(255,90,31,0.06) 0%, transparent 60%)' }} />

      <SkipToMainContent />
      <OfflineIndicator />
      <Toaster />
      <CommandPalette />

      {/* ── Mobile Header ── */}
      <header
        className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-4"
        style={{
          background: 'var(--frame-bg)',
          borderBottom: '1px solid var(--panel-border)',
          paddingTop: 'max(0px, env(safe-area-inset-top))',
          boxShadow: '0 2px 16px rgba(0,0,0,0.5)'
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="btn-icon"
            style={{ width: '2rem', height: '2rem' }}
          >
            {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', boxShadow: '0 0 16px var(--accent-glow)' }}>
              <Building size={14} className="text-white" />
            </div>
            <span className="font-bold text-sm tracking-widest uppercase" style={{ color: 'var(--text)' }}>SteelBuild Pro</span>
          </div>
        </div>
        {currentUser && (
          <div className="flex items-center gap-2">
            <NotificationCenter />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="btn-icon" style={{ width: '2rem', height: '2rem' }}>
                  <UserCircle size={16} style={{ color: 'var(--accent-2)' }} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52"
                style={{ background: 'var(--panel-bg-2)', border: '1px solid var(--panel-border)', borderRadius: '14px' }}>
                <div className="px-3 py-2">
                  <p className="text-xs font-semibold truncate" style={{ color: 'var(--text)' }}>{currentUser.full_name || currentUser.email}</p>
                  <p className="label-caps mt-0.5">{currentUser.role}</p>
                </div>
                <DropdownMenuSeparator style={{ background: 'var(--panel-border)' }} />
                <DropdownMenuItem asChild>
                  <Link to={createPageUrl('Settings')} className="flex items-center gap-2 text-xs px-3 py-2 cursor-pointer" style={{ color: 'var(--text-dim)' }}>
                    <Settings size={13} /> Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowLogoutDialog(true)} className="flex items-center gap-2 text-xs px-3 py-2 cursor-pointer" style={{ color: 'var(--danger)' }}>
                  <LogOut size={13} /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </header>

      {/* ── Logout Confirmation ── */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent style={{ background: 'var(--panel-bg-2)', border: '1px solid var(--panel-border)', borderRadius: 'var(--radius-panel)', color: 'var(--text)' }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: 'var(--text)' }}>Confirm Logout</AlertDialogTitle>
            <AlertDialogDescription style={{ color: 'var(--text-mute)' }}>
              Are you sure you want to end your session?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', color: 'var(--text-dim)', borderRadius: 'var(--radius-control)' }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="btn-primary" style={{ borderRadius: 'var(--radius-control)' }}>
              Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Sidebar ── */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-full w-60 flex flex-col',
          'lg:translate-x-0 transition-transform duration-300',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{
          background: 'var(--frame-bg)',
          borderRight: '1px solid var(--panel-border)',
          boxShadow: '4px 0 32px rgba(0,0,0,0.6)'
        }}
      >
        {/* Brand */}
        <div className="h-14 flex items-center px-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--panel-border)' }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center mr-3 flex-shrink-0"
               style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', boxShadow: '0 0 18px var(--accent-glow)' }}>
            <Building size={14} className="text-white" />
          </div>
          <span className="font-bold text-sm tracking-widest uppercase" style={{ color: 'var(--text)' }}>SteelBuild Pro</span>
        </div>

        {/* Nav Groups */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {visibleNavGroups.map((group) => {
            const isExpanded = expandedGroups.includes(group.name);
            const GroupIcon = group.icon;
            const hasActivePage = group.items.some((item) => item.page === currentPageName);

            return (
              <div key={group.name}>
                <button
                  onClick={() => toggleGroup(group.name)}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl transition-all"
                  style={{
                    color: hasActivePage ? 'var(--accent-2)' : 'var(--text-mute)',
                    background: hasActivePage ? 'rgba(255,90,31,0.06)' : 'transparent',
                    fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase'
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <GroupIcon size={11} />
                    <span>{group.name}</span>
                  </div>
                  <ChevronDown size={10} className={cn('transition-transform', isExpanded ? 'rotate-0' : '-rotate-90')} />
                </button>

                {isExpanded && (
                  <div className="ml-1.5 mt-0.5 space-y-0.5 mb-1">
                    {group.items.map((item) => {
                      const isActive = currentPageName === item.page;
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.page}
                          to={createPageUrl(item.page)}
                          onClick={() => setSidebarOpen(false)}
                          className={cn('flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium rounded-xl transition-all', isActive ? 'nav-item-active' : '')}
                          style={isActive ? {} : {
                            color: 'var(--text-mute)',
                            border: '1px solid transparent'
                          }}
                          onMouseEnter={e => { if (!isActive) { e.currentTarget.style.color = 'var(--text-dim)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}}
                          onMouseLeave={e => { if (!isActive) { e.currentTarget.style.color = 'var(--text-mute)'; e.currentTarget.style.background = ''; }}}
                        >
                          <Icon size={12} />
                          {item.name}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User Footer */}
        {currentUser && (
          <div className="flex-shrink-0 p-3" style={{ borderTop: '1px solid var(--panel-border)' }}>
            <div className="flex items-center justify-end mb-2">
              <NotificationCenter />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all"
                style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,90,31,0.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--panel-border)'; }}
              >
                <UserCircle size={15} style={{ color: 'var(--accent-2)', flexShrink: 0 }} />
                <div className="flex-1 text-left overflow-hidden">
                  <p className="text-xs font-semibold truncate" style={{ color: 'var(--text)', letterSpacing: '0.03em' }}>
                    {currentUser.full_name || currentUser.email}
                  </p>
                  <p className="label-caps mt-0.5">{currentUser.role}</p>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52"
                style={{ background: 'var(--panel-bg-2)', border: '1px solid var(--panel-border)', borderRadius: '14px' }}>
                <DropdownMenuItem asChild>
                  <Link to={createPageUrl('Settings')} className="flex items-center gap-2 text-xs px-3 py-2 cursor-pointer" style={{ color: 'var(--text-dim)' }}>
                    <Settings size={13} /> Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator style={{ background: 'var(--panel-border)' }} />
                <DropdownMenuItem onClick={() => setShowLogoutDialog(true)} className="flex items-center gap-2 text-xs px-3 py-2 cursor-pointer" style={{ color: 'var(--danger)' }}>
                  <LogOut size={13} /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </aside>

      {/* Sidebar backdrop (mobile) */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 lg:hidden" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
             onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Main Content ── */}
      <main id="main-content" className="lg:ml-60 pt-14 lg:pt-0 min-h-screen pb-20 lg:pb-0 relative z-10" role="main">
        <PullToRefresh onRefresh={handleRefresh}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPageName}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.65, 0, 0.35, 1] }}
              style={{ color: 'var(--text)' }}
              className="p-4 lg:p-5"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </PullToRefresh>
      </main>

      <MobileNav currentPageName={currentPageName} />
    </div>
  );

}

const LayoutWithProviders = React.memo(function LayoutWithProviders({ children, currentPageName }) {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ConfirmProvider>
          <ActiveProjectProvider>
            <TabNavigationProvider>
              <LayoutContent children={children} currentPageName={currentPageName} />
            </TabNavigationProvider>
          </ActiveProjectProvider>
        </ConfirmProvider>
      </ThemeProvider>
    </ErrorBoundary>);

});

export default LayoutWithProviders;