import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
const { appId, token, functionsVersion } = appParams;

const backendProvider = import.meta.env.VITE_BACKEND_PROVIDER;
const resolvedProvider = backendProvider ?? 'firestudio';

const createLocalClient = () => {
  const storageKey = (entity) => `firestudio_${entity}`;
  const getCollection = (entity) => {
    const raw = window.localStorage.getItem(storageKey(entity));
    return raw ? JSON.parse(raw) : [];
  };
  const setCollection = (entity, items) => {
    window.localStorage.setItem(storageKey(entity), JSON.stringify(items));
  };
  const createEntityClient = (entity) => ({
    list: async (sortBy, max) => {
      const items = getCollection(entity);
      const sorted = sortItems(items, sortBy);
      return applyLimit(sorted, max);
    },
    filter: async (filters = {}, sortBy, max) => {
      const items = getCollection(entity).filter((item) => matchesFilters(item, filters));
      const sorted = sortItems(items, sortBy);
      return applyLimit(sorted, max);
    },
    create: async (data) => {
      const items = getCollection(entity);
      const id = data?.id ?? getId();
      const created = { ...data, id };
      items.push(created);
      setCollection(entity, items);
      return created;
    },
    update: async (id, data) => {
      const items = getCollection(entity);
      const next = items.map((item) => (item.id === id ? { ...item, ...data } : item));
      setCollection(entity, next);
      return next.find((item) => item.id === id);
    },
    delete: async (id) => {
      const items = getCollection(entity).filter((item) => item.id !== id);
      setCollection(entity, items);
      return true;
    },
    bulkCreate: async (entries = []) => {
      const items = getCollection(entity);
      const created = entries.map((entry) => ({ ...entry, id: entry.id ?? getId() }));
      setCollection(entity, [...items, ...created]);
      return created;
    }
  });

  const userKey = 'firestudio_user';

  const getCurrentUser = () => {
    const raw = window.localStorage.getItem(userKey);
    return raw ? JSON.parse(raw) : null;
  };

  const ensureUser = () => {
    const existing = getCurrentUser();
    if (existing) {
      return existing;
    }
    const fallback = { id: 'local-user', full_name: 'Local User' };
    window.localStorage.setItem(userKey, JSON.stringify(fallback));
    return fallback;
  };

  return {
    entities: new Proxy(
      {},
      {
        get: (_, entity) => createEntityClient(entity)
      }
    ),
    auth: {
      me: async () => ensureUser(),
      updateMe: async (data) => {
        const current = ensureUser();
        const next = { ...current, ...data };
        window.localStorage.setItem(userKey, JSON.stringify(next));
        return next;
      },
      logout: async (redirectUrl) => {
        window.localStorage.removeItem(userKey);
        if (redirectUrl) {
          window.location.href = redirectUrl;
        }
      },
      redirectToLogin: (redirectUrl = '/login') => {
        window.location.href = redirectUrl;
      }
    },
    functions: {
      invoke: async () => ({ data: null })
    },
    integrations: {
      Core: {
        UploadFile: async ({ file }) => ({
          file_url: file ? URL.createObjectURL(file) : null
        }),
        InvokeLLM: async () => ({
          data: { response: 'AI integration not configured.' }
        })
      }
    },
    appLogs: {
      logUserInApp: async () => {}
    }
  };
};

const getId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const sortItems = (items, sortBy) => {
  if (!sortBy) {
    return [...items];
  }
  const direction = sortBy.startsWith('-') ? -1 : 1;
  const field = sortBy.replace(/^-/, '');
  return [...items].sort((a, b) => {
    const left = a?.[field];
    const right = b?.[field];
    if (left === right) return 0;
    if (left === undefined) return 1;
    if (right === undefined) return -1;
    return left > right ? direction : -direction;
  });
};

const applyLimit = (items, max) => {
  if (!max) {
    return items;
  }
  return items.slice(0, max);
};

const matchesFilters = (item, filters) => {
  return Object.entries(filters).every(([key, value]) => {
    if (key === 'id') {
      return item.id === value;
    }
    return item?.[key] === value;
  });
};

const localClient = createLocalClient();

const createBackendClient = () => {
  if (resolvedProvider === 'base44') {
    return createClient({
      appId,
      token,
      functionsVersion,
      serverUrl: '',
      requiresAuth: false
    });
  }
  return localClient;
};

export const base44 = createBackendClient();
