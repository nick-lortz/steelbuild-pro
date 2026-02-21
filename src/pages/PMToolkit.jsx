import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  CheckCircle2, 
  FileText, 
  DollarSign, 
  Truck, 
  Users, 
  TrendingUp,
  ArrowRight,
  AlertCircle,
  Mail
} from 'lucide-react';

export default function PMToolkit() {
  const { activeProjectId } = useActiveProject();

  const { data: project } = useQuery({
    queryKey: ['project', activeProjectId],
    queryFn: () => base44.entities.Project.filter({ id: activeProjectId }),
    enabled: !!activeProjectId,
    select: (data) => data[0]
  });

  const { data: checklistItems = [] } = useQuery({
    queryKey: ['checklistItems', activeProjectId],
    queryFn: () => base44.entities.ProjectChecklistItem.filter({ project_id: activeProjectId, category: 'job_setup' }),
    enabled: !!activeProjectId
  });

  const { data: scopeRef } = useQuery({
    queryKey: ['scopeReference', activeProjectId],
    queryFn: () => base44.entities.ScopeReference.filter({ project_id: activeProjectId, is_current: true }),
    enabled: !!activeProjectId,
    select: (data) => data[0]
  });

  const { data: changeOrders = [] } = useQuery({
    queryKey: ['changeOrders', activeProjectId],
    queryFn: () => base44.entities.ChangeOrder.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId
  });

  const { data: coLineItems = [] } = useQuery({
    queryKey: ['coLineItems', activeProjectId],
    queryFn: () => base44.entities.ChangeOrderLineItem.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId
  });

  const { data: shippingRecords = [] } = useQuery({
    queryKey: ['shippingRecords', activeProjectId],
    queryFn: () => base44.entities.ShippingCostRecord.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId
  });

  const { data: travelRecords = [] } = useQuery({
    queryKey: ['travelRecords', activeProjectId],
    queryFn: () => base44.entities.TravelCostRecord.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['projectContacts', activeProjectId],
    queryFn: () => base44.entities.ProjectContact.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId
  });

  const { data: rfis = [] } = useQuery({
    queryKey: ['rfis', activeProjectId],
    queryFn: () => base44.entities.RFI.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId
  });

  // Calculations
  const completedChecklist = checklistItems.filter(i => i.status === 'completed').length;
  const totalChecklist = checklistItems.length;
  const checklistProgress = totalChecklist > 0 ? Math.round((completedChecklist / totalChecklist) * 100) : 0;

  const totalCOValue = changeOrders.reduce((sum, co) => {
    const items = coLineItems.filter(li => li.change_order_id === co.id);
    const credits = items.filter(i => i.type === 'credit').reduce((s, i) => s + (i.price || 0), 0);
    const charges = items.filter(i => i.type === 'charge').reduce((s, i) => s + (i.price || 0), 0);
    return sum + (charges - credits);
  }, 0);

  const approvedCOs = changeOrders.filter(co => co.status === 'approved').length;
  const pendingCOs = changeOrders.filter(co => ['draft', 'submitted', 'under_review'].includes(co.status)).length;

  const totalShippingCost = shippingRecords.reduce((sum, r) => sum + (r.total_cost || 0), 0);
  const totalTravelCost = travelRecords.reduce((sum, r) => sum + (r.total_cost || 0), 0);

  const openRFIs = rfis.filter(r => !['closed', 'answered'].includes(r.status)).length;
  const hasScope = !!scopeRef?.scope_letter_url || (scopeRef?.furnished_installed?.length > 0);

  if (!activeProjectId) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            Select a project to access PM Toolkit
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#E5E7EB]">PM Toolkit</h1>
        <p className="text-sm text-[#9CA3AF] mt-1">{project?.project_number} • Job Folder & Estimating Tools</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-[#6B7280]">Job Setup</p>
            <p className="text-2xl font-bold text-[#FF9D42]">{checklistProgress}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-[#6B7280]">Total COs</p>
            <p className="text-2xl font-bold">{changeOrders.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-[#6B7280]">Open RFIs</p>
            <p className="text-2xl font-bold text-yellow-500">{openRFIs}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-[#6B7280]">Contacts</p>
            <p className="text-2xl font-bold">{contacts.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Modules */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Job Setup */}
        <Card className="hover:border-[rgba(255,157,66,0.3)] transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#FF9D42]" />
              Job Setup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#9CA3AF]">Checklist Progress</p>
                <p className="text-xl font-bold">{completedChecklist} of {totalChecklist} completed</p>
              </div>
              <Badge className="text-lg px-3 py-1">{checklistProgress}%</Badge>
            </div>
            <Link to={createPageUrl('PMJobSetup')}>
              <Button variant="outline" className="w-full">
                View Checklist <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Scope & Exclusions */}
        <Card className="hover:border-[rgba(255,157,66,0.3)] transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#FF9D42]" />
              Scope & Exclusions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-[#9CA3AF]">Scope Letter Status</p>
              {hasScope ? (
                <Badge variant="success" className="mt-2">Configured</Badge>
              ) : (
                <Badge variant="destructive" className="mt-2">Not Set</Badge>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-[#6B7280]">
              <div>Scope Items: {scopeRef?.furnished_installed?.length || 0}</div>
              <div>Exclusions: {scopeRef?.exclusions?.length || 0}</div>
            </div>
            <Link to={createPageUrl('PMScopeExclusions')}>
              <Button variant="outline" className="w-full">
                Manage Scope <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Change Orders */}
        <Card className="hover:border-[rgba(255,157,66,0.3)] transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-[#FF9D42]" />
              Change Orders
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-[#6B7280]">Total COs</p>
                <p className="text-xl font-bold">{changeOrders.length}</p>
              </div>
              <div>
                <p className="text-xs text-[#6B7280]">Net Value</p>
                <p className="text-xl font-bold text-[#FF9D42]">${(totalCOValue / 1000).toFixed(0)}K</p>
              </div>
              <div>
                <p className="text-xs text-[#6B7280]">Approved</p>
                <p className="text-lg font-semibold text-green-500">{approvedCOs}</p>
              </div>
              <div>
                <p className="text-xs text-[#6B7280]">Pending</p>
                <p className="text-lg font-semibold text-yellow-500">{pendingCOs}</p>
              </div>
            </div>
            <Link to={createPageUrl('PMChangeOrders')}>
              <Button variant="outline" className="w-full">
                Manage COs <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Shipping & Travel */}
        <Card className="hover:border-[rgba(255,157,66,0.3)] transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-[#FF9D42]" />
              Shipping & Travel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-[#6B7280]">Shipping Cost</p>
                <p className="text-lg font-bold">${(totalShippingCost / 1000).toFixed(1)}K</p>
              </div>
              <div>
                <p className="text-xs text-[#6B7280]">Travel Cost</p>
                <p className="text-lg font-bold">${(totalTravelCost / 1000).toFixed(1)}K</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-[#6B7280]">Combined Total</p>
                <p className="text-xl font-bold text-[#FF9D42]">${((totalShippingCost + totalTravelCost) / 1000).toFixed(1)}K</p>
              </div>
            </div>
            <Link to={createPageUrl('PMShippingTravel')}>
              <Button variant="outline" className="w-full">
                Open Calculators <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Contacts */}
        <Card className="hover:border-[rgba(255,157,66,0.3)] transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#FF9D42]" />
              Contacts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-[#9CA3AF]">Project Contacts</p>
              <p className="text-2xl font-bold">{contacts.length}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-[#6B7280]">GC: {contacts.filter(c => c.tags?.includes('gc')).length}</div>
              <div className="text-[#6B7280]">Engineer: {contacts.filter(c => c.tags?.includes('engineer')).length}</div>
            </div>
            <Link to={createPageUrl('PMContacts')}>
              <Button variant="outline" className="w-full">
                View Directory <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Status Snapshot */}
        <Card className="hover:border-[rgba(255,157,66,0.3)] transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#FF9D42]" />
              Status Snapshot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[#9CA3AF]">PM:</span>
                <span className="font-medium">{project?.project_manager || 'Unassigned'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#9CA3AF]">Total CO Value:</span>
                <span className="font-bold text-[#FF9D42]">${(totalCOValue / 1000).toFixed(0)}K</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#9CA3AF]">Open RFIs:</span>
                <span className={openRFIs > 0 ? 'text-yellow-500 font-semibold' : ''}>{openRFIs}</span>
              </div>
            </div>
            <Link to={createPageUrl('PMReports')}>
              <Button variant="outline" className="w-full">
                View Reports <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Alert Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {!hasScope && (
          <Card className="border-yellow-500/30 bg-yellow-500/5">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-yellow-500">Scope Not Configured</p>
                <p className="text-sm text-[#9CA3AF] mt-1">Upload scope letter to anchor CO justifications</p>
                <Link to={createPageUrl('PMScopeExclusions')}>
                  <Button variant="outline" size="sm" className="mt-2">Configure Now</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {totalChecklist > 0 && completedChecklist < totalChecklist && (
          <Card className="border-blue-500/30 bg-blue-500/5">
            <CardContent className="p-4 flex items-start gap-3">
              <Mail className="w-5 h-5 text-blue-500 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-blue-500">Job Setup Incomplete</p>
                <p className="text-sm text-[#9CA3AF] mt-1">{totalChecklist - completedChecklist} tasks remaining</p>
                <Link to={createPageUrl('PMJobSetup')}>
                  <Button variant="outline" size="sm" className="mt-2">Complete Setup</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}