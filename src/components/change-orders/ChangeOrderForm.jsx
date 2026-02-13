import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Sparkles, FileText } from 'lucide-react';
import AIImpactAnalysis from './AIImpactAnalysis';
import ApprovalWorkflow from './ApprovalWorkflow';
import FormField from '@/components/ui/FormField';

export default function ChangeOrderForm({ formData, setFormData, projects, onProjectChange, onSubmit, isLoading, isEdit, changeOrder }) {
  const [sovAllocations, setSovAllocations] = useState(formData.sov_allocations || []);
  const [activeTab, setActiveTab] = useState('details');

  const { data: sovItems = [] } = useQuery({
    queryKey: ['sov-items', formData.project_id],
    queryFn: () => base44.entities.SOVItem.filter({ project_id: formData.project_id }),
    enabled: !!formData.project_id,
    select: (items) => items.sort((a, b) => (a.sov_code || '').localeCompare(b.sov_code || ''))
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addSOVAllocation = () => {
    setSovAllocations([...sovAllocations, { sov_item_id: '', amount: 0, description: '' }]);
  };

  const updateSOVAllocation = (index, field, value) => {
    const updated = [...sovAllocations];
    updated[index][field] = value;
    setSovAllocations(updated);
    setFormData(prev => ({ ...prev, sov_allocations: updated }));
  };

  const removeSOVAllocation = (index) => {
    const updated = sovAllocations.filter((_, i) => i !== index);
    setSovAllocations(updated);
    setFormData(prev => ({ ...prev, sov_allocations: updated }));
  };

  const totalAllocated = sovAllocations.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const costImpact = parseFloat(formData.cost_impact) || 0;
  const allocationMismatch = Math.abs(totalAllocated - costImpact) > 0.01;

  const handleFormSubmit = (e) => {
    e.preventDefault();
    onSubmit(e);
  };

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: Infinity
  });

  const handleAIAnalysisComplete = (analysis) => {
    // Store AI analysis in form data
    setFormData(prev => ({ 
      ...prev, 
      ai_analysis: analysis,
      cost_impact: prev.cost_impact || analysis.predicted_cost_impact?.toString() || '',
      schedule_impact_days: prev.schedule_impact_days || analysis.predicted_schedule_impact?.toString() || ''
    }));
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <TabsList className="bg-zinc-800 border-zinc-700 w-full">
        <TabsTrigger value="details" className="flex-1">
          <FileText size={14} className="mr-2" />
          Details
        </TabsTrigger>
        {isEdit && changeOrder && (
          <>
            <TabsTrigger value="ai" className="flex-1">
              <Sparkles size={14} className="mr-2" />
              AI Analysis
            </TabsTrigger>
            <TabsTrigger value="approval" className="flex-1">
              Approval
            </TabsTrigger>
          </>
        )}
      </TabsList>

      <TabsContent value="details">
        <form onSubmit={handleFormSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Project" required>
          <Select 
            value={formData.project_id} 
            onValueChange={onProjectChange}
            disabled={isEdit}
            aria-required="true"
          >
            <SelectTrigger className="bg-zinc-800 border-zinc-700">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.project_number} - {p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        
        <FormField label="CO Number" required>
          <Input
            type="number"
            value={formData.co_number}
            onChange={(e) => handleChange('co_number', e.target.value)}
            className="bg-zinc-800 border-zinc-700 font-mono"
            required
          />
        </FormField>
      </div>
      
      <FormField label="Title" required>
        <Input
          value={formData.title}
          onChange={(e) => handleChange('title', e.target.value)}
          placeholder="Change order title"
          required
          className="bg-zinc-800 border-zinc-700"
        />
      </FormField>

      <FormField label="Description">
        <Textarea
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={4}
          placeholder="Detailed description of the change"
          className="bg-zinc-800 border-zinc-700"
        />
      </FormField>

      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
          <SelectTrigger className="bg-zinc-800 border-zinc-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="void">Void</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Cost Impact ($)</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.cost_impact}
            onChange={(e) => handleChange('cost_impact', e.target.value)}
            placeholder="0.00"
            className="bg-zinc-800 border-zinc-700"
          />
          <p className="text-xs text-zinc-500">Positive = add, Negative = deduct</p>
        </div>
        <div className="space-y-2">
          <Label>Schedule Impact (Days)</Label>
          <Input
            type="number"
            value={formData.schedule_impact_days}
            onChange={(e) => handleChange('schedule_impact_days', e.target.value)}
            placeholder="0"
            className="bg-zinc-800 border-zinc-700"
          />
          <p className="text-xs text-zinc-500">Positive = added time</p>
        </div>
      </div>

      {/* SOV Allocations Section */}
      {formData.project_id && sovItems.length > 0 && (
        <Card className="bg-zinc-800/50 border-zinc-700">
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <Label className="text-sm font-semibold">SOV Allocations</Label>
                <p className="text-xs text-zinc-500 mt-1">
                  Distribute cost impact across SOV line items
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSOVAllocation}
                className="border-zinc-600"
              >
                <Plus size={14} className="mr-1" />
                Add Line
              </Button>
            </div>

            {sovAllocations.map((allocation, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-start bg-zinc-900/50 p-2 rounded">
                <div className="col-span-5">
                  <Select
                    value={allocation.sov_item_id}
                    onValueChange={(v) => updateSOVAllocation(idx, 'sov_item_id', v)}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 h-8 text-xs">
                      <SelectValue placeholder="Select SOV Line" />
                    </SelectTrigger>
                    <SelectContent>
                      {sovItems.map(item => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.sov_code} - {item.description?.substring(0, 30)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    step="0.01"
                    value={allocation.amount}
                    onChange={(e) => updateSOVAllocation(idx, 'amount', e.target.value)}
                    placeholder="Amount"
                    className="bg-zinc-800 border-zinc-700 h-8 text-xs"
                  />
                </div>
                <div className="col-span-4">
                  <Input
                    value={allocation.description}
                    onChange={(e) => updateSOVAllocation(idx, 'description', e.target.value)}
                    placeholder="Reason"
                    className="bg-zinc-800 border-zinc-700 h-8 text-xs"
                  />
                </div>
                <div className="col-span-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSOVAllocation(idx)}
                    className="h-8 w-8 text-red-400 hover:text-red-300"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}

            {sovAllocations.length > 0 && (
              <div className="flex justify-between text-xs pt-2 border-t border-zinc-700">
                <span className="text-zinc-400">Total Allocated:</span>
                <span className={`font-semibold ${allocationMismatch ? 'text-amber-400' : 'text-green-400'}`}>
                  ${totalAllocated.toFixed(2)}
                </span>
              </div>
            )}

            {allocationMismatch && sovAllocations.length > 0 && (
              <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 p-2 rounded">
                ⚠️ Allocation total (${totalAllocated.toFixed(2)}) doesn't match cost impact (${costImpact.toFixed(2)})
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Submitted Date</Label>
          <Input
            type="date"
            value={formData.submitted_date}
            onChange={(e) => handleChange('submitted_date', e.target.value)}
            className="bg-zinc-800 border-zinc-700"
          />
        </div>
        <div className="space-y-2">
          <Label>Approved Date</Label>
          <Input
            type="date"
            value={formData.approved_date}
            onChange={(e) => handleChange('approved_date', e.target.value)}
            className="bg-zinc-800 border-zinc-700"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Approved By</Label>
        <Input
          value={formData.approved_by}
          onChange={(e) => handleChange('approved_by', e.target.value)}
          placeholder="Name of approver"
          className="bg-zinc-800 border-zinc-700"
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-amber-500 hover:bg-amber-600 text-black"
        >
          {isLoading ? 'Saving...' : isEdit ? 'Update CO' : 'Create CO'}
        </Button>
      </div>
    </form>
      </TabsContent>

      {isEdit && changeOrder && (
        <>
          <TabsContent value="ai">
            <AIImpactAnalysis
              changeOrderData={changeOrder}
              projectId={changeOrder.project_id}
              onAnalysisComplete={handleAIAnalysisComplete}
            />
          </TabsContent>

          <TabsContent value="approval">
            <ApprovalWorkflow
              changeOrder={changeOrder}
              currentUser={currentUser}
              onApprovalComplete={() => {
                // Refresh data handled by parent
              }}
            />
          </TabsContent>
        </>
      )}
    </Tabs>
  );
}