function notImplemented(path) {
  return () => {
    throw new Error(
      `[owned adapter] ${path} is not implemented yet. Switch VITE_BACKEND_PROVIDER=base44 or implement this endpoint.`
    );
  };
}

function createEntityMethodProxy(entityName) {
  return new Proxy(
    {},
    {
      get(_target, methodName) {
        return notImplemented(`entities.${String(entityName)}.${String(methodName)}`);
      }
    }
  );
}

export const ownedAdapter = {
  auth: {
    me: notImplemented('auth.me'),
    updateMe: notImplemented('auth.updateMe'),
    logout: notImplemented('auth.logout'),
    redirectToLogin: notImplemented('auth.redirectToLogin')
  },
  entities: new Proxy(
    {},
    {
      get(_target, entityName) {
        return createEntityMethodProxy(entityName);
      }
    }
  ),
  functions: {
    invoke: notImplemented('functions.invoke')
  },
  integrations: {
    Core: {
      UploadFile: notImplemented('integrations.Core.UploadFile'),
      InvokeLLM: notImplemented('integrations.Core.InvokeLLM')
    }
  },
  users: {
    inviteUser: notImplemented('users.inviteUser')
  },
  appLogs: {
    logUserInApp: notImplemented('appLogs.logUserInApp')
  },
  analytics: {
    track: notImplemented('analytics.track')
  }
};
