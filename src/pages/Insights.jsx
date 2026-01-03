import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PageHeader from '@/components/ui/PageHeader';
import ProjectAssistant from '@/components/ai/ProjectAssistant';

export default function Insights() {
  const [selectedProject, setSelectedProject] = useState('all');

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
    staleTime: 10 * 60 * 1000,
  });

  const { data: financials = [] } = useQuery({
    queryKey: ['financials'],
    queryFn: () => base44.entities.Financial.list(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: rfis = [] } = useQuery({
    queryKey: ['rfis'],
    queryFn: () => base44.entities.RFI.list(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: changeOrders = [] } = useQuery({
    queryKey: ['changeOrders'],
    queryFn: () => base44.entities.ChangeOrder.list(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: drawingSets = [] } = useQuery({
    queryKey: ['drawings'],
    queryFn: () => base44.entities.DrawingSet.list(),
    staleTime: 10 * 60 * 1000,
  });

  return (
    <div>
      <PageHeader 
        title="AI Project Manager" 
        subtitle="Data-driven insights and analysis"
        actions={
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-64 bg-zinc-900 border-zinc-800 text-white">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.project_number} - {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {/* AI Assistant */}
      <ProjectAssistant
        projects={projects}
        drawings={drawingSets}
        rfis={rfis}
        changeOrders={changeOrders}
        tasks={tasks}
        financials={financials}
        expenses={expenses}
        selectedProject={selectedProject === 'all' ? null : selectedProject}
      />
    </div>
  );
}