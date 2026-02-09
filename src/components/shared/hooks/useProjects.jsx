import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Hook to fetch projects with automatic alphabetical sorting
 * Ensures all projects are displayed A-Z by name throughout the app
 * 
 * @param {Object} filters - Optional filters for project query
 * @param {Object} options - Additional react-query options
 * @returns useQuery result with alphabetically sorted projects
 */
export function useProjects(filters = {}, options = {}) {
  return useQuery({
    queryKey: ['projects', filters],
    queryFn: async () => {
      const projects = Object.keys(filters).length > 0
        ? await base44.entities.Project.filter(filters)
        : await base44.entities.Project.list();
      
      // CRITICAL: Always sort alphabetically by name (A-Z)
      // This is a global requirement for all project dropdowns/lists
      return projects.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    ...options
  });
}

/**
 * Utility to sort projects alphabetically
 * Use this when you have projects from other sources that need sorting
 */
export function sortProjectsAlphabetically(projects) {
  if (!projects || !Array.isArray(projects)) return [];
  return [...projects].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}