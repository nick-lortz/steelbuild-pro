import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

export default function NavigationTracker() {
  const location = useLocation();
  const lastLoggedPage = useRef(null);
  const lastLogTime = useRef(0);
  const MIN_LOG_INTERVAL = 30000; // 30 seconds minimum between logs

  useEffect(() => {
    const currentPath = location.pathname;
    const pageName = currentPath.split('/').pop() || 'Home';
    const now = Date.now();

    // Skip if same page or too soon since last log
    if (pageName === lastLoggedPage.current || (now - lastLogTime.current) < MIN_LOG_INTERVAL) {
      return;
    }

    lastLoggedPage.current = pageName;
    lastLogTime.current = now;

    // Log page view - Temporarily disabled due to Base44 platform SDK bug (App ID dropping out causing 404s)
    // base44.analytics.track({
    //   eventName: 'page_view',
    //   properties: { page: pageName }
    // }).catch(() => {
    //   // Silently ignore rate limit errors
    // });
  }, [location.pathname]);

  return null;
}