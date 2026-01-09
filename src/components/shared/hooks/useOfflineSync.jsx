import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const DB_NAME = 'steelbuild_offline';
const DB_VERSION = 1;

// IndexedDB wrapper
class OfflineDB {
  constructor() {
    this.db = null;
  }

  async init() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Store for cached entities
        if (!db.objectStoreNames.contains('entities')) {
          const entityStore = db.createObjectStore('entities', { keyPath: 'key' });
          entityStore.createIndex('entityType', 'entityType', { unique: false });
        }

        // Store for pending sync operations
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
          syncStore.createIndex('entityType', 'entityType', { unique: false });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async getEntity(entityType, id) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('entities', 'readonly');
      const store = tx.objectStore('entities');
      const request = store.get(`${entityType}-${id}`);
      request.onsuccess = () => resolve(request.result?.data);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllEntities(entityType) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('entities', 'readonly');
      const store = tx.objectStore('entities');
      const index = store.index('entityType');
      const request = index.getAll(entityType);
      request.onsuccess = () => {
        const results = request.result.map(item => item.data);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveEntity(entityType, data) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('entities', 'readwrite');
      const store = tx.objectStore('entities');
      const key = `${entityType}-${data.id}`;
      const request = store.put({ key, entityType, data, timestamp: Date.now() });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async saveEntities(entityType, entities) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('entities', 'readwrite');
      const store = tx.objectStore('entities');
      
      entities.forEach(entity => {
        const key = `${entityType}-${entity.id}`;
        store.put({ key, entityType, data: entity, timestamp: Date.now() });
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async addToSyncQueue(operation) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('syncQueue', 'readwrite');
      const store = tx.objectStore('syncQueue');
      const request = store.add({
        ...operation,
        timestamp: Date.now(),
        synced: false
      });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getSyncQueue() {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('syncQueue', 'readonly');
      const store = tx.objectStore('syncQueue');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result.filter(item => !item.synced));
      request.onerror = () => reject(request.error);
    });
  }

  async markSynced(id) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('syncQueue', 'readwrite');
      const store = tx.objectStore('syncQueue');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearSyncQueue() {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('syncQueue', 'readwrite');
      const store = tx.objectStore('syncQueue');
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

const offlineDB = new OfflineDB();

export function useOfflineSync(entityType) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState('idle'); // idle, syncing, error
  const [pendingCount, setPendingCount] = useState(0);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Update pending count
  useEffect(() => {
    const updatePendingCount = async () => {
      const queue = await offlineDB.getSyncQueue();
      const filtered = entityType 
        ? queue.filter(item => item.entityType === entityType)
        : queue;
      setPendingCount(filtered.length);
    };

    updatePendingCount();
    const interval = setInterval(updatePendingCount, 5000);
    return () => clearInterval(interval);
  }, [entityType]);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline) {
      syncPendingChanges();
    }
  }, [isOnline]);

  const cacheData = useCallback(async (data, single = false) => {
    try {
      if (single) {
        await offlineDB.saveEntity(entityType, data);
      } else {
        await offlineDB.saveEntities(entityType, data);
      }
    } catch (error) {
      console.error('Cache error:', error);
    }
  }, [entityType]);

  const getCachedData = useCallback(async (id = null) => {
    try {
      if (id) {
        return await offlineDB.getEntity(entityType, id);
      }
      return await offlineDB.getAllEntities(entityType);
    } catch (error) {
      console.error('Cache retrieval error:', error);
      return id ? null : [];
    }
  }, [entityType]);

  const createOffline = useCallback(async (data) => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const entityData = { ...data, id: tempId, _offline: true };

    // Save to IndexedDB
    await offlineDB.saveEntity(entityType, entityData);

    // Add to sync queue
    await offlineDB.addToSyncQueue({
      entityType,
      operation: 'create',
      data,
      tempId
    });

    // Update React Query cache
    queryClient.setQueryData([entityType.toLowerCase() + 's'], (old = []) => [...old, entityData]);

    return entityData;
  }, [entityType, queryClient]);

  const updateOffline = useCallback(async (id, data) => {
    // Update in IndexedDB
    const existing = await offlineDB.getEntity(entityType, id);
    const updated = { ...existing, ...data, _offline: true };
    await offlineDB.saveEntity(entityType, updated);

    // Add to sync queue
    await offlineDB.addToSyncQueue({
      entityType,
      operation: 'update',
      id,
      data
    });

    // Update React Query cache
    queryClient.setQueryData([entityType.toLowerCase() + 's'], (old = []) =>
      old.map(item => item.id === id ? updated : item)
    );

    return updated;
  }, [entityType, queryClient]);

  const deleteOffline = useCallback(async (id) => {
    // Add to sync queue
    await offlineDB.addToSyncQueue({
      entityType,
      operation: 'delete',
      id
    });

    // Update React Query cache
    queryClient.setQueryData([entityType.toLowerCase() + 's'], (old = []) =>
      old.filter(item => item.id !== id)
    );
  }, [entityType, queryClient]);

  const syncPendingChanges = useCallback(async () => {
    if (!isOnline || syncStatus === 'syncing') return;

    setSyncStatus('syncing');

    try {
      const queue = await offlineDB.getSyncQueue();
      const filtered = entityType 
        ? queue.filter(item => item.entityType === entityType)
        : queue;

      for (const item of filtered) {
        try {
          const Entity = base44.entities[item.entityType];

          switch (item.operation) {
            case 'create':
              await Entity.create(item.data);
              break;
            case 'update':
              await Entity.update(item.id, item.data);
              break;
            case 'delete':
              await Entity.delete(item.id);
              break;
          }

          await offlineDB.markSynced(item.id);
        } catch (error) {
          console.error('Sync error for item:', item, error);
        }
      }

      // Refresh data from server
      await queryClient.invalidateQueries({ queryKey: [entityType.toLowerCase() + 's'] });

      setSyncStatus('idle');
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus('error');
    }
  }, [isOnline, syncStatus, entityType, queryClient]);

  return {
    isOnline,
    syncStatus,
    pendingCount,
    cacheData,
    getCachedData,
    createOffline,
    updateOffline,
    deleteOffline,
    syncPendingChanges
  };
}