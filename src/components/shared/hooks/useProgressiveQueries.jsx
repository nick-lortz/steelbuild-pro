import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

const STAGGER_DELAY = 150; // ms between query initiations

export function useProgressiveQueries(queries) {
  const [enabledQueries, setEnabledQueries] = useState(new Set());
  const queriesLength = queries.length;
  
  useEffect(() => {
    // Progressively enable queries to avoid rate limits
    queries.forEach((query, index) => {
      setTimeout(() => {
        setEnabledQueries(prev => new Set([...prev, query.key]));
      }, index * STAGGER_DELAY);
    });
  }, [queriesLength]);

  const results = queries.map(({ key, fn, options = {} }) => 
    useQuery({
      queryKey: key,
      queryFn: fn,
      enabled: enabledQueries.has(key),
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 1,
      ...options
    })
  );

  return {
    results,
    isLoading: results.some(r => r.isLoading),
    isError: results.some(r => r.isError),
    allLoaded: results.every(r => r.isFetched)
  };
}