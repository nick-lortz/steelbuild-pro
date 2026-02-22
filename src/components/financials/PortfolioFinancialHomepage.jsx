import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, AlertCircle, DollarSign } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const formatCurrency = (value) => {
  if (value == null) return '$0.00';
  return Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    style: 'currency',
    currency: 'USD'
  });
};

export default function PortfolioFinancialHomepage({ projects = [], sovItems = [], expenses = [], changeOrders = [] }) {
  const metrics = useMemo(() => {
    const totalBaseContract = projects.reduce((sum, p) => sum + (p.contract_value || 0), 0);
    const approvedCOs = changeOrders
      .filter(co => co.status === 'approved')
      .reduce((sum, co) => sum + (co.cost_impact || 0), 0);
    const totalContract = totalBaseContract + approvedCOs;
    
    const earnedValue = sovItems.reduce((sum, sov) => {
      const earned = (sov.scheduled_value || 0) * ((sov.percent_complete || 0) / 100);
      return sum + earned;
    }, 0);

    const actualCost = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    
    const projectStats = projects.map(p => {
      const projectSov = sovItems.filter(s => s.project_id === p.id);
      const projectEarned = projectSov.reduce((sum, s) => sum + ((s.scheduled_value || 0) * ((s.percent_complete || 0) / 100)), 0);
      const projectExpenses = expenses.filter(e => e.project_id === p.id).reduce((sum, e) => sum + (e.amount || 0), 0);
      
      const baseContract = p.contract_value || 0;
      const projectCOs = changeOrders
        .filter(co => co.project_id === p.id && co.status === 'approved')
        .reduce((sum, co) => sum + (co.cost_impact || 0), 0);
      const projectTotal = baseContract + projectCOs;

      return {
        projectId: p.id,
        projectNumber: p.project_number,
        projectName: p.name,
        baseContract,
        totalContract: projectTotal,
        earnedValue: projectEarned,
        actualCost: projectExpenses,
        margin: projectTotal - projectExpenses,
        marginPercent: projectTotal > 0 ? ((projectTotal - projectExpenses) / projectTotal * 100) : 0,
        cpi: projectExpenses > 0 ? (projectEarned / projectExpenses) : 1
      };
    });

    return {
      totalBaseContract,
      totalContract,
      approvedCOs,
      earnedValue,
      actualCost,
      overallMargin: totalContract - actualCost,
      overallMarginPercent: totalContract > 0 ? ((totalContract - actualCost) / totalContract * 100) : 0,
      cpi: actualCost > 0 ? (earnedValue / actualCost) : 1,
      projectCount: projects.length,
      projectStats: projectStats.sort((a, b) => b.totalContract - a.totalContract)
    };
  }, [projects, sovItems, expenses, changeOrders]);

  // Chart data - top projects by contract value
  const topProjectsData = metrics.projectStats.slice(0, 5).map(p => ({
    name: `${p.projectNumber}`,
    budget: p.totalContract,
    actual: p.actualCost,
    earned: p.earnedValue
  }));

  // Margin distribution
  const marginData = metrics.projectStats.map(p => ({
    name: `${p.projectNumber}`,
    margin: p.margin,
    status: p.marginPercent >= 15 ? 'Healthy' : p.marginPercent >= 10 ? 'Caution' : 'Risk'
  }));

  const marginHealth = {
    healthy: marginData.filter(d => d.status === 'Healthy').length,
    caution: marginData.filter(d => d.status === 'Caution').length,
    risk: marginData.filter(d => d.status === 'Risk').length
  };

  const COLORS = {
    healthy: '#10B981',
    caution: '#FF9D42',
    risk: '#EF4444'
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-[rgba(255,255,255,0.05)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-[#9CA3AF] font-semibold">Total Portfolio Contract</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#FF9D42]">{formatCurrency(metrics.totalContract)}</div>
            <div className="text-xs text-[#6B7280] mt-1">{metrics.projectCount} active projects</div>
          </CardContent>
        </Card>

        <Card className="border-[rgba(255,255,255,0.05)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-[#9CA3AF] font-semibold">Actual Cost to Date</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#E5E7EB]">{formatCurrency(metrics.actualCost)}</div>
            <div className="text-xs text-[#6B7280] mt-1">{((metrics.actualCost / metrics.totalContract) * 100).toFixed(1)}% of contract</div>
          </CardContent>
        </Card>

        <Card className="border-[rgba(255,255,255,0.05)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-[#9CA3AF] font-semibold">Portfolio Margin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${metrics.overallMargin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatCurrency(metrics.overallMargin)}
            </div>
            <div className="text-xs text-[#6B7280] mt-1">{metrics.overallMarginPercent.toFixed(1)}% margin</div>
          </CardContent>
        </Card>

        <Card className="border-[rgba(255,255,255,0.05)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-[#9CA3AF] font-semibold">Cost Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${metrics.cpi >= 1 ? 'text-green-400' : 'text-red-400'}`}>
              {metrics.cpi.toFixed(2)}
            </div>
            <div className="text-xs text-[#6B7280] mt-1">CPI (Earned/Actual)</div>
          </CardContent>
        </Card>
      </div>

      {/* Margin Health Alert */}
      {marginHealth.risk > 0 && (
        <div className="p-4 bg-red-950/20 border border-red-900/30 rounded-lg flex items-start gap-3">
          <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-300 mb-1">Margin Risk Alert</p>
            <p className="text-xs text-[#9CA3AF]">{marginHealth.risk} project(s) at risk. Review profitability status.</p>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Projects Performance */}
        <Card className="border-[rgba(255,255,255,0.05)]">
          <CardHeader>
            <CardTitle className="text-base">Top 5 Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProjectsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid rgba(255,255,255,0.1)' }}
                  formatter={(value) => formatCurrency(value)}
                />
                <Legend />
                <Bar dataKey="budget" fill="#FF9D42" name="Budget" />
                <Bar dataKey="actual" fill="#EF4444" name="Actual" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Margin Health Distribution */}
        <Card className="border-[rgba(255,255,255,0.05)]">
          <CardHeader>
            <CardTitle className="text-base">Margin Health</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Healthy', value: marginHealth.healthy },
                    { name: 'Caution', value: marginHealth.caution },
                    { name: 'Risk', value: marginHealth.risk }
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill={COLORS.healthy} />
                  <Cell fill={COLORS.caution} />
                  <Cell fill={COLORS.risk} />
                </Pie>
                <Tooltip formatter={(value) => `${value}`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Project Summary Table */}
      <Card className="border-[rgba(255,255,255,0.05)]">
        <CardHeader>
          <CardTitle className="text-base">Project Financial Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.05)]">
                  <th className="text-left py-3 px-4 text-[#9CA3AF] font-semibold">Project</th>
                  <th className="text-right py-3 px-4 text-[#9CA3AF] font-semibold">Total Contract</th>
                  <th className="text-right py-3 px-4 text-[#9CA3AF] font-semibold">Actual Cost</th>
                  <th className="text-right py-3 px-4 text-[#9CA3AF] font-semibold">Margin</th>
                  <th className="text-right py-3 px-4 text-[#9CA3AF] font-semibold">Margin %</th>
                  <th className="text-right py-3 px-4 text-[#9CA3AF] font-semibold">CPI</th>
                </tr>
              </thead>
              <tbody>
                {metrics.projectStats.map((project, idx) => {
                  const marginStatus = project.marginPercent >= 15 ? 'Healthy' : project.marginPercent >= 10 ? 'Caution' : 'Risk';
                  const marginColor = marginStatus === 'Healthy' ? 'text-green-400' : marginStatus === 'Caution' ? 'text-amber-400' : 'text-red-400';
                  
                  return (
                    <tr key={idx} className="border-b border-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,157,66,0.02)] transition-colors">
                      <td className="py-3 px-4 text-[#E5E7EB]">
                        <div className="font-mono text-sm">{project.projectNumber}</div>
                        <div className="text-xs text-[#6B7280]">{project.projectName}</div>
                      </td>
                      <td className="py-3 px-4 text-right text-[#E5E7EB] font-mono">{formatCurrency(project.totalContract)}</td>
                      <td className="py-3 px-4 text-right text-[#E5E7EB] font-mono">{formatCurrency(project.actualCost)}</td>
                      <td className={`py-3 px-4 text-right font-mono font-semibold ${project.margin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatCurrency(project.margin)}
                      </td>
                      <td className={`py-3 px-4 text-right font-mono font-semibold ${marginColor}`}>
                        {project.marginPercent.toFixed(1)}%
                      </td>
                      <td className={`py-3 px-4 text-right font-mono font-semibold ${project.cpi >= 1 ? 'text-green-400' : 'text-red-400'}`}>
                        {project.cpi.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
                {metrics.projectStats.length === 0 && (
                  <tr>
                    <td colSpan="6" className="py-6 px-4 text-center text-[#6B7280]">
                      No projects available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}