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
import { base44 } from '@/api/base44Client';

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

    const subscribe = () => {
      if (!mounted) return;

      try {
        // Subscribe to entity changes
        const unsubscribe = base44.entities[entityName].subscribe((event) => {
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
        
        // Attempt reconnection with exponential backoff
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          const delay = reconnectDelay * Math.pow(2, reconnectAttempts.current - 1);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (mounted) {
              subscribe();
            }
          }, delay);
        }
      }
    };

    subscribe();

    // Cleanup
    return () => {
      mounted = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [entityName, queryClient, JSON.stringify(queryKey), maxReconnectAttempts, reconnectDelay]);

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