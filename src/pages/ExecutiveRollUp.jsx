import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';
import { cn } from '@/lib/utils';

export default function ExecutiveRollUp() {
  const navigate = useNavigate();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => apiClient.auth.me()
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiClient.entities.Project.filter({ 
      status: ['awarded', 'in_progress'] 
    })
  });

  const { data: allSOVItems = [] } = useQuery({
    queryKey: ['all-sov-items'],
    queryFn: () => apiClient.entities.SOVItem.list()
  });

  const { data: allExpenses = [] } = useQuery({
    queryKey: ['all-expenses'],
    queryFn: () => apiClient.entities.Expense.filter({
      payment_status: ['paid', 'approved']
    })
  });

  const { data: allChangeOrders = [] } = useQuery({
    queryKey: ['all-change-orders'],
    queryFn: () => apiClient.entities.ChangeOrder.list()
  });

  const { data: allEstimatedCosts = [] } = useQuery({
    queryKey: ['all-etc'],
    queryFn: () => apiClient.entities.EstimatedCostToComplete.list()
  });

  const { data: allMappings = [] } = useQuery({
    queryKey: ['all-mappings'],
    queryFn: () => apiClient.entities.SOVCostCodeMap.list()
  });

  // Calculate project-level financials and risk
  const projectSummaries = useMemo(() => {
    return projects.map(project => {
      const projectSOV = allSOVItems.filter(s => s.project_id === project.id);
      const projectExpenses = allExpenses.filter(e => e.project_id === project.id);
      const projectCOs = allChangeOrders.filter(co => co.project_id === project.id);
      const projectETC = allEstimatedCosts.filter(etc => etc.project_id === project.id);
      const projectMappings = allMappings.filter(m => m.project_id === project.id);

      const contractValue = projectSOV.reduce((sum, s) => sum + (s.scheduled_value || 0), 0);
      const approvedCOs = projectCOs.filter(co => co.status === 'approved');
      const approvedCOsValue = approvedCOs.reduce((sum, co) => sum + (co.cost_impact || 0), 0);
      const totalContract = contractValue + approvedCOsValue;

      const earnedToDate = projectSOV.reduce((sum, s) => 
        sum + ((s.scheduled_value || 0) * ((s.percent_complete || 0) / 100)), 0);
      
      const actualCost = projectExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      
      const totalETC = projectETC.reduce((sum, etc) => sum + (etc.estimated_remaining_cost || 0), 0);
      const estimatedCostAtCompletion = actualCost + totalETC;

      const projectedProfit = totalContract - estimatedCostAtCompletion;
      const projectedMarginPercent = totalContract > 0 ? (projectedProfit / totalContract) * 100 : 0;

      // Risk determination (same logic as CostRiskIndicator)
      const plannedMargin = project.planned_margin || 15;
      const marginVariance = projectedMarginPercent - plannedMargin;
      
      let riskStatus, riskIcon, riskColor;
      if (marginVariance >= -2) {
        riskStatus = 'Green';
        riskIcon = CheckCircle;
        riskColor = 'text-green-400';
      } else if (marginVariance >= -5) {
        riskStatus = 'Yellow';
        riskIcon = AlertCircle;
        riskColor = 'text-amber-400';
      } else {
        riskStatus = 'Red';
        riskIcon = AlertTriangle;
        riskColor = 'text-red-400';
      }

      // Identify largest risk driver
      const drivers = [];
      projectSOV.forEach(sov => {
        const sovEarned = (sov.scheduled_value || 0) * ((sov.percent_complete || 0) / 100);
        const sovMappings = projectMappings.filter(m => m.sov_item_id === sov.id);
        
        const costCodeBreakdown = sovMappings.map(mapping => {
          const ccExpenses = projectExpenses.filter(e => e.cost_code_id === mapping.cost_code_id);
          const ccActual = ccExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
          return ccActual * (mapping.allocation_percent / 100);
        });

        const unmappedExpenses = projectExpenses.filter(e => 
          e.sov_code === sov.sov_code &&
          !sovMappings.find(m => m.cost_code_id === e.cost_code_id)
        );
        const unmappedCost = unmappedExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const sovActualCost = costCodeBreakdown.reduce((sum, c) => sum + c, 0) + unmappedCost;

        const variance = sovEarned - sovActualCost;
        const variancePercent = sovEarned > 0 ? (variance / sovEarned) * 100 : 0;

        if ((variancePercent < -5 || variance < -5000) && sovEarned > 0) {
          drivers.push({
            description: `${sov.sov_code}: $${Math.abs(variance).toLocaleString()} over`,
            variance_amount: Math.abs(variance)
          });
        }
      });

      drivers.sort((a, b) => b.variance_amount - a.variance_amount);
      const largestDriver = drivers[0]?.description || 'No major variances';

      return {
        project,
        contractValue: totalContract,
        earnedToDate,
        actualCost,
        projectedProfit,
        projectedMarginPercent,
        riskStatus,
        riskIcon,
        riskColor,
        largestDriver,
        marginVariance
      };
    });
  }, [projects, allSOVItems, allExpenses, allChangeOrders, allEstimatedCosts, allMappings]);

  // Aggregate totals
  const aggregates = useMemo(() => {
    const totalContract = projectSummaries.reduce((sum, p) => sum + p.contractValue, 0);
    const totalEarned = projectSummaries.reduce((sum, p) => sum + p.earnedToDate, 0);
    const totalBilled = projectSummaries.reduce((sum, p) => {
      const projectSOV = allSOVItems.filter(s => s.project_id === p.project.id);
      return sum + projectSOV.reduce((s, sov) => s + (sov.billed_to_date || 0), 0);
    }, 0);
    const totalCost = projectSummaries.reduce((sum, p) => sum + p.actualCost, 0);
    const totalProfit = projectSummaries.reduce((sum, p) => sum + p.projectedProfit, 0);
    const totalMarginPercent = totalContract > 0 ? (totalProfit / totalContract) * 100 : 0;

    const riskCounts = {
      red: projectSummaries.filter(p => p.riskStatus === 'Red').length,
      yellow: projectSummaries.filter(p => p.riskStatus === 'Yellow').length,
      green: projectSummaries.filter(p => p.riskStatus === 'Green').length
    };

    return {
      totalContract,
      totalEarned,
      totalBilled,
      totalCost,
      totalProfit,
      totalMarginPercent,
      riskCounts
    };
  }, [projectSummaries, allSOVItems]);

  // Sort: Red first, then Yellow, then Green, then by margin variance
  const sortedProjects = useMemo(() => {
    return [...projectSummaries].sort((a, b) => {
      const statusOrder = { Red: 0, Yellow: 1, Green: 2 };
      const statusDiff = statusOrder[a.riskStatus] - statusOrder[b.riskStatus];
      if (statusDiff !== 0) return statusDiff;
      return a.marginVariance - b.marginVariance;
    });
  }, [projectSummaries]);

  const handleProjectClick = (summary) => {
    navigate(createPageUrl('JobStatusReport') + `?project=${summary.project.id}`);
  };

  // Access control
  if (currentUser && currentUser.role !== 'admin') {
    return (
      <div>
        <PageHeader title="Executive Financial Roll-Up" subtitle="Portfolio health overview" />
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle size={48} className="mx-auto mb-4 text-amber-400" />
            <p className="text-muted-foreground">This dashboard is restricted to executives and administrators.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const columns = [
    {
      header: 'Project',
      accessor: 'project',
      render: (row) => (
        <div>
          <div className="font-semibold">{row.project.name}</div>
          <div className="text-xs text-muted-foreground">{row.project.project_number}</div>
        </div>
      )
    },
    {
      header: 'Contract Value',
      accessor: 'contractValue',
      render: (row) => <span className="font-semibold">${row.contractValue.toLocaleString()}</span>
    },
    {
      header: 'Projected Margin',
      accessor: 'projectedProfit',
      render: (row) => (
        <div>
          <div className={cn('font-semibold', row.projectedProfit >= 0 ? 'text-green-400' : 'text-red-400')}>
            ${row.projectedProfit.toLocaleString()}
          </div>
          <div className={cn('text-xs', row.projectedProfit >= 0 ? 'text-green-400' : 'text-red-400')}>
            {row.projectedMarginPercent.toFixed(1)}%
          </div>
        </div>
      )
    },
    {
      header: 'Risk',
      accessor: 'riskStatus',
      render: (row) => {
        const Icon = row.riskIcon;
        return (
          <div className="flex items-center gap-2">
            <Icon size={16} className={row.riskColor} />
            <span className={cn('font-semibold', row.riskColor)}>{row.riskStatus}</span>
          </div>
        );
      }
    },
    {
      header: 'Largest Risk Driver',
      accessor: 'largestDriver',
      render: (row) => <span className="text-sm text-muted-foreground">{row.largestDriver}</span>
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Executive Financial Roll-Up" 
        subtitle="Portfolio health across all active projects"
      />

      {/* Aggregate Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <DollarSign size={14} className="text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">Total Contract</p>
            <p className="text-lg font-bold">${aggregates.totalContract.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <TrendingUp size={14} className="text-green-400" />
            </div>
            <p className="text-xs text-muted-foreground">Total Earned</p>
            <p className="text-lg font-bold text-green-400">${aggregates.totalEarned.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <DollarSign size={14} className="text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">Total Billed</p>
            <p className="text-lg font-bold">${aggregates.totalBilled.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <TrendingUp size={14} className="text-red-400" />
            </div>
            <p className="text-xs text-muted-foreground">Total Cost</p>
            <p className="text-lg font-bold text-red-400">${aggregates.totalCost.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className={aggregates.totalProfit >= 0 ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <TrendingUp size={14} className={aggregates.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'} />
            </div>
            <p className="text-xs text-muted-foreground">Aggregate Margin</p>
            <p className={cn('text-lg font-bold', aggregates.totalProfit >= 0 ? 'text-green-400' : 'text-red-400')}>
              ${aggregates.totalProfit.toLocaleString()}
            </p>
            <p className={cn('text-xs', aggregates.totalProfit >= 0 ? 'text-green-400' : 'text-red-400')}>
              {aggregates.totalMarginPercent.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Risk Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Portfolio Risk Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-400" />
              <span className="text-sm text-muted-foreground">Red:</span>
              <span className="text-lg font-bold text-red-400">{aggregates.riskCounts.red}</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-amber-400" />
              <span className="text-sm text-muted-foreground">Yellow:</span>
              <span className="text-lg font-bold text-amber-400">{aggregates.riskCounts.yellow}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-green-400" />
              <span className="text-sm text-muted-foreground">Green:</span>
              <span className="text-lg font-bold text-green-400">{aggregates.riskCounts.green}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Project Risk Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project Risk Overview</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Click any project to view detailed Job Status Report</p>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={sortedProjects}
            onRowClick={handleProjectClick}
            emptyMessage="No active projects"
          />
        </CardContent>
      </Card>
    </div>
  );
}