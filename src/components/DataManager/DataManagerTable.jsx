import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, RefreshCw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function DataManagerTable({
  entityId,
  entityConfig,
  projectId,
  showAllProjects,
  search,
  filters,
  onEdit,
  onNewRecord
}) {
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [sortField, setSortField] = useState(entityConfig.defaultSort?.field || 'updated_at');
  const [sortDir, setSortDir] = useState(entityConfig.defaultSort?.direction || 'asc');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: Infinity
  });

  // Build query filter
  const queryFilter = useMemo(() => {
    const f = {};
    if (!showAllProjects && projectId) {
      f.project_id = projectId;
    }
    return f;
  }, [projectId, showAllProjects]);

  // Fetch records
  const { data: records = [], isLoading, refetch } = useQuery({
    queryKey: [entityId, projectId, showAllProjects],
    queryFn: async () => {
      const result = await base44.entities[entityConfig.entityName].filter(queryFilter);
      return Array.isArray(result) ? result : [];
    },
    enabled: !showAllProjects ? !!projectId : true,
    staleTime: 2 * 60 * 1000
  });

  // Filter + Search
  const filtered = useMemo(() => {
    let result = records;

    // Search
    if (search) {
      const q = search.toLowerCase();
      const searchableFields = entityConfig.columns.filter(c => c.searchable).map(c => c.id);
      result = result.filter(r =>
        searchableFields.some(f => String(r[f] || '').toLowerCase().includes(q))
      );
    }

    // Quick filter
    if (filters.quickFilter && entityConfig.quickFilters) {
      const qf = entityConfig.quickFilters.find(f => f.id === filters.quickFilter);
      if (qf) {
        result = result.filter(qf.filter);
      }
    }

    // Sort
    result.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [records, search, filters, sortField, sortDir, entityConfig]);

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities[entityConfig.entityName].delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [entityId, projectId, showAllProjects] });
      toast.success('Record deleted');
      setDeleteConfirm(null);
    },
    onError: (err) => toast.error(`Delete failed: ${err.message}`)
  });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const toggleRow = (id) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };

  const handleDeleteRecord = (record) => {
    if (!currentUser) return;
    
    // Admin can delete; non-admin can only delete if they created it
    const canDelete = currentUser.role === 'admin' || record.created_by === currentUser.email;
    if (!canDelete) {
      toast.error('Only admins or creator can delete');
      return;
    }

    setDeleteConfirm(record);
  };

  const visibleColumns = entityConfig.defaultColumns || entityConfig.columns.slice(0, 7).map(c => c.id);
  const displayColumns = entityConfig.columns.filter(c => visibleColumns.includes(c.id));

  if (!projectId && !showAllProjects) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          <p>Select a project to view records</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="flex-1 overflow-auto">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <p>No records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30 sticky top-0">
                  <tr>
                    <th className="w-8 px-3 py-2">
                      <Checkbox
                        checked={selectedRows.size > 0}
                        onCheckedChange={() => {
                          if (selectedRows.size > 0) {
                            setSelectedRows(new Set());
                          } else {
                            setSelectedRows(new Set(filtered.map(r => r.id)));
                          }
                        }}
                      />
                    </th>
                    {displayColumns.map(col => (
                      <th
                        key={col.id}
                        style={{ width: col.width || 'auto' }}
                        className="px-3 py-2 text-left font-medium text-xs uppercase tracking-wide text-muted-foreground"
                      >
                        {col.sortable ? (
                          <button
                            onClick={() => handleSort(col.id)}
                            className="hover:text-foreground transition-colors flex items-center gap-1"
                          >
                            {col.label}
                            {sortField === col.id && (
                              <span>{sortDir === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </button>
                        ) : (
                          col.label
                        )}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-right font-medium text-xs">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((record) => (
                    <tr key={record.id} className="border-b hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2">
                        <Checkbox
                          checked={selectedRows.has(record.id)}
                          onCheckedChange={() => toggleRow(record.id)}
                        />
                      </td>
                      {displayColumns.map(col => (
                        <td key={col.id} style={{ width: col.width || 'auto' }} className="px-3 py-2 truncate text-xs">
                          {col.format ? col.format(record[col.id]) : (record[col.id] || '-')}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onEdit(record)}
                            className="h-7 w-7 p-0"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteRecord(record)}
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Record?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteConfirm.id)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}