import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const useBase44 = env.VITE_USE_BASE44 === 'true';

  return {
    logLevel: 'error', // Suppress warnings, only show errors
    plugins: [
      ...(useBase44
        ? [
            base44({
              // Support for legacy code that imports the base44 SDK with @/integrations, @/entities, etc.
              // can be removed if the code has been updated to use the new SDK imports from @base44/sdk
              legacySDKImports: env.BASE44_LEGACY_SDK_IMPORTS === 'true',
              hmrNotifier: true,
              navigationNotifier: true,
              visualEditAgent: true
            })
          ]
        : []),
      react()
    ]
  };
});
