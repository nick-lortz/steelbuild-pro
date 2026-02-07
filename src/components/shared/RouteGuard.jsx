import React from 'react';
import { useProjectGuard } from '@/components/shared/hooks/useProjectGuard';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import { AlertTriangle, Building } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Route guard wrapper for pages that require a valid projectId.
 * Shows project picker if missing, validation error if invalid.
 * 
 * @param {object} props
 * @param {React.ReactNode} props.children - Page content to render
 * @param {string} props.pageLabel - Page name for error messaging
 * @param {boolean} props.allowAllProjects - If true, shows "All Projects" option
 * @returns {React.ReactNode}
 */
export default function RouteGuard({ children, pageLabel = 'This page', allowAllProjects = false }) {
  const { projectId, isLoading, error, project } = useProjectGuard(pageLabel);
  const { setActiveProjectId } = useActiveProject();

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
    enabled: !projectId && !isLoading,
  });

  // Still validating
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Validating project...</p>
        </div>
      </div>
    );
  }

  // Project not found error
  if (error === 'PROJECT_NOT_FOUND') {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md border-destructive bg-destructive/5">
          <CardHeader>
            <div className="flex gap-3 items-start">
              <AlertTriangle className="w-6 h-6 text-destructive mt-1 flex-shrink-0" />
              <div>
                <CardTitle>Project Not Found</CardTitle>
                <CardDescription>The project you requested no longer exists or has been deleted.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please select a valid project from the list below.
            </p>
            <Button 
              onClick={() => window.location.href = createPageUrl('Projects')}
              className="w-full"
            >
              Go to Projects
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Validation error
  if (error === 'VALIDATION_ERROR') {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md border-destructive bg-destructive/5">
          <CardHeader>
            <div className="flex gap-3 items-start">
              <AlertTriangle className="w-6 h-6 text-destructive mt-1 flex-shrink-0" />
              <div>
                <CardTitle>Validation Error</CardTitle>
                <CardDescription>Unable to validate the project. Please try again.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => window.location.reload()}
              className="w-full"
            >
              Reload Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No project selected — show project picker
  if (error === 'NO_PROJECT_SELECTED') {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              Select a Project
            </CardTitle>
            <CardDescription>
              {pageLabel} requires an active project. Please select one below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No projects available.</p>
                <Button 
                  onClick={() => window.location.href = createPageUrl('Projects')}
                >
                  Create or View Projects
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {allowAllProjects && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setActiveProjectId(null);
                        // Reload page or navigate back
                        window.location.reload();
                      }}
                      className="justify-start h-auto py-3"
                    >
                      <div>
                        <div className="font-semibold">All Projects</div>
                        <div className="text-xs text-muted-foreground">View all projects</div>
                      </div>
                    </Button>
                  )}
                  {projects.map((p) => (
                    <Button
                      key={p.id}
                      variant="outline"
                      onClick={() => {
                        setActiveProjectId(p.id);
                        window.location.reload();
                      }}
                      className="justify-start h-auto py-3"
                    >
                      <div>
                        <div className="font-semibold">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.project_number}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Project is valid, render children
  return <>{children}</>;
}