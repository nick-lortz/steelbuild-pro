import { useState, useEffect, createContext, useContext } from 'react';

const ActiveProjectContext = createContext();

export function ActiveProjectProvider({ children }) {
  console.log('ActiveProjectProvider mounted');
  
  const [activeProjectId, setActiveProjectId] = useState(() => {
    return localStorage.getItem('activeProjectId') || null;
  });

  useEffect(() => {
    if (activeProjectId) {
      localStorage.setItem('activeProjectId', activeProjectId);
    } else {
      localStorage.removeItem('activeProjectId');
    }
  }, [activeProjectId]);

  return (
    <ActiveProjectContext.Provider value={{ activeProjectId, setActiveProjectId }}>
      {children}
    </ActiveProjectContext.Provider>
  );
}

export function useActiveProject() {
  const context = useContext(ActiveProjectContext);
  if (!context) {
    throw new Error('useActiveProject must be used within ActiveProjectProvider');
  }
  return context;
}