import React, { createContext, useContext, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const ProjectContext = createContext(null);

export function ProjectProvider({ children }) {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [activeProjectId, setActiveProjectId] = useState(projectId);

  // Fetch active project details
  const { data: project, isLoading } = useQuery({
    queryKey: ['project', activeProjectId],
    queryFn: async () => {
      if (!activeProjectId) return null;
      try {
        const projects = await base44.entities.Project.filter({ id: activeProjectId });
        return projects[0] || null;
      } catch {
        return null;
      }
    },
    enabled: !!activeProjectId,
    staleTime: 5 * 60 * 1000
  });

  // Sync activeProjectId with route params
  useEffect(() => {
    if (projectId !== activeProjectId) {
      setActiveProjectId(projectId);
    }
  }, [projectId]);

  const switchProject = (newProjectId) => {
    setActiveProjectId(newProjectId);
    navigate(`/projects/${newProjectId}/dashboard`);
  };

  const clearProject = () => {
    setActiveProjectId(null);
    navigate('/projects');
  };

  const value = {
    projectId: activeProjectId,
    project,
    isLoading,
    switchProject,
    clearProject,
    isProjectScoped: !!activeProjectId
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within ProjectProvider');
  }
  return context;
}