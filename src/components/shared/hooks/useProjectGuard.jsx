import { useEffect, useState } from 'react';
import { useActiveProject } from './useActiveProject';
import { base44 } from '@/api/base44Client';

/**
 * Guard hook for pages that require a valid projectId.
 * Redirects to project picker if projectId is missing.
 * Validates projectId exists in database.
 * 
 * @param {string} pageLabel - Page name for error messaging
 * @returns {object} { projectId, isLoading, error, project }
 */
export function useProjectGuard(pageLabel = 'This page') {
  const { activeProjectId, setActiveProjectId } = useActiveProject();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [project, setProject] = useState(null);

  useEffect(() => {
    const validate = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // If no activeProjectId, user needs to select one
        if (!activeProjectId) {
          setError('NO_PROJECT_SELECTED');
          return;
        }

        // Validate projectId exists in database
        const projects = await base44.entities.Project.filter({ id: activeProjectId });
        if (!projects || projects.length === 0) {
          setError('PROJECT_NOT_FOUND');
          setActiveProjectId(null);
          return;
        }

        setProject(projects[0]);
        setIsLoading(false);
      } catch (err) {
        console.error(`[${pageLabel}] Project validation error:`, err);
        setError('VALIDATION_ERROR');
      }
    };

    validate();
  }, [activeProjectId, pageLabel, setActiveProjectId]);

  return {
    projectId: activeProjectId,
    isLoading,
    error,
    project,
    setProjectId: setActiveProjectId,
  };
}