import { useMemo } from 'react';
import { useProject } from '@/components/providers/ProjectContext';
import { createPageUrl } from '@/utils';

/**
 * Hook to generate project-aware navigation URLs
 */
export function useProjectNavigation() {
  const { projectId, isProjectScoped } = useProject();

  const getUrl = useMemo(() => {
    return (item) => {
      // Global-only items always use standard page URL
      if (item.scope === 'global') {
        return createPageUrl(item.page);
      }

      // Project-only items require project context
      if (item.scope === 'project') {
        if (!projectId) return '#';
        return `/projects/${projectId}/${item.path}`;
      }

      // Both-scoped items use project context if available
      if (item.scope === 'both') {
        if (isProjectScoped && projectId && item.path) {
          return `/projects/${projectId}/${item.path}`;
        }
        return createPageUrl(item.page);
      }

      return createPageUrl(item.page);
    };
  }, [projectId, isProjectScoped]);

  return { getUrl };
}