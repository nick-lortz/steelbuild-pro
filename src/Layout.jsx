import React, { useState, useEffect, Suspense } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { initSentry } from '@/components/providers/SentryProvider';
import { useRenderCount, useMountLogger } from '@/components/shared/diagnostics';
import { useAuth, useAuthActions } from '@/components/shared/hooks/useAuth';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { Toaster } from '@/components/ui/toaster';
import { ConfirmProvider } from '@/components/providers/ConfirmProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { ActiveProjectProvider, useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { TabNavigationProvider } from '@/components/shared/hooks/useTabNavigation';
import { SkipToMainContent } from '@/components/shared/accessibility';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import MobileNav from '@/components/layout/MobileNav';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import PullToRefresh from '@/components/shared/PullToRefresh';
import TopNav from '@/components/layout/TopNav';

// --- PLATFORM BUG WORKAROUND: Force App ID in Preview ---
const IS_PREVIEW_ENV = window.location.hostname.includes('preview') || window.location.hostname.includes('sandbox');
if (IS_PREVIEW_ENV) {
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    let url = args[0];
    const APP_ID = '694bc0dd754d739afc7067e9';
    if (typeof url === 'string') {
      if (url.includes('/v1/apps/undefined/')) args[0] = url.replace('/v1/apps/undefined/', `/v1/apps/${APP_ID}/`);
      else if (url.includes('/v1/apps/null/')) args[0] = url.replace('/v1/apps/null/', `/v1/apps/${APP_ID}/`);
      // Also catch cases where the url is just the origin without app ID
      else if (url.includes('api.base44.app/v1/') && !url.includes('/apps/')) {
        args[0] = url.replace('/v1/', `/v1/apps/${APP_ID}/`);
      }
    } else if (url instanceof URL) {
      if (url.href.includes('/v1/apps/undefined/')) args[0] = new URL(url.href.replace('/v1/apps/undefined/', `/v1/apps/${APP_ID}/`));
      else if (url.href.includes('/v1/apps/null/')) args[0] = new URL(url.href.replace('/v1/apps/null/', `/v1/apps/${APP_ID}/`));
    } else if (url instanceof Request) {
      if (url.url.includes('/v1/apps/undefined/')) args[0] = new Request(url.url.replace('/v1/apps/undefined/', `/v1/apps/${APP_ID}/`), url);
      else if (url.url.includes('/v1/apps/null/')) args[0] = new Request(url.url.replace('/v1/apps/null/', `/v1/apps/${APP_ID}/`), url);
    }
    return originalFetch.apply(this, args);
  };

  // Intercept XMLHttpRequest just in case the SDK uses Axios
  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    const APP_ID = '694bc0dd754d739afc7067e9';
    if (typeof url === 'string') {
      if (url.includes('/v1/apps/undefined/')) url = url.replace('/v1/apps/undefined/', `/v1/apps/${APP_ID}/`);
      else if (url.includes('/v1/apps/null/')) url = url.replace('/v1/apps/null/', `/v1/apps/${APP_ID}/`);
      else if (url.includes('api.base44.app/v1/') && !url.includes('/apps/')) url = url.replace('/v1/', `/v1/apps/${APP_ID}/`);
    }
    return originalOpen.call(this, method, url, ...rest);
  };
}
// ------------------------------------------------------

// Lazy load heavy components
const OfflineIndicator = React.lazy(() => import('@/components/shared/OfflineIndicator'));
const CommandPalette = React.lazy(() => import('@/components/shared/CommandPalette'));

// ── Nav groups for the all-apps grid (used by TopNav) ───────────────────────
import {
  LayoutDashboard, Building, Calendar, AlertCircle as AlertCircleIcon, CheckCircle2,
  FileText, FileCheck, Users, MessageSquareWarning, MessageSquare, Package,
  Wrench, Truck, Camera, DollarSign, BarChart3, Hash, Clock,
  Gauge, TrendingUp, Sparkles, Settings, UserCircle, File, LayoutGrid,
} from 'lucide-react';

const navGroups = [
  {
    name: 'Dashboard',
    icon: LayoutDashboard,
    items: [
      { name: 'Project Dashboard', page: 'ProjectDashboard', icon: LayoutDashboard },
      { name: 'Projects',          page: 'Projects',         icon: Building },
      { name: 'Calendar',          page: 'Calendar',         icon: Calendar },
      { name: 'Alerts',            page: 'Alerts',           icon: AlertCircleIcon },
      { name: 'To-Do List',        page: 'ToDoList',         icon: CheckCircle2 },
    ],
    roles: ['admin', 'user'],
  },
  {
    name: 'Job Setup',
    icon: FileCheck,
    items: [
      { name: 'Contracts',          page: 'Contracts',        icon: FileText },
      { name: 'Job Setup',          page: 'PMJobSetup',       icon: CheckCircle2 },
      { name: 'Scope & Exclusions', page: 'PMScopeExclusions',icon: FileText },
      { name: 'Contacts',           page: 'PMContacts',       icon: Users },
    ],
    roles: ['admin', 'user'],
  },
  {
    name: 'Detailing & Drawings',
    icon: FileText,
    items: [
      { name: 'Drawings',   page: 'Drawings',   icon: FileText },
      { name: 'Detailing',  page: 'Detailing',  icon: FileCheck },
      { name: 'Documents',  page: 'Documents',  icon: File },
    ],
    roles: ['admin', 'user'],
  },
  {
    name: 'Communications',
    icon: MessageSquare,
    items: [
      { name: 'RFI Hub',          page: 'RFIHub',            icon: MessageSquareWarning },
      { name: 'Submittals',       page: 'Submittals',        icon: FileCheck },
      { name: 'Messages',         page: 'Messages',          icon: MessageSquare },
      { name: 'Production Notes', page: 'ProductionMeetings',icon: Calendar },
      { name: 'Meetings',         page: 'Meetings',          icon: Users },
      { name: 'My Action Items',  page: 'MyActionItems',     icon: CheckCircle2 },
    ],
    roles: ['admin', 'user'],
  },
  {
    name: 'Fabrication',
    icon: Wrench,
    items: [
      { name: 'Fabrication',   page: 'Fabrication',  icon: Wrench },
      { name: 'Work Packages', page: 'WorkPackages', icon: Package },
    ],
    roles: ['admin', 'user'],
  },
  {
    name: 'Logistics & Deliveries',
    icon: Truck,
    items: [
      { name: 'Deliveries',        page: 'Deliveries',       icon: Truck },
      { name: 'Look-Ahead Planning',page: 'LookAheadPlanning',icon: Calendar },
      { name: 'Shipping & Travel', page: 'PMShippingTravel', icon: Truck },
    ],
    roles: ['admin', 'user'],
  },
  {
    name: 'Field Execution',
    icon: Camera,
    items: [
      { name: 'Schedule',        page: 'Schedule',       icon: Calendar },
      { name: 'Weekly Schedule', page: 'WeeklySchedule', icon: Calendar },
      { name: 'Field Tools',     page: 'FieldTools',     icon: Camera },
      { name: 'Daily Logs',      page: 'DailyLogs',      icon: FileText },
      { name: 'Photos',          page: 'ProjectPhotos',  icon: Camera },
    ],
    roles: ['admin', 'user'],
  },
  {
    name: 'Cost Control',
    icon: DollarSign,
    items: [
      { name: 'Financials',     page: 'FinancialsRedesign', icon: DollarSign },
      { name: 'Budget Control', page: 'BudgetControl',      icon: BarChart3 },
      { name: 'Change Orders',  page: 'ChangeOrders',       icon: FileCheck },
      { name: 'Cost Codes',     page: 'CostCodes',          icon: Hash },
      { name: 'Labor & Scope',  page: 'LaborScope',         icon: Clock },
    ],
    roles: ['admin', 'user'],
  },
  {
    name: 'Resources',
    icon: Users,
    items: [
      { name: 'Resources',           page: 'Resources',          icon: Users },
      { name: 'Resource Management', page: 'ResourceManagement', icon: Package },
      { name: 'Equipment',           page: 'Equipment',          icon: Truck },
      { name: 'Labor',               page: 'Labor',              icon: Clock },
    ],
    roles: ['admin', 'user'],
  },
  {
    name: 'Reporting & Analytics',
    icon: BarChart3,
    items: [
      { name: 'Portfolio Pulse',   page: 'PortfolioPulse',            icon: Gauge },
      { name: 'Executive Roll-Up', page: 'ExecutiveRollUp',           icon: TrendingUp },
      { name: 'Project Analytics', page: 'ProjectAnalyticsDashboard', icon: BarChart3 },
      { name: 'Job Status Report', page: 'JobStatusReport',           icon: FileText },
      { name: 'Reports',           page: 'Reports',                   icon: FileText },
      { name: 'ProjectSolver AI',   page: 'ProjectSolver',             icon: Sparkles },
      { name: 'AI Insights',       page: 'Insights',                  icon: Sparkles },
      { name: 'Feedback Loop',     page: 'FeedbackLoop',              icon: TrendingUp },
      { name: 'Performance',       page: 'Performance',               icon: Gauge },
    ],
    roles: ['admin', 'user'],
  },
  {
    name: 'Settings',
    icon: Settings,
    items: [
      { name: 'Profile',       page: 'Profile',          icon: UserCircle, roles: ['admin', 'user'] },
      { name: 'Notifications', page: 'NotificationSettings', icon: Settings, roles: ['admin', 'user'] },
      { name: 'Admin Panel',   page: 'Admin',            icon: Settings,   roles: ['admin'] },
      { name: 'Data Management',page:'DataManagement',   icon: LayoutDashboard, roles: ['admin'] },
      { name: 'App Audit',     page: 'AuditDashboard',   icon: AlertCircleIcon, roles: ['admin'] },
      { name: 'Fix Queue',     page: 'AuditFixQueue',    icon: CheckCircle2, roles: ['admin'] },
      { name: 'Formula Tests', page: 'FinancialTestRunner', icon: Sparkles, roles: ['admin'] },
      { name: 'Integrations',  page: 'Integrations',     icon: Sparkles,   roles: ['admin'] },
      { name: 'Settings',      page: 'Settings',         icon: Settings,   roles: ['admin'] },
    ],
    roles: ['admin', 'user'],
  },
];

// ── Main Layout ──────────────────────────────────────────────────────────────
function LayoutContent({ children, currentPageName }) {
  useRenderCount('LayoutContent');
  useMountLogger('LayoutContent');

  useEffect(() => { initSentry(); }, []);

  const { activeProjectId } = useActiveProject();
  const queryClient = useQueryClient();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const handleRefresh = async () => { await queryClient.invalidateQueries(); };

  const { user: currentUser, isLoading: userLoading, isEnvError } = useAuth();
  const { logout } = useAuthActions();
  const handleLogout = () => logout();

  useEffect(() => {
    if (!currentUser) return;
    import('@/components/providers/SentryProvider').then(({ setSentryUser, setSentryContext }) => {
      setSentryUser(currentUser);
      if (activeProjectId) setSentryContext('project', { project_id: activeProjectId });
    });
  }, [currentUser, activeProjectId]);

  const visibleNavGroups = React.useMemo(() => {
    if (!currentUser) return navGroups;
    return navGroups
      .map(group => ({
        ...group,
        items: group.items.filter(item => !item.roles || item.roles.includes(currentUser.role)),
      }))
      .filter(group => (!group.roles || group.roles.includes(currentUser.role)) && group.items.length > 0);
  }, [currentUser]);

  const noFramePages = ['LandingPage', 'HowItWorks', 'PrivacyPolicy', 'TermsOfService'];
  const isFrameless = noFramePages.includes(currentPageName);

  if (userLoading) {
    return (
      <div style={{ background: '#1A1D22', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="text-center">
          <div style={{ width: 40, height: 40, border: '3px solid rgba(255,90,31,0.3)', borderTopColor: '#FF5A1F', borderRadius: '50%' }} className="animate-spin mx-auto mb-3" />
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Loading</p>
        </div>
      </div>
    );
  }

  if (isEnvError) {
    return (
      <div style={{ background: '#1A1D22', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="text-center max-w-md px-6">
          <AlertCircle size={32} style={{ color: '#FF4D4D', margin: '0 auto 1rem' }} />
          <h2 style={{ color: '#fff', fontWeight: 700, marginBottom: 8 }}>App Configuration Error</h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
            The app returned a "Not Found" response. Check environment config.
          </p>
        </div>
      </div>
    );
  }

  if (isFrameless) {
    return (
      <>
        <SkipToMainContent />
        <Suspense fallback={null}>
          <OfflineIndicator />
        </Suspense>
        <Toaster />
        <AnimatePresence mode="wait">
          <motion.div key={currentPageName} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            {children}
          </motion.div>
        </AnimatePresence>
      </>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground font-sans">
      <SkipToMainContent />
      <Toaster />
      <Suspense fallback={null}>
        <OfflineIndicator />
        <CommandPalette />
      </Suspense>

      {/* Sidebar */}
      <div className="hidden md:flex w-64 flex-col border-r border-border bg-card">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <h1 className="text-xl font-black tracking-tight text-foreground">STEEL<span className="text-primary">BUILD</span><span className="text-muted-foreground font-medium">-PRO</span></h1>
        </div>
        <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
          <nav className="space-y-6 px-3">
            {visibleNavGroups.map((group, i) => (
              <div key={i}>
                <h2 className="px-3 text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
                  {group.name}
                </h2>
                <div className="space-y-1">
                  {group.items.map((item, j) => {
                    const Icon = item.icon;
                    const isActive = currentPageName === item.page;
                    return (
                      <a
                        key={j}
                        href={`/${item.page}`}
                        className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                          isActive
                            ? 'bg-primary/10 text-primary border border-primary/20'
                            : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                        }`}
                      >
                        <Icon className={`mr-3 flex-shrink-0 h-4 w-4 ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                        {item.name}
                      </a>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        {/* Header */}
        <header className="h-16 flex flex-shrink-0 items-center justify-between px-6 border-b border-border bg-card/50 backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            {/* Mobile menu button (placeholder) */}
            <button className="md:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>
            </button>
            <div className="hidden sm:flex items-center bg-secondary/50 rounded-md px-3 py-1.5 border border-border">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-3">Project</span>
              <select className="bg-transparent border-none text-sm font-medium text-foreground focus:ring-0 cursor-pointer outline-none">
                <option>All Projects</option>
                <option>Active Projects</option>
                <option>Completed Projects</option>
              </select>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="hidden sm:block text-right">
              <div className="text-sm font-medium text-foreground">{currentUser?.full_name || currentUser?.email}</div>
              <div className="text-xs font-semibold text-primary uppercase tracking-wider">{currentUser?.role}</div>
            </div>
            <div className="h-8 w-8 rounded-full bg-secondary border border-border flex items-center justify-center text-sm font-bold text-muted-foreground">
              {currentUser?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <button onClick={() => setShowLogoutDialog(true)} className="p-2 text-muted-foreground hover:text-destructive transition-colors" title="Logout">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main id="main-content" role="main" className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <PullToRefresh onRefresh={handleRefresh}>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPageName}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="h-full max-w-[1600px] mx-auto"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </PullToRefresh>
        </main>
      </div>

      {/* Logout confirm dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to end your session?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-secondary text-secondary-foreground hover:bg-secondary/80 border-none">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 border-none">
              Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
    </ErrorBoundary>
  );
});

export default LayoutWithProviders;