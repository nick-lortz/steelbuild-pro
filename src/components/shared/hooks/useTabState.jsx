import { useState, useEffect, useRef, useCallback } from 'react';
import { useActiveProject } from './useActiveProject';

const DB_NAME = 'steelbuild_tab_state';
const DB_VERSION = 1;
const STORE_NAME = 'tab_states';

// IndexedDB wrapper with localStorage fallback
class TabStateStorage {
  constructor() {
    this.db = null;
    this.fallbackToLocalStorage = false;
    this.initDB();
  }

  async initDB() {
    if (typeof window === 'undefined') return;

    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => {
        console.warn('[TabState] IndexedDB failed, using localStorage');
        this.fallbackToLocalStorage = true;
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };
    } catch (error) {
      console.warn('[TabState] IndexedDB unavailable, using localStorage');
      this.fallbackToLocalStorage = true;
    }
  }

  async get(key) {
    if (this.fallbackToLocalStorage) {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    }

    if (!this.db) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (!this.db) return null;
    }

    return new Promise((resolve) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result?.value || null);
      };

      request.onerror = () => {
        resolve(null);
      };
    });
  }

  async set(key, value) {
    if (this.fallbackToLocalStorage) {
      localStorage.setItem(key, JSON.stringify(value));
      return;
    }

    if (!this.db) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (!this.db) {
        localStorage.setItem(key, JSON.stringify(value));
        return;
      }
    }

    return new Promise((resolve) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({ key, value, timestamp: Date.now() });

      request.onsuccess = () => resolve();
      request.onerror = () => {
        localStorage.setItem(key, JSON.stringify(value));
        resolve();
      };
    });
  }

  async delete(key) {
    if (this.fallbackToLocalStorage) {
      localStorage.removeItem(key);
      return;
    }

    if (!this.db) return;

    return new Promise((resolve) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  }
}

const storage = new TabStateStorage();

/**
 * Persist and restore tab state across tab switches
 * 
 * @param {string} tabId - Unique tab identifier (e.g., 'financials', 'rfis')
 * @param {string} routeId - Sub-route within tab (optional)
 * @returns {object} State management utilities
 */
export function useTabState(tabId, routeId = 'default') {
  const { activeProjectId } = useActiveProject();
  const [user, setUser] = useState(null);
  const scrollRef = useRef(null);
  const restoredRef = useRef(false);

  // Get current user
  useEffect(() => {
    import('@/api/base44Client').then(({ base44 }) => {
      base44.auth.me().then(setUser).catch(() => {});
    });
  }, []);

  // Build storage key
  const getStorageKey = useCallback((stateType) => {
    if (!user?.id) return null;
    return `tab_${user.id}_${activeProjectId || 'global'}_${tabId}_${routeId}_${stateType}`;
  }, [user?.id, activeProjectId, tabId, routeId]);

  // Save scroll position
  const saveScroll = useCallback(async () => {
    const key = getStorageKey('scroll');
    if (!key) return;

    const scrollY = window.scrollY;
    await storage.set(key, { scrollY, timestamp: Date.now() });
  }, [getStorageKey]);

  // Restore scroll position
  const restoreScroll = useCallback(async () => {
    const key = getStorageKey('scroll');
    if (!key || restoredRef.current) return;

    const data = await storage.get(key);
    if (data?.scrollY !== undefined) {
      // Delay to ensure content is rendered
      requestAnimationFrame(() => {
        window.scrollTo(0, data.scrollY);
        restoredRef.current = true;
      });
    }
  }, [getStorageKey]);

  // Save filters
  const saveFilters = useCallback(async (filters) => {
    const key = getStorageKey('filters');
    if (!key) return;
    await storage.set(key, filters);
  }, [getStorageKey]);

  // Restore filters
  const restoreFilters = useCallback(async () => {
    const key = getStorageKey('filters');
    if (!key) return null;
    return await storage.get(key);
  }, [getStorageKey]);

  // Save table state (sort, pagination)
  const saveTableState = useCallback(async (tableState) => {
    const key = getStorageKey('table');
    if (!key) return;
    await storage.set(key, tableState);
  }, [getStorageKey]);

  // Restore table state
  const restoreTableState = useCallback(async () => {
    const key = getStorageKey('table');
    if (!key) return null;
    return await storage.get(key);
  }, [getStorageKey]);

  // Save selection/expansion
  const saveSelection = useCallback(async (selection) => {
    const key = getStorageKey('selection');
    if (!key) return;
    await storage.set(key, selection);
  }, [getStorageKey]);

  // Restore selection/expansion
  const restoreSelection = useCallback(async () => {
    const key = getStorageKey('selection');
    if (!key) return null;
    return await storage.get(key);
  }, [getStorageKey]);

  // Clear all state for this tab
  const clearTabState = useCallback(async () => {
    const types = ['scroll', 'filters', 'table', 'selection'];
    await Promise.all(
      types.map(type => {
        const key = getStorageKey(type);
        return key ? storage.delete(key) : Promise.resolve();
      })
    );
    restoredRef.current = false;
  }, [getStorageKey]);

  // Auto-save scroll on unmount
  useEffect(() => {
    const handleScroll = () => {
      if (scrollRef.current) clearTimeout(scrollRef.current);
      scrollRef.current = setTimeout(saveScroll, 300);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      saveScroll();
    };
  }, [saveScroll]);

  // Auto-restore on mount
  useEffect(() => {
    if (!restoredRef.current) {
      restoreScroll();
    }
  }, [restoreScroll]);

  return {
    saveScroll,
    restoreScroll,
    saveFilters,
    restoreFilters,
    saveTableState,
    restoreTableState,
    saveSelection,
    restoreSelection,
    clearTabState,
  };
}