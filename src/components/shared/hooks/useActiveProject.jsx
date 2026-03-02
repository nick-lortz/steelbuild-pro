import React, { useState, useEffect, createContext, useContext, useMemo } from 'react';

const ActiveProjectContext = createContext(null);

export const ActiveProjectProvider = React.memo(
/** @param {{ children: React.ReactNode }} props */
function ActiveProjectProvider({ children }) {
  const [activeProjectId, setActiveProjectId] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('activeProjectId');
      return stored ? Number(stored) : null;
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

  const wrappedSetActiveProjectId = React.useCallback((id) => {
    setActiveProjectId(id != null ? Number(id) : null);
  }, []);

  const value = useMemo(() => ({ activeProjectId, setActiveProjectId: wrappedSetActiveProjectId }), [activeProjectId, wrappedSetActiveProjectId]);

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