import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { Building } from 'lucide-react';

export default function PMProjectSelector() {
  const { activeProjectId, setActiveProjectId } = useActiveProject();

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
    staleTime: 5 * 60 * 1000
  });

  return (
    <div className="flex items-center gap-2">
      <Building size={16} className="text-amber-500" />
      <Select value={activeProjectId || ''} onValueChange={setActiveProjectId}>
        <SelectTrigger className="w-80 bg-zinc-900 border-zinc-800">
          <SelectValue placeholder="Select Project..." />
        </SelectTrigger>
        <SelectContent className="bg-zinc-900 border-zinc-800">
          {projects.map(p => (
            <SelectItem key={p.id} value={p.id}>
              {p.project_number} - {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}