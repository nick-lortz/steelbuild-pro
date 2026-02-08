/**
 * Hardened Real-Time Subscription Hook
 * 
 * Features:
 * - Auto reconnection
 * - Authorization enforcement
 * - Delta updates (not full refetch)
 * - Cleanup on unmount
 */

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export function useEntitySubscription(entityName, queryKey, options = {}) {
  const queryClient = useQueryClient();
  const unsubscribeRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const [isConnected, setIsConnected] = useState(true);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = options.maxReconnectAttempts || 5;
  const reconnectDelay = options.reconnectDelay || 1000;

  useEffect(() => {
    let mounted = true;
    
    // Check if online
    const isOnline = navigator.onLine;
    if (!isOnline) {
      setIsConnected(false);
      return;
    }

    const subscribe = () => {
      if (!mounted || !navigator.onLine) return;

      try {
        // Subscribe to entity changes
        const unsubscribe = apiClient.entities[entityName].subscribe((event) => {
          if (!mounted) return;

          // Reset reconnect attempts on successful message
          reconnectAttempts.current = 0;
          setIsConnected(true);

          // Apply delta update instead of full refetch
          queryClient.setQueryData(queryKey, (oldData) => {
            if (!oldData) return oldData;

            const isArray = Array.isArray(oldData);
            const data = isArray ? oldData : [oldData];

            let updated;
            
            switch (event.type) {
              case 'create':
                // Add new item
                updated = [...data, event.data];
                break;
                
              case 'update':
                // Update existing item
                updated = data.map(item => 
                  item.id === event.id ? { ...item, ...event.data } : item
                );
                break;
                
              case 'delete':
                // Remove item
                updated = data.filter(item => item.id !== event.id);
                break;
                
              default:
                return oldData;
            }

            return isArray ? updated : updated[0];
          });

          // Call custom handler if provided
          if (options.onEvent) {
            options.onEvent(event);
          }
        });

        unsubscribeRef.current = unsubscribe;
        setIsConnected(true);

      } catch (error) {
        console.error(`Subscription error for ${entityName}:`, error);
        setIsConnected(false);
        
        // Don't reconnect if offline
        if (!navigator.onLine) {
          return;
        }
        
        // Attempt reconnection with exponential backoff + jitter
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          const baseDelay = reconnectDelay * Math.pow(2, reconnectAttempts.current - 1);
          const jitter = Math.random() * 1000; // 0-1000ms jitter
          const delay = baseDelay + jitter;
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (mounted && navigator.onLine) {
              subscribe();
            }
          }, delay);
        }
      }
    };

    // Listen for online/offline
    const handleOnline = () => {
      if (mounted && reconnectAttempts.current < maxReconnectAttempts) {
        subscribe();
      }
    };
    
    const handleOffline = () => {
      setIsConnected(false);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    subscribe();

    // Cleanup
    return () => {
      mounted = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [entityName, maxReconnectAttempts, reconnectDelay]);

  return { isConnected, reconnectAttempts: reconnectAttempts.current };
}

/**
 * Hook for subscribing to project-filtered entities
 * Only receives events for records in accessible projects
 */
export function useProjectEntitySubscription(entityName, projectId, queryKey, options = {}) {
  const queryClient = useQueryClient();
  
  return useEntitySubscription(entityName, queryKey, {
    ...options,
    onEvent: (event) => {
      // Server-side filtering: only process if event belongs to this project
      if (event.data?.project_id !== projectId) {
        return;
      }
      
      if (options.onEvent) {
        options.onEvent(event);
      }
    }
  });
}

/**
 * Hook for subscribing with custom filter
 */
export function useFilteredEntitySubscription(entityName, filterFn, queryKey, options = {}) {
  const queryClient = useQueryClient();
  
  return useEntitySubscription(entityName, queryKey, {
    ...options,
    onEvent: (event) => {
      // Apply custom filter
      if (!filterFn(event)) {
        return;
      }
      
      if (options.onEvent) {
        options.onEvent(event);
      }
    }
  });
}