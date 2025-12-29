import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  LayoutDashboard, 
  Building2, 
  Calendar, 
  DollarSign, 
  FileText, 
  MessageSquareWarning,
  FileCheck,
  Users,
  Settings,
  Menu,
  X
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import NotificationBell from '@/components/notifications/NotificationBell';

const navItems = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Projects', path: '/Projects', icon: Building2 },
  { label: 'Schedule', path: '/Schedule', icon: Calendar },
  { label: 'Financials', path: '/Financials', icon: DollarSign },
  { label: 'Drawings', path: '/Drawings', icon: FileText },
  { label: 'RFIs', path: '/RFIs', icon: MessageSquareWarning },
  { label: 'Change Orders', path: '/ChangeOrders', icon: FileCheck },
];

export default function Layout({ children, currentPageName }) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const location = useLocation();

  const isActivePage = (path) => {
    if (path === '/') {
      return location.pathname === '/' || location.pathname === '/Dashboard';
    }
    return location.pathname === path || location.pathname === createPageUrl(path.slice(1));
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Top Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-950 border-b border-zinc-800">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to={createPageUrl('Dashboard')} className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center">
                <Building2 size={20} className="text-black" />
              </div>
              <span className="text-xl font-bold hidden sm:block">PM System</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActivePage(item.path);
                return (
                  <Link
                    key={item.path}
                    to={createPageUrl(item.path === '/' ? 'Dashboard' : item.path.slice(1))}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'bg-amber-500 text-black'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                    }`}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-2">
              <NotificationBell />
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-zinc-800 bg-zinc-950">
            <div className="px-4 py-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActivePage(item.path);
                return (
                  <Link
                    key={item.path}
                    to={createPageUrl(item.path === '/' ? 'Dashboard' : item.path.slice(1))}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'bg-amber-500 text-black'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                    }`}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="pt-16">
        <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}