import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Badge } from "@/components/ui/badge";
import PageHeader from '@/components/ui/PageHeader';
import AutomatedReportScheduler from '@/components/reports/AutomatedReportScheduler';
import DataTable from '@/components/ui/DataTable';
import { FileText, Download, Play, Calendar, TrendingUp, DollarSign, AlertTriangle, FileSpreadsheet, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function Reports() {
  const [showForm, setShowForm] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [generatingReport, setGeneratingReport] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    report_type: 'custom',
    schedule: 'on_demand',
    recipients: [],
    filters: {
      project_ids: [],
      date_range: '30',
      metrics: []
    },
    active: true
  });

  const queryClient = useQueryClient();

  const { data: reports = [] } = useQuery({
    queryKey: ['reports'],
    queryFn: () => base44.entities.Report.list('-created_date'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
    staleTime: 10 * 60 * 1000,
  });

  const { data: financials = [] } = useQuery({
    queryKey: ['financials'],
    queryFn: () => base44.entities.Financial.list(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: rfis = [] } = useQuery({
    queryKey: ['rfis'],
    queryFn: () => base44.entities.RFI.list(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: changeOrders = [] } = useQuery({
    queryKey: ['changeOrders'],
    queryFn: () => base44.entities.ChangeOrder.list(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: drawingSets = [] } = useQuery({
    queryKey: ['drawingSets'],
    queryFn: () => base44.entities.DrawingSet.list(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list(),
    staleTime: 5 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Report.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      setShowForm(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Report.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      setShowForm(false);
      setEditingReport(null);
      resetForm();
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      report_type: 'custom',
      schedule: 'on_demand',
      recipients: [],
      filters: {
        project_ids: [],
        date_range: '30',
        metrics: []
      },
      active: true
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingReport) {
      updateMutation.mutate({ id: editingReport.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (report) => {
    setEditingReport(report);
    setFormData({
      name: report.name || '',
      description: report.description || '',
      report_type: report.report_type || 'custom',
      schedule: report.schedule || 'on_demand',
      recipients: report.recipients || [],
      filters: report.filters || { project_ids: [], date_range: '30', metrics: [] },
      active: report.active !== undefined ? report.active : true
    });
    setShowForm(true);
  };

  const generateReport = async (report) => {
    setGeneratingReport(report.id);
    
    try {
      // Filter data based on report settings
      const selectedProjects = report.filters?.project_ids?.length > 0
        ? projects.filter(p => report.filters.project_ids.includes(p.id))
        : projects;

      let reportData = '';

      if (report.report_type === 'financial') {
        reportData = generateFinancialReport(selectedProjects);
      } else if (report.report_type === 'progress') {
        reportData = generateProgressReport(selectedProjects);
      } else if (report.report_type === 'safety') {
        reportData = generateSafetyReport(selectedProjects);
      } else if (report.report_type === 'quality') {
        reportData = generateQualityReport(selectedProjects);
      } else {
        reportData = generateCustomReport(selectedProjects, report);
      }

      // Generate CSV
      downloadCSV(reportData, `${report.name}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    } catch (error) {
      console.error('Report generation failed:', error);
      alert('Failed to generate report');
    } finally {
      setGeneratingReport(null);
    }
  };

  const generateFinancialReport = (selectedProjects) => {
    const headers = ['Project', 'Project Number', 'Budget', 'Committed', 'Actual', 'Variance', 'Forecast'];
    const rows = selectedProjects.map(project => {
      const projectFinancials = financials.filter(f => f.project_id === project.id);
      const projectExpenses = expenses.filter(e => e.project_id === project.id && (e.payment_status === 'paid' || e.payment_status === 'approved'));
      
      const budget = projectFinancials.reduce((sum, f) => sum + (f.budget_amount || 0), 0);
      const committed = projectFinancials.reduce((sum, f) => sum + (f.committed_amount || 0), 0);
      const actual = projectFinancials.reduce((sum, f) => sum + (f.actual_amount || 0), 0) + 
                     projectExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const forecast = projectFinancials.reduce((sum, f) => sum + (f.forecast_amount || 0), 0);
      const variance = budget - actual;

      return [
        project.name,
        project.project_number,
        budget,
        committed,
        actual,
        variance,
        forecast
      ];
    });

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const generateProgressReport = (selectedProjects) => {
    const headers = ['Project', 'Status', 'Start Date', 'Target Completion', 'Tasks Total', 'Tasks Completed', 'Progress %', 'Blocked Tasks'];
    const rows = selectedProjects.map(project => {
      const projectTasks = tasks.filter(t => t.project_id === project.id);
      const completedTasks = projectTasks.filter(t => t.status === 'completed').length;
      const blockedTasks = projectTasks.filter(t => t.status === 'blocked').length;
      const progress = projectTasks.length > 0 ? ((completedTasks / projectTasks.length) * 100).toFixed(1) : 0;

      return [
        project.name,
        project.status,
        project.start_date || '',
        project.target_completion || '',
        projectTasks.length,
        completedTasks,
        progress,
        blockedTasks
      ];
    });

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const generateSafetyReport = (selectedProjects) => {
    const headers = ['Project', 'Total RFIs', 'Open RFIs', 'Critical RFIs', 'Change Orders', 'Drawing Issues'];
    const rows = selectedProjects.map(project => {
      const projectRFIs = rfis.filter(r => r.project_id === project.id);
      const openRFIs = projectRFIs.filter(r => ['draft', 'submitted', 'pending'].includes(r.status)).length;
      const criticalRFIs = projectRFIs.filter(r => r.priority === 'critical').length;
      const projectCOs = changeOrders.filter(c => c.project_id === project.id).length;
      const projectDrawings = drawingSets.filter(d => d.project_id === project.id);
      const drawingIssues = projectDrawings.filter(d => d.status === 'IFA' || !d.released_for_fab_date).length;

      return [
        project.name,
        projectRFIs.length,
        openRFIs,
        criticalRFIs,
        projectCOs,
        drawingIssues
      ];
    });

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const generateQualityReport = (selectedProjects) => {
    const headers = ['Project', 'Drawing Sets', 'Released Sets', 'Pending Approval', 'AI Reviewed', 'RFIs Answered'];
    const rows = selectedProjects.map(project => {
      const projectDrawings = drawingSets.filter(d => d.project_id === project.id);
      const releasedSets = projectDrawings.filter(d => d.released_for_fab_date).length;
      const pendingSets = projectDrawings.filter(d => d.status === 'IFA' || d.status === 'BFA').length;
      const aiReviewed = projectDrawings.filter(d => d.ai_review_status === 'completed').length;
      const projectRFIs = rfis.filter(r => r.project_id === project.id);
      const answeredRFIs = projectRFIs.filter(r => r.status === 'answered' || r.status === 'closed').length;

      return [
        project.name,
        projectDrawings.length,
        releasedSets,
        pendingSets,
        aiReviewed,
        answeredRFIs
      ];
    });

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const generateCustomReport = (selectedProjects, report) => {
    const headers = ['Project', 'Project Number', 'Status', 'Budget', 'Actual Costs'];
    const rows = selectedProjects.map(project => {
      const projectFinancials = financials.filter(f => f.project_id === project.id);
      const budget = projectFinancials.reduce((sum, f) => sum + (f.budget_amount || 0), 0);
      const actual = projectFinancials.reduce((sum, f) => sum + (f.actual_amount || 0), 0);

      return [
        project.name,
        project.project_number,
        project.status,
        budget,
        actual
      ];
    });

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const downloadCSV = (csvContent, filename) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns = [
    {
      header: 'Report Name',
      accessor: 'name',
      render: (row) => (
        <div>
          <p className="font-medium">{row.name}</p>
          <p className="text-xs text-zinc-500">{row.description}</p>
        </div>
      ),
    },
    {
      header: 'Type',
      accessor: 'report_type',
      render: (row) => (
        <Badge variant="outline" className="capitalize">
          {row.report_type}
        </Badge>
      ),
    },
    {
      header: 'Schedule',
      accessor: 'schedule',
      render: (row) => (
        <span className="capitalize text-zinc-400">{row.schedule.replace('_', ' ')}</span>
      ),
    },
    {
      header: 'Last Run',
      accessor: 'last_run',
      render: (row) => row.last_run ? format(new Date(row.last_run), 'MMM d, yyyy h:mm a') : 'Never',
    },
    {
      header: 'Status',
      accessor: 'active',
      render: (row) => (
        <Badge variant="outline" className={row.active ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'}>
          {row.active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (row) => (
        <Button
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            generateReport(row);
          }}
          disabled={generatingReport === row.id}
          className="bg-amber-500 hover:bg-amber-600 text-black"
        >
          {generatingReport === row.id ? (
            <>
              <Loader2 size={14} className="mr-1 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Play size={14} className="mr-1" />
              Run Report
            </>
          )}
        </Button>
      ),
    },
  ];

  // Quick Stats
  const reportStats = React.useMemo(() => ({
    totalReports: reports.length,
    activeReports: reports.filter(r => r.active).length,
    scheduledReports: reports.filter(r => r.schedule !== 'on_demand').length,
  }), [reports]);
  
  const { totalReports, activeReports, scheduledReports } = reportStats;

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Generate and schedule project reports"
        actions={
          <Button 
            onClick={() => {
              resetForm();
              setEditingReport(null);
              setShowForm(true);
            }}
            className="bg-amber-500 hover:bg-amber-600 text-black"
          >
            <FileText size={18} className="mr-2" />
            Create Report
          </Button>
        }
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Total Reports</p>
                <p className="text-2xl font-bold text-white">{totalReports}</p>
              </div>
              <FileText className="text-amber-500" size={24} />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Active Reports</p>
                <p className="text-2xl font-bold text-white">{activeReports}</p>
              </div>
              <TrendingUp className="text-green-500" size={24} />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Scheduled</p>
                <p className="text-2xl font-bold text-white">{scheduledReports}</p>
              </div>
              <Calendar className="text-blue-500" size={24} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="financial" className="space-y-6">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="financial">Financial Reports</TabsTrigger>
          <TabsTrigger value="progress">Progress Reports</TabsTrigger>
          <TabsTrigger value="safety">Safety Reports</TabsTrigger>
          <TabsTrigger value="quality">Quality Reports</TabsTrigger>
          <TabsTrigger value="automated">Automated Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="financial">
          <DataTable
            columns={columns}
            data={reports.filter(r => r.report_type === 'financial')}
            onRowClick={handleEdit}
            emptyMessage="No financial reports. Create your first report to get started."
          />
        </TabsContent>

        <TabsContent value="progress">
          <DataTable
            columns={columns}
            data={reports.filter(r => r.report_type === 'progress')}
            onRowClick={handleEdit}
            emptyMessage="No progress reports. Create your first report to get started."
          />
        </TabsContent>

        <TabsContent value="safety">
          <DataTable
            columns={columns}
            data={reports.filter(r => r.report_type === 'safety')}
            onRowClick={handleEdit}
            emptyMessage="No safety reports. Create your first report to get started."
          />
        </TabsContent>

        <TabsContent value="quality">
          <DataTable
            columns={columns}
            data={reports.filter(r => r.report_type === 'quality')}
            onRowClick={handleEdit}
            emptyMessage="No quality reports. Create your first report to get started."
          />
        </TabsContent>

        <TabsContent value="automated">
          <AutomatedReportScheduler />
        </TabsContent>
      </Tabs>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-800 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingReport ? 'Edit Report' : 'Create Report'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Report Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Monthly Financial Summary"
                required
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the report"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Report Type *</Label>
                <Select 
                  value={formData.report_type} 
                  onValueChange={(v) => setFormData({ ...formData, report_type: v })}
                >
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
                <Select 
                  value={formData.schedule} 
                  onValueChange={(v) => setFormData({ ...formData, schedule: v })}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="on_demand">On Demand</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Filter Projects</Label>
              <Select 
                value={formData.filters?.project_ids?.[0] || 'all'} 
                onValueChange={(v) => {
                  if (v === 'all') {
                    setFormData({ ...formData, filters: { ...formData.filters, project_ids: [] } });
                  } else {
                    setFormData({ ...formData, filters: { ...formData.filters, project_ids: [v] } });
                  }
                }}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue placeholder="All projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.project_number} - {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
                className="border-zinc-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-amber-500 hover:bg-amber-600 text-black"
              >
                {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Report'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}