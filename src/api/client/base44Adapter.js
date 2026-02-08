import { base44 } from '@/api/base44Client';

export const base44Adapter = {
  auth: {
    me: (...args) => base44.auth.me(...args),
    updateMe: (...args) => base44.auth.updateMe(...args),
    logout: (...args) => base44.auth.logout(...args),
    redirectToLogin: (...args) => base44.auth.redirectToLogin(...args)
  },
  entities: new Proxy(
    {},
    {
      get(_target, entityName) {
        return base44.entities[entityName];
      }
    }
  ),
  functions: {
    invoke: (...args) => base44.functions.invoke(...args)
  },
  integrations: {
    Core: {
      UploadFile: (...args) => base44.integrations.Core.UploadFile(...args),
      InvokeLLM: (...args) => base44.integrations.Core.InvokeLLM(...args)
    }
  },
  users: {
    inviteUser: (...args) => base44.users.inviteUser(...args)
  },
  appLogs: {
    logUserInApp: (...args) => base44.appLogs.logUserInApp(...args)
  },
  analytics: {
    track: (...args) => base44.analytics.track(...args)
  }
};
