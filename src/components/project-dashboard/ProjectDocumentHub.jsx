import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, AlertCircle, File, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

export default function ProjectDocumentHub({ projectId }) {
  const { data: rfis = [] } = useQuery({
    queryKey: ['rfis', projectId],
    queryFn: () => base44.entities.RFI.filter({ project_id: projectId }),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000
  });

  const { data: changeOrders = [] } = useQuery({
    queryKey: ['changeOrders', projectId],
    queryFn: () => base44.entities.ChangeOrder.filter({ project_id: projectId }),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000
  });

  const { data: drawingSets = [] } = useQuery({
    queryKey: ['drawingSets', projectId],
    queryFn: () => base44.entities.DrawingSet.filter({ project_id: projectId }),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['documents', projectId],
    queryFn: () => base44.entities.Document.filter({ project_id: projectId }),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000
  });

  const metrics = useMemo(() => {
    const openRFIs = rfis.filter(r => !['answered', 'closed'].includes(r.status)).length;
    const criticalRFIs = rfis.filter(r => r.priority === 'critical' && !['answered', 'closed'].includes(r.status)).length;
    const pendingCOs = changeOrders.filter(c => ['submitted', 'under_review'].includes(c.status)).length;
    const releasedDrawings = drawingSets.filter(d => d.status === 'FFF' || d.released_for_fab_date).length;
    const pendingDrawings = drawingSets.filter(d => ['IFA', 'BFA'].includes(d.status)).length;

    return {
      openRFIs,
      criticalRFIs,
      pendingCOs,
      releasedDrawings,
      pendingDrawings,
      totalDocuments: documents.length
    };
  }, [rfis, changeOrders, drawingSets, documents]);

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText size={18} />
          Project Documents
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="rfis" className="space-y-4">
          <TabsList className="bg-zinc-950 border border-zinc-800">
            <TabsTrigger value="rfis">
              RFIs
              {metrics.openRFIs > 0 && (
                <Badge className="ml-2 bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-[10px]">
                  {metrics.openRFIs}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="cos">
              Change Orders
              {metrics.pendingCOs > 0 && (
                <Badge className="ml-2 bg-purple-500/20 text-purple-400 border-purple-500/30 text-[10px]">
                  {metrics.pendingCOs}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="drawings">
              Drawings
              {metrics.pendingDrawings > 0 && (
                <Badge className="ml-2 bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">
                  {metrics.pendingDrawings}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="docs">
              Files ({metrics.totalDocuments})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rfis" className="space-y-2">
            {rfis.length === 0 ? (
              <p className="text-center py-8 text-zinc-500 text-sm">No RFIs</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {rfis.slice(0, 10).map(rfi => (
                  <div key={rfi.id} className="p-3 bg-zinc-950 border border-zinc-800 rounded hover:border-zinc-700 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-xs font-mono text-zinc-500">RFI-{rfi.rfi_number}</p>
                          <Badge variant="outline" className={`text-[10px] capitalize ${
                            rfi.status === 'closed' || rfi.status === 'answered' ? 'bg-green-500/10 text-green-400 border-green-500/30' :
                            rfi.status === 'submitted' || rfi.status === 'under_review' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' :
                            'bg-zinc-700 text-zinc-400'
                          }`}>
                            {rfi.status.replace('_', ' ')}
                          </Badge>
                          {rfi.priority === 'critical' && (
                            <AlertCircle size={12} className="text-red-400" />
                          )}
                        </div>
                        <p className="text-sm text-white truncate">{rfi.subject}</p>
                        {rfi.due_date && (
                          <p className="text-xs text-zinc-500 mt-1">Due: {format(new Date(rfi.due_date), 'MMM d, yyyy')}</p>
                        )}
                      </div>
                      <Link to={createPageUrl('RFIHub') + `?rfi=${rfi.id}`}>
                        <Button size="sm" variant="ghost" className="text-xs text-cyan-400">
                          <ExternalLink size={12} />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
                {rfis.length > 10 && (
                  <Link to={createPageUrl('RFIHub')}>
                    <Button variant="outline" size="sm" className="w-full border-zinc-800 text-xs">
                      View All {rfis.length} RFIs
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="cos" className="space-y-2">
            {changeOrders.length === 0 ? (
              <p className="text-center py-8 text-zinc-500 text-sm">No Change Orders</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {changeOrders.slice(0, 10).map(co => (
                  <div key={co.id} className="p-3 bg-zinc-950 border border-zinc-800 rounded hover:border-zinc-700 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-xs font-mono text-zinc-500">CO-{co.co_number}</p>
                          <Badge variant="outline" className={`text-[10px] capitalize ${
                            co.status === 'approved' ? 'bg-green-500/10 text-green-400 border-green-500/30' :
                            co.status === 'submitted' || co.status === 'under_review' ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' :
                            'bg-zinc-700 text-zinc-400'
                          }`}>
                            {co.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-white truncate">{co.title}</p>
                        <p className="text-xs text-zinc-500 mt-1">
                          Cost Impact: {co.cost_impact >= 0 ? '+' : ''}${co.cost_impact?.toLocaleString() || 0}
                        </p>
                      </div>
                      <Link to={createPageUrl('ChangeOrders') + `?co=${co.id}`}>
                        <Button size="sm" variant="ghost" className="text-xs text-purple-400">
                          <ExternalLink size={12} />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
                {changeOrders.length > 10 && (
                  <Link to={createPageUrl('ChangeOrders')}>
                    <Button variant="outline" size="sm" className="w-full border-zinc-800 text-xs">
                      View All {changeOrders.length} Change Orders
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="drawings" className="space-y-2">
            {drawingSets.length === 0 ? (
              <p className="text-center py-8 text-zinc-500 text-sm">No Drawing Sets</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {drawingSets.slice(0, 10).map(drawing => (
                  <div key={drawing.id} className="p-3 bg-zinc-950 border border-zinc-800 rounded hover:border-zinc-700 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={`text-[10px] ${
                            drawing.status === 'FFF' ? 'bg-green-500/10 text-green-400 border-green-500/30' :
                            drawing.status === 'BFA' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                            'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          }`}>
                            {drawing.status}
                          </Badge>
                          {drawing.current_revision && (
                            <p className="text-xs font-mono text-zinc-500">Rev {drawing.current_revision}</p>
                          )}
                        </div>
                        <p className="text-sm text-white truncate">{drawing.set_name}</p>
                        {drawing.released_for_fab_date && (
                          <p className="text-xs text-green-400 mt-1">
                            Released: {format(new Date(drawing.released_for_fab_date), 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>
                      <Link to={createPageUrl('Drawings') + `?set=${drawing.id}`}>
                        <Button size="sm" variant="ghost" className="text-xs text-amber-400">
                          <ExternalLink size={12} />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
                {drawingSets.length > 10 && (
                  <Link to={createPageUrl('Drawings')}>
                    <Button variant="outline" size="sm" className="w-full border-zinc-800 text-xs">
                      View All {drawingSets.length} Drawing Sets
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="docs" className="space-y-2">
            {documents.length === 0 ? (
              <p className="text-center py-8 text-zinc-500 text-sm">No Documents</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {documents.slice(0, 10).map(doc => (
                  <div key={doc.id} className="p-3 bg-zinc-950 border border-zinc-800 rounded hover:border-zinc-700 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <File size={12} className="text-zinc-500" />
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {doc.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-white truncate">{doc.title}</p>
                        <p className="text-xs text-zinc-500 mt-1">
                          Uploaded {format(new Date(doc.created_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="ghost" className="text-xs text-blue-400">
                          <ExternalLink size={12} />
                        </Button>
                      </a>
                    </div>
                  </div>
                ))}
                {documents.length > 10 && (
                  <Link to={createPageUrl('Documents')}>
                    <Button variant="outline" size="sm" className="w-full border-zinc-800 text-xs">
                      View All {documents.length} Documents
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}