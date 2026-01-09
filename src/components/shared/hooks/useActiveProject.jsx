import React, { useState, useEffect, createContext, useContext, useMemo } from 'react';

const ActiveProjectContext = createContext();

export const ActiveProjectProvider = React.memo(function ActiveProjectProvider({ children }) {
  const [activeProjectId, setActiveProjectId] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('activeProjectId') || null;
    }
    return null;
  });

  useEffect(() => {
    if (activeProjectId) {
      localStorage.setItem('activeProjectId', activeProjectId);
    } else {
      localStorage.removeItem('activeProjectId');
    }
  }, [activeProjectId]);

  const value = useMemo(() => ({ activeProjectId, setActiveProjectId }), [activeProjectId]);

  return (
    <ActiveProjectContext.Provider value={value}>
      {children}
    </ActiveProjectContext.Provider>
  );
});

export function useActiveProject() {
  const context = useContext(ActiveProjectContext);
  if (!context) {
    throw new Error('useActiveProject must be used within ActiveProjectProvider');
  }
  return context;
}