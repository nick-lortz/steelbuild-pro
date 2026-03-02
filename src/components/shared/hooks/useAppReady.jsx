import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Reads the Base44 appId from all known injection points:
 * - URL search param (preview bridge injects ?appId=xxx or similar)
 * - window.__BASE44_APP_ID__ (runtime global)
 * - base44.config.appId (SDK internal after init)
 */
function resolveAppId() {
  // 1. URL params injected by builder bridge
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('appId') || params.get('app_id') || params.get('base44_app_id');
  if (fromUrl && fromUrl !== 'null') return fromUrl;

  // 2. Runtime global set by builder bridge
  if (window.__BASE44_APP_ID__ && window.__BASE44_APP_ID__ !== 'null') {
    return window.__BASE44_APP_ID__;
  }

  // 3. SDK internal config (set after async init)
  const sdkId = base44?.config?.appId;
  if (sdkId && sdkId !== 'null') return sdkId;

  return null;
}

export function useAppReady() {
  const [isReady, setIsReady] = useState(() => !!resolveAppId());

  useEffect(() => {
    if (isReady) return;

    let mounted = true;
    let checks = 0;
    const maxChecks = 30; // 3 seconds at 100ms

    const poll = () => {
      const appId = resolveAppId();
      if (appId) {
        if (mounted) setIsReady(true);
        return;
      }
      if (++checks < maxChecks) {
        setTimeout(poll, 100);
      }
      // After maxChecks, give up silently — queries stay disabled
    };

    poll();
    return () => { mounted = false; };
  }, [isReady]);

  return { isReady };
}