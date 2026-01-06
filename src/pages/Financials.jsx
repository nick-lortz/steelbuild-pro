import React, { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Filter } from 'lucide-react';
import FinancialSummaryCards from '@/components/financials/FinancialSummaryCards';
import FinancialTrendChart from '@/components/financials/FinancialTrendChart';
import ProjectBreakdownList from '@/components/financials/ProjectBreakdownList';

export default function Financials() {
  const [projectFilter, setProjectFilter] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch portfolio metrics
  const { data: portfolioData, refetch: refetchPortfolio } = useQuery({
    queryKey: ['portfolio-metrics'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getPortfolioMetrics', {});
      return response.data;
    },
    staleTime: 5 * 60 * 1000
  });

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
    staleTime: 5 * 60 * 1000
  });

  // Fetch financials for project breakdown
  const { data: financials = [] } = useQuery({
    queryKey: ['financials'],
    queryFn: () => base44.entities.Financial.list(),
    staleTime: 5 * 60 * 1000
  });

  // Fetch expenses for actual costs
  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list(),
    staleTime: 5 * 60 * 1000
  });

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetchPortfolio();
    setIsRefreshing(false);
  }, [refetchPortfolio]);

  // Calculate project-level financial data
  const projectFinancials = useMemo(() => {
    return projects.map(project => {
      const projectFinancials = financials.filter(f => f.project_id === project.id);
      const projectExpenses = expenses.filter(e => e.project_id === project.id);

      const budget = projectFinancials.reduce((sum, f) => sum + (f.budget_amount || 0), 0);
      const committed = projectFinancials.reduce((sum, f) => sum + (f.committed_amount || 0), 0);
      const actual = projectExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

      return {
        ...project,
        budget_total: budget || project.contract_value || 0,
        committed_total: committed,
        actual_costs: actual
      };
    });
  }, [projects, financials, expenses]);

  // Filter projects
  const filteredProjects = useMemo(() => {
    if (projectFilter === 'all') return projectFinancials;
    return projectFinancials.filter(p => p.id === projectFilter);
  }, [projectFinancials, projectFilter]);

  // Calculate summary metrics for filtered projects
  const summaryMetrics = useMemo(() => {
    return filteredProjects.reduce((acc, project) => ({
      budget: acc.budget + project.budget_total,
      committed: acc.committed + project.committed_total,
      actual: acc.actual + project.actual_costs
    }), { budget: 0, committed: 0, actual: 0 });
  }, [filteredProjects]);

  const handleProjectClick = (project) => {
    window.location.href = `/ProjectDashboard?id=${project.id}`;
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Financials</h1>
          <p className="text-sm text-muted-foreground">
            {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={18} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
          </Button>
        </div>
      </div>

      {/* Project Filter */}
      {showFilters && (
        <div className="mb-4">
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.project_number} - {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Summary Cards */}
      <div className="mb-4">
        <FinancialSummaryCards metrics={summaryMetrics} />
      </div>

      {/* Trend Chart */}
      {portfolioData?.financial_trends && (
        <div className="mb-4">
          <FinancialTrendChart data={portfolioData.financial_trends} />
        </div>
      )}

      {/* Project Breakdown */}
      <div className="mb-4">
        <h2 className="text-sm font-semibold mb-3">Project Breakdown</h2>
        <ProjectBreakdownList 
          projects={filteredProjects}
          onProjectClick={handleProjectClick}
        />
      </div>
    </div>
  );
}