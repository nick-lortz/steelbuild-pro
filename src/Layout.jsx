import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  AlertCircle,
  LayoutGrid,
  Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Toaster } from '@/components/ui/toaster';
import { ConfirmProvider } from '@/components/providers/ConfirmProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { ActiveProjectProvider, useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { TabNavigationProvider } from '@/components/shared/hooks/useTabNavigation';
import { SkipToMainContent } from '@/components/shared/accessibility';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { showErrorToast, isAuthError } from '@/components/shared/errorHandling';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import MobileNav from '@/components/layout/MobileNav';
import OfflineIndicator from '@/components/shared/OfflineIndicator';
import CommandPalette from '@/components/shared/CommandPalette';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { SECURITY_HEADERS } from '@/components/shared/securityHeaders';
import PullToRefresh from '@/components/shared/PullToRefresh';

// Top-level nav tabs (Phoenix style)
const navTabs = [
  { name: 'Dashboard', page: 'ProjectDashboard' },
  { name: 'Projects', page: 'Projects' },
  { name: 'Schedule', page: 'Schedule' },
  { name: 'Financials', page: 'FinancialsRedesign' },
  { name: 'Field', page: 'FieldTools' },
  { name: 'Reports', page: 'Reports' },
];

// Full nav groups for the dropdown "all apps" menu
const navGroups = [
  {
    name: 'Dashboard',
    icon: LayoutDashboard,
    items: [
      { name: 'Project Dashboard', page: 'ProjectDashboard', icon: LayoutDashboard },
      { name: 'Projects', page: 'Projects', icon: Building },
      { name: 'Calendar', page: 'Calendar', icon: Calendar },
      { name: 'Alerts', page: 'Alerts', icon: AlertCircle },
      { name: 'To-Do List', page: 'ToDoList', icon: CheckCircle2 },
    ],
    roles: ['admin', 'user']
  },
  {
    name: 'Job Setup',
    icon: FileCheck,
    items: [
      { name: 'Contracts', page: 'Contracts', icon: FileText },
      { name: 'Job Setup', page: 'PMJobSetup', icon: CheckCircle2 },
      { name: 'Scope & Exclusions', page: 'PMScopeExclusions', icon: FileText },
      { name: 'Contacts', page: 'PMContacts', icon: Users },
    ],
    roles: ['admin', 'user']
  },
  {
    name: 'Detailing & Drawings',
    icon: FileText,
    items: [
      { name: 'Drawings', page: 'Drawings', icon: FileText },
      { name: 'Detailing', page: 'Detailing', icon: FileCheck },
      { name: 'Documents', page: 'Documents', icon: File },
    ],
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
      { name: 'My Action Items', page: 'MyActionItems', icon: CheckCircle2 },
    ],
    roles: ['admin', 'user']
  },
  {
    name: 'Fabrication',
    icon: Wrench,
    items: [
      { name: 'Fabrication', page: 'Fabrication', icon: Wrench },
      { name: 'Work Packages', page: 'WorkPackages', icon: Package },
    ],
    roles: ['admin', 'user']
  },
  {
    name: 'Logistics & Deliveries',
    icon: Truck,
    items: [
      { name: 'Deliveries', page: 'Deliveries', icon: Truck },
      { name: 'Look-Ahead Planning', page: 'LookAheadPlanning', icon: Calendar },
      { name: 'Shipping & Travel', page: 'PMShippingTravel', icon: Truck },
    ],
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
      { name: 'Photos', page: 'ProjectPhotos', icon: Camera },
    ],
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
      { name: 'Labor & Scope', page: 'LaborScope', icon: Clock },
    ],
    roles: ['admin', 'user']
  },
  {
    name: 'Resources',
    icon: Users,
    items: [
      { name: 'Resources', page: 'Resources', icon: Users },
      { name: 'Resource Management', page: 'ResourceManagement', icon: Package },
      { name: 'Equipment', page: 'Equipment', icon: Truck },
      { name: 'Labor', page: 'Labor', icon: Clock },
    ],
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
      { name: 'Performance', page: 'Performance', icon: Gauge },
    ],
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
      { name: 'Formula Tests', page: 'FinancialTestRunner', icon: Sparkles, roles: ['admin'] },
      { name: 'Integrations', page: 'Integrations', icon: Sparkles, roles: ['admin'] },
      { name: 'Settings', page: 'Settings', icon: Settings, roles: ['admin'] },
    ],
    roles: ['admin', 'user']
  },
];

// ── All-Apps Grid Dropdown ──────────────────────────────────────────────────
function AllAppsDropdown({ navGroups, currentPageName }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center justify-center w-8 h-8 rounded-xl transition-all"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          title="All modules"
        >
          <LayoutGrid size={15} style={{ color: 'rgba(255,255,255,0.6)' }} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[480px] max-h-[70vh] overflow-y-auto p-3"
        style={{
          background: '#0D1117',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '16px',
          boxShadow: '0 24px 48px rgba(0,0,0,0.8)'
        }}
      >
        <p className="label-caps px-2 mb-3">All Modules</p>
        <div className="grid grid-cols-2 gap-1">
          {navGroups.map((group) => (
            <div key={group.name} className="mb-2">
              <p className="label-caps px-2 mb-1" style={{ color: 'rgba(255,90,31,0.7)' }}>{group.name}</p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentPageName === item.page;
                return (
                  <DropdownMenuItem key={item.page} asChild>
                    <Link
                      to={createPageUrl(item.page)}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs cursor-pointer transition-all"
                      style={{
                        color: isActive ? 'var(--accent-2)' : 'rgba(255,255,255,0.55)',
                        background: isActive ? 'rgba(255,90,31,0.1)' : 'transparent',
                      }}
                    >
                      <Icon size={11} />
                      {item.name}
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </div>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Main Layout ─────────────────────────────────────────────────────────────
function LayoutContent({ children, currentPageName }) {
  useRenderCount('LayoutContent');
  useMountLogger('LayoutContent');

  useEffect(() => { initSentry(); }, []);

  const { activeProjectId } = useActiveProject();
  const queryClient = useQueryClient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
    return navGroups.map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.roles || item.roles.includes(currentUser.role))
    })).filter((group) => (!group.roles || group.roles.includes(currentUser.role)) && group.items.length > 0);
  }, [currentUser]);

  // Pages that should show WITHOUT the Phoenix frame (landing, etc.)
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

  // Frameless pages (landing etc.) — render direct
  if (isFrameless) {
    return (
      <>
        <SkipToMainContent />
        <OfflineIndicator />
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
    // Outer page — medium grey, like the reference
    <div style={{ background: '#2B2F38', minHeight: '100vh', padding: '16px', boxSizing: 'border-box' }}>
      <SkipToMainContent />
      <OfflineIndicator />
      <Toaster />
      <CommandPalette />

      {/* ── Phoenix Frame ──────────────────────────────────────── */}
      <div
        style={{
          background: '#0D1117',
          borderRadius: 20,
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
          minHeight: 'calc(100vh - 32px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* ── Top Nav Bar ── */}
        <header
          style={{
            height: 48,   /* slim 48px header */
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            gap: 0,
            flexShrink: 0,
          }}
        >
          {/* Brand */}
          <div className="flex items-center gap-2.5 mr-8 flex-shrink-0">
            <div
              style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'linear-gradient(135deg, #FF5A1F, #FF8C42)',
                boxShadow: '0 0 16px rgba(255,90,31,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Building size={14} color="#fff" />
            </div>
            <span style={{ fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.9)' }}>
              SteelBuild Pro
            </span>
          </div>

          {/* Desktop Tab Nav */}
          <nav className="hidden lg:flex items-center gap-1 flex-1">
            {navTabs.map((tab) => {
              const isActive = currentPageName === tab.page;
              return (
                <Link
                  key={tab.page}
                  to={createPageUrl(tab.page)}
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    padding: '6px 14px',
                    borderRadius: 8,
                    color: isActive ? '#fff' : 'rgba(255,255,255,0.38)',
                    background: isActive ? 'rgba(255,255,255,0.07)' : 'transparent',
                    textDecoration: 'none',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'rgba(255,255,255,0.38)'; }}
                >
                  {tab.name}
                </Link>
              );
            })}
          </nav>

          {/* Right icons */}
          <div className="flex items-center gap-2 ml-auto flex-shrink-0">
            {/* All-apps grid */}
            <AllAppsDropdown navGroups={visibleNavGroups} currentPageName={currentPageName} />

            {/* Notifications */}
            <NotificationCenter />

            {/* Mobile hamburger */}
            <button
              className="lg:hidden flex items-center justify-center w-8 h-8 rounded-xl transition-all"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={15} style={{ color: 'rgba(255,255,255,0.6)' }} /> : <Menu size={15} style={{ color: 'rgba(255,255,255,0.6)' }} />}
            </button>

            {/* User avatar / dropdown */}
            {currentUser && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(135deg, #FF5A1F, #FF8C42)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '0.55rem', fontWeight: 800, color: '#fff' }}>
                        {(currentUser.full_name || currentUser.email || 'U')[0].toUpperCase()}
                      </span>
                    </div>
                    <span className="hidden md:block" style={{ fontSize: '0.65rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {currentUser.full_name || currentUser.email}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48"
                  style={{ background: '#0D1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, boxShadow: '0 16px 40px rgba(0,0,0,0.8)' }}>
                  <div className="px-3 py-2.5">
                    <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginBottom: 2 }}>{currentUser.full_name || currentUser.email}</p>
                    <p style={{ fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,90,31,0.7)' }}>{currentUser.role}</p>
                  </div>
                  <DropdownMenuSeparator style={{ background: 'rgba(255,255,255,0.06)' }} />
                  <DropdownMenuItem asChild>
                    <Link to={createPageUrl('Profile')} style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.55)', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'pointer' }}>
                      <UserCircle size={13} /> Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to={createPageUrl('Settings')} style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.55)', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'pointer' }}>
                      <Settings size={13} /> Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator style={{ background: 'rgba(255,255,255,0.06)' }} />
                  <DropdownMenuItem onClick={() => setShowLogoutDialog(true)} style={{ fontSize: '0.7rem', color: '#FF4D4D', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'pointer' }}>
                    <LogOut size={13} /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </header>

        {/* Mobile nav dropdown */}
        {mobileMenuOpen && (
          <div style={{ background: '#0D1117', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '12px 16px' }}>
            <div className="grid grid-cols-2 gap-1">
              {navTabs.map((tab) => {
                const isActive = currentPageName === tab.page;
                return (
                  <Link
                    key={tab.page}
                    to={createPageUrl(tab.page)}
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                      padding: '8px 12px', borderRadius: 8, textDecoration: 'none',
                      color: isActive ? '#FF8C42' : 'rgba(255,255,255,0.45)',
                      background: isActive ? 'rgba(255,90,31,0.1)' : 'rgba(255,255,255,0.03)',
                    }}
                  >
                    {tab.name}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Page Content ── */}
        <main id="main-content" role="main" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <PullToRefresh onRefresh={handleRefresh}>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPageName}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: [0.65, 0, 0.35, 1] }}
                style={{ color: 'rgba(255,255,255,0.88)', minHeight: '100%' }}
                className="p-2 sm:p-4"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </PullToRefresh>
        </main>

        {/* Mobile bottom nav inside frame */}
        <div className="lg:hidden">
          <MobileNav currentPageName={currentPageName} />
        </div>
      </div>

      {/* ── Logout Dialog ── */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent style={{ background: '#0D1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, color: '#fff' }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: '#fff' }}>Confirm Logout</AlertDialogTitle>
            <AlertDialogDescription style={{ color: 'rgba(255,255,255,0.45)' }}>
              Are you sure you want to end your session?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', borderRadius: 10 }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} style={{ background: 'linear-gradient(90deg,#FF5A1F,#FF8C42)', color: '#fff', borderRadius: 10, border: 'none' }}>
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