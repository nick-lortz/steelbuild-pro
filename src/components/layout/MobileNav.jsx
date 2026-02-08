import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Building2, 
  Calendar, 
  DollarSign, 
  Users, 
  UserCircle 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

const tabs = [
  { name: 'Dashboard', page: 'Dashboard', icon: Building2, rootPage: 'Dashboard' },
  { name: 'Projects', page: 'Projects', icon: Building2, rootPage: 'Projects' },
  { name: 'Schedule', page: 'Schedule', icon: Calendar, rootPage: 'Schedule' },
  { name: 'Financials', page: 'Financials', icon: DollarSign, rootPage: 'Financials' },
  { name: 'Resources', page: 'Resources', icon: Users, rootPage: 'ResourceManagement' },
];

// Map pages to their parent tab for proper navigation stack tracking
const pageToTabMap = {
  'Dashboard': 'Dashboard',
  'Projects': 'Projects',
  'ProjectDashboard': 'Projects',
  'ProjectSettings': 'Projects',
  'Schedule': 'Schedule',
  'LookAheadPlanning': 'Schedule',
  'WeeklySchedule': 'Schedule',
  'Financials': 'Financials',
  'BudgetControl': 'Financials',
  'CostCodes': 'Financials',
  'ResourceManagement': 'Resources',
  'Resources': 'Resources',
  'Equipment': 'Resources',
  'Labor': 'Resources',
  'Profile': 'Profile'
};

export default function MobileNav({ currentPageName }) {
  const navigate = useNavigate();
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => apiClient.auth.me(),
  });

  const handleTabClick = (e, tab) => {
    const currentTab = pageToTabMap[currentPageName];
    const targetTab = tab.page;
    
    // If clicking the active tab, navigate to its root page
    if (currentTab === targetTab && currentPageName !== tab.rootPage) {
      e.preventDefault();
      navigate(createPageUrl(tab.rootPage));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (currentPageName === tab.page) {
      // Already on root page, just scroll to top
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 border-t border-zinc-800 safe-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const currentTab = pageToTabMap[currentPageName];
          const isActive = currentTab === tab.page;
          
          return (
            <Link
              key={tab.page}
              to={createPageUrl(tab.page)}
              onClick={(e) => handleTabClick(e, tab)}
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
          to={createPageUrl('Profile')}
          onClick={(e) => {
            if (currentPageName === 'Profile') {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
          className={cn(
            "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[64px]",
            currentPageName === 'Profile' 
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
