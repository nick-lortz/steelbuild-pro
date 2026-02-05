import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, TrendingUp, AlertCircle, CheckCircle, Clock, DollarSign, Plus } from 'lucide-react';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { DataTable } from '@/components/ui/DataTable';

export default function Contracts() {
  const { activeProjectId } = useActiveProject();
  const queryClient = useQueryClient();

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
    initialData: []
  });

  const { data: changeOrders } = useQuery({
    queryKey: ['change-orders', activeProjectId],
    queryFn: () => base44.entities.ChangeOrder.filter(
      activeProjectId ? { project_id: activeProjectId } : {}
    ),
    initialData: []
  });

  const filteredProjects = activeProjectId 
    ? projects.filter(p => p.id === activeProjectId)
    : projects;

  // Calculate KPIs
  const totalContractValue = filteredProjects.reduce((sum, p) => sum + (p.contract_value || 0), 0);
  const totalApprovedCOs = changeOrders.filter(co => co.status === 'approved').length;
  const totalCOValue = changeOrders
    .filter(co => co.status === 'approved')
    .reduce((sum, co) => sum + (co.cost_impact || 0), 0);
  const revisedContractValue = totalContractValue + totalCOValue;
  const pendingCOs = changeOrders.filter(co => ['submitted', 'under_review'].includes(co.status)).length;
  const avgCOProcessingDays = changeOrders
    .filter(co => co.approved_date && co.submitted_date)
    .reduce((sum, co) => {
      const days = Math.ceil((new Date(co.approved_date) - new Date(co.submitted_date)) / (1000 * 60 * 60 * 24));
      return sum + days;
    }, 0) / (changeOrders.filter(co => co.approved_date).length || 1);

  const contractColumns = [
    {
      accessorKey: 'project_number',
      header: 'Project #'
    },
    {
      accessorKey: 'name',
      header: 'Project Name'
    },
    {
      accessorKey: 'client',
      header: 'Client'
    },
    {
      accessorKey: 'contract_value',
      header: 'Original Value',
      cell: ({ row }) => `$${(row.original.contract_value || 0).toLocaleString()}`
    },
    {
      id: 'co_value',
      header: 'CO Value',
      cell: ({ row }) => {
        const projectCOs = changeOrders.filter(co => 
          co.project_id === row.original.id && co.status === 'approved'
        );
        const coValue = projectCOs.reduce((sum, co) => sum + (co.cost_impact || 0), 0);
        return (
          <span className={coValue > 0 ? 'text-green-500' : coValue < 0 ? 'text-red-500' : ''}>
            ${Math.abs(coValue).toLocaleString()}
          </span>
        );
      }
    },
    {
      id: 'revised_value',
      header: 'Revised Value',
      cell: ({ row }) => {
        const projectCOs = changeOrders.filter(co => 
          co.project_id === row.original.id && co.status === 'approved'
        );
        const coValue = projectCOs.reduce((sum, co) => sum + (co.cost_impact || 0), 0);
        const revised = (row.original.contract_value || 0) + coValue;
        return `$${revised.toLocaleString()}`;
      }
    },
    {
      id: 'pending_cos',
      header: 'Pending COs',
      cell: ({ row }) => {
        const pending = changeOrders.filter(co => 
          co.project_id === row.original.id && 
          ['submitted', 'under_review'].includes(co.status)
        ).length;
        return (
          <Badge variant={pending > 0 ? 'default' : 'outline'}>
            {pending}
          </Badge>
        );
      }
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const statusColors = {
          bidding: 'bg-yellow-500/20 text-yellow-400',
          awarded: 'bg-blue-500/20 text-blue-400',
          in_progress: 'bg-green-500/20 text-green-400',
          on_hold: 'bg-red-500/20 text-red-400',
          completed: 'bg-zinc-500/20 text-zinc-400',
          closed: 'bg-zinc-700/20 text-zinc-500'
        };
        return (
          <Badge className={statusColors[row.original.status]}>
            {row.original.status.replace('_', ' ')}
          </Badge>
        );
      }
    }
  ];

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600/10 via-zinc-900/50 to-blue-600/5 border border-blue-500/20 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-500 flex items-center justify-center shadow-2xl shadow-blue-500/30">
              <FileText className="w-7 h-7 text-black" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Contracts & Contract Reviews</h1>
              <p className="text-zinc-400 font-medium mt-1">Contract values, change orders, and compliance tracking</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Original Contract Value</p>
                <p className="text-2xl font-bold text-white mt-1">${(totalContractValue / 1000000).toFixed(2)}M</p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Revised Contract Value</p>
                <p className="text-2xl font-bold text-green-500 mt-1">${(revisedContractValue / 1000000).toFixed(2)}M</p>
                <p className="text-xs text-zinc-500 mt-1">
                  +${((revisedContractValue - totalContractValue) / 1000).toFixed(0)}k
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Approved Change Orders</p>
                <p className="text-2xl font-bold text-white mt-1">{totalApprovedCOs}</p>
                <p className="text-xs text-zinc-500 mt-1">
                  ${(totalCOValue / 1000).toFixed(0)}k total
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Pending COs</p>
                <p className="text-2xl font-bold text-amber-500 mt-1">{pendingCOs}</p>
                <p className="text-xs text-zinc-500 mt-1">
                  {avgCOProcessingDays.toFixed(0)} days avg
                </p>
              </div>
              <Clock className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wide">CO Growth Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">
              {((totalCOValue / totalContractValue) * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-zinc-500 mt-2">Change order value vs original contract</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wide">CO Approval Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">
              {((totalApprovedCOs / (changeOrders.length || 1)) * 100).toFixed(0)}%
            </p>
            <p className="text-xs text-zinc-500 mt-2">
              {totalApprovedCOs} of {changeOrders.length} submitted
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wide">Avg Processing Time</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">
              {avgCOProcessingDays.toFixed(0)} days
            </p>
            <p className="text-xs text-zinc-500 mt-2">Submission to approval</p>
          </CardContent>
        </Card>
      </div>

      {/* Contract Table */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wide">Contract Summary by Project</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={contractColumns}
            data={filteredProjects}
          />
        </CardContent>
      </Card>
    </div>
  );
}