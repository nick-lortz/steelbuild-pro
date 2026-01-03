import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle2, Clock, Plus, TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from '@/components/ui/notifications';

export default function RiskAssessmentModule({ projectId }) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingRisk, setEditingRisk] = useState(null);
  const queryClient = useQueryClient();

  const { data: risks = [] } = useQuery({
    queryKey: ['project-risks', projectId],
    queryFn: () => base44.entities.ProjectRisk.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const createRiskMutation = useMutation({
    mutationFn: (data) => base44.entities.ProjectRisk.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-risks'] });
      setShowDialog(false);
      setEditingRisk(null);
      toast.success('Risk added');
    }
  });

  const updateRiskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProjectRisk.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-risks'] });
      setShowDialog(false);
      setEditingRisk(null);
      toast.success('Risk updated');
    }
  });

  const openRisks = risks.filter(r => r.status === 'open');
  const mitigatedRisks = risks.filter(r => r.status === 'mitigated');
  const closedRisks = risks.filter(r => r.status === 'closed');

  const totalScheduleImpact = openRisks.reduce((sum, r) => sum + (Number(r.schedule_impact_days) || 0), 0);
  const totalCostImpact = openRisks.reduce((sum, r) => sum + (Number(r.cost_impact) || 0), 0);

  const criticalRisks = openRisks.filter(r => r.severity === 'critical');
  const highRisks = openRisks.filter(r => r.severity === 'high');

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-400">Open Risks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-400">{openRisks.length}</p>
            <p className="text-xs text-zinc-500 mt-1">
              {criticalRisks.length} critical, {highRisks.length} high
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-400 flex items-center gap-2">
              <Calendar size={16} />
              Schedule Impact
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-400">{totalScheduleImpact}</p>
            <p className="text-xs text-zinc-500 mt-1">days at risk</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-400 flex items-center gap-2">
              <DollarSign size={16} />
              Cost Impact
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-400">${totalCostImpact.toLocaleString()}</p>
            <p className="text-xs text-zinc-500 mt-1">potential exposure</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-400">Mitigated</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-400">{mitigatedRisks.length}</p>
            <p className="text-xs text-zinc-500 mt-1">{closedRisks.length} closed</p>
          </CardContent>
        </Card>
      </div>

      {/* Risk List */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Risk Register</CardTitle>
            <Button 
              onClick={() => {
                setEditingRisk(null);
                setShowDialog(true);
              }}
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              <Plus size={16} className="mr-1" />
              Add Risk
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {risks.length === 0 ? (
              <p className="text-zinc-500 text-center py-8">No risks identified</p>
            ) : (
              <>
                {/* Open Risks */}
                {openRisks.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-zinc-400 uppercase">Open</h4>
                    {openRisks.map(risk => (
                      <RiskItem 
                        key={risk.id} 
                        risk={risk} 
                        onEdit={() => {
                          setEditingRisk(risk);
                          setShowDialog(true);
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Mitigated Risks */}
                {mitigatedRisks.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <h4 className="text-sm font-semibold text-zinc-400 uppercase">Mitigated</h4>
                    {mitigatedRisks.map(risk => (
                      <RiskItem 
                        key={risk.id} 
                        risk={risk} 
                        onEdit={() => {
                          setEditingRisk(risk);
                          setShowDialog(true);
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Closed Risks */}
                {closedRisks.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <h4 className="text-sm font-semibold text-zinc-400 uppercase">Closed</h4>
                    {closedRisks.map(risk => (
                      <RiskItem 
                        key={risk.id} 
                        risk={risk} 
                        onEdit={() => {
                          setEditingRisk(risk);
                          setShowDialog(true);
                        }}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <RiskDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        projectId={projectId}
        risk={editingRisk}
        onSubmit={(data) => {
          if (editingRisk) {
            updateRiskMutation.mutate({ id: editingRisk.id, data });
          } else {
            createRiskMutation.mutate(data);
          }
        }}
      />
    </div>
  );
}

function RiskItem({ risk, onEdit }) {
  const severityStyles = {
    low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    critical: 'bg-red-500/20 text-red-400 border-red-500/30'
  };

  const statusIcons = {
    open: <AlertTriangle size={16} className="text-amber-400" />,
    mitigated: <CheckCircle2 size={16} className="text-green-400" />,
    closed: <CheckCircle2 size={16} className="text-zinc-500" />
  };

  return (
    <div 
      onClick={onEdit}
      className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg hover:bg-zinc-800 cursor-pointer transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {statusIcons[risk.status]}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h5 className="font-semibold text-white">{risk.title}</h5>
              <Badge variant="outline" className={severityStyles[risk.severity]}>
                {risk.severity}
              </Badge>
            </div>
            <p className="text-sm text-zinc-400 mb-2">{risk.description}</p>
            {risk.mitigation_plan && (
              <p className="text-xs text-green-400 mb-2">
                <strong>Mitigation:</strong> {risk.mitigation_plan}
              </p>
            )}
            <div className="flex items-center gap-4 text-xs text-zinc-500">
              {risk.schedule_impact_days > 0 && (
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  {risk.schedule_impact_days} days
                </span>
              )}
              {risk.cost_impact > 0 && (
                <span className="flex items-center gap-1">
                  <DollarSign size={12} />
                  ${Number(risk.cost_impact).toLocaleString()}
                </span>
              )}
              {risk.owner && (
                <span>Owner: {risk.owner}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RiskDialog({ open, onOpenChange, projectId, risk, onSubmit }) {
  const [formData, setFormData] = useState(risk || {
    title: '',
    description: '',
    severity: 'medium',
    status: 'open',
    schedule_impact_days: 0,
    cost_impact: 0,
    mitigation_plan: '',
    owner: ''
  });

  React.useEffect(() => {
    if (risk) {
      setFormData(risk);
    } else {
      setFormData({
        title: '',
        description: '',
        severity: 'medium',
        status: 'open',
        schedule_impact_days: 0,
        cost_impact: 0,
        mitigation_plan: '',
        owner: ''
      });
    }
  }, [risk, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...formData, project_id: projectId });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle>{risk ? 'Edit Risk' : 'Add Risk'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="bg-zinc-800 border-zinc-700"
            />
          </div>

          <div className="space-y-2">
            <Label>Description *</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              required
              className="bg-zinc-800 border-zinc-700"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Severity *</Label>
              <Select value={formData.severity} onValueChange={(v) => setFormData({ ...formData, severity: v })}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="mitigated">Mitigated</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Schedule Impact (days)</Label>
              <Input
                type="number"
                value={formData.schedule_impact_days}
                onChange={(e) => setFormData({ ...formData, schedule_impact_days: Number(e.target.value) })}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            <div className="space-y-2">
              <Label>Cost Impact ($)</Label>
              <Input
                type="number"
                value={formData.cost_impact}
                onChange={(e) => setFormData({ ...formData, cost_impact: Number(e.target.value) })}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Mitigation Plan</Label>
            <Textarea
              value={formData.mitigation_plan}
              onChange={(e) => setFormData({ ...formData, mitigation_plan: e.target.value })}
              rows={3}
              placeholder="Steps taken or planned to mitigate this risk..."
              className="bg-zinc-800 border-zinc-700"
            />
          </div>

          <div className="space-y-2">
            <Label>Owner</Label>
            <Input
              value={formData.owner}
              onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
              placeholder="Person responsible"
              className="bg-zinc-800 border-zinc-700"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-zinc-700">
              Cancel
            </Button>
            <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-black">
              {risk ? 'Update' : 'Add'} Risk
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}