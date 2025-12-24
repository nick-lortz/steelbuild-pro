import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
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
  Truck
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { name: 'Dashboard', page: 'Dashboard', icon: Building2 },
  { name: 'Projects', page: 'Projects', icon: Building2 },
  { name: 'Cost Codes', page: 'CostCodes', icon: Hash },
  { name: 'Financials', page: 'Financials', icon: DollarSign },
  { name: 'Drawings', page: 'Drawings', icon: FileText },
  { name: 'RFIs', page: 'RFIs', icon: MessageSquareWarning },
  { name: 'Change Orders', page: 'ChangeOrders', icon: FileCheck },
  { name: 'Resources', page: 'Resources', icon: Users },
  { name: 'Equipment', page: 'Equipment', icon: 'Truck' },
  { name: 'Labor', page: 'Labor', icon: 'Clock' },
  { name: 'Meetings', page: 'Meetings', icon: 'Users' },
  { name: 'Documents', page: 'Documents', icon: 'File' },
  { name: 'Daily Logs', page: 'DailyLogs', icon: 'Calendar' },
  { name: 'Performance', page: 'Performance', icon: 'TrendingUp' },
  { name: 'AI Insights', page: 'Insights', icon: 'Sparkles' },
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <style>{`
        :root {
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
      `}</style>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 h-16 bg-zinc-900 border-b border-zinc-800 flex items-center px-4">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 text-zinc-400 hover:text-white"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <div className="flex items-center gap-2 ml-4">
          <div className="w-8 h-8 bg-amber-500 rounded flex items-center justify-center">
            <Building2 size={18} className="text-black" />
          </div>
          <span className="font-bold text-lg tracking-tight">SteelBuild Pro</span>
        </div>
      </header>

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 z-40 h-full w-64 bg-zinc-900 border-r border-zinc-800 transition-transform duration-200",
        "lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-zinc-800">
          <div className="w-8 h-8 bg-amber-500 rounded flex items-center justify-center">
            <Building2 size={18} className="text-black" />
          </div>
          <span className="font-bold text-lg tracking-tight ml-3">SteelBuild Pro</span>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = currentPageName === item.page;
            const Icon = typeof item.icon === 'string' ? eval(item.icon) : item.icon;
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" 
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                )}
              >
                <Icon size={18} />
                {item.name}
                {isActive && <ChevronRight size={16} className="ml-auto" />}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}