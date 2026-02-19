import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, TrendingUp, TrendingDown, DollarSign, Clock, AlertTriangle, Edit, Trash2, Eye, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/components/ui/notifications';
import ChangeOrderForm from '@/components/change-orders/ChangeOrderForm';
import ChangeOrderDetail from '@/components/change-orders/ChangeOrderDetail';

export default function ChangeOrders() {
  const [showForm, setShowForm] = useState(false);
  const [editingCO, setEditingCO] = useState(null);
  const [viewingCO, setViewingCO] = useState(null);
  const [deleteCO, setDeleteCO] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: Infinity
  });

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
    staleTime: 5 * 60 * 1000
  });

  const { data: changeOrders = [], isLoading: cosLoading, refetch } = useQuery({
    queryKey: ['changeOrders'],
    queryFn: () => base44.entities.ChangeOrder.list('-created_date'),
    staleTime: 2 * 60 * 1000
  });

  // Real-time subscription
  React.useEffect(() => {
    const unsubscribe = base44.entities.ChangeOrder.subscribe((event) => {
      queryClient.invalidateQueries({ queryKey: ['changeOrders'] });
      if (event.type === 'create') {
        toast.success(`CO-${event.data.co_number} created`);
      } else if (event.type === 'update') {
        toast.info(`CO-${event.data.co_number} updated`);
      }
    });
    return unsubscribe;
  }, [queryClient]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      const result = await base44.entities.ChangeOrder.create({
        ...data,
        version: 1,
        version_history: [],
        created_by: user.email
      });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changeOrders'] });
      queryClient.invalidateQueries({ queryKey: ['sov-items'] });
      setShowForm(false);
      setEditingCO(null);
      toast.success('Change order created successfully');
    },
    onError: (error) => {
      console.error('Create change order error:', error);
      toast.error(error?.message || 'Failed to create change order');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, changesSummary }) => {
      const current = changeOrders.find(co => co.id === id);
      const user = await base44.auth.me();
      
      const versionHistory = current?.version_history || [];
      const newVersion = (current?.version || 1) + 1;
      
      versionHistory.push({
        version: current?.version || 1,
        changed_by: user.email,
        changed_at: new Date().toISOString(),
        changes_summary: changesSummary || 'Updated change order',
        snapshot: { ...current }
      });

      const result = await base44.entities.ChangeOrder.update(id, {
        ...data,
        version: newVersion,
        version_history: versionHistory
      });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changeOrders'] });
      queryClient.invalidateQueries({ queryKey: ['sov-items'] });
      setShowForm(false);
      setEditingCO(null);
      toast.success('Change order updated successfully');
    },
    onError: (error) => {
      console.error('Update change order error:', error);
      toast.error(error?.message || 'Failed to update change order');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const result = await base44.entities.ChangeOrder.delete(id);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changeOrders'] });
      setDeleteCO(null);
      toast.success('Change order deleted successfully');
    },
    onError: (error) => {
      console.error('Delete change order error:', error);
      toast.error(error?.message || 'Failed to delete change order');
    }
  });

  const getNextCONumber = (projectId) => {
    const projectCOs = changeOrders.filter(co => co.project_id === projectId);
    return projectCOs.reduce((max, co) => Math.max(max, co.co_number || 0), 0) + 1;
  };

  const handleAddNew = () => {
    setEditingCO(null);
    setShowForm(true);
  };

  const handleEdit = (co) => {
    setEditingCO(co);
    setShowForm(true);
  };

  const filteredCOs = useMemo(() => {
    return changeOrders.filter(co => {
      const matchesSearch = 
        co.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        co.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(co.co_number).includes(searchTerm);
      const matchesStatus = statusFilter === 'all' || co.status === statusFilter;
      const matchesProject = projectFilter === 'all' || co.project_id === projectFilter;
      return matchesSearch && matchesStatus && matchesProject;
    });
  }, [changeOrders, searchTerm, statusFilter, projectFilter]);

  const stats = useMemo(() => {
    const approved = changeOrders.filter(co => co.status === 'approved');
    const pending = changeOrders.filter(co => ['draft', 'submitted', 'under_review'].includes(co.status));
    const rejected = changeOrders.filter(co => co.status === 'rejected');
    
    const approvedCost = approved.reduce((sum, co) => sum + (co.cost_impact || 0), 0);
    const pendingCost = pending.reduce((sum, co) => sum + (co.cost_impact || 0), 0);
    const scheduleDays = approved.reduce((sum, co) => sum + (co.schedule_impact_days || 0), 0);

    return {
      total: changeOrders.length,
      approved: approved.length,
      pending: pending.length,
      rejected: rejected.length,
      approvedCost,
      pendingCost,
      scheduleDays
    };
  }, [changeOrders]);

  const statusColors = {
    draft: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
    submitted: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    under_review: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    approved: 'bg-green-500/20 text-green-400 border-green-500/30',
    rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
    void: 'bg-zinc-700/20 text-zinc-600 border-zinc-700/30'
  };

  if (cosLoading || projectsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 to-black">
      {/* Header */}
      <div className="border-b border-zinc-800/50 bg-gradient-to-b from-zinc-900 to-zinc-950/50">
        <div className="max-w-[1800px] mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Change Orders</h1>
              <p className="text-sm text-zinc-500 font-mono mt-1">{filteredCOs.length} of {stats.total}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20"
              >
                <RefreshCw size={14} className="mr-2" />
                Refresh
              </Button>
              <Button
                onClick={handleAddNew}
                className="bg-amber-500 hover:bg-amber-600 text-black font-bold"
              >
                <Plus size={16} className="mr-2" />
                New CO
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="border-b border-zinc-800/50 bg-zinc-950/50">
        <div className="max-w-[1800px] mx-auto px-8 py-4">
          <div className="grid grid-cols-5 gap-4">
            <Card className="bg-zinc-800 border-zinc-700/50">
              <CardContent className="p-4">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-1">Total COs</div>
                <div className="text-3xl font-bold text-blue-400">{stats.total}</div>
              </CardContent>
            </Card>
            <Card className="bg-green-500/15 border-green-500/30">
              <CardContent className="p-4">
                <div className="text-[10px] text-green-400 uppercase tracking-wider font-semibold mb-1">Approved</div>
                <div className="text-3xl font-bold text-green-400">{stats.approved}</div>
                <div className="text-xs text-green-500 mt-1">+${(stats.approvedCost / 1000).toFixed(0)}K</div>
              </CardContent>
            </Card>
            <Card className="bg-amber-500/15 border-amber-500/30">
              <CardContent className="p-4">
                <div className="text-[10px] text-amber-400 uppercase tracking-wider font-semibold mb-1">Pending</div>
                <div className="text-3xl font-bold text-amber-400">{stats.pending}</div>
                <div className="text-xs text-amber-500 mt-1">${(stats.pendingCost / 1000).toFixed(0)}K</div>
              </CardContent>
            </Card>
            <Card className="bg-red-500/15 border-red-500/30">
              <CardContent className="p-4">
                <div className="text-[10px] text-red-400 uppercase tracking-wider font-semibold mb-1">Rejected</div>
                <div className="text-3xl font-bold text-red-400">{stats.rejected}</div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-800 border-zinc-700/50">
              <CardContent className="p-4">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-1">Schedule Impact</div>
                <div className="text-3xl font-bold text-white">{stats.scheduleDays > 0 ? '+' : ''}{stats.scheduleDays}</div>
                <div className="text-xs text-zinc-500 mt-1">days</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-zinc-800/50 bg-zinc-950/30">
        <div className="max-w-[1800px] mx-auto px-8 py-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <Input
                placeholder="Search COs by title, number, description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-zinc-900 border-zinc-800 text-white h-9"
              />
            </div>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-56 bg-zinc-900 border-zinc-800 text-white h-9">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.project_number} - {p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 bg-zinc-900 border-zinc-800 text-white h-9">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="void">Void</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1800px] mx-auto px-8 py-6">
        {filteredCOs.length === 0 ? (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-12 text-center">
              <DollarSign size={48} className="mx-auto mb-4 text-zinc-700" />
              <p className="text-zinc-500 mb-4">No change orders found</p>
              <Button onClick={handleAddNew} className="bg-amber-500 hover:bg-amber-600 text-black">
                <Plus size={16} className="mr-2" />
                Create First CO
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredCOs.map(co => {
              const project = projects.find(p => p.id === co.project_id);
              const costImpact = co.cost_impact || 0;
              const scheduleImpact = co.schedule_impact_days || 0;

              return (
                <Card
                  key={co.id}
                  className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer group"
                  onClick={() => setViewingCO(co)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* CO Number Badge */}
                      <div className="flex flex-col items-center min-w-[80px]">
                        <div className="text-2xl font-black text-amber-500 font-mono">
                          CO-{String(co.co_number).padStart(3, '0')}
                        </div>
                        {co.version > 1 && (
                          <Badge variant="outline" className="text-[9px] mt-1">
                            v{co.version}
                          </Badge>
                        )}
                      </div>

                      {/* Main Content */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-white text-lg group-hover:text-blue-400 transition-colors">
                              {co.title}
                            </h3>
                            <p className="text-sm text-zinc-500 mt-1">{project?.project_number} • {project?.name}</p>
                          </div>
                          <Badge variant="outline" className={statusColors[co.status]}>
                            {co.status?.toUpperCase()}
                          </Badge>
                        </div>

                        {co.description && (
                          <p className="text-sm text-zinc-400 line-clamp-2 mb-3">{co.description}</p>
                        )}

                        {/* Impacts */}
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <DollarSign size={16} className={costImpact >= 0 ? 'text-green-500' : 'text-red-500'} />
                            <div>
                              <p className="text-[10px] text-zinc-600 uppercase">Cost Impact</p>
                              <p className={`text-sm font-bold ${costImpact >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {costImpact >= 0 ? '+' : ''}${Math.abs(costImpact).toLocaleString()}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Clock size={16} className={scheduleImpact > 0 ? 'text-red-500' : 'text-zinc-600'} />
                            <div>
                              <p className="text-[10px] text-zinc-600 uppercase">Schedule</p>
                              <p className={`text-sm font-bold ${scheduleImpact > 0 ? 'text-red-400' : 'text-zinc-500'}`}>
                                {scheduleImpact > 0 ? '+' : ''}{scheduleImpact} days
                              </p>
                            </div>
                          </div>

                          {co.submitted_date && (
                            <div>
                              <p className="text-[10px] text-zinc-600 uppercase">Submitted</p>
                              <p className="text-sm text-zinc-400">{format(new Date(co.submitted_date), 'MMM d, yyyy')}</p>
                            </div>
                          )}

                          {co.approved_date && (
                            <div>
                              <p className="text-[10px] text-zinc-600 uppercase">Approved</p>
                              <p className="text-sm text-green-400">{format(new Date(co.approved_date), 'MMM d, yyyy')}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingCO(co);
                          }}
                          className="text-zinc-400 hover:text-white h-8"
                        >
                          <Eye size={14} className="mr-1" />
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(co);
                          }}
                          className="text-zinc-400 hover:text-blue-400 h-8"
                        >
                          <Edit size={14} className="mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteCO(co);
                          }}
                          className="text-zinc-500 hover:text-red-500 h-8 w-8"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Form */}
      <Sheet 
        open={showForm} 
        onOpenChange={(open) => {
          setShowForm(open);
          if (!open) setEditingCO(null);
        }}
      >
        <SheetContent className="w-full sm:max-w-3xl bg-zinc-900 border-zinc-800 text-white overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingCO ? 'Edit Change Order' : 'New Change Order'}</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <ChangeOrderForm
              changeOrder={editingCO}
              projects={projects}
              getNextCONumber={getNextCONumber}
              onSubmit={(data, changesSummary) => {
                if (editingCO) {
                  updateMutation.mutate({ id: editingCO.id, data, changesSummary });
                } else {
                  createMutation.mutate(data);
                }
              }}
              onCancel={() => {
                setShowForm(false);
                setEditingCO(null);
              }}
              isLoading={createMutation.isPending || updateMutation.isPending}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Detail View */}
      <Sheet open={!!viewingCO} onOpenChange={(open) => !open && setViewingCO(null)}>
        <SheetContent className="w-full sm:max-w-4xl bg-zinc-900 border-zinc-800 text-white overflow-y-auto">
          {viewingCO && (
            <ChangeOrderDetail
              changeOrder={viewingCO}
              projects={projects}
              onEdit={() => {
                handleEdit(viewingCO);
                setViewingCO(null);
              }}
              onDelete={() => {
                setDeleteCO(viewingCO);
                setViewingCO(null);
              }}
              onUpdate={() => {
                queryClient.invalidateQueries({ queryKey: ['changeOrders'] });
              }}
              onClose={() => setViewingCO(null)}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteCO} onOpenChange={() => setDeleteCO(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Change Order?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Delete CO-{String(deleteCO?.co_number).padStart(3, '0')} "{deleteCO?.title}"? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700 text-white hover:bg-zinc-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteCO.id)}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}