import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  DollarSign,
  FileText,
  MessageSquareWarning,
  FileCheck,
  Users,
  Menu,
  X,
  ChevronRight,
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Toaster } from '@/components/ui/Toaster';
import { ConfirmProvider } from '@/components/providers/ConfirmProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import NotificationPanel from '@/components/notifications/NotificationPanel';
import MobileNav from '@/components/layout/MobileNav';
import ThemeToggle from '@/components/layout/ThemeToggle';
import OfflineIndicator from '@/components/shared/OfflineIndicator';
import CommandPalette from '@/components/shared/CommandPalette';

      const navItems = [
        { name: 'Dashboard', page: 'Dashboard', icon: Building2, roles: ['admin', 'user'] },
        { name: 'Projects', page: 'Projects', icon: Building2, roles: ['admin', 'user'] },
        { name: 'Work Packages', page: 'WorkPackages', icon: FileCheck, roles: ['admin', 'user'] },
        { name: 'Labor & Scope', page: 'LaborScope', icon: TrendingUp, roles: ['admin', 'user'] },
        { name: 'Cost Codes', page: 'CostCodes', icon: Hash, roles: ['admin', 'user'] },
        { name: 'Analytics', page: 'Analytics', icon: BarChart3, roles: ['admin', 'user'] },
        { name: 'Financials', page: 'Financials', icon: DollarSign, roles: ['admin', 'user'] },
        { name: 'Detailing', page: 'Detailing', icon: FileText, roles: ['admin', 'user'] },
        { name: 'RFIs', page: 'RFIs', icon: MessageSquareWarning, roles: ['admin', 'user'] },
        { name: 'Change Orders', page: 'ChangeOrders', icon: FileCheck, roles: ['admin', 'user'] },
        { name: 'Schedule', page: 'Schedule', icon: Calendar, roles: ['admin', 'user'] },
        { name: 'Fabrication', page: 'Fabrication', icon: TrendingUp, roles: ['admin', 'user'] },
        { name: 'Deliveries', page: 'Deliveries', icon: Truck, roles: ['admin', 'user'] },
        { name: 'Resources', page: 'Resources', icon: Users, roles: ['admin', 'user'] },
        { name: 'Resource Management', page: 'ResourceManagement', icon: TrendingUp, roles: ['admin', 'user'] },
        { name: 'Equipment', page: 'Equipment', icon: Truck, roles: ['admin', 'user'] },
        { name: 'Labor', page: 'Labor', icon: Clock, roles: ['admin', 'user'] },
        { name: 'Meetings', page: 'Meetings', icon: Users, roles: ['admin', 'user'] },
        { name: 'Production Notes', page: 'ProductionMeetings', icon: Calendar, roles: ['admin', 'user'] },
        { name: 'Documents', page: 'Documents', icon: File, roles: ['admin', 'user'] },
        { name: 'Daily Logs', page: 'DailyLogs', icon: Calendar, roles: ['admin', 'user'] },
        { name: 'Reports', page: 'Reports', icon: FileText, roles: ['admin', 'user'] },
        { name: 'Performance', page: 'Performance', icon: TrendingUp, roles: ['admin', 'user'] },
        { name: 'AI Insights', page: 'Insights', icon: Sparkles, roles: ['admin', 'user'] },
        { name: 'Messages', page: 'Messages', icon: MessageSquareWarning, roles: ['admin', 'user'] },
        { name: 'Field Tools', page: 'FieldTools', icon: Camera, roles: ['admin', 'user'] },
        { name: 'Custom Dashboard', page: 'CustomDashboard', icon: BarChart3, roles: ['admin', 'user'] },
        { name: 'Integrations', page: 'Integrations', icon: Sparkles, roles: ['admin'] },
        { name: 'Profile', page: 'Profile', icon: UserCircle, roles: ['admin', 'user'] },
        { name: 'Settings', page: 'Settings', icon: Settings, roles: ['admin'] },
      ];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { activeProjectId } = useActiveProject();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch {
        return null;
      }
    },
  });

  const { data: activeProject } = useQuery({
    queryKey: ['activeProject', activeProjectId],
    queryFn: async () => {
      if (!activeProjectId) return null;
      return await base44.entities.Project.filter({ id: activeProjectId });
    },
    enabled: !!activeProjectId,
    select: (data) => data?.[0] || null,
  });

  const handleLogout = () => {
    base44.auth.logout();
  };

  const projectPhase = activeProject?.phase || 'fabrication';

  const visibleNavItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(currentUser?.role)
  );

  const getNavItemPriority = (item) => {
    if (projectPhase === 'detailing' && item.page === 'Detailing') return 1;
    if (projectPhase === 'fabrication' && item.page === 'Fabrication') return 1;
    if (projectPhase === 'delivery' && item.page === 'Deliveries') return 1;
    if (projectPhase === 'erection' && item.page === 'Schedule') return 1;
    return 2;
  };

  const sortedNavItems = [...visibleNavItems].sort((a, b) => {
    const priorityA = getNavItemPriority(a);
    const priorityB = getNavItemPriority(b);
    return priorityA - priorityB;
  });

  return (
    <ThemeProvider>
      <ConfirmProvider>
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
            className="p-2 text-zinc-400 hover:text-white"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-500 rounded flex items-center justify-center">
              <Building2 size={18} className="text-black" />
            </div>
            <span className="font-bold text-lg tracking-tight">SteelBuild Pro</span>
          </div>
        </div>

        {currentUser && (
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationPanel />
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
        )}
      </header>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-full w-64 bg-card border-r border-border transition-transform duration-200 flex flex-col',
          'lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="h-16 flex items-center px-4 border-b border-border flex-shrink-0">
          <div className="w-8 h-8 bg-amber-500 rounded flex items-center justify-center">
            <Building2 size={18} className="text-black" />
          </div>
          <span className="font-bold text-lg tracking-tight ml-3">SteelBuild Pro</span>
        </div>

        <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
          {sortedNavItems.map((item) => {
            const isActive = currentPageName === item.page;
            const isPrimaryPhase = getNavItemPriority(item) === 1;
            const Icon = item.icon;

            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                    : isPrimaryPhase
                    ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/5'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                )}
              >
                <Icon size={18} />
                {item.name}
                {isActive && <ChevronRight size={16} className="ml-auto" />}
              </Link>
            );
          })}
        </nav>

        {currentUser && (
          <div className="border-t border-border p-3 flex-shrink-0">
            <div className="flex items-center justify-between mb-3 px-3">
              <ThemeToggle />
              <NotificationPanel />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary">
                <UserCircle size={18} className="text-amber-500" />
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium truncate">
                    {currentUser.full_name || currentUser.email}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">{currentUser.role}</p>
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
        )}
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen pb-20 lg:pb-0">
        <div className="p-4 lg:p-6">{children}</div>
      </main>

      <MobileNav currentPageName={currentPageName} />
        </div>
        </ConfirmProvider>
        </ThemeProvider>
        );
        }