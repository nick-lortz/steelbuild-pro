import { base44 } from '@/api/base44Client';

const base44Any = /** @type {any} */ (base44);

export const base44Adapter = {
  auth: {
    me: base44Any.auth.me.bind(base44Any.auth),
    updateMe: base44Any.auth.updateMe.bind(base44Any.auth),
    logout: base44Any.auth.logout.bind(base44Any.auth),
    redirectToLogin: base44Any.auth.redirectToLogin.bind(base44Any.auth)
  },
  entities: new Proxy(
    {},
    {
      get(_target, entityName) {
        return base44Any.entities[/** @type {any} */ (entityName)];
      }
    }
  ),
  functions: {
    invoke: base44Any.functions.invoke.bind(base44Any.functions)
  },
  integrations: {
    Core: {
      UploadFile: base44Any.integrations.Core.UploadFile.bind(base44Any.integrations.Core),
      InvokeLLM: base44Any.integrations.Core.InvokeLLM.bind(base44Any.integrations.Core)
    }
  },
  users: {
    inviteUser: base44Any.users.inviteUser.bind(base44Any.users)
  },
  appLogs: {
    logUserInApp: base44Any.appLogs.logUserInApp.bind(base44Any.appLogs)
  },
  analytics: {
    track: base44Any.analytics.track.bind(base44Any.analytics)
  }
};
