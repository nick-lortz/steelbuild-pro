import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DataTable from '@/components/ui/DataTable';
import { Edit2, Plus, Calendar } from 'lucide-react';
import { toast } from '@/components/ui/notifications';
import * as backend from '../services/backend';

export default function ETCManager({ projectId, expenses = [] }) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingETC, setEditingETC] = useState(null);
  const [formData, setFormData] = useState({
    category: 'labor',
    estimated_remaining_cost: 0,
    notes: '',
    last_reviewed_date: new Date().toISOString().split('T')[0]
  });
  const [requiresComment, setRequiresComment] = useState(false);

  const queryClient = useQueryClient();

  const { data: etcRecords = [] } = useQuery({
    queryKey: ['etc', projectId],
    queryFn: () => base44.entities.EstimatedCostToComplete.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const createMutation = useMutation({
    mutationFn: (data) => backend.createETC(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['etc'] });
      setShowDialog(false);
      resetForm();
      toast.success('ETC created');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to create ETC');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => backend.updateETC(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['etc'] });
      setShowDialog(false);
      resetForm();
      toast.success('ETC updated');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to update ETC');
    }
  });

  const resetForm = () => {
    setFormData({
      category: 'labor',
      estimated_remaining_cost: 0,
      notes: '',
      last_reviewed_date: new Date().toISOString().split('T')[0]
    });
    setEditingETC(null);
  };

  const handleSubmit = async () => {
    const newEstimate = Number(formData.estimated_remaining_cost) || 0;
    
    // Validate large changes require comments
    if (requiresComment && !formData.notes?.trim()) {
      toast.error('Comment required for significant ETC changes');
      return;
    }

    const user = await base44.auth.me();
    
    const data = {
      ...formData,
      project_id: projectId,
      estimated_remaining_cost: newEstimate,
      last_updated_by: user.email
    };

    // Track change for audit trail
    if (editingETC && editingETC.id) {
      const previousEstimate = editingETC.estimated_remaining_cost || 0;
      data.previous_estimate = previousEstimate;
      data.change_amount = newEstimate - previousEstimate;
      updateMutation.mutate({ id: editingETC.id, data });
    } else {
      // Check if record exists for this category
      const existingRecord = etcRecords.find(r => r.category === data.category);
      if (existingRecord) {
        data.previous_estimate = existingRecord.estimated_remaining_cost || 0;
        data.change_amount = newEstimate - data.previous_estimate;
        updateMutation.mutate({ id: existingRecord.id, data });
      } else {
        data.previous_estimate = 0;
        data.change_amount = newEstimate;
        createMutation.mutate(data);
      }
    }
  };

  const handleEdit = (etc) => {
    setEditingETC(etc);
    setFormData({
      category: etc.category,
      estimated_remaining_cost: etc.estimated_remaining_cost || 0,
      notes: etc.notes || '',
      last_reviewed_date: etc.last_reviewed_date || new Date().toISOString().split('T')[0]
    });
    setRequiresComment(false);
    setShowDialog(true);
  };

  // Check if change is significant
  React.useEffect(() => {
    if (!editingETC) {
      setRequiresComment(false);
      return;
    }

    const newEstimate = Number(formData.estimated_remaining_cost) || 0;
    const oldEstimate = editingETC.estimated_remaining_cost || 0;
    const change = Math.abs(newEstimate - oldEstimate);
    const percentChange = oldEstimate > 0 ? (change / oldEstimate) * 100 : 0;

    // Require comment if change > $5000 OR > 20%
    const isSignificant = change > 5000 || percentChange > 20;
    setRequiresComment(isSignificant);
  }, [formData.estimated_remaining_cost, editingETC]);

  // Calculate actual costs per category
  const costByCategory = React.useMemo(() => {
    const categories = ['labor', 'material', 'equipment', 'subcontract', 'other'];
    return categories.map(cat => {
      const actual = expenses
        .filter(e => e.category === cat && (e.payment_status === 'paid' || e.payment_status === 'approved'))
        .reduce((sum, e) => sum + (e.amount || 0), 0);
      
      const etc = etcRecords.find(e => e.category === cat);
      const remaining = etc?.estimated_remaining_cost || 0;
      const forecast = actual + remaining;
      
      return {
        category: cat,
        actual,
        remaining,
        forecast,
        etc
      };
    });
  }, [expenses, etcRecords]);

  const columns = [
    { 
      header: 'Category', 
      accessor: 'category',
      render: (row) => <span className="capitalize font-medium">{row.category}</span>
    },
    { 
      header: 'Actual to Date', 
      accessor: 'actual',
      render: (row) => <span className="text-red-400">${row.actual.toLocaleString()}</span>
    },
    { 
      header: 'Est Remaining', 
      accessor: 'remaining',
      render: (row) => <span>${row.remaining.toLocaleString()}</span>
    },
    { 
      header: 'Forecast Total', 
      accessor: 'forecast',
      render: (row) => <span className="font-semibold">${row.forecast.toLocaleString()}</span>
    },
    {
      header: 'Last Updated',
      accessor: 'last_reviewed_date',
      render: (row) => row.etc?.last_reviewed_date ? (
        <div className="text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar size={12} />
            {row.etc.last_reviewed_date}
          </div>
          {row.etc.last_updated_by && (
            <div className="text-[10px]">{row.etc.last_updated_by.split('@')[0]}</div>
          )}
        </div>
      ) : (
        <span className="text-xs text-muted-foreground">Not set</span>
      )
    },
    {
      header: '',
      accessor: 'actions',
      render: (row) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => row.etc ? handleEdit(row.etc) : handleEdit({ category: row.category, estimated_remaining_cost: 0 })}
        >
          <Edit2 size={14} />
        </Button>
      )
    }
  ];

  const totalActual = costByCategory.reduce((sum, c) => sum + c.actual, 0);
  const totalRemaining = costByCategory.reduce((sum, c) => sum + c.remaining, 0);
  const totalForecast = totalActual + totalRemaining;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-base">Estimated Cost to Complete (ETC)</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              PM forecast of remaining costs by category
            </p>
          </div>
          <Button size="sm" onClick={() => { resetForm(); setShowDialog(true); }}>
            <Plus size={16} className="mr-1" />
            Update ETC
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <DataTable columns={columns} data={costByCategory} />

        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Total Actual</p>
            <p className="text-lg font-bold text-red-400">${totalActual.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Total Remaining</p>
            <p className="text-lg font-bold">${totalRemaining.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Forecast at Completion</p>
            <p className="text-lg font-bold">${totalForecast.toLocaleString()}</p>
          </div>
        </div>
      </CardContent>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingETC ? 'Update' : 'Set'} Estimated Cost to Complete</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Category</label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => setFormData({ ...formData, category: value })}
                disabled={!!editingETC}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="labor">Labor</SelectItem>
                  <SelectItem value="material">Material</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                  <SelectItem value="subcontract">Subcontract</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Estimated Remaining Cost</label>
              <Input
                type="number"
                step="0.01"
                value={formData.estimated_remaining_cost}
                onChange={(e) => setFormData({ ...formData, estimated_remaining_cost: e.target.value })}
                placeholder="0"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Last Reviewed Date</label>
              <Input
                type="date"
                value={formData.last_reviewed_date}
                onChange={(e) => setFormData({ ...formData, last_reviewed_date: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium">
                Notes / Assumptions {requiresComment && <span className="text-red-400">*</span>}
              </label>
              {requiresComment && (
                <p className="text-xs text-amber-400 mb-1">
                  Comment required: significant change detected (&gt;$5K or &gt;20%)
                </p>
              )}
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="E.g., Based on current crew size, remaining tonnage estimate..."
                rows={3}
                className={requiresComment && !formData.notes?.trim() ? 'border-amber-500' : ''}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button 
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}