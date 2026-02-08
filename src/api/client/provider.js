const SUPPORTED_PROVIDERS = ['base44', 'owned'];

export function getBackendProvider() {
  const provider = (/** @type {any} */ (import.meta).env?.VITE_BACKEND_PROVIDER || 'base44').toLowerCase();
  return SUPPORTED_PROVIDERS.includes(provider) ? provider : 'base44';
}

export function isBase44Provider() {
  return getBackendProvider() === 'base44';
}
