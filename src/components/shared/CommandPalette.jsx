import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { createPageUrl } from '@/utils';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Building2, Calendar, FileText, MessageSquareWarning, FileCheck, Plus } from 'lucide-react';

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiClient.entities.Project.list('-updated_date'),
    enabled: open
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['recent-tasks'],
    queryFn: () => apiClient.entities.Task.list('-updated_date', 10),
    enabled: open
  });

  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const pages = [
    { name: 'Dashboard', icon: Building2, page: 'Dashboard' },
    { name: 'Projects', icon: Building2, page: 'Projects' },
    { name: 'Schedule', icon: Calendar, page: 'Schedule' },
    { name: 'Drawings', icon: FileText, page: 'Drawings' },
    { name: 'RFIs', icon: MessageSquareWarning, page: 'RFIs' },
    { name: 'Change Orders', icon: FileCheck, page: 'ChangeOrders' },
    { name: 'Financials', icon: FileText, page: 'Financials' },
    { name: 'Analytics', icon: FileText, page: 'Analytics' }
  ];

  const actions = [
    { name: 'New Project', action: () => navigate(createPageUrl('Projects')), icon: Plus },
    { name: 'New Task', action: () => navigate(createPageUrl('Schedule')), icon: Plus },
    { name: 'New RFI', action: () => navigate(createPageUrl('RFIs')), icon: Plus }
  ];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type to search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="Quick Actions">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <CommandItem
                key={action.name}
                onSelect={() => {
                  action.action();
                  setOpen(false);
                }}
              >
                <Icon className="mr-2 h-4 w-4" />
                <span>{action.name}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandGroup heading="Pages">
          {pages.map((page) => {
            const Icon = page.icon;
            return (
              <CommandItem
                key={page.page}
                onSelect={() => {
                  navigate(createPageUrl(page.page));
                  setOpen(false);
                }}
              >
                <Icon className="mr-2 h-4 w-4" />
                <span>{page.name}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>

        {projects.length > 0 && (
          <CommandGroup heading="Recent Projects">
            {projects.slice(0, 5).map((project) => (
              <CommandItem
                key={project.id}
                onSelect={() => {
                  navigate(createPageUrl('ProjectDashboard') + `?id=${project.id}`);
                  setOpen(false);
                }}
              >
                <Building2 className="mr-2 h-4 w-4" />
                <span>{project.project_number} - {project.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {tasks.length > 0 && (
          <CommandGroup heading="Recent Tasks">
            {tasks.slice(0, 5).map((task) => (
              <CommandItem
                key={task.id}
                onSelect={() => {
                  navigate(createPageUrl('Schedule'));
                  setOpen(false);
                }}
              >
                <Calendar className="mr-2 h-4 w-4" />
                <span>{task.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}