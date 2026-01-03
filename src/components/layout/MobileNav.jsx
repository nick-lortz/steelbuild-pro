import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Building2, 
  Calendar, 
  DollarSign, 
  Users, 
  UserCircle,
  X 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const tabs = [
  { name: 'Dashboard', page: 'Dashboard', icon: Building2 },
  { name: 'Projects', page: 'Projects', icon: Building2 },
  { name: 'Schedule', page: 'Schedule', icon: Calendar },
  { name: 'Financials', page: 'Financials', icon: DollarSign },
  { name: 'Resources', page: 'Resources', icon: Users },
];

export default function MobileNav({ currentPageName }) {
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 border-t border-zinc-800 safe-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentPageName === tab.page;
          
          return (
            <Link
              key={tab.page}
              to={createPageUrl(tab.page)}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[64px]",
                isActive 
                  ? "text-amber-500" 
                  : "text-zinc-400 active:bg-zinc-800"
              )}
            >
              <Icon size={20} />
              <span className="text-[10px] font-medium">{tab.name}</span>
            </Link>
          );
        })}
        
        <Link
          to={createPageUrl('Settings')}
          className={cn(
            "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[64px]",
            currentPageName === 'Settings' 
              ? "text-amber-500" 
              : "text-zinc-400 active:bg-zinc-800"
          )}
        >
          <UserCircle size={20} />
          <span className="text-[10px] font-medium">Profile</span>
        </Link>
      </div>
    </nav>
  );
}