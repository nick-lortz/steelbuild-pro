import React, { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, FileWarning, Lightbulb, Flag, MessageSquare, CheckCircle2, X, Eye, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function DrawingAnalysisDashboard({ drawingSetId, projectId }) {
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: conflicts = [] } = useQuery({
    queryKey: ['drawing-conflicts', projectId],
    queryFn: () => base44.entities.DrawingConflict.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: erectionIssues = [] } = useQuery({
    queryKey: ['erection-issues', projectId],
    queryFn: () => base44.entities.ErectionIssue.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: rfiSuggestions = [] } = useQuery({
    queryKey: ['rfi-suggestions', projectId],
    queryFn: () => base44.entities.RFISuggestion.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: connectionImprovements = [] } = useQuery({
    queryKey: ['connection-improvements', projectId],
    queryFn: () => base44.entities.ConnectionImprovement.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: designFlags = [] } = useQuery({
    queryKey: ['design-flags', projectId],
    queryFn: () => base44.entities.DesignIntentFlag.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: sheets = [] } = useQuery({
    queryKey: ['drawing-sheets', projectId],
    queryFn: () => base44.entities.DrawingSheet.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const updateConflictMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DrawingConflict.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['drawing-conflicts']);
      toast.success('Updated');
    }
  });

  const updateErectionIssueMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ErectionIssue.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['erection-issues']);
      toast.success('Updated');
    }
  });

  const updateRFISuggestionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RFISuggestion.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['rfi-suggestions']);
      toast.success('Updated');
    }
  });

  const convertToRFIMutation = useMutation({
    mutationFn: async (suggestion) => {
      // Get max RFI number to avoid conflicts
      const existingRFIs = await base44.entities.RFI.filter({ project_id: projectId });
      const maxRFINumber = existingRFIs.reduce((max, rfi) => Math.max(max, rfi.rfi_number || 0), 0);
      
      const rfi = await base44.entities.RFI.create({
        project_id: projectId,
        rfi_number: maxRFINumber + 1,
        subject: `Drawing Conflict - ${suggestion.location_reference || 'Auto-generated'}`,
        question: suggestion.proposed_question,
        status: 'draft',
        priority: suggestion.schedule_risk === 'high' ? 'high' : 'medium',
        fab_blocker: suggestion.fabrication_hold
      });

      await base44.entities.RFISuggestion.update(suggestion.id, {
        status: 'converted_to_rfi',
        linked_rfi_id: rfi.id
      });

      return rfi;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['rfi-suggestions']);
      queryClient.invalidateQueries(['rfis']);
      toast.success('RFI created');
    }
  });

  const getSheetNumber = (sheetId) => {
    const sheet = sheets.find(s => s.id === sheetId);
    return sheet?.sheet_number || 'Unknown';
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'medium': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default: return 'bg-zinc-700/20 text-zinc-400 border-zinc-600/30';
    }
  };

  const stats = useMemo(() => ({
    openConflicts: conflicts.filter(c => c.status === 'open').length,
    criticalConflicts: conflicts.filter(c => c.risk_level === 'critical' && c.status === 'open').length,
    openErectionIssues: erectionIssues.filter(e => e.status === 'open').length,
    highRiskIssues: erectionIssues.filter(e => e.install_risk === 'high' && e.status === 'open').length,
    pendingRFIs: rfiSuggestions.filter(r => r.status === 'pending_review').length,
    fabricationHolds: rfiSuggestions.filter(r => r.fabrication_hold && r.status === 'pending_review').length,
    pendingImprovements: connectionImprovements.filter(ci => ci.status === 'pending_review').length,
    pendingFlags: designFlags.filter(df => df.status === 'flagged' || df.status === 'pm_review').length
  }), [conflicts, erectionIssues, rfiSuggestions, connectionImprovements, designFlags]);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-red-900/20 border-red-700/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={14} className="text-red-400" />
              <div className="text-xs text-red-300">Critical Conflicts</div>
            </div>
            <div className="text-2xl font-bold text-white">{stats.criticalConflicts}</div>
            <div className="text-xs text-zinc-500 mt-1">{stats.openConflicts} total open</div>
          </CardContent>
        </Card>

        <Card className="bg-orange-900/20 border-orange-700/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <FileWarning size={14} className="text-orange-400" />
              <div className="text-xs text-orange-300">Erection Risks</div>
            </div>
            <div className="text-2xl font-bold text-white">{stats.highRiskIssues}</div>
            <div className="text-xs text-zinc-500 mt-1">{stats.openErectionIssues} total open</div>
          </CardContent>
        </Card>

        <Card className="bg-blue-900/20 border-blue-700/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare size={14} className="text-blue-400" />
              <div className="text-xs text-blue-300">Pending RFIs</div>
            </div>
            <div className="text-2xl font-bold text-white">{stats.pendingRFIs}</div>
            <div className="text-xs text-zinc-500 mt-1">{stats.fabricationHolds} hold fab</div>
          </CardContent>
        </Card>

        <Card className="bg-amber-900/20 border-amber-700/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Flag size={14} className="text-amber-400" />
              <div className="text-xs text-amber-300">PM Review Flags</div>
            </div>
            <div className="text-2xl font-bold text-white">{stats.pendingFlags}</div>
            <div className="text-xs text-zinc-500 mt-1">Design changes</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Analysis */}
      <Tabs defaultValue="conflicts" className="mt-4">
        <TabsList className="bg-zinc-800 border border-zinc-700">
          <TabsTrigger value="conflicts">
            Conflicts ({stats.openConflicts})
          </TabsTrigger>
          <TabsTrigger value="erection">
            Erection Risks ({stats.openErectionIssues})
          </TabsTrigger>
          <TabsTrigger value="rfis">
            RFI Queue ({stats.pendingRFIs})
          </TabsTrigger>
          <TabsTrigger value="improvements">
            Improvements ({stats.pendingImprovements})
          </TabsTrigger>
          <TabsTrigger value="flags">
            Design Flags ({stats.pendingFlags})
          </TabsTrigger>
        </TabsList>

        {/* Conflicts Tab */}
        <TabsContent value="conflicts" className="space-y-3 mt-4">
          {conflicts.filter(c => c.status === 'open').map(conflict => (
            <Card key={conflict.id} className="bg-zinc-800/50 border-zinc-700">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className={cn("text-xs font-semibold", getRiskColor(conflict.risk_level))}>
                        {conflict.risk_level?.toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className="text-xs bg-zinc-900/50 border-zinc-700">
                        {conflict.conflict_type?.replace('_', ' ').toUpperCase()}
                      </Badge>
                      {conflict.fabrication_impact && (
                        <Badge className="text-xs bg-red-500/20 text-red-400 border-red-500/30">FAB HOLD</Badge>
                      )}
                      {conflict.design_intent_change && (
                        <Badge className="text-xs bg-purple-500/20 text-purple-400 border-purple-500/30">DESIGN CHANGE</Badge>
                      )}
                    </div>
                    <div className="text-sm text-white font-medium mb-2">{conflict.description}</div>
                    <div className="text-xs text-zinc-400 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-blue-400">{getSheetNumber(conflict.sheet_1_id)}</span>
                        <span>→</span>
                        <span className="text-zinc-500">{conflict.sheet_1_value}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-blue-400">{getSheetNumber(conflict.sheet_2_id)}</span>
                        <span>→</span>
                        <span className="text-zinc-500">{conflict.sheet_2_value}</span>
                      </div>
                      {conflict.location_reference && (
                        <div className="text-amber-400 mt-1">@ {conflict.location_reference}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => updateConflictMutation.mutate({ id: conflict.id, data: { status: 'resolved' }})}
                      disabled={updateConflictMutation.isPending}
                      className="h-7 text-green-400 hover:text-green-300 hover:bg-green-500/10"
                    >
                      <CheckCircle2 size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => updateConflictMutation.mutate({ id: conflict.id, data: { status: 'waived' }})}
                      disabled={updateConflictMutation.isPending}
                      className="h-7 text-zinc-400 hover:text-zinc-300"
                    >
                      <X size={14} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {conflicts.filter(c => c.status === 'open').length === 0 && (
            <div className="text-center py-8 text-zinc-500 text-sm">No open conflicts</div>
          )}
        </TabsContent>

        {/* Erection Issues Tab */}
        <TabsContent value="erection" className="space-y-3 mt-4">
          {erectionIssues.filter(e => e.status === 'open').map(issue => (
            <Card key={issue.id} className="bg-zinc-800/50 border-zinc-700">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className={cn("text-xs font-semibold", getRiskColor(issue.install_risk))}>
                        {issue.install_risk?.toUpperCase()} INSTALL RISK
                      </Badge>
                      <Badge variant="outline" className="text-xs bg-zinc-900/50 border-zinc-700">
                        {issue.issue_type?.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-sm text-white font-medium mb-2">{issue.description}</div>
                    <div className="text-xs text-zinc-400 space-y-1">
                      <div className="font-mono text-blue-400">{getSheetNumber(issue.sheet_id)}</div>
                      {issue.related_connection && (
                        <div>Connection: <span className="text-amber-400">{issue.related_connection}</span></div>
                      )}
                      {issue.location_reference && (
                        <div>Location: <span className="text-amber-400">{issue.location_reference}</span></div>
                      )}
                      <div className="flex gap-3 mt-2 text-[10px]">
                        <span>Delay Risk: <span className={cn("font-semibold", getRiskColor(issue.field_delay_risk))}>{issue.field_delay_risk}</span></span>
                        <span>Inspect Risk: <span className={cn("font-semibold", getRiskColor(issue.inspection_risk))}>{issue.inspection_risk}</span></span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => updateErectionIssueMutation.mutate({ id: issue.id, data: { status: 'acknowledged' }})}
                      disabled={updateErectionIssueMutation.isPending}
                      className="h-7 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                    >
                      <Eye size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => updateErectionIssueMutation.mutate({ id: issue.id, data: { status: 'resolved' }})}
                      disabled={updateErectionIssueMutation.isPending}
                      className="h-7 text-green-400 hover:text-green-300 hover:bg-green-500/10"
                    >
                      <CheckCircle2 size={14} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {erectionIssues.filter(e => e.status === 'open').length === 0 && (
            <div className="text-center py-8 text-zinc-500 text-sm">No open erection issues</div>
          )}
        </TabsContent>

        {/* RFI Suggestions Tab */}
        <TabsContent value="rfis" className="space-y-3 mt-4">
          {rfiSuggestions.filter(r => r.status === 'pending_review').map(rfi => (
            <Card key={rfi.id} className="bg-zinc-800/50 border-zinc-700">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs bg-zinc-900/50 border-zinc-700">
                        {rfi.trigger_source?.replace('_', ' ').toUpperCase()}
                      </Badge>
                      {rfi.fabrication_hold && (
                        <Badge className="text-xs bg-red-500/20 text-red-400 border-red-500/30">HOLD FAB</Badge>
                      )}
                      <Badge variant="outline" className={cn("text-xs", getRiskColor(rfi.schedule_risk))}>
                        {rfi.schedule_risk} SCHEDULE RISK
                      </Badge>
                    </div>
                    <div className="text-sm text-white mb-3 leading-relaxed">{rfi.proposed_question}</div>
                    {rfi.location_reference && (
                      <div className="text-xs text-amber-400 mb-2">@ {rfi.location_reference}</div>
                    )}
                    {rfi.referenced_sheets?.length > 0 && (
                      <div className="text-xs text-zinc-400">
                        Refs: {rfi.referenced_sheets.map(getSheetNumber).join(', ')}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button
                      size="sm"
                      onClick={() => convertToRFIMutation.mutate(rfi)}
                      disabled={convertToRFIMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700 h-7 text-xs"
                    >
                      {convertToRFIMutation.isPending ? 'Creating...' : 'Convert to RFI'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => updateRFISuggestionMutation.mutate({ id: rfi.id, data: { status: 'rejected' }})}
                      disabled={updateRFISuggestionMutation.isPending}
                      className="h-7 text-xs text-zinc-400 hover:text-zinc-300"
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {rfiSuggestions.filter(r => r.status === 'pending_review').length === 0 && (
            <div className="text-center py-8 text-zinc-500 text-sm">No pending RFI suggestions</div>
          )}
        </TabsContent>

        {/* Connection Improvements Tab */}
        <TabsContent value="improvements" className="space-y-3 mt-4">
          {connectionImprovements.filter(ci => ci.status === 'pending_review').map(improvement => (
            <Card key={improvement.id} className="bg-zinc-800/50 border-zinc-700">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb size={14} className="text-amber-400" />
                      <Badge variant="outline" className="text-xs bg-zinc-900/50 border-zinc-700">
                        {improvement.improvement_category?.replace('_', ' ').toUpperCase()}
                      </Badge>
                      {improvement.estimated_savings > 0 && (
                        <Badge className="text-xs bg-green-500/20 text-green-400 border-green-500/30">
                          ${improvement.estimated_savings.toLocaleString()} savings
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-white font-medium mb-1">
                      Detail {improvement.original_detail_reference}
                    </div>
                    <div className="text-sm text-zinc-300 mb-2">{improvement.suggested_improvement}</div>
                    <div className="text-xs text-zinc-500">
                      Sheet: <span className="font-mono text-blue-400">{getSheetNumber(improvement.sheet_id)}</span>
                    </div>
                    {improvement.applicability_tags?.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {improvement.applicability_tags.map(tag => (
                          <Badge key={tag} variant="outline" className="text-[9px] bg-zinc-900/50">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button
                      size="sm"
                      onClick={async () => {
                        await base44.entities.ConnectionImprovement.update(improvement.id, { status: 'approved' });
                        queryClient.invalidateQueries(['connection-improvements']);
                        toast.success('Approved');
                      }}
                      className="bg-green-600 hover:bg-green-700 h-7 text-xs"
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        await base44.entities.ConnectionImprovement.update(improvement.id, { status: 'rejected' });
                        queryClient.invalidateQueries(['connection-improvements']);
                        toast.success('Rejected');
                      }}
                      className="h-7 text-xs text-zinc-400"
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {connectionImprovements.filter(ci => ci.status === 'pending_review').length === 0 && (
            <div className="text-center py-8 text-zinc-500 text-sm">No pending improvements</div>
          )}
        </TabsContent>

        {/* Design Intent Flags Tab */}
        <TabsContent value="flags" className="space-y-3 mt-4">
          {designFlags.filter(df => ['flagged', 'pm_review', 'engineer_review'].includes(df.status)).map(flag => (
            <Card key={flag.id} className="bg-zinc-800/50 border-amber-700/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Flag size={14} className="text-amber-400" />
                      <Badge variant="outline" className="text-xs bg-amber-500/20 text-amber-400 border-amber-500/30">
                        {flag.change_category?.replace('_', ' ').toUpperCase()}
                      </Badge>
                      {flag.requires_PM_approval && (
                        <Badge className="text-xs bg-red-500/20 text-red-400 border-red-500/30">PM APPROVAL REQ</Badge>
                      )}
                      {flag.requires_engineer_review && (
                        <Badge className="text-xs bg-purple-500/20 text-purple-400 border-purple-500/30">EOR REVIEW</Badge>
                      )}
                    </div>
                    <div className="text-sm text-white font-medium mb-2">{flag.description}</div>
                    <div className="text-xs text-zinc-400 space-y-1">
                      <div>Sheet: <span className="font-mono text-blue-400">{getSheetNumber(flag.sheet_id)}</span></div>
                      {flag.location_reference && (
                        <div>Location: <span className="text-amber-400">{flag.location_reference}</span></div>
                      )}
                      {flag.original_intent && (
                        <div className="grid grid-cols-2 gap-2 mt-2 p-2 bg-zinc-900/50 rounded">
                          <div>
                            <div className="text-[10px] text-zinc-600 mb-0.5">ORIGINAL</div>
                            <div className="text-xs text-zinc-300">{flag.original_intent}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-zinc-600 mb-0.5">NEW</div>
                            <div className="text-xs text-amber-400">{flag.new_intent}</div>
                          </div>
                        </div>
                      )}
                      {(flag.cost_impact_estimate > 0 || flag.schedule_impact_days > 0) && (
                        <div className="flex gap-3 mt-2 text-[10px]">
                          {flag.cost_impact_estimate > 0 && (
                            <span className="text-red-400">Cost: +${flag.cost_impact_estimate.toLocaleString()}</span>
                          )}
                          {flag.schedule_impact_days > 0 && (
                            <span className="text-orange-400">Schedule: +{flag.schedule_impact_days}d</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button
                      size="sm"
                      onClick={async () => {
                        await base44.entities.DesignIntentFlag.update(flag.id, { 
                          status: 'approved', 
                          approved_by: currentUser?.email, 
                          approved_at: new Date().toISOString() 
                        });
                        queryClient.invalidateQueries(['design-flags']);
                        toast.success('Approved');
                      }}
                      className="bg-green-600 hover:bg-green-700 h-7 text-xs"
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        await base44.entities.DesignIntentFlag.update(flag.id, { status: 'rejected' });
                        queryClient.invalidateQueries(['design-flags']);
                        toast.success('Rejected');
                      }}
                      className="h-7 text-xs text-zinc-400"
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {designFlags.filter(df => ['flagged', 'pm_review', 'engineer_review'].includes(df.status)).length === 0 && (
            <div className="text-center py-8 text-zinc-500 text-sm">No pending design flags</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}