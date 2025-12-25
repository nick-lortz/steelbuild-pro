import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Calendar, Mail, FileText, Trash2, PlayCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function AutomatedReportScheduler() {
  const [showForm, setShowForm] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    report_type: 'custom',
    schedule: 'weekly',
    recipients: '',
    active: true
  });

  const queryClient = useQueryClient();

  const { data: reports = [] } = useQuery({
    queryKey: ['automatedReports'],
    queryFn: () => base44.entities.Report.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Report.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automatedReports'] });
      setShowForm(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Report.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automatedReports'] });
      setShowForm(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Report.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automatedReports'] });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }) => base44.entities.Report.update(id, { active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automatedReports'] });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      report_type: 'custom',
      schedule: 'weekly',
      recipients: '',
      active: true
    });
    setEditingReport(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const data = {
      ...formData,
      recipients: formData.recipients.split(',').map(r => r.trim()).filter(Boolean),
      last_run: editingReport?.last_run || null
    };

    if (editingReport) {
      updateMutation.mutate({ id: editingReport.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (report) => {
    setFormData({
      name: report.name,
      description: report.description || '',
      report_type: report.report_type,
      schedule: report.schedule,
      recipients: report.recipients?.join(', ') || '',
      active: report.active
    });
    setEditingReport(report);
    setShowForm(true);
  };

  const reportTypeIcons = {
    financial: '💰',
    progress: '📊',
    safety: '🛡️',
    quality: '✓',
    custom: '📄'
  };

  const scheduleLabels = {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    on_demand: 'On Demand'
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Automated Reports</h2>
          <p className="text-sm text-zinc-400">Schedule recurring reports for drawings, RFIs, and project data</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-amber-500 hover:bg-amber-600 text-black">
          <Plus size={18} className="mr-2" />
          New Report
        </Button>
      </div>

      <div className="grid gap-4">
        {reports.length === 0 ? (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-8 text-center text-zinc-500">
              <FileText size={32} className="mx-auto mb-2 opacity-50" />
              <p>No automated reports configured</p>
            </CardContent>
          </Card>
        ) : (
          reports.map(report => (
            <Card key={report.id} className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{reportTypeIcons[report.report_type]}</span>
                      <h3 className="font-medium text-white">{report.name}</h3>
                      <Badge variant="outline" className={report.active ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'}>
                        {report.active ? 'Active' : 'Paused'}
                      </Badge>
                    </div>
                    {report.description && (
                      <p className="text-sm text-zinc-400 mb-2">{report.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {scheduleLabels[report.schedule]}
                      </span>
                      {report.recipients && report.recipients.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Mail size={12} />
                          {report.recipients.length} recipient{report.recipients.length !== 1 ? 's' : ''}
                        </span>
                      )}
                      {report.last_run && (
                        <span>Last run: {format(new Date(report.last_run), 'MMM d, yyyy')}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleActiveMutation.mutate({ id: report.id, active: !report.active })}
                      className="text-zinc-400 hover:text-white"
                    >
                      <PlayCircle size={16} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(report)}
                      className="text-zinc-400 hover:text-white"
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm('Delete this automated report?')) {
                          deleteMutation.mutate(report.id);
                        }
                      }}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>{editingReport ? 'Edit Report' : 'New Automated Report'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Report Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Weekly Drawing Status"
                className="bg-zinc-800 border-zinc-700"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Report Type *</Label>
                <Select value={formData.report_type} onValueChange={(v) => setFormData({ ...formData, report_type: v })}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="financial">Financial</SelectItem>
                    <SelectItem value="progress">Progress</SelectItem>
                    <SelectItem value="safety">Safety</SelectItem>
                    <SelectItem value="quality">Quality</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Schedule *</Label>
                <Select value={formData.schedule} onValueChange={(v) => setFormData({ ...formData, schedule: v })}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="on_demand">On Demand</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Recipients (comma-separated emails)</Label>
              <Input
                value={formData.recipients}
                onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
                placeholder="user1@email.com, user2@email.com"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="border-zinc-700">
                Cancel
              </Button>
              <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-black">
                {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}