import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, AlertTriangle } from 'lucide-react';

export default function ChangeOrderForm({ changeOrder, projects, getNextCONumber, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState({
    project_id: '',
    co_number: '',
    title: '',
    description: '',
    status: 'draft',
    cost_impact: '',
    schedule_impact_days: '',
    submitted_date: '',
    approved_date: '',
    approved_by: '',
    sov_allocations: []
  });
  const [changesSummary, setChangesSummary] = useState('');

  useEffect(() => {
    if (changeOrder) {
      setFormData({
        project_id: changeOrder.project_id || '',
        co_number: changeOrder.co_number?.toString() || '',
        title: changeOrder.title || '',
        description: changeOrder.description || '',
        status: changeOrder.status || 'draft',
        cost_impact: changeOrder.cost_impact?.toString() || '',
        schedule_impact_days: changeOrder.schedule_impact_days?.toString() || '',
        submitted_date: changeOrder.submitted_date || '',
        approved_date: changeOrder.approved_date || '',
        approved_by: changeOrder.approved_by || '',
        sov_allocations: changeOrder.sov_allocations || []
      });
    }
  }, [changeOrder]);

  const { data: sovItems = [] } = useQuery({
    queryKey: ['sov-items', formData.project_id],
    queryFn: () => base44.entities.SOVItem.filter({ project_id: formData.project_id }),
    enabled: !!formData.project_id
  });

  const { data: rfis = [] } = useQuery({
    queryKey: ['rfis', formData.project_id],
    queryFn: () => base44.entities.RFI.filter({ project_id: formData.project_id }),
    enabled: !!formData.project_id
  });

  const handleProjectChange = (projectId) => {
    const nextNumber = getNextCONumber(projectId);
    setFormData(prev => ({
      ...prev,
      project_id: projectId,
      co_number: nextNumber.toString()
    }));
  };

  const addSOVAllocation = () => {
    setFormData(prev => ({
      ...prev,
      sov_allocations: [...prev.sov_allocations, { sov_item_id: '', amount: '', description: '' }]
    }));
  };

  const updateSOVAllocation = (index, field, value) => {
    const updated = [...formData.sov_allocations];
    updated[index][field] = value;
    setFormData(prev => ({ ...prev, sov_allocations: updated }));
  };

  const removeSOVAllocation = (index) => {
    setFormData(prev => ({
      ...prev,
      sov_allocations: prev.sov_allocations.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const data = {
      ...formData,
      co_number: parseInt(formData.co_number) || 1,
      cost_impact: parseFloat(formData.cost_impact) || 0,
      schedule_impact_days: parseInt(formData.schedule_impact_days) || 0,
      sov_allocations: formData.sov_allocations.map(alloc => ({
        ...alloc,
        amount: parseFloat(alloc.amount) || 0
      }))
    };

    onSubmit(data, changesSummary);
  };

  const totalAllocated = formData.sov_allocations.reduce((sum, item) => 
    sum + (parseFloat(item.amount) || 0), 0
  );
  const costImpact = parseFloat(formData.cost_impact) || 0;
  const allocationMismatch = Math.abs(totalAllocated - costImpact) > 0.01;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <Card className="bg-zinc-950 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Project *</Label>
              <Select 
                value={formData.project_id} 
                onValueChange={handleProjectChange}
                disabled={!!changeOrder}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue placeholder="Select project" />
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
            <div className="space-y-2">
              <Label>CO Number *</Label>
              <Input
                type="number"
                value={formData.co_number}
                onChange={(e) => setFormData(prev => ({ ...prev, co_number: e.target.value }))}
                className="bg-zinc-800 border-zinc-700 font-mono"
                required
                disabled={!!changeOrder}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Add Level 2 Bracing Per RFI-023"
              required
              className="bg-zinc-800 border-zinc-700"
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
              placeholder="Detailed scope of change..."
              className="bg-zinc-800 border-zinc-700"
            />
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="void">Void</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Impact */}
      <Card className="bg-zinc-950 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base">Impact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cost Impact ($) *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.cost_impact}
                onChange={(e) => setFormData(prev => ({ ...prev, cost_impact: e.target.value }))}
                placeholder="0.00"
                className="bg-zinc-800 border-zinc-700"
                required
              />
              <p className="text-xs text-zinc-500">Positive = addition, Negative = deduction</p>
            </div>
            <div className="space-y-2">
              <Label>Schedule Impact (Days)</Label>
              <Input
                type="number"
                value={formData.schedule_impact_days}
                onChange={(e) => setFormData(prev => ({ ...prev, schedule_impact_days: e.target.value }))}
                placeholder="0"
                className="bg-zinc-800 border-zinc-700"
              />
              <p className="text-xs text-zinc-500">Days added to schedule</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SOV Allocations */}
      {formData.project_id && sovItems.length > 0 && (
        <Card className="bg-zinc-950 border-zinc-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">SOV Allocations</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSOVAllocation}
                className="border-zinc-700"
              >
                <Plus size={14} className="mr-1" />
                Add Line
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-zinc-500">
              Break down cost impact across SOV line items for accurate billing tracking
            </p>

            {formData.sov_allocations.map((allocation, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end bg-zinc-900/50 p-3 rounded">
                <div className="col-span-5 space-y-1">
                  <Label className="text-xs text-zinc-500">SOV Line Item</Label>
                  <Select
                    value={allocation.sov_item_id}
                    onValueChange={(v) => updateSOVAllocation(idx, 'sov_item_id', v)}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 h-9 text-sm">
                      <SelectValue placeholder="Select SOV line" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      {sovItems.map(item => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.sov_code} - {item.description?.substring(0, 40)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs text-zinc-500">Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={allocation.amount}
                    onChange={(e) => updateSOVAllocation(idx, 'amount', e.target.value)}
                    placeholder="0.00"
                    className="bg-zinc-800 border-zinc-700 h-9 text-sm"
                  />
                </div>
                <div className="col-span-4 space-y-1">
                  <Label className="text-xs text-zinc-500">Reason</Label>
                  <Input
                    value={allocation.description}
                    onChange={(e) => updateSOVAllocation(idx, 'description', e.target.value)}
                    placeholder="Why this line is affected"
                    className="bg-zinc-800 border-zinc-700 h-9 text-sm"
                  />
                </div>
                <div className="col-span-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSOVAllocation(idx)}
                    className="h-9 w-9 text-red-400 hover:text-red-300"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}

            {formData.sov_allocations.length > 0 && (
              <>
                <div className="flex justify-between text-sm pt-2 border-t border-zinc-800">
                  <span className="text-zinc-400">Total Allocated:</span>
                  <span className={`font-bold ${allocationMismatch ? 'text-amber-400' : 'text-green-400'}`}>
                    ${totalAllocated.toLocaleString()}
                  </span>
                </div>
                {allocationMismatch && (
                  <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded">
                    <AlertTriangle size={14} className="text-amber-400 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-amber-400">Allocation Mismatch</p>
                      <p className="text-[10px] text-zinc-400 mt-1">
                        Total allocated (${totalAllocated.toFixed(2)}) doesn't match cost impact (${costImpact.toFixed(2)})
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dates */}
      <Card className="bg-zinc-950 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base">Dates & Approval</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Submitted Date</Label>
              <Input
                type="date"
                value={formData.submitted_date}
                onChange={(e) => setFormData(prev => ({ ...prev, submitted_date: e.target.value }))}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <Label>Approved Date</Label>
              <Input
                type="date"
                value={formData.approved_date}
                onChange={(e) => setFormData(prev => ({ ...prev, approved_date: e.target.value }))}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Approved By</Label>
            <Input
              value={formData.approved_by}
              onChange={(e) => setFormData(prev => ({ ...prev, approved_by: e.target.value }))}
              placeholder="Name of approver"
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
        </CardContent>
      </Card>

      {/* Version Notes (Edit Only) */}
      {changeOrder && (
        <Card className="bg-blue-500/10 border-blue-500/30">
          <CardContent className="p-4">
            <Label className="text-sm text-blue-400 mb-2 block">Change Summary (Version {(changeOrder.version || 1) + 1})</Label>
            <Textarea
              value={changesSummary}
              onChange={(e) => setChangesSummary(e.target.value)}
              rows={2}
              placeholder="Briefly describe what changed in this update..."
              className="bg-zinc-900 border-zinc-700 text-white"
            />
            <p className="text-xs text-zinc-500 mt-2">This will be recorded in version history</p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="border-zinc-700"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-amber-500 hover:bg-amber-600 text-black font-bold"
        >
          {isLoading ? 'Saving...' : changeOrder ? 'Update CO' : 'Create CO'}
        </Button>
      </div>
    </form>
  );
}