import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useRenderCount, useMountLogger } from '@/components/shared/diagnostics';
import {
  Building,
  DollarSign,
  FileText,
  MessageSquareWarning,
  FileCheck,
  FileQuestion,
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
  Gauge } from
'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger } from
'@/components/ui/dropdown-menu';
import { Toaster } from '@/components/ui/Toaster';
import { ConfirmProvider } from '@/components/providers/ConfirmProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { ActiveProjectProvider, useActiveProject } from '@/components/shared/hooks/useActiveProject';
import NotificationPanel from '@/components/notifications/NotificationPanel';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import MobileNav from '@/components/layout/MobileNav';
import ThemeToggle from '@/components/layout/ThemeToggle';
import OfflineIndicator from '@/components/shared/OfflineIndicator';
import CommandPalette from '@/components/shared/CommandPalette';

const navGroups = [
  {
    name: 'Overview',
    icon: LayoutDashboard,
    items: [
      { name: 'Dashboard', page: 'Dashboard', icon: Building },
      { name: 'Projects', page: 'Projects', icon: Building },
      { name: 'Executive Roll-Up', page: 'ExecutiveRollUp', icon: BarChart3 },
      { name: 'Calendar', page: 'Calendar', icon: Calendar }
    ],
    roles: ['admin', 'user']
  },
  {
    name: 'Project Execution',
    icon: CheckCircle2,
    items: [
      { name: 'Schedule', page: 'Schedule', icon: Calendar },
      { name: 'Look-Ahead Planning', page: 'LookAheadPlanning', icon: Calendar },
      { name: 'Weekly Schedule', page: 'WeeklySchedule', icon: Calendar },
      { name: 'Work Packages', page: 'WorkPackages', icon: FileCheck },
      { name: 'To-Do List', page: 'ToDoList', icon: CheckCircle2 },
      { name: 'Field Tools', page: 'FieldTools', icon: Camera }
    ],
    roles: ['admin', 'user']
  },
  {
    name: 'Design & Fabrication',
    icon: Wrench,
    items: [
      { name: 'Detailing', page: 'Detailing', icon: FileText },
      { name: 'Fabrication', page: 'Fabrication', icon: TrendingUp },
      { name: 'Documents', page: 'Documents', icon: File },
      { name: 'Photos', page: 'ProjectPhotos', icon: Camera }
    ],
    roles: ['admin', 'user']
  },
  {
    name: 'Logistics',
    icon: Truck,
    items: [
      { name: 'Deliveries', page: 'Deliveries', icon: Truck },
      { name: 'Daily Logs', page: 'DailyLogs', icon: Calendar }
    ],
    roles: ['admin', 'user']
  },
  {
    name: 'Cost Management',
    icon: DollarSign,
    items: [
      { name: 'Financials', page: 'Financials', icon: DollarSign },
      { name: 'Budget Control', page: 'BudgetControl', icon: DollarSign },
      { name: 'Cost Codes', page: 'CostCodes', icon: Hash },
      { name: 'Change Orders', page: 'ChangeOrders', icon: FileCheck },
      { name: 'Labor & Scope', page: 'LaborScope', icon: TrendingUp }
    ],
    roles: ['admin', 'user']
  },
  {
    name: 'Resources',
    icon: Users,
    items: [
      { name: 'Resource Management', page: 'ResourceManagement', icon: Package },
      { name: 'Equipment', page: 'Equipment', icon: Truck },
      { name: 'Labor', page: 'Labor', icon: Clock }
    ],
    roles: ['admin', 'user']
  },
  {
    name: 'Communications',
    icon: MessageSquare,
    items: [
      { name: 'RFIs', page: 'RFIs', icon: MessageSquareWarning },
      { name: 'RFI Hub', page: 'RFIHub', icon: FileQuestion },
      { name: 'Submittals', page: 'Submittals', icon: FileCheck },
      { name: 'Messages', page: 'Messages', icon: MessageSquareWarning },
      { name: 'Meetings', page: 'Meetings', icon: Users },
      { name: 'Production Notes', page: 'ProductionMeetings', icon: Calendar },
      { name: 'My Action Items', page: 'MyActionItems', icon: CheckCircle2 }
    ],
    roles: ['admin', 'user']
  },
  {
    name: 'Insights & Reporting',
    icon: BarChart3,
    items: [
      { name: 'Analytics', page: 'Analytics', icon: BarChart3 },
      { name: 'Reports', page: 'Reports', icon: FileText },
      { name: 'Performance', page: 'Performance', icon: Gauge },
      { name: 'Job Status Report', page: 'JobStatusReport', icon: FileText },
      { name: 'AI Insights', page: 'Insights', icon: Sparkles }
    ],
    roles: ['admin', 'user']
  },
  {
    name: 'Settings',
    icon: Settings,
    items: [
      { name: 'Profile', page: 'Profile', icon: UserCircle, roles: ['admin', 'user'] },
      { name: 'Notifications', page: 'NotificationSettings', icon: Settings, roles: ['admin', 'user'] },
      { name: 'Integrations', page: 'Integrations', icon: Sparkles, roles: ['admin'] },
      { name: 'Settings', page: 'Settings', icon: Settings, roles: ['admin'] }
    ],
    roles: ['admin', 'user']
  }
];


function LayoutContent({ children, currentPageName }) {
  useRenderCount('LayoutContent');
  useMountLogger('LayoutContent');

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState(() => {
    const saved = localStorage.getItem('nav_expanded_groups');
    return saved ? JSON.parse(saved) : ['Overview', 'Project Execution'];
  });
  const { activeProjectId } = useActiveProject();

  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => {
      const newExpanded = prev.includes(groupName)
        ? prev.filter(g => g !== groupName)
        : [...prev, groupName];
      localStorage.setItem('nav_expanded_groups', JSON.stringify(newExpanded));
      return newExpanded;
    });
  };

  const { data: currentUser, isLoading: userLoading, error: userError } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch (error) {
        // If unauthorized, redirect to login
        if (error?.response?.status === 401 || error?.status === 401) {
          base44.auth.redirectToLogin(window.location.pathname);
          return null;
        }
        throw error;
      }
    },
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false
  });

  const { data: activeProject } = useQuery({
    queryKey: ['activeProject', activeProjectId],
    queryFn: async () => {
      if (!activeProjectId) return null;
      return await base44.entities.Project.filter({ id: activeProjectId });
    },
    enabled: !!activeProjectId,
    select: (data) => data?.[0] || null,
    staleTime: 5 * 60 * 1000
  });

  const handleLogout = () => {
    base44.auth.logout();
  };

  const projectPhase = activeProject?.phase || 'fabrication';

  const visibleNavGroups = useMemo(() => {
    if (!currentUser) return navGroups;
    return navGroups.map(group => ({
      ...group,
      items: group.items.filter(item => 
        !item.roles || item.roles.includes(currentUser.role)
      )
    })).filter(group => 
      (!group.roles || group.roles.includes(currentUser.role)) && group.items.length > 0
    );
  }, [currentUser]);

  // Show loading state while checking auth
  if (userLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <OfflineIndicator />
      <Toaster />
      <CommandPalette />
          <style>{`
            .dark {
              --background: 0 0% 4%;
              --foreground: 0 0% 95%;
              --card: 0 0% 7%;
              --card-foreground: 0 0% 95%;
              --primary: 35 100% 50%;
              --primary-foreground: 0 0% 0%;
              --secondary: 0 0% 12%;
              --secondary-foreground: 0 0% 95%;
              --muted: 0 0% 15%;
              --muted-foreground: 0 0% 65%;
              --accent: 35 100% 50%;
              --accent-foreground: 0 0% 0%;
              --destructive: 0 62% 50%;
              --destructive-foreground: 0 0% 95%;
              --border: 0 0% 18%;
              --input: 0 0% 15%;
              --ring: 35 100% 50%;
            }
            
            .light {
              --background: 0 0% 100%;
              --foreground: 0 0% 10%;
              --card: 0 0% 98%;
              --card-foreground: 0 0% 10%;
              --primary: 35 100% 50%;
              --primary-foreground: 0 0% 100%;
              --secondary: 0 0% 95%;
              --secondary-foreground: 0 0% 10%;
              --muted: 0 0% 90%;
              --muted-foreground: 0 0% 40%;
              --accent: 35 100% 50%;
              --accent-foreground: 0 0% 100%;
              --destructive: 0 62% 50%;
              --destructive-foreground: 0 0% 98%;
              --border: 0 0% 85%;
              --input: 0 0% 90%;
              --ring: 35 100% 50%;
            }
          `}</style>
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 h-16 bg-card border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 text-zinc-400 hover:text-white">

            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-500 rounded flex items-center justify-center">
              <Building size={18} className="text-black" />
            </div>
            <span className="font-bold text-lg tracking-tight">SteelBuild Pro</span>
          </div>
        </div>

        {currentUser &&
        <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationCenter />
            <DropdownMenu>
              <DropdownMenuTrigger className="p-2">
                <UserCircle size={24} className="text-zinc-400" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-zinc-900 border-zinc-800 text-white">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium text-white">
                    {currentUser.full_name || currentUser.email}
                  </p>
                  <p className="text-xs text-zinc-400 capitalize">{currentUser.role}</p>
                </div>
                <DropdownMenuSeparator className="bg-zinc-800" />
                <DropdownMenuItem asChild className="text-white hover:text-white">
                  <Link to={createPageUrl('Settings')}>
                    <Settings size={16} className="mr-2" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="text-red-400 hover:text-red-300">
                  <LogOut size={16} className="mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      </header>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-full w-64 bg-black border-r border-zinc-800 flex flex-col',
          'lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}>

        <div className="h-16 flex items-center px-4 border-b-2 border-zinc-800 flex-shrink-0">
          <div className="w-8 h-8 bg-amber-500 flex items-center justify-center">
            <Building size={18} className="text-black" />
          </div>
          <span className="font-bold text-lg tracking-tight ml-3 text-white">SteelBuild Pro</span>
        </div>

        <nav className="p-2 space-y-1 flex-1 overflow-y-auto">
          {visibleNavGroups.map((group) => {
            const isExpanded = expandedGroups.includes(group.name);
            const GroupIcon = group.icon;
            const hasActivePage = group.items.some(item => item.page === currentPageName);

            return (
              <div key={group.name}>
                {/* Group Header */}
                <button
                  onClick={() => toggleGroup(group.name)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors',
                    hasActivePage ? 'text-amber-500' : 'text-zinc-400 hover:text-white'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <GroupIcon size={12} />
                    <span>{group.name}</span>
                  </div>
                  <ChevronDown 
                    size={12} 
                    className={cn(
                      'transition-transform',
                      isExpanded ? 'rotate-0' : '-rotate-90'
                    )}
                  />
                </button>

                {/* Group Items */}
                {isExpanded && (
                  <div className="ml-2 mt-0.5 space-y-0.5">
                    {group.items.map((item) => {
                      const isActive = currentPageName === item.page;
                      const Icon = item.icon;

                      return (
                        <Link
                          key={item.page}
                          to={createPageUrl(item.page)}
                          onClick={() => setSidebarOpen(false)}
                          className={cn(
                            'flex items-center gap-2 px-3 py-1.5 text-xs font-medium transition-colors rounded',
                            isActive
                              ? 'bg-amber-500 text-black'
                              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                          )}
                        >
                          <Icon size={13} />
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

        {currentUser &&
        <div className="border-t-2 border-zinc-800 p-2 flex-shrink-0">
            <div className="flex items-center justify-between mb-2 px-2">
              <ThemeToggle />
              <NotificationCenter />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger className="w-full flex items-center gap-2 px-2 py-2 hover:bg-zinc-900 transition-colors">
                <UserCircle size={14} className="text-amber-500" />
                <div className="flex-1 text-left">
                  <p className="text-xs font-bold text-white truncate uppercase tracking-wider">
                    {currentUser.full_name || currentUser.email}
                  </p>
                  <p className="text-[10px] text-zinc-600 uppercase tracking-widest">{currentUser.role}</p>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-zinc-900 border-zinc-800 text-white">
                <DropdownMenuItem asChild className="text-white hover:text-white">
                  <Link to={createPageUrl('Settings')}>
                    <Settings size={16} className="mr-2" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-zinc-800" />
                <DropdownMenuItem onClick={handleLogout} className="text-red-400 hover:text-red-300">
                  <LogOut size={16} className="mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      </aside>

      {sidebarOpen &&
      <div
        className="fixed inset-0 bg-black/50 z-30 lg:hidden"
        onClick={() => setSidebarOpen(false)} />

      }

      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen pb-20 lg:pb-0">
        <div className="text-slate-50 p-4 lg:p-6">{children}</div>
      </main>

      <MobileNav currentPageName={currentPageName} />
      </div>);

}

const LayoutWithProviders = React.memo(function LayoutWithProviders({ children, currentPageName }) {
  return (
    <ThemeProvider>
      <ConfirmProvider>
        <ActiveProjectProvider>
          <LayoutContent children={children} currentPageName={currentPageName} />
        </ActiveProjectProvider>
      </ConfirmProvider>
    </ThemeProvider>
  );
});

export default LayoutWithProviders;