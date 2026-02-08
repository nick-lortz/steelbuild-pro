import React from 'react';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import PageHeader from '@/components/ui/PageHeader';
import DocumentLinkageCenter from '@/components/documents/DocumentLinkageCenter';

export default function DocumentLinkage() {
  const { activeProjectId } = useActiveProject();

  const { data: project } = useQuery({
    queryKey: ['project', activeProjectId],
    queryFn: () => apiClient.entities.Project.filter({ id: activeProjectId }),
    enabled: !!activeProjectId,
    select: (data) => data?.[0] || null
  });

  if (!activeProjectId) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-400">Select a project first</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Document Linkage"
        subtitle={`All linked documents for ${project?.name || 'project'}`}
      />
      <DocumentLinkageCenter projectId={activeProjectId} />
    </div>
  );
}