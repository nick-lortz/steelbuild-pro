import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

const tabs = [
  { name: 'Dashboard', page: 'Dashboard', icon: Building2, rootPage: 'Dashboard' },
  { name: 'Projects', page: 'Projects', icon: Building2, rootPage: 'Projects' },
  { name: 'Schedule', page: 'Schedule', icon: Calendar, rootPage: 'Schedule' },
  { name: 'Financials', page: 'FinancialsRedesign', icon: DollarSign, rootPage: 'FinancialsRedesign' },
  { name: 'Resources', page: 'Resources', icon: Users, rootPage: 'ResourceManagement' },
];

// Map pages to their parent tab for proper navigation stack tracking
const pageToTabMap = {
  'Dashboard': 'Dashboard',
  'Projects': 'Projects',
  'ProjectDashboard': 'Projects',
  'ProjectSettings': 'Projects',
  'PortfolioPulse': 'Dashboard',
  'Schedule': 'Schedule',
  'LookAheadPlanning': 'Schedule',
  'WeeklySchedule': 'Schedule',
  'FinancialsRedesign': 'FinancialsRedesign',
  'Financials': 'FinancialsRedesign',
  'BudgetControl': 'FinancialsRedesign',
  'CostCodes': 'FinancialsRedesign',
  'ResourceManagement': 'Resources',
  'Resources': 'Resources',
  'Equipment': 'Resources',
  'Labor': 'Resources',
  'RFIHub': 'Dashboard',
  'WorkPackages': 'Dashboard',
  'Deliveries': 'Dashboard',
  'ChangeOrders': 'Dashboard',
  'Drawings': 'Dashboard',
  'Submittals': 'Dashboard',
  'Detailing': 'Dashboard',
  'Fabrication': 'Dashboard',
  'Profile': 'Profile'
};

export default function MobileNav({ currentPageName }) {
  const navigate = useNavigate();

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
    <nav 
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 safe-bottom"
      style={{
        background: '#0D1117',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '8px 8px',
      }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const currentTab = pageToTabMap[currentPageName];
        const isActive = currentTab === tab.page;
        
        return (
          <Link
            key={tab.page}
            to={createPageUrl(tab.page)}
            onClick={(e) => handleTabClick(e, tab)}
            className="flex flex-col items-center gap-1 rounded-lg transition-colors"
            style={{
              padding: '8px 12px',
              minWidth: '64px',
              color: isActive ? '#FF8C42' : 'rgba(255,255,255,0.55)',
              backgroundColor: isActive ? 'rgba(255,90,31,0.1)' : 'transparent',
              textDecoration: 'none',
            }}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <Icon size={20} style={{ color: isActive ? '#FF8C42' : 'rgba(255,255,255,0.4)' }} />
            <span style={{ fontSize: '10px', fontWeight: 500 }}>{tab.name}</span>
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
        className="flex flex-col items-center gap-1 rounded-lg transition-colors"
        style={{
          padding: '8px 12px',
          minWidth: '64px',
          color: currentPageName === 'Profile' ? '#FF8C42' : 'rgba(255,255,255,0.55)',
          backgroundColor: currentPageName === 'Profile' ? 'rgba(255,90,31,0.1)' : 'transparent',
          textDecoration: 'none',
        }}
        onMouseEnter={(e) => {
          if (currentPageName !== 'Profile') e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
        }}
        onMouseLeave={(e) => {
          if (currentPageName !== 'Profile') e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <UserCircle size={20} style={{ color: currentPageName === 'Profile' ? '#FF8C42' : 'rgba(255,255,255,0.4)' }} />
        <span style={{ fontSize: '10px', fontWeight: 500 }}>Profile</span>
      </Link>
    </nav>
  );
}