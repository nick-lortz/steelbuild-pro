import { base44Adapter } from '@/api/client/base44Adapter';
import { ownedAdapter } from '@/api/client/ownedAdapter';
import { getBackendProvider, isBase44Provider } from '@/api/client/provider';

const provider = getBackendProvider();

export const apiClient = provider === 'owned' ? ownedAdapter : base44Adapter;
export { getBackendProvider, isBase44Provider };
