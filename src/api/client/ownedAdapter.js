import { ownedRequest } from '@/api/client/ownedHttp';

function createEntityClient(entityName) {
  const entity = String(entityName);
  return {
    list: (sortBy, limit) =>
      ownedRequest(`/entities/${entity}`, { query: { sortBy, limit } }),
    filter: (filters, sortBy, limit) =>
      ownedRequest(`/entities/${entity}`, { method: 'POST', body: { filters: filters || {}, sortBy, limit } }),
    create: (data) =>
      ownedRequest(`/entities/${entity}`, { method: 'POST', body: { data } }),
    bulkCreate: (records) =>
      ownedRequest(`/entities/${entity}/bulk`, { method: 'POST', body: { records } }),
    update: (id, data) =>
      ownedRequest(`/entities/${entity}/${id}`, { method: 'PATCH', body: { data } }),
    delete: (id) =>
      ownedRequest(`/entities/${entity}/${id}`, { method: 'DELETE' }),
    subscribe: (_handler) => {
      // Realtime transport will be wired later; return no-op unsubscribe to keep current call sites stable.
      return () => {};
    }
  };
}

export const ownedAdapter = {
  auth: {
    me: () => ownedRequest('/auth/me'),
    updateMe: (data) => ownedRequest('/auth/me', { method: 'PATCH', body: data }),
    logout: async (redirectTo) => {
      await ownedRequest('/auth/logout', { method: 'POST' });
      if (redirectTo) {
        window.location.assign(redirectTo);
      }
    },
    redirectToLogin: (redirectTo) => {
      const target = encodeURIComponent(redirectTo || window.location.pathname);
      window.location.assign(`/login?redirect=${target}`);
    }
  },
  entities: new Proxy(
    {},
    {
      get(_target, entityName) {
        return createEntityClient(entityName);
      }
    }
  ),
  functions: {
    invoke: (name, payload = {}) =>
      ownedRequest(`/functions/${name}`, { method: 'POST', body: payload })
  },
  integrations: {
    Core: {
      UploadFile: async ({ file }) => {
        const form = new FormData();
        form.append('file', file);
        return ownedRequest('/files/upload', { method: 'POST', body: form });
      },
      InvokeLLM: (payload) =>
        ownedRequest('/ai/invoke', { method: 'POST', body: payload })
    }
  },
  users: {
    inviteUser: (email, role) =>
      ownedRequest('/users/invite', { method: 'POST', body: { email, role } })
  },
  appLogs: {
    logUserInApp: (pageName) =>
      ownedRequest('/app-logs/page-view', { method: 'POST', body: { page: pageName } })
  },
  analytics: {
    track: (payload) =>
      ownedRequest('/analytics/track', { method: 'POST', body: payload })
  }
};
