import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Trash2, Edit, Search, Plus, Database } from 'lucide-react';
import { toast } from '@/components/ui/notifications';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PageHeader from '@/components/ui/PageHeader';

const ENTITY_TYPES = [
  { name: 'WorkPackage', label: 'Work Packages' },
  { name: 'DrawingSet', label: 'Detailing (Drawing Sets)' },
  { name: 'Fabrication', label: 'Fabrication' },
  { name: 'Delivery', label: 'Deliveries' },
  { name: 'Task', label: 'Schedule (Tasks)' },
  { name: 'Budget', label: 'Budgets' },
  { name: 'SOVItem', label: 'SOV Items' },
  { name: 'Expense', label: 'Expenses' },
  { name: 'ChangeOrder', label: 'Change Orders' },
  { name: 'RFI', label: 'RFIs' },
  { name: 'Submittal', label: 'Submittals' },
  { name: 'DrawingSheet', label: 'Drawing Sheets' }
];

export default function DataManagement() {
  const [selectedEntity, setSelectedEntity] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingRecord, setEditingRecord] = useState(null);
  const [editData, setEditData] = useState({});
  const queryClient = useQueryClient();

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['entity-data', selectedEntity],
    queryFn: async () => {
      if (!selectedEntity) return [];
      return await base44.entities[selectedEntity].list('-updated_date', 100);
    },
    enabled: !!selectedEntity
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities[selectedEntity].delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entity-data', selectedEntity] });
      toast.success('Record deleted');
    },
    onError: (error) => {
      toast.error('Delete failed: ' + error.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      await base44.entities[selectedEntity].update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entity-data', selectedEntity] });
      setEditingRecord(null);
      setEditData({});
      toast.success('Record updated');
    },
    onError: (error) => {
      toast.error('Update failed: ' + error.message);
    }
  });

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this record? This cannot be undone.')) {
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setEditData({ ...record });
  };

  const handleSave = () => {
    updateMutation.mutate({
      id: editingRecord.id,
      data: editData
    });
  };

  const filteredRecords = records.filter(record => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return Object.values(record).some(val => 
      String(val).toLowerCase().includes(searchLower)
    );
  });

  const getDisplayFields = (record) => {
    const exclude = ['id', 'created_date', 'updated_date', 'created_by'];
    return Object.entries(record)
      .filter(([key]) => !exclude.includes(key))
      .slice(0, 4);
  };

  const renderEditField = (key, value) => {
    if (key === 'id' || key === 'created_date' || key === 'updated_date' || key === 'created_by') {
      return null;
    }

    if (typeof value === 'boolean') {
      return (
        <div key={key} className="space-y-1">
          <label className="text-xs text-zinc-400">{key}</label>
          <select
            value={String(editData[key])}
            onChange={(e) => setEditData({ ...editData, [key]: e.target.value === 'true' })}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white"
          >
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        </div>
      );
    }

    if (typeof value === 'object' && value !== null) {
      return (
        <div key={key} className="space-y-1">
          <label className="text-xs text-zinc-400">{key}</label>
          <textarea
            value={JSON.stringify(editData[key], null, 2)}
            onChange={(e) => {
              try {
                setEditData({ ...editData, [key]: JSON.parse(e.target.value) });
              } catch (err) {
                // Keep as string if invalid JSON
              }
            }}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white font-mono"
            rows={4}
          />
        </div>
      );
    }

    return (
      <div key={key} className="space-y-1">
        <label className="text-xs text-zinc-400">{key}</label>
        <Input
          value={editData[key] || ''}
          onChange={(e) => setEditData({ ...editData, [key]: e.target.value })}
          className="bg-zinc-800 border-zinc-700 text-white"
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      <PageHeader
        title="Data Management"
        subtitle="View, edit, and delete entity records"
      />

      <div className="max-w-[1800px] mx-auto px-8 py-6 space-y-6">
        <Card className="bg-zinc-900/50 border-zinc-800 p-6">
          <div className="flex items-center gap-4 mb-6">
            <Database size={20} className="text-amber-500" />
            <Select value={selectedEntity} onValueChange={setSelectedEntity}>
              <SelectTrigger className="w-64 bg-zinc-800 border-zinc-700 text-white">
                <SelectValue placeholder="Select entity type..." />
              </SelectTrigger>
              <SelectContent>
                {ENTITY_TYPES.map(entity => (
                  <SelectItem key={entity.name} value={entity.name}>
                    {entity.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedEntity && (
              <div className="flex-1 relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <Input
                  placeholder="Search records..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            )}
          </div>

          {!selectedEntity && (
            <div className="text-center py-12 text-zinc-500">
              Select an entity type to view records
            </div>
          )}

          {selectedEntity && isLoading && (
            <div className="text-center py-12 text-zinc-500">
              Loading records...
            </div>
          )}

          {selectedEntity && !isLoading && filteredRecords.length === 0 && (
            <div className="text-center py-12 text-zinc-500">
              No records found
            </div>
          )}

          {selectedEntity && !isLoading && filteredRecords.length > 0 && (
            <div className="space-y-2">
              {filteredRecords.map(record => (
                <Card key={record.id} className="bg-zinc-800/30 border-zinc-700 p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                      {getDisplayFields(record).map(([key, value]) => (
                        <div key={key}>
                          <div className="text-xs text-zinc-500 mb-1">{key}</div>
                          <div className="text-sm text-white truncate">
                            {typeof value === 'object' ? JSON.stringify(value).substring(0, 50) + '...' : String(value)}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(record)}
                        className="text-blue-400 hover:bg-blue-500/10"
                      >
                        <Edit size={14} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(record.id)}
                        className="text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-zinc-700 text-xs text-zinc-600">
                    ID: {record.id} | Created: {new Date(record.created_date).toLocaleString()}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Dialog open={!!editingRecord} onOpenChange={() => setEditingRecord(null)}>
        <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-800 text-white max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Record</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {editingRecord && Object.entries(editingRecord).map(([key, value]) => 
              renderEditField(key, value)
            )}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setEditingRecord(null)}
                className="border-zinc-700 text-white hover:bg-zinc-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="bg-amber-500 hover:bg-amber-600 text-black"
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}