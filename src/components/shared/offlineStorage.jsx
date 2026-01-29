// Offline data persistence for field operations
export const OfflineStorage = {
  // Store pending photo uploads
  savePendingPhoto: async (file, metadata) => {
    const db = await openDB();
    const id = `photo_${Date.now()}`;
    await db.put('pendingPhotos', {
      id,
      file: await file.arrayBuffer(),
      fileName: file.name,
      fileSize: file.size,
      metadata,
      timestamp: Date.now(),
      synced: false
    });
    return id;
  },

  getPendingPhotos: async () => {
    const db = await openDB();
    return db.getAll('pendingPhotos');
  },

  removePendingPhoto: async (id) => {
    const db = await openDB();
    await db.delete('pendingPhotos', id);
  },

  // Store pending punch items
  savePendingPunch: async (data) => {
    const db = await openDB();
    const id = `punch_${Date.now()}`;
    await db.put('pendingPunch', {
      id,
      ...data,
      timestamp: Date.now(),
      synced: false
    });
    return id;
  },

  getPendingPunch: async () => {
    const db = await openDB();
    return db.getAll('pendingPunch');
  },

  removePendingPunch: async (id) => {
    const db = await openDB();
    await db.delete('pendingPunch', id);
  },

  // Store pending installs
  savePendingInstall: async (data) => {
    const db = await openDB();
    const id = `install_${Date.now()}`;
    await db.put('pendingInstalls', {
      id,
      ...data,
      timestamp: Date.now(),
      synced: false
    });
    return id;
  },

  getPendingInstalls: async () => {
    const db = await openDB();
    return db.getAll('pendingInstalls');
  },

  removePendingInstall: async (id) => {
    const db = await openDB();
    await db.delete('pendingInstalls', id);
  },

  // Sync all pending data
  syncPending: async () => {
    const results = {
      photos: 0,
      punch: 0,
      installs: 0,
      errors: []
    };

    try {
      const pendingPhotos = await this.getPendingPhotos();
      const pendingPunch = await this.getPendingPunch();
      const pendingInstalls = await this.getPendingInstalls();

      // Photos will be handled by FieldTools component
      results.photos = pendingPhotos.length;
      
      // Punch items
      for (const punch of pendingPunch) {
        try {
          await this.removePendingPunch(punch.id);
          results.punch++;
        } catch (e) {
          results.errors.push(`Punch ${punch.id}: ${e.message}`);
        }
      }

      // Installs
      for (const install of pendingInstalls) {
        try {
          await this.removePendingInstall(install.id);
          results.installs++;
        } catch (e) {
          results.errors.push(`Install ${install.id}: ${e.message}`);
        }
      }
    } catch (error) {
      results.errors.push(`Sync failed: ${error.message}`);
    }

    return results;
  }
};

// IndexedDB helper
let dbInstance = null;

async function openDB() {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SteelBuildDB', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pendingPhotos')) {
        db.createObjectStore('pendingPhotos', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('pendingPunch')) {
        db.createObjectStore('pendingPunch', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('pendingInstalls')) {
        db.createObjectStore('pendingInstalls', { keyPath: 'id' });
      }
    };
  });
}

// Wrapper for IndexedDB operations
export async function withDB(callback) {
  const db = await openDB();
  return callback(db);
}

export async function putDB(storeName, value) {
  return withDB((db) => {
    return new Promise((resolve, reject) => {
      const request = db.transaction(storeName, 'readwrite').objectStore(storeName).put(value);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  });
}

export async function deleteDB(storeName, key) {
  return withDB((db) => {
    return new Promise((resolve, reject) => {
      const request = db.transaction(storeName, 'readwrite').objectStore(storeName).delete(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  });
}

export async function getAllDB(storeName) {
  return withDB((db) => {
    return new Promise((resolve, reject) => {
      const request = db.transaction(storeName, 'readonly').objectStore(storeName).getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  });
}