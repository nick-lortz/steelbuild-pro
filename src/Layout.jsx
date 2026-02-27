import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { FileText, BarChart3, Home, Menu, X } from 'lucide-react';

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { label: 'Home', path: 'Home', icon: Home },
    { label: 'Reporting', path: 'Reporting', icon: BarChart3 },
    { label: 'Documents', path: 'DocumentManagement', icon: FileText },
  ];

  return (
    <div className="flex min-h-screen bg-gray-900">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 md:hidden bg-gray-800 p-2 rounded-lg text-white"
      >
        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 w-64 bg-gray-800 border-r border-gray-700 transform transition-transform
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 z-40 md:relative
      `}>
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-xl font-bold text-white">Steel Project</h1>
        </div>
        <nav className="p-4 space-y-2">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentPageName === item.path;
            return (
              <Link
                key={item.path}
                to={createPageUrl(item.path)}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 w-full pt-14 md:pt-0">
        {children}
      </main>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 md:hidden z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}