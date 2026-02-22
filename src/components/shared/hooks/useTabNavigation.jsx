import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const TabNavigationContext = createContext(null);

// Map pages to their parent tab
const pageToTabMap = {
  'Dashboard': 'Dashboard',
  'Projects': 'Projects',
  'ProjectDashboard': 'Projects',
  'ProjectSettings': 'Projects',
  'Schedule': 'Schedule',
  'LookAheadPlanning': 'Schedule',
  'WeeklySchedule': 'Schedule',
  'Financials': 'Financials',
  'FinancialsRedesign': 'Financials',
  'BudgetControl': 'Financials',
  'CostCodes': 'Financials',
  'JobStatusReport': 'Financials',
  'ResourceManagement': 'Resources',
  'Resources': 'Resources',
  'Equipment': 'Resources',
  'Labor': 'Resources'
};

export const TabNavigationProvider = ({ children }) => {
  const location = useLocation();
  const [tabStates, setTabStates] = useState({});
  const scrollPositions = useRef({});
  const navigationStacks = useRef({});

  const currentTab = pageToTabMap[location.pathname.split('/').pop()] || 'Dashboard';

  // Save scroll position for current tab
  const saveScrollPosition = useCallback(() => {
    scrollPositions.current[currentTab] = window.scrollY;
  }, [currentTab]);

  // Restore scroll position for tab
  const restoreScrollPosition = useCallback((tab) => {
    const savedPosition = scrollPositions.current[tab] || 0;
    requestAnimationFrame(() => {
      window.scrollTo(0, savedPosition);
    });
  }, []);

  // Save tab state (filters, search, etc.)
  const saveTabState = useCallback((tab, state) => {
    setTabStates(prev => ({
      ...prev,
      [tab]: { ...prev[tab], ...state }
    }));
  }, []);

  // Get tab state
  const getTabState = useCallback((tab) => {
    return tabStates[tab] || {};
  }, [tabStates]);

  // Save navigation stack for tab
  const saveNavigationStack = useCallback((tab, stack) => {
    navigationStacks.current[tab] = stack;
  }, []);

  // Get navigation stack for tab
  const getNavigationStack = useCallback((tab) => {
    return navigationStacks.current[tab] || [];
  }, []);

  // Auto-save scroll position on scroll
  useEffect(() => {
    const handleScroll = () => {
      saveScrollPosition();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [saveScrollPosition]);

  // Restore scroll position when tab changes
  useEffect(() => {
    restoreScrollPosition(currentTab);
  }, [currentTab, restoreScrollPosition]);

  const value = {
    currentTab,
    saveTabState,
    getTabState,
    saveScrollPosition,
    restoreScrollPosition,
    saveNavigationStack,
    getNavigationStack,
    tabStates
  };

  return (
    <TabNavigationContext.Provider value={value}>
      {children}
    </TabNavigationContext.Provider>
  );
};

export const useTabNavigation = () => {
  const context = useContext(TabNavigationContext);
  if (!context) {
    throw new Error('useTabNavigation must be used within TabNavigationProvider');
  }
  return context;
};