import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Pencil, Save, X, Trash2, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

export default function UnapprovedHoursPanel() {
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: unapprovedHours = [], isLoading } = useQuery({
    queryKey: ['unapprovedHours', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      return await base44.entities.LaborHours.filter({ 
        approved: false,
        created_by: currentUser.email
      }, '-work_date');
    },
    enabled: !!currentUser?.email
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
    select: (data) => {
      const map = {};
      data.forEach(p => { map[p.id] = p; });
      return map;
    }
  });

  const { data: workPackages = [] } = useQuery({
    queryKey: ['workPackages'],
    queryFn: () => base44.entities.WorkPackage.list(),
    select: (data) => {
      const map = {};
      data.forEach(wp => { map[wp.id] = wp; });
      return map;
    }
  });

  const { data: costCodes = [] } = useQuery({
    queryKey: ['costCodes'],
    queryFn: () => base44.entities.CostCode.list(),
    select: (data) => {
      const map = {};
      data.forEach(cc => { map[cc.id] = cc; });
      return map;
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LaborHours.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unapprovedHours'] });
      toast.success('Hours updated');
      setEditingId(null);
      setEditData({});
    },
    onError: () => toast.error('Failed to update hours')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LaborHours.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unapprovedHours'] });
      toast.success('Hours deleted');
    },
    onError: () => toast.error('Failed to delete hours')
  });

  const approveMutation = useMutation({
    mutationFn: (id) => base44.entities.LaborHours.update(id, { 
      approved: true,
      approved_by: currentUser?.email,
      approved_date: new Date().toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unapprovedHours'] });
      toast.success('Hours approved');
    },
    onError: () => toast.error('Failed to approve hours')
  });

  const handleEdit = (entry) => {
    setEditingId(entry.id);
    setEditData({
      hours: entry.hours,
      overtime_hours: entry.overtime_hours || 0,
      description: entry.description || ''
    });
  };

  const handleSave = (id) => {
    updateMutation.mutate({
      id,
      data: {
        hours: parseFloat(editData.hours) || 0,
        overtime_hours: parseFloat(editData.overtime_hours) || 0,
        description: editData.description
      }
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditData({});
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="animate-spin" size={16} />
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (unapprovedHours.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No unapproved hours to review
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Hours Pending Approval</CardTitle>
          <Badge variant="outline">{unapprovedHours.length} entries</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {unapprovedHours.map((entry) => {
            const isEditing = editingId === entry.id;
            const project = projects[entry.project_id];
            const workPackage = workPackages[entry.work_package_id];
            const costCode = costCodes[entry.cost_code_id];

            return (
              <div key={entry.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium">
                        {format(parseISO(entry.work_date), 'MMM d, yyyy')}
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground truncate">
                        {project?.name || 'Unknown Project'}
                      </span>
                    </div>
                    {workPackage && (
                      <div className="text-xs text-muted-foreground">
                        WP: {workPackage.name || workPackage.id}
                      </div>
                    )}
                    {costCode && (
                      <div className="text-xs text-muted-foreground">
                        {costCode.code} - {costCode.name}
                      </div>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(entry)}
                        className="h-7 w-7 p-0"
                      >
                        <Pencil size={12} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => approveMutation.mutate(entry.id)}
                        className="h-7 w-7 p-0 text-green-600 hover:text-green-700"
                      >
                        <CheckCircle2 size={12} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(entry.id)}
                        className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-2 pt-2 border-t">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-muted-foreground">Reg Hours</label>
                        <Input
                          type="number"
                          step="0.5"
                          value={editData.hours}
                          onChange={(e) => setEditData({ ...editData, hours: e.target.value })}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">OT Hours</label>
                        <Input
                          type="number"
                          step="0.5"
                          value={editData.overtime_hours}
                          onChange={(e) => setEditData({ ...editData, overtime_hours: e.target.value })}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Description</label>
                      <Textarea
                        value={editData.description}
                        onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                        className="min-h-[60px] text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSave(entry.id)}
                        className="h-7"
                      >
                        <Save size={12} className="mr-1" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancel}
                        className="h-7"
                      >
                        <X size={12} className="mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-2 border-t">
                    <div className="flex items-center gap-4 text-xs">
                      <span className="font-medium">{entry.hours}h reg</span>
                      {entry.overtime_hours > 0 && (
                        <span className="font-medium text-amber-600">{entry.overtime_hours}h OT</span>
                      )}
                    </div>
                    {entry.description && (
                      <p className="text-xs text-muted-foreground mt-1">{entry.description}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}