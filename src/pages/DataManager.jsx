import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import RouteGuard from '@/components/shared/RouteGuard';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Package, Wrench, Truck, Calendar, DollarSign, FileText, AlertCircle,
  Plus, RefreshCw, ChevronRight, Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import DataManagerTable from '@/components/DataManager/DataManagerTable';
import DataManagerEditSheet from '@/components/DataManager/DataManagerEditSheet';
import { ENTITY_CONFIGS } from '@/components/DataManager/entityConfigs';

const CATEGORIES = [
  { id: 'WorkPackage', label: 'Work Packages', icon: Package },
  { id: 'DetailingItem', label: 'Detailing', icon: FileText },
  { id: 'FabricationItem', label: 'Fabrication', icon: Wrench },
  { id: 'Delivery', label: 'Deliveries', icon: Truck },
  { id: 'Task', label: 'Schedule', icon: Calendar },
  { id: 'BudgetLine', label: 'Budget', icon: DollarSign },
  { id: 'SOVItem', label: 'SOV', icon: FileText },
  { id: 'Expense', label: 'Expenses', icon: DollarSign },
  { id: 'ChangeOrder', label: 'Change Orders', icon: AlertCircle },
  { id: 'EquipmentLog', label: 'Equipment', icon: Wrench },
  { id: 'RFI', label: 'RFIs', icon: AlertCircle }
];

export default function DataManagerPage() {
  return (
    <RouteGuard pageLabel="Data Manager" allowAllProjects>
      <DataManager />
    </RouteGuard>
  );
}

function DataManager() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeProjectId, setActiveProjectId } = useActiveProject();
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [showNewRecord, setShowNewRecord] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});

  const currentEntity = searchParams.get('entity') || 'WorkPackage';
  const entityConfig = ENTITY_CONFIGS[currentEntity];

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: Infinity
  });

  const { data: allProjects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
    staleTime: 5 * 60 * 1000
  });

  const projects = React.useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') return allProjects;
    return allProjects.filter((p) =>
      p.project_manager === currentUser.email ||
      p.superintendent === currentUser.email ||
      (p.assigned_users && p.assigned_users.includes(currentUser.email))
    );
  }, [currentUser, allProjects]);

  const handleEntitySelect = (entityId) => {
    setSearchParams({ entity: entityId });
    setSearch('');
    setFilters({});
  };

  const handleProjectChange = (projectId) => {
    if (projectId === 'all') {
      setShowAllProjects(true);
      setActiveProjectId(null);
    } else {
      setShowAllProjects(false);
      setActiveProjectId(projectId);
    }
  };

  if (!entityConfig) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Entity not found</p>
      </div>
    );
  }

  const visibleProjects = showAllProjects ? projects : (activeProjectId ? projects.filter(p => p.id === activeProjectId) : []);

  return (
    <ErrorBoundary>
      <div className="flex h-[calc(100vh-120px)] gap-6 p-6">
        {/* Sidebar */}
        <aside className="w-64 flex flex-col gap-4">
          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Categories</h2>
            <div className="space-y-1">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isActive = currentEntity === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleEntitySelect(cat.id)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors',
                      isActive
                        ? 'bg-amber-500/20 text-amber-400 font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="flex-1 text-left">{cat.label}</span>
                    {isActive && <ChevronRight className="h-4 w-4" />}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{entityConfig.label}</h1>
              <p className="text-xs text-muted-foreground mt-1">{entityConfig.description}</p>
            </div>
            <Button onClick={() => setShowNewRecord(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New {entityConfig.singularLabel}
            </Button>
          </div>

          {/* Filters Bar */}
          <div className="flex items-center gap-2">
            <Select value={showAllProjects ? 'all' : (activeProjectId || '')} onValueChange={handleProjectChange}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select project..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.project_number} - {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 h-9"
            />

            {entityConfig.quickFilters && (
              <Select value={filters.quickFilter || ''} onValueChange={(val) => setFilters({ ...filters, quickFilter: val })}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Quick filters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>All</SelectItem>
                  {entityConfig.quickFilters.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Table */}
          {(showAllProjects || activeProjectId) && (
            <DataManagerTable
              entityId={currentEntity}
              entityConfig={entityConfig}
              projectId={showAllProjects ? null : activeProjectId}
              showAllProjects={showAllProjects}
              search={search}
              filters={filters}
              onEdit={setEditingRecord}
              onNewRecord={() => setShowNewRecord(true)}
            />
          )}
        </div>
      </div>

      {/* New/Edit Sheet */}
      {(showNewRecord || editingRecord) && (
        <DataManagerEditSheet
          entityId={currentEntity}
          entityConfig={entityConfig}
          record={editingRecord}
          projectId={activeProjectId}
          projects={projects}
          showAllProjects={showAllProjects}
          onClose={() => {
            setShowNewRecord(false);
            setEditingRecord(null);
          }}
        />
      )}
    </ErrorBoundary>
  );
}