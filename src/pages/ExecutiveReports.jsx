import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  FileText, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Clock, 
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  PieChart as PieChartIcon,
  Activity
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { format, differenceInDays } from 'date-fns';
import { toast } from '@/components/ui/notifications';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function ExecutiveReports() {
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [reportConfig, setReportConfig] = useState({
    includeFinancials: true,
    includeSchedule: true,
    includeRFIs: true,
    includeChangeOrders: true,
    includeResources: true,
    includeTasks: false
  });
  const [drillDownData, setDrillDownData] = useState(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  // Fetch all data
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
    staleTime: 5 * 60 * 1000
  });

  const { data: workPackages = [] } = useQuery({
    queryKey: ['work-packages'],
    queryFn: () => base44.entities.WorkPackage.list(),
    staleTime: 2 * 60 * 1000
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list(),
    staleTime: 2 * 60 * 1000
  });

  const { data: rfis = [] } = useQuery({
    queryKey: ['rfis'],
    queryFn: () => base44.entities.RFI.list(),
    staleTime: 2 * 60 * 1000
  });

  const { data: changeOrders = [] } = useQuery({
    queryKey: ['changeOrders'],
    queryFn: () => base44.entities.ChangeOrder.list(),
    staleTime: 2 * 60 * 1000
  });

  const { data: resources = [] } = useQuery({
    queryKey: ['resources'],
    queryFn: () => base44.entities.Resource.list(),
    staleTime: 5 * 60 * 1000
  });

  // Filter data by selected projects
  const filteredData = useMemo(() => {
    const projectIds = selectedProjects.length > 0 ? selectedProjects : projects.map(p => p.id);
    
    return {
      projects: projects.filter(p => projectIds.includes(p.id)),
      workPackages: workPackages.filter(wp => projectIds.includes(wp.project_id)),
      tasks: tasks.filter(t => projectIds.includes(t.project_id)),
      rfis: rfis.filter(r => projectIds.includes(r.project_id)),
      changeOrders: changeOrders.filter(co => projectIds.includes(co.project_id)),
      resources: resources
    };
  }, [selectedProjects, projects, workPackages, tasks, rfis, changeOrders, resources]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const { projects: filtProjects, workPackages: filtWPs, tasks: filtTasks, rfis: filtRFIs, changeOrders: filtCOs } = filteredData;

    // Financial metrics
    const totalBudget = filtProjects.reduce((sum, p) => sum + (p.contract_value || 0), 0);
    const totalActualCost = filtWPs.reduce((sum, wp) => sum + (wp.forecast_at_completion || 0), 0);
    const costVariance = totalBudget - totalActualCost;
    const costVariancePercent = totalBudget > 0 ? ((costVariance / totalBudget) * 100) : 0;

    // Schedule metrics
    const totalTasks = filtTasks.length;
    const completedTasks = filtTasks.filter(t => t.status === 'completed').length;
    const onTimeTasks = filtTasks.filter(t => {
      if (t.status === 'completed' && t.actual_finish && t.end_date) {
        return new Date(t.actual_finish) <= new Date(t.end_date);
      }
      return true;
    }).length;
    const schedulePerformanceIndex = totalTasks > 0 ? (onTimeTasks / totalTasks) : 0;

    // RFI metrics
    const totalRFIs = filtRFIs.length;
    const openRFIs = filtRFIs.filter(r => ['draft', 'submitted', 'under_review'].includes(r.status)).length;
    const avgRFIResponseDays = filtRFIs.filter(r => r.submitted_date && r.response_date).reduce((sum, r) => {
      return sum + differenceInDays(new Date(r.response_date), new Date(r.submitted_date));
    }, 0) / (filtRFIs.filter(r => r.response_date).length || 1);

    // Change Order metrics
    const totalCOs = filtCOs.length;
    const approvedCOs = filtCOs.filter(co => co.status === 'approved').length;
    const coImpact = filtCOs.reduce((sum, co) => sum + (co.cost_impact || 0), 0);
    const avgCOCycleTime = filtCOs.filter(co => co.submitted_date && co.approved_date).reduce((sum, co) => {
      return sum + differenceInDays(new Date(co.approved_date), new Date(co.submitted_date));
    }, 0) / (filtCOs.filter(co => co.approved_date).length || 1);

    // Resource utilization
    const assignedResources = resources.filter(r => r.status === 'assigned').length;
    const availableResources = resources.filter(r => r.status === 'available').length;
    const resourceUtilization = (assignedResources / (assignedResources + availableResources)) * 100 || 0;

    return {
      financial: { totalBudget, totalActualCost, costVariance, costVariancePercent },
      schedule: { totalTasks, completedTasks, schedulePerformanceIndex },
      rfis: { totalRFIs, openRFIs, avgRFIResponseDays },
      changeOrders: { totalCOs, approvedCOs, coImpact, avgCOCycleTime },
      resources: { assignedResources, availableResources, resourceUtilization }
    };
  }, [filteredData, resources]);

  // Chart data
  const costVarianceChartData = useMemo(() => {
    return filteredData.projects.map(p => {
      const projectWPs = filteredData.workPackages.filter(wp => wp.project_id === p.id);
      const budget = projectWPs.reduce((sum, wp) => sum + (wp.budget_at_award || 0), 0);
      const forecast = projectWPs.reduce((sum, wp) => sum + (wp.forecast_at_completion || 0), 0);
      return {
        name: p.project_number || p.name.slice(0, 20),
        budget: budget / 1000,
        forecast: forecast / 1000,
        variance: (budget - forecast) / 1000,
        projectId: p.id
      };
    });
  }, [filteredData]);

  const rfiStatusChartData = useMemo(() => {
    const statusCounts = filteredData.rfis.reduce((acc, rfi) => {
      acc[rfi.status] = (acc[rfi.status] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status.replace('_', ' ').toUpperCase(),
      value: count,
      status
    }));
  }, [filteredData.rfis]);

  const scheduleProgressChartData = useMemo(() => {
    return filteredData.projects.map(p => {
      const projectTasks = filteredData.tasks.filter(t => t.project_id === p.id);
      const completed = projectTasks.filter(t => t.status === 'completed').length;
      const total = projectTasks.length;
      return {
        name: p.project_number || p.name.slice(0, 20),
        completed,
        inProgress: projectTasks.filter(t => t.status === 'in_progress').length,
        notStarted: projectTasks.filter(t => t.status === 'not_started').length,
        progressPercent: total > 0 ? (completed / total) * 100 : 0,
        projectId: p.id
      };
    });
  }, [filteredData]);

  const handleChartClick = (data, type) => {
    if (!data) return;
    
    setDrillDownData({
      type,
      projectId: data.projectId,
      projectName: data.name,
      data: data
    });
  };

  const generatePDF = async () => {
    setGeneratingPDF(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      let yPos = 20;

      // Title
      doc.setFontSize(20);
      doc.setFont(undefined, 'bold');
      doc.text('Executive Project Report', pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;

      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;

      // Projects Summary
      if (selectedProjects.length > 0) {
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Projects Included:', 20, yPos);
        yPos += 7;
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        filteredData.projects.forEach(p => {
          doc.text(`• ${p.project_number} - ${p.name}`, 25, yPos);
          yPos += 5;
        });
        yPos += 5;
      }

      // Key Metrics
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Key Performance Indicators', 20, yPos);
      yPos += 10;

      if (reportConfig.includeFinancials) {
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('Financial Performance', 20, yPos);
        yPos += 6;
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.text(`Total Budget: $${(metrics.financial.totalBudget / 1000).toFixed(0)}K`, 25, yPos);
        yPos += 5;
        doc.text(`Total Forecast: $${(metrics.financial.totalActualCost / 1000).toFixed(0)}K`, 25, yPos);
        yPos += 5;
        const varianceColor = metrics.financial.costVariance >= 0 ? [34, 197, 94] : [239, 68, 68];
        doc.setTextColor(...varianceColor);
        doc.text(`Cost Variance: ${metrics.financial.costVariance >= 0 ? '+' : ''}$${(metrics.financial.costVariance / 1000).toFixed(0)}K (${metrics.financial.costVariancePercent.toFixed(1)}%)`, 25, yPos);
        doc.setTextColor(0, 0, 0);
        yPos += 8;
      }

      if (reportConfig.includeSchedule) {
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('Schedule Performance', 20, yPos);
        yPos += 6;
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.text(`Total Tasks: ${metrics.schedule.totalTasks}`, 25, yPos);
        yPos += 5;
        doc.text(`Completed: ${metrics.schedule.completedTasks} (${((metrics.schedule.completedTasks / metrics.schedule.totalTasks) * 100).toFixed(1)}%)`, 25, yPos);
        yPos += 5;
        doc.text(`Schedule Performance Index: ${(metrics.schedule.schedulePerformanceIndex * 100).toFixed(1)}%`, 25, yPos);
        yPos += 8;
      }

      if (reportConfig.includeRFIs) {
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('RFI Performance', 20, yPos);
        yPos += 6;
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.text(`Total RFIs: ${metrics.rfis.totalRFIs}`, 25, yPos);
        yPos += 5;
        doc.text(`Open RFIs: ${metrics.rfis.openRFIs}`, 25, yPos);
        yPos += 5;
        doc.text(`Avg Response Time: ${metrics.rfis.avgRFIResponseDays.toFixed(1)} days`, 25, yPos);
        yPos += 8;
      }

      if (reportConfig.includeChangeOrders) {
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('Change Order Summary', 20, yPos);
        yPos += 6;
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.text(`Total COs: ${metrics.changeOrders.totalCOs}`, 25, yPos);
        yPos += 5;
        doc.text(`Approved: ${metrics.changeOrders.approvedCOs}`, 25, yPos);
        yPos += 5;
        doc.text(`Financial Impact: $${(metrics.changeOrders.coImpact / 1000).toFixed(0)}K`, 25, yPos);
        yPos += 5;
        doc.text(`Avg Cycle Time: ${metrics.changeOrders.avgCOCycleTime.toFixed(1)} days`, 25, yPos);
        yPos += 8;
      }

      if (reportConfig.includeResources) {
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('Resource Utilization', 20, yPos);
        yPos += 6;
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.text(`Assigned Resources: ${metrics.resources.assignedResources}`, 25, yPos);
        yPos += 5;
        doc.text(`Available Resources: ${metrics.resources.availableResources}`, 25, yPos);
        yPos += 5;
        doc.text(`Utilization Rate: ${metrics.resources.resourceUtilization.toFixed(1)}%`, 25, yPos);
        yPos += 10;
      }

      // Cost Variance Table
      if (reportConfig.includeFinancials && yPos < 250) {
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Cost Variance by Project', 20, yPos);
        yPos += 5;
        
        doc.autoTable({
          startY: yPos,
          head: [['Project', 'Budget', 'Forecast', 'Variance']],
          body: costVarianceChartData.map(d => [
            d.name,
            `$${d.budget.toFixed(0)}K`,
            `$${d.forecast.toFixed(0)}K`,
            `${d.variance >= 0 ? '+' : ''}$${d.variance.toFixed(0)}K`
          ]),
          theme: 'grid',
          headStyles: { fillColor: [59, 130, 246], textColor: 255 },
          styles: { fontSize: 8 }
        });
      }

      // Save PDF
      const filename = `Executive_Report_${format(new Date(), 'yyyy-MM-dd_HHmm')}.pdf`;
      doc.save(filename);
      toast.success('Report generated successfully');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF report');
    } finally {
      setGeneratingPDF(false);
    }
  };

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Executive Reports</h1>
            <p className="text-zinc-400 mt-1">Comprehensive project performance analytics</p>
          </div>
          <Button 
            onClick={generatePDF} 
            disabled={generatingPDF}
            className="bg-amber-500 hover:bg-amber-600 text-black font-bold"
          >
            <Download size={16} className="mr-2" />
            {generatingPDF ? 'Generating...' : 'Export PDF'}
          </Button>
        </div>

        {/* Filters */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label className="text-white mb-2 block">Select Projects (leave empty for all)</Label>
                <Select 
                  value={selectedProjects[0] || ''} 
                  onValueChange={(v) => setSelectedProjects(v ? [v] : [])}
                >
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
              
              <div className="space-y-3">
                <Label className="text-white mb-2 block">Report Sections</Label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(reportConfig).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <Checkbox
                        id={key}
                        checked={value}
                        onCheckedChange={(checked) => setReportConfig(prev => ({ ...prev, [key]: checked }))}
                        className="border-zinc-600"
                      />
                      <Label htmlFor={key} className="text-sm text-zinc-300 cursor-pointer">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^include/, '').trim()}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="text-blue-400" size={20} />
                <span className="text-xs text-zinc-400">Cost Variance</span>
              </div>
              <div className={`text-2xl font-bold ${metrics.financial.costVariance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {metrics.financial.costVariance >= 0 ? '+' : ''}${(metrics.financial.costVariance / 1000).toFixed(0)}K
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                {metrics.financial.costVariancePercent.toFixed(1)}% of budget
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle2 className="text-green-400" size={20} />
                <span className="text-xs text-zinc-400">SPI</span>
              </div>
              <div className="text-2xl font-bold text-green-400">
                {(metrics.schedule.schedulePerformanceIndex * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                Schedule Performance Index
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/10 border-amber-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Clock className="text-amber-400" size={20} />
                <span className="text-xs text-zinc-400">RFI Response</span>
              </div>
              <div className="text-2xl font-bold text-amber-400">
                {metrics.rfis.avgRFIResponseDays.toFixed(1)}
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                Avg days to respond
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <FileText className="text-purple-400" size={20} />
                <span className="text-xs text-zinc-400">CO Cycle Time</span>
              </div>
              <div className="text-2xl font-bold text-purple-400">
                {metrics.changeOrders.avgCOCycleTime.toFixed(1)}
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                Avg days to approve
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/10 border-cyan-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Activity className="text-cyan-400" size={20} />
                <span className="text-xs text-zinc-400">Utilization</span>
              </div>
              <div className="text-2xl font-bold text-cyan-400">
                {metrics.resources.resourceUtilization.toFixed(1)}%
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                Resource utilization
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="cost" className="space-y-4">
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="cost" className="data-[state=active]:bg-zinc-800">
              <BarChart3 size={16} className="mr-2" />
              Cost Analysis
            </TabsTrigger>
            <TabsTrigger value="schedule" className="data-[state=active]:bg-zinc-800">
              <Activity size={16} className="mr-2" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="rfi" className="data-[state=active]:bg-zinc-800">
              <PieChartIcon size={16} className="mr-2" />
              RFIs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cost" className="space-y-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Cost Variance by Project</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={costVarianceChartData} onClick={(e) => handleChartClick(e?.activePayload?.[0]?.payload, 'cost')}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
                    <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                      labelStyle={{ color: '#F3F4F6' }}
                    />
                    <Legend />
                    <Bar dataKey="budget" fill="#3B82F6" name="Budget ($K)" />
                    <Bar dataKey="forecast" fill="#10B981" name="Forecast ($K)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Schedule Progress by Project</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={scheduleProgressChartData} onClick={(e) => handleChartClick(e?.activePayload?.[0]?.payload, 'schedule')}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
                    <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                      labelStyle={{ color: '#F3F4F6' }}
                    />
                    <Legend />
                    <Bar dataKey="completed" stackId="a" fill="#10B981" name="Completed" />
                    <Bar dataKey="inProgress" stackId="a" fill="#3B82F6" name="In Progress" />
                    <Bar dataKey="notStarted" stackId="a" fill="#6B7280" name="Not Started" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rfi" className="space-y-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">RFI Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={rfiStatusChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {rfiStatusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                      labelStyle={{ color: '#F3F4F6' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Drill-down data table */}
        {drillDownData && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">
                  Drill-down: {drillDownData.projectName} - {drillDownData.type}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setDrillDownData(null)}>
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {drillDownData.type === 'cost' && (
                <div className="space-y-2">
                  {filteredData.workPackages
                    .filter(wp => wp.project_id === drillDownData.projectId)
                    .map(wp => (
                      <div key={wp.id} className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                        <div>
                          <div className="text-white font-semibold">{wp.title}</div>
                          <div className="text-xs text-zinc-400">{wp.wpid}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-white">${((wp.budget_at_award || 0) / 1000).toFixed(0)}K</div>
                          <div className={`text-xs ${(wp.forecast_at_completion || 0) > (wp.budget_at_award || 0) ? 'text-red-400' : 'text-green-400'}`}>
                            Forecast: ${((wp.forecast_at_completion || 0) / 1000).toFixed(0)}K
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
              
              {drillDownData.type === 'schedule' && (
                <div className="space-y-2">
                  {filteredData.tasks
                    .filter(t => t.project_id === drillDownData.projectId)
                    .slice(0, 20)
                    .map(task => (
                      <div key={task.id} className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                        <div>
                          <div className="text-white font-semibold">{task.name}</div>
                          <div className="text-xs text-zinc-400">{task.phase}</div>
                        </div>
                        <div className="text-right">
                          <div className={`text-xs px-2 py-1 rounded ${
                            task.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                            task.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-zinc-700 text-zinc-400'
                          }`}>
                            {task.status?.replace('_', ' ').toUpperCase()}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}