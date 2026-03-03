import React, { createContext, useContext, useEffect } from 'react';

// Phoenix Industrial Dark — theme is always dark, no toggle.
const ThemeContext = createContext({ theme: 'dark', toggleTheme: () => {} });

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }) {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light');
    root.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: 'dark', toggleTheme: () => {} }}>
      {children}
    </ThemeContext.Provider>
  );
}