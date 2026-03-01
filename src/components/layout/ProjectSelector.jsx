import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2 } from 'lucide-react';

export default function ProjectSelector() {
  const { activeProjectId, setActiveProjectId } = useActiveProject();

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
    staleTime: 5 * 60 * 1000,
  });

  if (projects.length === 0) return null;

  return (
    <div className="px-2 py-2 border-b border-[rgba(255,255,255,0.05)]">
      <div className="flex items-center gap-1.5 mb-1.5 px-1">
        <Building2 size={10} className="text-[#FF9D42]" />
        <span className="text-[9px] font-bold uppercase tracking-widest text-[#6B7280]">Active Project</span>
      </div>
      <Select
        value={activeProjectId || 'none'}
        onValueChange={(val) => setActiveProjectId(val === 'none' ? null : val)}
      >
        <SelectTrigger className="h-8 text-xs bg-[rgba(255,157,66,0.05)] border-[rgba(255,157,66,0.15)] text-[#E5E7EB] hover:border-[rgba(255,157,66,0.3)] transition-colors">
          <SelectValue placeholder="Select a project..." />
        </SelectTrigger>
        <SelectContent className="bg-[#0F1419] border-[rgba(255,255,255,0.1)] max-h-64">
          <SelectItem value="none" className="text-xs text-[#6B7280]">— No project selected —</SelectItem>
          {projects.map((p) => (
            <SelectItem key={p.id} value={p.id} className="text-xs">
              <span className="font-mono text-[#FF9D42] mr-1.5">{p.project_number}</span>
              <span className="text-[#E5E7EB] truncate">{p.name}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}