// --- PLATFORM BUG WORKAROUND: Force App ID in Preview ---
// Intercept fetch and XHR before ANY other scripts load

const IS_PREVIEW_ENV = window.location.hostname.includes('preview') || window.location.hostname.includes('sandbox');

if (IS_PREVIEW_ENV) {
  const APP_ID = '694bc0dd754d739afc7067e9';
  const SHORT_ID = 'fc7067e9';

  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    let url = args[0];
    let originalUrlStr = typeof url === 'string' ? url : (url instanceof URL ? url.href : (url instanceof Request ? url.url : String(url)));
    if (typeof url === 'string') {
      url = url.replace('/v1/apps/undefined/', `/v1/apps/${APP_ID}/`);
      url = url.replace('/v1/apps/null/', `/v1/apps/${APP_ID}/`);
      url = url.replace(`/v1/apps/${SHORT_ID}/`, `/v1/apps/${APP_ID}/`);
      if (url.includes('api.base44.app/v1/') && !url.includes('/apps/')) {
        url = url.replace('/v1/', `/v1/apps/${APP_ID}/`);
      }
      args[0] = url;
    } else if (url instanceof URL) {
      let href = url.href;
      href = href.replace('/v1/apps/undefined/', `/v1/apps/${APP_ID}/`);
      href = href.replace('/v1/apps/null/', `/v1/apps/${APP_ID}/`);
      href = href.replace(`/v1/apps/${SHORT_ID}/`, `/v1/apps/${APP_ID}/`);
      args[0] = new URL(href);
    } else if (url instanceof Request) {
      let reqUrl = url.url;
      reqUrl = reqUrl.replace('/v1/apps/undefined/', `/v1/apps/${APP_ID}/`);
      reqUrl = reqUrl.replace('/v1/apps/null/', `/v1/apps/${APP_ID}/`);
      reqUrl = reqUrl.replace(`/v1/apps/${SHORT_ID}/`, `/v1/apps/${APP_ID}/`);
      args[0] = new Request(reqUrl, url);
    }
    
    // Check for auth me requests
    if (String(args[0]).includes('/auth/me')) {
      console.log("[INTERCEPTOR] Caught fetch to /auth/me", args[0]);
    }
    
    return originalFetch.apply(this, args);
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    if (typeof url === 'string') {
      let newUrl = url;
      newUrl = newUrl.replace('/v1/apps/undefined/', `/v1/apps/${APP_ID}/`);
      newUrl = newUrl.replace('/v1/apps/null/', `/v1/apps/${APP_ID}/`);
      newUrl = newUrl.replace(`/v1/apps/${SHORT_ID}/`, `/v1/apps/${APP_ID}/`);
      if (newUrl.includes('api.base44.app/v1/') && !newUrl.includes('/apps/')) {
        newUrl = newUrl.replace('/v1/', `/v1/apps/${APP_ID}/`);
      }
      
      if (newUrl.includes('/auth/me')) {
        console.log("[INTERCEPTOR] Caught XHR to /auth/me", newUrl);
      }
      
      return originalOpen.call(this, method, newUrl, ...rest);
    }
    return originalOpen.call(this, method, url, ...rest);
  };
  
  console.log("[INTERCEPTOR] Installed early network hooks for APP_ID:", APP_ID);
  
  // Also try to patch window.__BASE44_APP_ID__ globally in case the SDK reads it
  window.__BASE44_APP_ID__ = APP_ID;
}