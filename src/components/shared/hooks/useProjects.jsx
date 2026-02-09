import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Hook to fetch projects with automatic alphabetical sorting
 * Ensures all projects are displayed A-Z by name throughout the app
 */
export function useProjects(filters = {}) {
  return useQuery({
    queryKey: ['projects', filters],
    queryFn: async () => {
      const projects = Object.keys(filters).length > 0
        ? await base44.entities.Project.filter(filters)
        : await base44.entities.Project.list();
      
      // Always sort alphabetically by name
      return projects.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  });
}

/**
 * Utility to sort projects alphabetically
 */
export function sortProjectsAlphabetically(projects) {
  return [...projects].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}