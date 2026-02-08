import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Trash2, Edit, Search, Download, Database, Filter, RefreshCw, Plus } from 'lucide-react';
import { toast } from '@/components/ui/notifications';
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';
import DataEditDialog from '@/components/data-management/DataEditDialog';
import CreateRecordDialog from '@/components/data-management/CreateRecordDialog';
import BulkEditDialog from '@/components/data-management/BulkEditDialog';
import BulkAddDialog from '@/components/data-management/BulkAddDialog';
import BulkActionsBar from '@/components/data-management/BulkActionsBar';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

const ENTITY_GROUPS = [
  {
    group: 'Execution',
    entities: [
      { name: 'WorkPackage', label: 'Work Packages', projectField: 'project_id' },
      { name: 'DrawingSet', label: 'Drawing Sets', projectField: 'project_id' },
      { name: 'Fabrication', label: 'Fabrication', projectField: 'project_id' },
      { name: 'Delivery', label: 'Deliveries', projectField: 'project_id' },
      { name: 'Task', label: 'Tasks', projectField: 'project_id' }
    ]
  },
  {
    group: 'Financial',
    entities: [
      { name: 'Budget', label: 'Budgets', projectField: 'project_id' },
      { name: 'Financial', label: 'Financials', projectField: 'project_id' },
      { name: 'SOVItem', label: 'SOV Items', projectField: 'project_id' },
      { name: 'Expense', label: 'Expenses', projectField: 'project_id' },
      { name: 'ChangeOrder', label: 'Change Orders', projectField: 'project_id' }
    ]
  },
  {
    group: 'Communications',
    entities: [
      { name: 'RFI', label: 'RFIs', projectField: 'project_id' },
      { name: 'Submittal', label: 'Submittals', projectField: 'project_id' },
      { name: 'Meeting', label: 'Meetings', projectField: 'project_id' },
      { name: 'ProductionNote', label: 'Production Notes', projectField: 'project_id' }
    ]
  },
  {
    group: 'Documents',
    entities: [
      { name: 'Document', label: 'Documents', projectField: 'project_id' },
      { name: 'DrawingSheet', label: 'Drawing Sheets', projectField: 'drawing_set_id' }
    ]
  }
];

export default function DataManagement() {
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedEntity, setSelectedEntity] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingRecord, setEditingRecord] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showBulkAddDialog, setShowBulkAddDialog] = useState(false);
  const [selectedRecords, setSelectedRecords] = useState(new Set());
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ['projects-for-data-mgmt'],
    queryFn: () => base44.entities.Project.list('-updated_date', 100)
  });

  const currentEntity = ENTITY_GROUPS.flatMap(g => g.entities).find(e => e.name === selectedEntity);

  const { data: records = [], isLoading, refetch } = useQuery({
    queryKey: ['entity-data', selectedEntity, selectedProject],
    queryFn: async () => {
      if (!selectedEntity) return [];
      
      if (selectedProject && currentEntity?.projectField) {
        return await base44.entities[selectedEntity].filter({ 
          [currentEntity.projectField]: selectedProject 
        });
      }
      
      return await base44.entities[selectedEntity].list('-updated_date', 200);
    },
    enabled: !!selectedEntity
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities[selectedEntity].delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entity-data', selectedEntity, selectedProject] });
      setSelectedRecords(new Set());
      toast.success('Record deleted');
    },
    onError: (error) => {
      toast.error('Delete failed: ' + error.message);
    }
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, updates }) => {
      await Promise.all(ids.map(id => base44.entities[selectedEntity].update(id, updates)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entity-data', selectedEntity, selectedProject] });
      setSelectedRecords(new Set());
      toast.success('Bulk update completed');
    },
    onError: (error) => {
      toast.error('Bulk update failed: ' + error.message);
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      await Promise.all(ids.map(id => base44.entities[selectedEntity].delete(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entity-data', selectedEntity, selectedProject] });
      setSelectedRecords(new Set());
      toast.success('Bulk delete completed');
    },
    onError: (error) => {
      toast.error('Bulk delete failed: ' + error.message);
    }
  });

  const handleDelete = async (record) => {
    const identifier = record.name || record.title || record.subject || record.rfi_number || record.id;
    if (window.confirm(`Delete "${identifier}"? This cannot be undone.`)) {
      deleteMutation.mutate(record.id);
    }
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Delete ${selectedRecords.size} records? This cannot be undone.`)) {
      bulkDeleteMutation.mutate(Array.from(selectedRecords));
    }
  };

  const handleBulkEdit = () => {
    setShowBulkEdit(true);
  };

  const handleBulkDuplicate = async () => {
    const recordsToDuplicate = filteredRecords.filter(r => selectedRecords.has(r.id));
    try {
      await Promise.all(recordsToDuplicate.map(record => {
        const { id, created_date, updated_date, created_by, ...data } = record;
        return base44.entities[selectedEntity].create(data);
      }));
      queryClient.invalidateQueries({ queryKey: ['entity-data', selectedEntity, selectedProject] });
      setSelectedRecords(new Set());
      toast.success(`${recordsToDuplicate.length} records duplicated`);
    } catch (error) {
      toast.error('Duplicate failed: ' + error.message);
    }
  };

  const toggleRecord = (id) => {
    const newSelected = new Set(selectedRecords);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRecords(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedRecords.size === filteredRecords.length) {
      setSelectedRecords(new Set());
    } else {
      setSelectedRecords(new Set(filteredRecords.map(r => r.id)));
    }
  };

  const handleExport = () => {
    const csv = convertToCSV(filteredRecords);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedEntity}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success('Data exported');
  };

  const convertToCSV = (data) => {
    if (!data.length) return '';
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => 
      Object.values(row).map(val => 
        typeof val === 'object' ? JSON.stringify(val) : val
      ).join(',')
    );
    return [headers, ...rows].join('\n');
  };

  const filteredRecords = records.filter(record => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return Object.values(record).some(val => 
      String(val).toLowerCase().includes(searchLower)
    );
  });

  const getDisplayColumns = () => {
    if (!records.length) return [];
    
    const sample = records[0];
    const exclude = ['created_by', 'updated_date'];
    
    return Object.keys(sample)
      .filter(key => !exclude.includes(key))
      .slice(0, 6)
      .map(key => ({
        key,
        label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        render: (record) => {
          const value = record[key];
          
          if (key === 'id') {
            return <span className="font-mono text-xs text-zinc-500">{value.substring(0, 8)}...</span>;
          }
          
          if (key === 'created_date') {
            return <span className="text-xs text-zinc-400">{new Date(value).toLocaleDateString()}</span>;
          }
          
          if (typeof value === 'boolean') {
            return <Badge variant={value ? 'default' : 'outline'}>{String(value)}</Badge>;
          }
          
          if (typeof value === 'object' && value !== null) {
            return <span className="text-xs text-zinc-500">Object</span>;
          }
          
          if (key.includes('status') || key.includes('phase')) {
            return <Badge variant="outline" className="text-xs">{value}</Badge>;
          }
          
          if (typeof value === 'number' && key.includes('amount')) {
            return <span className="font-medium">${value.toLocaleString()}</span>;
          }
          
          return <span className="truncate max-w-[200px] block">{String(value)}</span>;
        }
      }));
  };

  const columns = getDisplayColumns();

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      <PageHeader
        title="Data Management"
        subtitle="View, edit, and manage project data"
      />

      <div className="max-w-[1800px] mx-auto px-8 py-6 space-y-6">
        {/* Filters */}
        <Card className="bg-zinc-900/50 border-zinc-800 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-zinc-400 font-medium">Project</label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>All Projects</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.project_number} - {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-zinc-400 font-medium">Entity Type</label>
              <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue placeholder="Select data type..." />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_GROUPS.map(group => (
                    <div key={group.group}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-zinc-500 uppercase">
                        {group.group}
                      </div>
                      {group.entities.map(entity => (
                        <SelectItem key={entity.name} value={entity.name}>
                          {entity.label}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-zinc-400 font-medium">Search</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <Input
                  placeholder="Search records..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Data Table */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          {!selectedEntity && (
            <div className="p-12 text-center">
              <Database size={48} className="mx-auto mb-4 text-zinc-700" />
              <p className="text-zinc-500 mb-2">Select a project and entity type to view data</p>
              <p className="text-xs text-zinc-600">Filter by project to narrow results</p>
            </div>
          )}

          {selectedEntity && (
            <>
              <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-white">
                    {currentEntity?.label}
                  </h3>
                  <Badge variant="outline" className="text-xs">
                    {filteredRecords.length} records
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => refetch()}
                    className="border-zinc-700 text-zinc-400 hover:text-white"
                  >
                    <RefreshCw size={14} />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleExport}
                    disabled={!filteredRecords.length}
                    className="border-zinc-700 text-zinc-400 hover:text-white"
                  >
                    <Download size={14} className="mr-2" />
                    Export
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowBulkAddDialog(true)}
                    className="border-zinc-700 text-zinc-400 hover:text-white"
                  >
                    <Plus size={14} className="mr-2" />
                    Bulk Add
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setShowCreateDialog(true)}
                    className="bg-amber-500 hover:bg-amber-600 text-black"
                  >
                    <Plus size={14} className="mr-2" />
                    Create New
                  </Button>
                </div>
              </div>

              {isLoading && (
                <div className="p-12 text-center text-zinc-500">
                  Loading data...
                </div>
              )}

              {!isLoading && filteredRecords.length === 0 && (
                <div className="p-12 text-center text-zinc-500">
                  No records found
                </div>
              )}

              {!isLoading && filteredRecords.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="w-12 p-3">
                          <Checkbox
                            checked={selectedRecords.size === filteredRecords.length}
                            onCheckedChange={toggleSelectAll}
                          />
                        </th>
                        {columns.map(col => (
                          <th key={col.key} className="text-left p-3 text-xs font-semibold text-zinc-400 uppercase">
                            {col.label}
                          </th>
                        ))}
                        <th className="text-right p-3 text-xs font-semibold text-zinc-400 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecords.map(record => (
                        <tr key={record.id} className="border-b border-zinc-800 hover:bg-zinc-800/30">
                          <td className="p-3">
                            <Checkbox
                              checked={selectedRecords.has(record.id)}
                              onCheckedChange={() => toggleRecord(record.id)}
                            />
                          </td>
                          {columns.map(col => (
                            <td key={col.key} className="p-3 text-sm text-white">
                              {col.render(record)}
                            </td>
                          ))}
                          <td className="p-3 text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingRecord(record)}
                                className="text-blue-400 hover:bg-blue-500/10"
                              >
                                <Edit size={14} />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(record)}
                                className="text-red-400 hover:bg-red-500/10"
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      {editingRecord && (
        <DataEditDialog
          record={editingRecord}
          entityName={selectedEntity}
          onClose={() => setEditingRecord(null)}
          onSave={() => {
            queryClient.invalidateQueries({ queryKey: ['entity-data', selectedEntity, selectedProject] });
            setEditingRecord(null);
          }}
        />
      )}

      {showCreateDialog && (
        <CreateRecordDialog
          entityName={selectedEntity}
          projectId={selectedProject}
          onClose={() => setShowCreateDialog(false)}
          onSave={() => {
            queryClient.invalidateQueries({ queryKey: ['entity-data', selectedEntity, selectedProject] });
            setShowCreateDialog(false);
          }}
        />
      )}

      {showBulkAddDialog && (
        <BulkAddDialog
          entityName={selectedEntity}
          projectId={selectedProject}
          onClose={() => setShowBulkAddDialog(false)}
          onSave={() => {
            queryClient.invalidateQueries({ queryKey: ['entity-data', selectedEntity, selectedProject] });
            setShowBulkAddDialog(false);
          }}
        />
      )}

      {showBulkEdit && (
        <BulkEditDialog
          records={filteredRecords.filter(r => selectedRecords.has(r.id))}
          entityName={selectedEntity}
          fields={columns.map(c => c.key).filter(k => k !== 'id' && k !== 'created_date')}
          onClose={() => setShowBulkEdit(false)}
          onSave={async (updates) => {
            await bulkUpdateMutation.mutateAsync({ 
              ids: Array.from(selectedRecords), 
              updates 
            });
          }}
        />
      )}

      <BulkActionsBar
        selectedCount={selectedRecords.size}
        onBulkEdit={handleBulkEdit}
        onBulkDelete={handleBulkDelete}
        onBulkDuplicate={handleBulkDuplicate}
      />
    </div>
  );
}