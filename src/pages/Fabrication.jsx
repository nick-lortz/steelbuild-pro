import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { 
  Package, 
  Wrench, 
  CheckCircle2, 
  AlertTriangle, 
  Clock,
  Truck,
  FileText,
  Plus,
  ArrowRight,
  Lock,
  Unlock,
  Settings,
  TrendingUp,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, isValid } from 'date-fns';
import StatusBadge from '@/components/ui/StatusBadge';
import { checkPrerequisites, PrerequisitesBadge } from '@/components/fabrication/PrerequisitesEngine';

export default function FabricationPage() {
  const { activeProjectId, setActiveProjectId } = useActiveProject();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState('packages');
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [showCreatePackage, setShowCreatePackage] = useState(false);
  const [showCreatePiece, setShowCreatePiece] = useState(false);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list()
  });

  const { data: workPackages = [] } = useQuery({
    queryKey: ['work-packages', activeProjectId],
    queryFn: () => base44.entities.WorkPackage.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId
  });

  const { data: fabricationPackages = [] } = useQuery({
    queryKey: ['fabrication-packages', activeProjectId],
    queryFn: () => base44.entities.FabricationPackage.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId
  });

  const { data: fabricationItems = [] } = useQuery({
    queryKey: ['fabrication', activeProjectId],
    queryFn: () => base44.entities.Fabrication.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId
  });

  const { data: drawings = [] } = useQuery({
    queryKey: ['drawings', activeProjectId],
    queryFn: () => base44.entities.DrawingSet.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId
  });

  const { data: deliveries = [] } = useQuery({
    queryKey: ['deliveries', activeProjectId],
    queryFn: () => base44.entities.Delivery.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId
  });

  const { data: rfis = [] } = useQuery({
    queryKey: ['rfis', activeProjectId],
    queryFn: () => base44.entities.RFI.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId
  });

  // Real-time subscriptions
  React.useEffect(() => {
    if (!activeProjectId) return;

    const unsubFabPkg = base44.entities.FabricationPackage.subscribe((event) => {
      if (event.data?.project_id === activeProjectId) {
        queryClient.invalidateQueries({ queryKey: ['fabrication-packages', activeProjectId] });
      }
    });

    const unsubFab = base44.entities.Fabrication.subscribe((event) => {
      if (event.data?.project_id === activeProjectId) {
        queryClient.invalidateQueries({ queryKey: ['fabrication', activeProjectId] });
        queryClient.invalidateQueries({ queryKey: ['fabrication-packages', activeProjectId] });
      }
    });

    const unsubDrawing = base44.entities.DrawingSet.subscribe((event) => {
      if (event.data?.project_id === activeProjectId) {
        queryClient.invalidateQueries({ queryKey: ['drawings', activeProjectId] });
        queryClient.invalidateQueries({ queryKey: ['fabrication-packages', activeProjectId] });
      }
    });

    const unsubWP = base44.entities.WorkPackage.subscribe((event) => {
      if (event.data?.project_id === activeProjectId) {
        queryClient.invalidateQueries({ queryKey: ['work-packages', activeProjectId] });
        queryClient.invalidateQueries({ queryKey: ['fabrication-packages', activeProjectId] });
      }
    });

    const unsubDelivery = base44.entities.Delivery.subscribe((event) => {
      if (event.data?.project_id === activeProjectId) {
        queryClient.invalidateQueries({ queryKey: ['deliveries', activeProjectId] });
        queryClient.invalidateQueries({ queryKey: ['fabrication-packages', activeProjectId] });
      }
    });

    return () => {
      unsubFabPkg();
      unsubFab();
      unsubDrawing();
      unsubWP();
      unsubDelivery();
    };
  }, [activeProjectId, queryClient]);

  // Enhanced packages with workflow data
  const enhancedPackages = useMemo(() => {
    return fabricationPackages.map(pkg => {
      const pieces = fabricationItems.filter(f => f.package_id === pkg.id);
      const linkedWP = workPackages.find(wp => wp.id === pkg.work_package_id);
      const linkedProject = projects.find(p => p.id === pkg.project_id);
      const linkedDelivery = deliveries.find(d => d.id === pkg.linked_delivery_id);
      const linkedDrawings = drawings.filter(d => pkg.drawing_set_ids?.includes(d.id));
      
      const releasedDrawings = linkedDrawings.filter(d => d.status === 'FFF').length;
      const drawingsReady = linkedDrawings.length > 0 && linkedDrawings.length === releasedDrawings;
      
      const openRFIs = rfis.filter(r => 
        linkedDrawings.some(d => d.id === r.linked_drawing_set_id) && 
        !['answered', 'closed'].includes(r.status)
      );
      
      const piecesComplete = pieces.filter(p => ['ready_to_ship', 'shipped'].includes(p.status)).length;
      const piecesReleased = pieces.filter(p => p.status === 'released').length;
      
      const canRelease = drawingsReady && 
                        openRFIs.length === 0 && 
                        pkg.bom_verified && 
                        pkg.status === 'pending_prereqs';
      
      const canShip = pkg.status === 'complete' && 
                     piecesComplete === pieces.length &&
                     pieces.length > 0;
      
      return {
        ...pkg,
        pieces,
        linkedWP,
        linkedProject,
        linkedDelivery,
        linkedDrawings,
        openRFIs,
        drawingsReady,
        piecesComplete,
        piecesReleased,
        canRelease,
        canShip,
        completionPercent: pieces.length > 0 ? (piecesComplete / pieces.length * 100) : 0
      };
    });
  }, [fabricationPackages, fabricationItems, workPackages, deliveries, drawings, rfis, projects]);

  // KPIs
  const kpis = useMemo(() => {
    const totalPackages = fabricationPackages.length;
    const releasedPackages = fabricationPackages.filter(p => ['released', 'in_progress', 'qc', 'complete'].includes(p.status)).length;
    const completePackages = fabricationPackages.filter(p => p.status === 'complete').length;
    const shippedPackages = fabricationPackages.filter(p => p.status === 'shipped').length;
    const blockedPackages = fabricationPackages.filter(p => p.status === 'pending_prereqs').length;
    const totalWeight = fabricationPackages.reduce((sum, p) => sum + (p.total_weight_tons || 0), 0);
    const shippedWeight = fabricationPackages.filter(p => p.status === 'shipped').reduce((sum, p) => sum + (p.total_weight_tons || 0), 0);
    
    return { 
      totalPackages, 
      releasedPackages, 
      completePackages, 
      shippedPackages,
      blockedPackages,
      totalWeight,
      shippedWeight,
      shippedPercent: totalWeight > 0 ? (shippedWeight / totalWeight * 100) : 0
    };
  }, [fabricationPackages]);

  const updatePackageMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FabricationPackage.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fabrication-packages'] });
      queryClient.invalidateQueries({ queryKey: ['work-packages'] });
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      toast.success('Package updated');
    }
  });

  const updatePieceMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Fabrication.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fabrication'] });
      queryClient.invalidateQueries({ queryKey: ['fabrication-packages'] });
      toast.success('Piece updated');
    }
  });

  const createDeliveryMutation = useMutation({
    mutationFn: async (packageData) => {
      const delivery = await base44.entities.Delivery.create({
        project_id: activeProjectId,
        package_name: packageData.package_name,
        delivery_number: `DEL-${Date.now()}`,
        delivery_status: 'draft',
        scheduled_date: packageData.planned_ship_date,
        weight_tons: packageData.total_weight_tons
      });
      
      await base44.entities.FabricationPackage.update(packageData.id, {
        linked_delivery_id: delivery.id,
        status: 'shipped'
      });
      
      return delivery;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['fabrication-packages'] });
      queryClient.invalidateQueries({ queryKey: ['work-packages'] });
      toast.success('Delivery created and package marked shipped');
    }
  });

  const selectedProject = projects.find(p => p.id === activeProjectId);

  if (!activeProjectId) {
    return (
      <div className="min-h-screen bg-black">
        <div className="border-b border-zinc-800 bg-black">
          <div className="max-w-[1600px] mx-auto px-6 py-4">
            <h1 className="text-xl font-bold text-white uppercase tracking-wide">Fabrication</h1>
            <p className="text-xs text-zinc-600 font-mono mt-1">SELECT PROJECT</p>
          </div>
        </div>
        <div className="max-w-[1600px] mx-auto px-6 py-12">
          <Select value={activeProjectId || ''} onValueChange={setActiveProjectId}>
            <SelectTrigger className="w-[280px] bg-zinc-900 border-zinc-800 text-white">
              <SelectValue placeholder="SELECT PROJECT" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700 max-h-60">
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id} className="text-white">
                  {p.project_number} - {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-black">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white uppercase tracking-wide">Fabrication</h1>
              <p className="text-xs text-zinc-600 font-mono mt-1">{selectedProject?.project_number} • {selectedProject?.name}</p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={activeProjectId || ''} onValueChange={setActiveProjectId}>
                <SelectTrigger className="w-[280px] bg-zinc-900 border-zinc-800 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700 max-h-60">
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id} className="text-white">
                      {p.project_number} - {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() => setShowCreatePackage({})}
                className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs uppercase tracking-wider">
                <Plus size={14} className="mr-1" />
                NEW PACKAGE
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Bar */}
      <div className="border-b border-zinc-800 bg-black">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="grid grid-cols-6 gap-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                  <Package size={10} />
                  Total Packages
                </div>
                <div className="text-2xl font-bold font-mono text-white">{kpis.totalPackages}</div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                  <Unlock size={10} />
                  Released
                </div>
                <div className="text-2xl font-bold font-mono text-amber-500">{kpis.releasedPackages}</div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                  <CheckCircle2 size={10} />
                  Complete
                </div>
                <div className="text-2xl font-bold font-mono text-green-500">{kpis.completePackages}</div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                  <Truck size={10} />
                  Shipped
                </div>
                <div className="text-2xl font-bold font-mono text-blue-500">{kpis.shippedPackages}</div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                  <AlertTriangle size={10} />
                  Blocked
                </div>
                <div className="text-2xl font-bold font-mono text-red-500">{kpis.blockedPackages}</div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                  <TrendingUp size={10} />
                  Shipped %
                </div>
                <div className="text-2xl font-bold font-mono text-white">{kpis.shippedPercent.toFixed(0)}%</div>
                <div className="text-[10px] text-zinc-600 mt-1">
                  {kpis.shippedWeight.toFixed(1)} / {kpis.totalWeight.toFixed(1)} tons
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        <Tabs value={viewMode} onValueChange={setViewMode}>
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="packages">
              <Package size={14} className="mr-2" />
              Packages ({fabricationPackages.length})
            </TabsTrigger>
            <TabsTrigger value="workPackages">
              <FileText size={14} className="mr-2" />
              Work Packages ({workPackages.length})
            </TabsTrigger>
            <TabsTrigger value="pieces">
              <Wrench size={14} className="mr-2" />
              All Pieces ({fabricationItems.length})
            </TabsTrigger>
            <TabsTrigger value="readiness">
              <Clock size={14} className="mr-2" />
              Fabrication Readiness
            </TabsTrigger>
          </TabsList>

          {/* Fabrication Packages */}
          <TabsContent value="packages" className="space-y-4 mt-6">
            {enhancedPackages.map(pkg => (
              <Card key={pkg.id} className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 cursor-pointer" onClick={() => setSelectedPackage(pkg)}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-6">
                    {/* Status Indicator */}
                    <div className={`w-1.5 h-20 rounded ${
                      pkg.status === 'shipped' ? 'bg-blue-500' :
                      pkg.status === 'complete' ? 'bg-green-500' :
                      pkg.status === 'in_progress' ? 'bg-amber-500' :
                      pkg.status === 'released' ? 'bg-purple-500' :
                      'bg-zinc-700'
                    }`} />

                    {/* Package Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-bold text-white">{pkg.package_name}</h3>
                            <StatusBadge status={pkg.status} />
                            {pkg.canRelease && (
                              <Badge className="bg-green-500 text-black text-[10px]">
                                <Unlock size={10} className="mr-1" />
                                READY TO RELEASE
                              </Badge>
                            )}
                            {pkg.canShip && (
                              <Badge className="bg-blue-500 text-black text-[10px]">
                                <Truck size={10} className="mr-1" />
                                READY TO SHIP
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-zinc-500 font-mono flex items-center gap-2">
                            <span>{pkg.package_number}</span>
                            {pkg.linkedProject && (
                              <>
                                <span>•</span>
                                <span>{pkg.linkedProject.project_number}</span>
                              </>
                            )}
                            {pkg.linkedWP && (
                              <>
                                <span>•</span>
                                <span>WP: {pkg.linkedWP.wpid}</span>
                              </>
                            )}
                          </div>
                          {pkg.area && (
                            <div className="text-xs text-zinc-600 mt-1">
                              📍 {pkg.area} {pkg.sequence && `• SEQ: ${pkg.sequence}`}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-zinc-400">Ship Target</div>
                          <div className="text-sm font-semibold text-white">
                            {pkg.planned_ship_date ? format(new Date(pkg.planned_ship_date), 'MMM d, yyyy') : 'Not set'}
                          </div>
                        </div>
                      </div>

                      {/* Metrics Grid */}
                      <div className="grid grid-cols-4 gap-4 mb-3">
                        <div>
                          <div className="text-[10px] text-zinc-600 uppercase">Pieces</div>
                          <div className="text-lg font-mono text-white">{pkg.pieces_complete || 0}/{pkg.total_pieces || 0}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-zinc-600 uppercase">Weight</div>
                          <div className="text-lg font-mono text-white">{(pkg.total_weight_tons || 0).toFixed(1)}T</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-zinc-600 uppercase">Progress</div>
                          <div className="text-lg font-mono text-amber-500">{(pkg.completion_percent || 0).toFixed(0)}%</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-zinc-600 uppercase">BOM</div>
                          <div className="flex items-center gap-1 mt-1">
                            {pkg.bom_verified ? (
                              <CheckCircle2 size={16} className="text-green-500" />
                            ) : (
                              <XCircle size={16} className="text-red-500" />
                            )}
                            <span className="text-xs text-zinc-400">
                              {pkg.bom_verified ? 'Verified' : 'Not Verified'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Workflow Status */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {pkg.linkedDrawings.length > 0 && (
                          <Badge variant="outline" className={pkg.drawingsReady ? 'border-green-500 text-green-400' : 'border-amber-500 text-amber-400'}>
                            <FileText size={10} className="mr-1" />
                            {pkg.linkedDrawings.filter(d => d.status === 'FFF').length}/{pkg.linkedDrawings.length} Drawings FFF
                          </Badge>
                        )}
                        {pkg.openRFIs.length > 0 && (
                          <Badge variant="outline" className="border-red-500 text-red-400">
                            <AlertTriangle size={10} className="mr-1" />
                            {pkg.openRFIs.length} Open RFIs
                          </Badge>
                        )}
                        {pkg.linkedWP && (
                          <Badge variant="outline" className="border-blue-500 text-blue-400">
                            WP: {pkg.linkedWP.wpid} • Budget: ${(pkg.linkedWP.budget_at_award / 1000).toFixed(0)}K
                          </Badge>
                        )}
                        {pkg.linkedDelivery && (
                          <Badge variant="outline" className="border-purple-500 text-purple-400">
                            <Truck size={10} className="mr-1" />
                            {pkg.linkedDelivery.delivery_number}
                          </Badge>
                        )}
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-3">
                        <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-green-500 transition-all"
                            style={{ width: `${pkg.completionPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 min-w-[140px]">
                      {pkg.canRelease && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            updatePackageMutation.mutate({
                              id: pkg.id,
                              data: {
                                status: 'released',
                                release_date: new Date().toISOString().split('T')[0]
                              }
                            });
                          }}
                          className="bg-green-500 hover:bg-green-600 text-black font-bold text-xs">
                          <Unlock size={12} className="mr-1" />
                          RELEASE
                        </Button>
                      )}
                      {pkg.status === 'in_progress' && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            updatePackageMutation.mutate({
                              id: pkg.id,
                              data: { status: 'qc' }
                            });
                          }}
                          className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs">
                          TO QC
                        </Button>
                      )}
                      {pkg.status === 'qc' && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            updatePackageMutation.mutate({
                              id: pkg.id,
                              data: { status: 'complete' }
                            });
                          }}
                          className="bg-green-500 hover:bg-green-600 text-black font-bold text-xs">
                          COMPLETE
                        </Button>
                      )}
                      {pkg.canShip && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            createDeliveryMutation.mutate(pkg);
                          }}
                          className="bg-blue-500 hover:bg-blue-600 text-black font-bold text-xs">
                          <Truck size={12} className="mr-1" />
                          CREATE DELIVERY
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {fabricationPackages.length === 0 && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-12 text-center">
                  <Package size={48} className="mx-auto mb-4 text-zinc-700" />
                  <p className="text-zinc-400">No fabrication packages yet</p>
                  <Button
                    onClick={() => setShowCreatePackage(true)}
                    className="mt-4 bg-amber-500 hover:bg-amber-600 text-black">
                    Create First Package
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Work Packages Integration */}
          <TabsContent value="workPackages" className="space-y-4 mt-6">
            {workPackages.map(wp => {
              const linkedFabPkgs = fabricationPackages.filter(fp => fp.work_package_id === wp.id);
              const linkedDrawings = drawings.filter(d => wp.linked_drawing_set_ids?.includes(d.id));
              const drawingsReleased = linkedDrawings.filter(d => d.status === 'FFF').length;
              const canCreateFabPkg = linkedDrawings.length > 0 && drawingsReleased === linkedDrawings.length;
              
              return (
                <Card key={wp.id} className="bg-zinc-900 border-zinc-800">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold text-white">{wp.title}</h3>
                          <StatusBadge status={wp.phase} />
                          <StatusBadge status={wp.status} />
                          {canCreateFabPkg && linkedFabPkgs.length === 0 && (
                            <Badge className="bg-green-500 text-black text-[10px]">
                              <CheckCircle2 size={10} className="mr-1" />
                              READY FOR FABRICATION
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-zinc-500 font-mono">{wp.wpid}</div>
                        {wp.scope_summary && (
                          <p className="text-xs text-zinc-400 mt-2">{wp.scope_summary}</p>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-xs text-zinc-500">Target Delivery</div>
                        <div className="text-sm font-semibold text-white">
                          {wp.target_date ? format(new Date(wp.target_date), 'MMM d, yyyy') : 'Not set'}
                        </div>
                        {wp.budget_at_award > 0 && (
                          <div className="text-xs text-zinc-400 mt-1">
                            Budget: ${(wp.budget_at_award / 1000).toFixed(0)}K
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4 mb-4">
                      <div>
                        <div className="text-[10px] text-zinc-600 uppercase">Drawings</div>
                        <div className={`text-sm font-mono ${drawingsReleased === linkedDrawings.length && linkedDrawings.length > 0 ? 'text-green-500' : 'text-white'}`}>
                          {drawingsReleased}/{linkedDrawings.length} FFF
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-zinc-600 uppercase">Fab Packages</div>
                        <div className="text-sm font-mono text-white">{linkedFabPkgs.length}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-zinc-600 uppercase">Progress</div>
                        <div className="text-sm font-mono text-amber-500">{wp.percent_complete || 0}%</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-zinc-600 uppercase">PM</div>
                        <div className="text-sm text-white truncate">{wp.assigned_pm?.split('@')[0] || '—'}</div>
                      </div>
                    </div>

                    {linkedFabPkgs.length > 0 ? (
                      <div className="space-y-2">
                        <div className="text-xs text-zinc-500 uppercase">Fabrication Packages:</div>
                        {linkedFabPkgs.map(fp => (
                          <div key={fp.id} className="flex items-center justify-between p-3 bg-zinc-800 rounded cursor-pointer hover:bg-zinc-700" onClick={() => setSelectedPackage(fp)}>
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-white font-medium">{fp.package_name}</span>
                              <StatusBadge status={fp.status} />
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-xs text-zinc-400">{fp.total_pieces || 0} pcs • {fp.total_weight_tons?.toFixed(1) || 0}T</div>
                              <div className="text-sm font-mono text-amber-500">{fp.completion_percent || 0}%</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-3 bg-zinc-800/50 border border-dashed border-zinc-700 rounded">
                        <div className="text-sm text-zinc-400">No fabrication packages created</div>
                        {canCreateFabPkg && (
                          <Button
                            size="sm"
                            onClick={() => {
                              // Pre-populate form with work package data
                              setShowCreatePackage({
                                work_package_id: wp.id,
                                package_name: wp.title,
                                area: wp.scope_summary,
                                planned_ship_date: wp.target_date,
                                drawing_set_ids: wp.linked_drawing_set_ids,
                                budget_at_award: wp.budget_at_award,
                                forecast_at_completion: wp.forecast_at_completion,
                                assigned_pm: wp.assigned_pm,
                                assigned_superintendent: wp.assigned_superintendent
                              });
                            }}
                            className="bg-green-500 hover:bg-green-600 text-black font-bold text-xs">
                            <Plus size={12} className="mr-1" />
                            CREATE FROM WP
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {workPackages.length === 0 && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-12 text-center">
                  <FileText size={48} className="mx-auto mb-4 text-zinc-700" />
                  <p className="text-zinc-400">No work packages found</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* All Pieces */}
          <TabsContent value="pieces" className="space-y-4 mt-6">
            <Card className="bg-zinc-900 border-zinc-800">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left p-3 text-xs font-medium text-zinc-400">Piece Mark</th>
                      <th className="text-left p-3 text-xs font-medium text-zinc-400">Package</th>
                      <th className="text-left p-3 text-xs font-medium text-zinc-400">Area</th>
                      <th className="text-left p-3 text-xs font-medium text-zinc-400">Status</th>
                      <th className="text-left p-3 text-xs font-medium text-zinc-400">Material</th>
                      <th className="text-left p-3 text-xs font-medium text-zinc-400">Weight</th>
                      <th className="text-left p-3 text-xs font-medium text-zinc-400">Prerequisites</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fabricationItems.map(item => {
                      const pkg = fabricationPackages.find(p => p.id === item.package_id);
                      const prereqCheck = checkPrerequisites(item, drawings, rfis);
                      
                      return (
                        <tr 
                          key={item.id} 
                          className="border-b border-zinc-800 hover:bg-zinc-800/50 cursor-pointer"
                          onClick={() => setSelectedPiece(item)}>
                          <td className="p-3 font-medium text-white">{item.piece_mark}</td>
                          <td className="p-3 text-sm text-zinc-400">{pkg?.package_name || '—'}</td>
                          <td className="p-3 text-sm text-zinc-400">{item.area_gridline || '—'}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <StatusBadge status={item.status} />
                              {item.on_hold && <Badge className="bg-red-500 text-[10px]">HOLD</Badge>}
                            </div>
                          </td>
                          <td className="p-3">
                            <StatusBadge status={item.material_status} />
                          </td>
                          <td className="p-3 text-sm text-zinc-400">{item.weight_tons?.toFixed(2) || '—'}T</td>
                          <td className="p-3">
                            <PrerequisitesBadge item={item} drawings={drawings} rfis={rfis} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {fabricationItems.length === 0 && (
                  <div className="text-center py-12 text-zinc-500">
                    <Wrench size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No fabrication pieces found</p>
                    <Button
                      onClick={() => setShowCreatePiece(true)}
                      className="mt-4 bg-amber-500 hover:bg-amber-600 text-black">
                      Add First Piece
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Fabrication Readiness */}
          <TabsContent value="readiness" className="space-y-4 mt-6">
            <Card className="bg-green-950/20 border-green-500/30">
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-widest text-green-400 flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  Ready to Release ({enhancedPackages.filter(p => p.canRelease).length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {enhancedPackages.filter(p => p.canRelease).map(pkg => (
                  <div key={pkg.id} className="flex items-center justify-between p-3 bg-zinc-900 border border-green-500/30 rounded">
                    <div>
                      <div className="font-semibold text-white">{pkg.package_name}</div>
                      <div className="text-xs text-zinc-500">{pkg.total_pieces} pieces • {pkg.total_weight_tons?.toFixed(1)}T</div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        updatePackageMutation.mutate({
                          id: pkg.id,
                          data: {
                            status: 'released',
                            release_date: new Date().toISOString().split('T')[0]
                          }
                        });
                      }}
                      className="bg-green-500 hover:bg-green-600 text-black font-bold">
                      <Unlock size={12} className="mr-1" />
                      RELEASE NOW
                    </Button>
                  </div>
                ))}
                {enhancedPackages.filter(p => p.canRelease).length === 0 && (
                  <div className="text-center py-8 text-zinc-500">
                    <p className="text-sm">No packages ready to release</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-red-950/20 border-red-500/30">
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-widest text-red-400 flex items-center gap-2">
                  <Lock size={16} />
                  Blocked - Prerequisites Not Met ({enhancedPackages.filter(p => p.status === 'pending_prereqs').length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {enhancedPackages.filter(p => p.status === 'pending_prereqs').map(pkg => (
                  <div key={pkg.id} className="p-3 bg-zinc-900 border border-red-500/30 rounded">
                    <div className="font-semibold text-white mb-2">{pkg.package_name}</div>
                    <div className="space-y-1 text-xs">
                      {!pkg.drawingsReady && (
                        <div className="flex items-center gap-2 text-red-400">
                          <XCircle size={12} />
                          <span>Drawings: {pkg.linkedDrawings.filter(d => d.status === 'FFF').length}/{pkg.linkedDrawings.length} FFF</span>
                        </div>
                      )}
                      {pkg.openRFIs.length > 0 && (
                        <div className="flex items-center gap-2 text-red-400">
                          <XCircle size={12} />
                          <span>{pkg.openRFIs.length} open RFIs blocking</span>
                        </div>
                      )}
                      {!pkg.bom_verified && (
                        <div className="flex items-center gap-2 text-amber-400">
                          <AlertTriangle size={12} />
                          <span>BOM not verified</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-blue-950/20 border-blue-500/30">
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-widest text-blue-400 flex items-center gap-2">
                  <Truck size={16} />
                  Ready to Ship ({enhancedPackages.filter(p => p.canShip).length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {enhancedPackages.filter(p => p.canShip).map(pkg => (
                  <div key={pkg.id} className="flex items-center justify-between p-3 bg-zinc-900 border border-blue-500/30 rounded">
                    <div>
                      <div className="font-semibold text-white">{pkg.package_name}</div>
                      <div className="text-xs text-zinc-500">{pkg.total_pieces} pieces complete • {pkg.total_weight_tons?.toFixed(1)}T</div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => createDeliveryMutation.mutate(pkg)}
                      className="bg-blue-500 hover:bg-blue-600 text-black font-bold">
                      <Truck size={12} className="mr-1" />
                      CREATE DELIVERY
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Package Detail Sheet */}
      <Sheet open={!!selectedPackage} onOpenChange={(open) => !open && setSelectedPackage(null)}>
        <SheetContent className="w-full sm:max-w-3xl bg-zinc-900 border-zinc-800 overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-white">{selectedPackage?.package_name}</SheetTitle>
          </SheetHeader>
          {selectedPackage && (
            <PackageDetailView
              package={selectedPackage}
              onUpdate={(data) => updatePackageMutation.mutate({ id: selectedPackage.id, data })}
              onClose={() => setSelectedPackage(null)}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Piece Detail Sheet */}
      <Sheet open={!!selectedPiece} onOpenChange={(open) => !open && setSelectedPiece(null)}>
        <SheetContent className="w-full sm:max-w-2xl bg-zinc-900 border-zinc-800 overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-white">{selectedPiece?.piece_mark}</SheetTitle>
          </SheetHeader>
          {selectedPiece && (
            <PieceDetailView
              piece={selectedPiece}
              drawings={drawings}
              rfis={rfis}
              onUpdate={(data) => updatePieceMutation.mutate({ id: selectedPiece.id, data })}
              onClose={() => setSelectedPiece(null)}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Create Package Dialog */}
      <Dialog open={!!showCreatePackage} onOpenChange={(open) => !open && setShowCreatePackage(false)}>
        <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">New Fabrication Package</DialogTitle>
          </DialogHeader>
          <CreatePackageForm
            projectId={activeProjectId}
            workPackages={workPackages}
            drawings={drawings}
            prefillData={typeof showCreatePackage === 'object' ? showCreatePackage : {}}
            onSubmit={async (data) => {
              await base44.entities.FabricationPackage.create(data);
              queryClient.invalidateQueries({ queryKey: ['fabrication-packages'] });
              queryClient.invalidateQueries({ queryKey: ['work-packages'] });
              setShowCreatePackage(false);
              toast.success('Package created');
            }}
            onCancel={() => setShowCreatePackage(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PackageDetailView({ package: pkg, onUpdate, onClose }) {
  return (
    <div className="space-y-6 mt-6">
      {/* Work Package Info */}
      {pkg.linkedWP && (
        <Card className="bg-blue-950/20 border-blue-500/30">
          <CardHeader>
            <CardTitle className="text-sm uppercase text-blue-400">Linked Work Package</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400">WPID:</span>
                <span className="text-white font-mono">{pkg.linkedWP.wpid}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Title:</span>
                <span className="text-white">{pkg.linkedWP.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Budget:</span>
                <span className="text-white font-mono">${(pkg.linkedWP.budget_at_award / 1000).toFixed(0)}K</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Target Date:</span>
                <span className="text-white">{pkg.linkedWP.target_date ? format(new Date(pkg.linkedWP.target_date), 'MMM d, yyyy') : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">PM:</span>
                <span className="text-white">{pkg.linkedWP.assigned_pm?.split('@')[0] || '—'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-zinc-800/50 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-sm">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={pkg.status}
              onValueChange={(val) => onUpdate({ status: val })}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending_prereqs">Pending Prerequisites</SelectItem>
                <SelectItem value="released">Released</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="qc">QC</SelectItem>
                <SelectItem value="complete">Complete</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="bg-zinc-800/50 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-sm">Ship Date</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="date"
              value={pkg.planned_ship_date || ''}
              onChange={(e) => onUpdate({ planned_ship_date: e.target.value })}
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </CardContent>
        </Card>
      </div>

      <Card className="bg-zinc-800/50 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-sm">Metrics</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-zinc-500">Total Pieces</div>
            <div className="text-xl font-mono text-white">{pkg.total_pieces || 0}</div>
          </div>
          <div>
            <div className="text-xs text-zinc-500">Complete</div>
            <div className="text-xl font-mono text-green-500">{pkg.pieces_complete || 0}</div>
          </div>
          <div>
            <div className="text-xs text-zinc-500">Weight</div>
            <div className="text-xl font-mono text-white">{(pkg.total_weight_tons || 0).toFixed(1)}T</div>
          </div>
        </CardContent>
      </Card>

      {pkg.scope_summary && (
        <Card className="bg-zinc-800/50 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-sm">Scope</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-300">{pkg.scope_summary}</p>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-2">
        <Button onClick={onClose} variant="outline" className="border-zinc-700">Close</Button>
      </div>
    </div>
  );
}

function PieceDetailView({ piece, drawings, rfis, onUpdate, onClose }) {
  const prereqCheck = checkPrerequisites(piece, drawings, rfis);
  
  return (
    <div className="space-y-6 mt-6">
      <Card className="bg-zinc-800/50 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-sm">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-zinc-500">Area/Gridline</div>
              <div className="text-sm text-white">{piece.area_gridline || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-500">Item Type</div>
              <div className="text-sm text-white capitalize">{piece.item_type?.replace('_', ' ') || '—'}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-zinc-400">Status</label>
              <Select
                value={piece.status}
                onValueChange={(val) => {
                  if (val === 'released' && !prereqCheck.canRelease) {
                    toast.error('Cannot release: Prerequisites not met');
                    return;
                  }
                  onUpdate({ status: val });
                }}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="released">Released</SelectItem>
                  <SelectItem value="in_fab">In Fab</SelectItem>
                  <SelectItem value="fit_up">Fit Up</SelectItem>
                  <SelectItem value="weld">Weld</SelectItem>
                  <SelectItem value="qc_hold">QC Hold</SelectItem>
                  <SelectItem value="coating">Coating</SelectItem>
                  <SelectItem value="ready_to_ship">Ready to Ship</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-zinc-400">Material Status</label>
              <Select
                value={piece.material_status}
                onValueChange={(val) => onUpdate({ material_status: val })}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_ordered">Not Ordered</SelectItem>
                  <SelectItem value="ordered">Ordered</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="cut">Cut</SelectItem>
                  <SelectItem value="staged">Staged</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {!prereqCheck.canRelease && prereqCheck.failures.length > 0 && (
            <div className="p-3 bg-red-950/30 border border-red-500/30 rounded">
              <div className="text-xs font-bold text-red-400 uppercase mb-2">Blocking Issues:</div>
              <div className="space-y-1">
                {prereqCheck.failures.map((failure, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs">
                    <XCircle size={12} className="text-red-500 mt-0.5 flex-shrink-0" />
                    <span className="text-zinc-300">{failure.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button onClick={onClose} variant="outline" className="border-zinc-700">Close</Button>
      </div>
    </div>
  );
}

function CreatePackageForm({ projectId, workPackages, drawings, onSubmit, onCancel, prefillData }) {
  const [formData, setFormData] = useState({
    project_id: projectId,
    work_package_id: '',
    package_number: '',
    package_name: '',
    area: '',
    sequence: '',
    scope_summary: '',
    status: 'draft',
    planned_ship_date: '',
    budget_at_award: 0,
    forecast_at_completion: 0,
    assigned_pm: '',
    assigned_superintendent: '',
    drawing_set_ids: [],
    ...prefillData
  });

  // Auto-populate when work package selected
  const handleWorkPackageChange = (wpId) => {
    const wp = workPackages.find(w => w.id === wpId);
    if (wp) {
      setFormData(prev => ({
        ...prev,
        work_package_id: wpId,
        package_name: prev.package_name || wp.title,
        scope_summary: wp.scope_summary,
        area: wp.scope_summary,
        planned_ship_date: prev.planned_ship_date || wp.target_date,
        budget_at_award: wp.budget_at_award,
        forecast_at_completion: wp.forecast_at_completion,
        assigned_pm: wp.assigned_pm,
        assigned_superintendent: wp.assigned_superintendent,
        drawing_set_ids: wp.linked_drawing_set_ids || []
      }));
    }
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      onSubmit(formData);
    }} className="space-y-6 mt-6">
      <div className="space-y-2">
        <label className="text-xs text-zinc-400">Link to Work Package (Optional)</label>
        <Select value={formData.work_package_id || ''} onValueChange={handleWorkPackageChange}>
          <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
            <SelectValue placeholder="Select work package to auto-populate data..." />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value={null}>None - Create Standalone</SelectItem>
            {workPackages.map(wp => (
              <SelectItem key={wp.id} value={wp.id}>
                {wp.wpid} - {wp.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs text-zinc-400">Package Number *</label>
          <Input
            value={formData.package_number}
            onChange={(e) => setFormData({ ...formData, package_number: e.target.value })}
            placeholder="FAB-001"
            className="bg-zinc-800 border-zinc-700 text-white"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs text-zinc-400">Package Name *</label>
          <Input
            value={formData.package_name}
            onChange={(e) => setFormData({ ...formData, package_name: e.target.value })}
            placeholder="Level 2 North Wing"
            className="bg-zinc-800 border-zinc-700 text-white"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs text-zinc-400">Area/Gridline</label>
          <Input
            value={formData.area}
            onChange={(e) => setFormData({ ...formData, area: e.target.value })}
            placeholder="A-B/1-3"
            className="bg-zinc-800 border-zinc-700 text-white"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs text-zinc-400">Erection Sequence</label>
          <Input
            value={formData.sequence}
            onChange={(e) => setFormData({ ...formData, sequence: e.target.value })}
            placeholder="SEQ-01"
            className="bg-zinc-800 border-zinc-700 text-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs text-zinc-400">Planned Ship Date</label>
          <Input
            type="date"
            value={formData.planned_ship_date}
            onChange={(e) => setFormData({ ...formData, planned_ship_date: e.target.value })}
            className="bg-zinc-800 border-zinc-700 text-white"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs text-zinc-400">Shop Foreman</label>
          <Input
            value={formData.shop_foreman || ''}
            onChange={(e) => setFormData({ ...formData, shop_foreman: e.target.value })}
            placeholder="Foreman name"
            className="bg-zinc-800 border-zinc-700 text-white"
          />
        </div>
      </div>

      {formData.work_package_id && (
        <Card className="bg-blue-950/20 border-blue-500/30">
          <CardContent className="p-3">
            <div className="text-xs text-blue-400 font-bold uppercase mb-2">Auto-Populated from Work Package:</div>
            <div className="grid grid-cols-2 gap-2 text-xs text-zinc-300">
              {formData.budget_at_award > 0 && (
                <div>Budget: ${(formData.budget_at_award / 1000).toFixed(0)}K</div>
              )}
              {formData.assigned_pm && (
                <div>PM: {formData.assigned_pm.split('@')[0]}</div>
              )}
              {formData.drawing_set_ids?.length > 0 && (
                <div>{formData.drawing_set_ids.length} Drawing Sets</div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-black">
          Create Package
        </Button>
      </div>
    </form>
  );
}

function PrerequisitesPanel({ item, drawings, rfis }) {
  const prereqCheck = checkPrerequisites(item, drawings, rfis);
  
  return (
    <Card className={prereqCheck.canRelease ? 'bg-green-950/20 border-green-500/30' : 'bg-red-950/20 border-red-500/30'}>
      <CardHeader>
        <CardTitle className="text-sm uppercase tracking-wide flex items-center gap-2">
          {prereqCheck.canRelease ? (
            <>
              <CheckCircle2 size={16} className="text-green-500" />
              <span className="text-green-400">Prerequisites Met - Ready to Release</span>
            </>
          ) : (
            <>
              <Lock size={16} className="text-red-500" />
              <span className="text-red-400">Prerequisites Not Met</span>
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {prereqCheck.failures.map((failure, idx) => (
            <div key={idx} className="flex items-start gap-2 text-sm">
              {failure.severity === 'critical' ? (
                <XCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertTriangle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
              )}
              <div>
                <div className="text-zinc-200">{failure.reason}</div>
                {failure.details && (
                  <div className="text-xs text-zinc-500 mt-0.5">{failure.details}</div>
                )}
              </div>
            </div>
          ))}
          
          {prereqCheck.canRelease && (
            <div className="flex items-center gap-2 text-sm text-green-400">
              <CheckCircle2 size={14} />
              <span>All prerequisites satisfied</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}