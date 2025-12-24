import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Building2, 
  DollarSign, 
  FileText, 
  MessageSquareWarning, 
  FileCheck,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock
} from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import { format } from 'date-fns';

function StatCard({ title, value, icon: Icon, trend, trendValue, variant = "default" }) {
  const bgColors = {
    default: "bg-zinc-900 border-zinc-800",
    amber: "bg-amber-500/5 border-amber-500/20",
    green: "bg-green-500/5 border-green-500/20",
    red: "bg-red-500/5 border-red-500/20",
  };
  
  return (
    <Card className={`${bgColors[variant]} border`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-zinc-400 text-sm font-medium">{title}</p>
            <p className="text-2xl font-bold text-white mt-1">{value}</p>
            {trend && (
              <div className={`flex items-center gap-1 mt-2 text-sm ${
                trend === 'up' ? 'text-green-400' : 'text-red-400'
              }`}>
                {trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {trendValue}
              </div>
            )}
          </div>
          <div className="p-2.5 bg-zinc-800 rounded-lg">
            <Icon size={20} className="text-amber-500" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date'),
  });

  const { data: rfis = [] } = useQuery({
    queryKey: ['rfis'],
    queryFn: () => base44.entities.RFI.list('-created_date'),
  });

  const { data: changeOrders = [] } = useQuery({
    queryKey: ['changeOrders'],
    queryFn: () => base44.entities.ChangeOrder.list('-created_date'),
  });

  const { data: financials = [] } = useQuery({
    queryKey: ['financials'],
    queryFn: () => base44.entities.Financial.list(),
  });

  const { data: drawings = [] } = useQuery({
    queryKey: ['drawings'],
    queryFn: () => base44.entities.DrawingSet.list('-created_date'),
  });

  const activeProjects = projects.filter(p => p.status === 'in_progress');
  const pendingRFIs = rfis.filter(r => r.status === 'pending' || r.status === 'submitted');
  const pendingCOs = changeOrders.filter(co => co.status === 'pending' || co.status === 'submitted');
  
  const totalBudget = financials.reduce((sum, f) => sum + (f.budget_amount || 0), 0);
  const totalActual = financials.reduce((sum, f) => sum + (f.actual_amount || 0), 0);
  const budgetVariance = totalBudget - totalActual;

  const overdueDocs = drawings.filter(d => {
    if (!d.due_date) return false;
    return new Date(d.due_date) < new Date() && d.status !== 'FFF' && d.status !== 'As-Built';
  });

  return (
    <div>
      <PageHeader 
        title="Dashboard" 
        subtitle="Overview of all active projects and key metrics"
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Active Projects"
          value={activeProjects.length}
          icon={Building2}
        />
        <StatCard
          title="Open RFIs"
          value={pendingRFIs.length}
          icon={MessageSquareWarning}
          variant={pendingRFIs.length > 5 ? "amber" : "default"}
        />
        <StatCard
          title="Pending Change Orders"
          value={pendingCOs.length}
          icon={FileCheck}
          variant={pendingCOs.length > 3 ? "amber" : "default"}
        />
        <StatCard
          title="Budget Variance"
          value={`$${Math.abs(budgetVariance).toLocaleString()}`}
          icon={DollarSign}
          trend={budgetVariance >= 0 ? 'up' : 'down'}
          trendValue={budgetVariance >= 0 ? 'Under budget' : 'Over budget'}
          variant={budgetVariance >= 0 ? "green" : "red"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Projects */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="border-b border-zinc-800 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-white">Active Projects</CardTitle>
              <Link 
                to={createPageUrl('Projects')} 
                className="text-sm text-amber-500 hover:text-amber-400"
              >
                View all →
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {activeProjects.length === 0 ? (
              <div className="p-6 text-center text-zinc-500">No active projects</div>
            ) : (
              <div className="divide-y divide-zinc-800">
                {activeProjects.slice(0, 5).map((project) => (
                  <Link 
                    key={project.id}
                    to={createPageUrl(`Projects?id=${project.id}`)}
                    className="flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-white">{project.name}</p>
                      <p className="text-sm text-zinc-400">{project.project_number} • {project.client}</p>
                    </div>
                    <StatusBadge status={project.status} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending RFIs */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="border-b border-zinc-800 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-white">Pending RFIs</CardTitle>
              <Link 
                to={createPageUrl('RFIs')} 
                className="text-sm text-amber-500 hover:text-amber-400"
              >
                View all →
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {pendingRFIs.length === 0 ? (
              <div className="p-6 text-center text-zinc-500">No pending RFIs</div>
            ) : (
              <div className="divide-y divide-zinc-800">
                {pendingRFIs.slice(0, 5).map((rfi) => {
                  const project = projects.find(p => p.id === rfi.project_id);
                  return (
                    <Link 
                      key={rfi.id}
                      to={createPageUrl(`RFIs?id=${rfi.id}`)}
                      className="flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-white">RFI-{String(rfi.rfi_number).padStart(3, '0')}</p>
                        <p className="text-sm text-zinc-400 line-clamp-1">{rfi.subject}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={rfi.priority} />
                        {rfi.due_date && (
                          <span className="text-xs text-zinc-500">
                            {format(new Date(rfi.due_date), 'MMM d')}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Overdue Drawings */}
        {overdueDocs.length > 0 && (
          <Card className="bg-red-500/5 border-red-500/20">
            <CardHeader className="border-b border-red-500/20 pb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="text-red-500" size={18} />
                <CardTitle className="text-lg font-semibold text-white">Overdue Drawings</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-red-500/10">
                {overdueDocs.slice(0, 5).map((drawing) => {
                  const project = projects.find(p => p.id === drawing.project_id);
                  return (
                    <div key={drawing.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-white">{drawing.set_name}</p>
                          <p className="text-sm text-zinc-400">{project?.name || 'Unknown Project'}</p>
                        </div>
                        <div className="text-right">
                          <StatusBadge status={drawing.status} />
                          <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                            <Clock size={12} />
                            Due: {format(new Date(drawing.due_date), 'MMM d')}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Change Orders */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="border-b border-zinc-800 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-white">Recent Change Orders</CardTitle>
              <Link 
                to={createPageUrl('ChangeOrders')} 
                className="text-sm text-amber-500 hover:text-amber-400"
              >
                View all →
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {changeOrders.length === 0 ? (
              <div className="p-6 text-center text-zinc-500">No change orders</div>
            ) : (
              <div className="divide-y divide-zinc-800">
                {changeOrders.slice(0, 5).map((co) => {
                  const project = projects.find(p => p.id === co.project_id);
                  return (
                    <Link 
                      key={co.id}
                      to={createPageUrl(`ChangeOrders?id=${co.id}`)}
                      className="flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-white">CO-{String(co.co_number).padStart(3, '0')}</p>
                        <p className="text-sm text-zinc-400 line-clamp-1">{co.title}</p>
                      </div>
                      <div className="text-right">
                        <StatusBadge status={co.status} />
                        <p className={`text-sm mt-1 ${co.cost_impact >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {co.cost_impact >= 0 ? '+' : ''}${co.cost_impact?.toLocaleString() || 0}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}