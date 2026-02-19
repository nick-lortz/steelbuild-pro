import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertTriangle, 
  CheckCircle2, 
  PlayCircle, 
  Loader2, 
  FileWarning, 
  Link as LinkIcon,
  Code,
  Shield,
  Database,
  Zap,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function AuditDashboard() {
  const queryClient = useQueryClient();
  const [scope, setScope] = useState('FULL_APP');

  const { data: auditRuns = [], isLoading: runsLoading } = useQuery({
    queryKey: ['audit-runs'],
    queryFn: () => base44.entities.AuditRun.list('-started_at', 50)
  });

  const latestRun = auditRuns[0];

  const { data: findings = [] } = useQuery({
    queryKey: ['audit-findings', latestRun?.id],
    queryFn: () => base44.entities.AuditFinding.filter({ audit_run_id: latestRun.id }),
    enabled: !!latestRun?.id
  });

  const { data: fixTasks = [] } = useQuery({
    queryKey: ['audit-fix-tasks'],
    queryFn: () => base44.entities.AuditFixTask.list('-created_date', 100)
  });

  const runAuditMutation = useMutation({
    mutationFn: (auditScope) => base44.functions.invoke('runFullAppAudit', { scope: auditScope }),
    onSuccess: () => {
      queryClient.invalidateQueries(['audit-runs']);
      queryClient.invalidateQueries(['audit-findings']);
      toast.success('Audit started');
    },
    onError: (error) => {
      toast.error(error.message || 'Audit failed');
    }
  });

  const applyFixMutation = useMutation({
    mutationFn: (findingId) => base44.functions.invoke('applyAutoFix', { audit_finding_id: findingId }),
    onSuccess: () => {
      queryClient.invalidateQueries(['audit-findings']);
      queryClient.invalidateQueries(['audit-fix-tasks']);
      toast.success('Fix applied');
    },
    onError: (error) => {
      toast.error(error.message || 'Fix failed');
    }
  });

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'HIGH': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'MEDIUM': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default: return 'bg-zinc-700/20 text-zinc-400 border-zinc-600/30';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'ROUTES': return LinkIcon;
      case 'IMPORTS': return Code;
      case 'AUTHZ': return Shield;
      case 'DATA_FLOW': return Database;
      case 'FORMULAS': return Zap;
      case 'RUNTIME_ERRORS': return XCircle;
      default: return FileWarning;
    }
  };

  const groupedFindings = findings.reduce((acc, f) => {
    if (!acc[f.severity]) acc[f.severity] = [];
    acc[f.severity].push(f);
    return acc;
  }, {});

  const isRunning = latestRun?.status === 'RUNNING';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">App Audit System</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Automated code quality, security, and runtime validation
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={scope} onValueChange={setScope} disabled={isRunning}>
            <SelectTrigger className="w-48 bg-zinc-800 border-zinc-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FULL_APP">Full App Audit</SelectItem>
              <SelectItem value="FRONTEND_ONLY">Frontend Only</SelectItem>
              <SelectItem value="BACKEND_ONLY">Backend Only</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => runAuditMutation.mutate(scope)}
            disabled={isRunning || runAuditMutation.isPending}
            className="bg-amber-500 hover:bg-amber-600 text-black font-bold"
          >
            {isRunning || runAuditMutation.isPending ? (
              <>
                <Loader2 size={16} className="animate-spin mr-2" />
                Running...
              </>
            ) : (
              <>
                <PlayCircle size={16} className="mr-2" />
                Run Audit
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Latest Run Summary */}
      {latestRun && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <Card className="bg-zinc-800/50 border-zinc-700">
            <CardContent className="p-4">
              <div className="text-xs text-zinc-500 mb-1">Total Issues</div>
              <div className="text-2xl font-bold text-white">{latestRun.counts?.total || 0}</div>
            </CardContent>
          </Card>
          <Card className="bg-red-900/20 border-red-700/30">
            <CardContent className="p-4">
              <div className="text-xs text-red-300 mb-1">Critical</div>
              <div className="text-2xl font-bold text-white">{latestRun.counts?.critical || 0}</div>
            </CardContent>
          </Card>
          <Card className="bg-orange-900/20 border-orange-700/30">
            <CardContent className="p-4">
              <div className="text-xs text-orange-300 mb-1">High</div>
              <div className="text-2xl font-bold text-white">{latestRun.counts?.high || 0}</div>
            </CardContent>
          </Card>
          <Card className="bg-amber-900/20 border-amber-700/30">
            <CardContent className="p-4">
              <div className="text-xs text-amber-300 mb-1">Medium</div>
              <div className="text-2xl font-bold text-white">{latestRun.counts?.medium || 0}</div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-800/50 border-zinc-700">
            <CardContent className="p-4">
              <div className="text-xs text-zinc-500 mb-1">Low</div>
              <div className="text-2xl font-bold text-white">{latestRun.counts?.low || 0}</div>
            </CardContent>
          </Card>
          <Card className="bg-green-900/20 border-green-700/30">
            <CardContent className="p-4">
              <div className="text-xs text-green-300 mb-1">Auto-Fixed</div>
              <div className="text-2xl font-bold text-white">{latestRun.counts?.auto_fixed || 0}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Findings */}
      {latestRun && findings.length > 0 && (
        <Tabs defaultValue="CRITICAL" className="mt-6">
          <TabsList className="bg-zinc-800 border border-zinc-700">
            <TabsTrigger value="CRITICAL">
              Critical ({groupedFindings.CRITICAL?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="HIGH">
              High ({groupedFindings.HIGH?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="MEDIUM">
              Medium ({groupedFindings.MEDIUM?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="LOW">
              Low ({groupedFindings.LOW?.length || 0})
            </TabsTrigger>
          </TabsList>

          {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(severity => (
            <TabsContent key={severity} value={severity} className="space-y-3 mt-4">
              {(groupedFindings[severity] || []).map(finding => {
                const CategoryIcon = getCategoryIcon(finding.category);
                
                return (
                  <Card key={finding.id} className="bg-zinc-800/50 border-zinc-700">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-3">
                            <CategoryIcon size={14} className="text-zinc-400" />
                            <Badge variant="outline" className={cn("text-xs font-semibold", getSeverityColor(finding.severity))}>
                              {finding.severity}
                            </Badge>
                            <Badge variant="outline" className="text-xs bg-zinc-900/50 border-zinc-700">
                              {finding.category}
                            </Badge>
                            {finding.fix_applied && (
                              <Badge className="text-xs bg-green-500/20 text-green-400 border-green-500/30">
                                <CheckCircle2 size={10} className="mr-1" />
                                FIXED
                              </Badge>
                            )}
                            {finding.auto_fixable && !finding.fix_applied && (
                              <Badge className="text-xs bg-blue-500/20 text-blue-400 border-blue-500/30">
                                AUTO-FIXABLE
                              </Badge>
                            )}
                          </div>

                          <div className="text-base font-semibold text-white mb-2">{finding.title}</div>
                          <div className="text-sm text-zinc-300 mb-3">{finding.description}</div>

                          <div className="space-y-2 text-xs">
                            <div className="flex items-start gap-2">
                              <span className="text-zinc-600 min-w-24">Location:</span>
                              <span className="font-mono text-blue-400">{finding.location}</span>
                            </div>
                            {finding.root_cause && (
                              <div className="flex items-start gap-2">
                                <span className="text-zinc-600 min-w-24">Root Cause:</span>
                                <span className="text-zinc-400">{finding.root_cause}</span>
                              </div>
                            )}
                            {finding.proposed_fix && (
                              <div className="flex items-start gap-2">
                                <span className="text-zinc-600 min-w-24">Proposed Fix:</span>
                                <span className="text-amber-400">{finding.proposed_fix}</span>
                              </div>
                            )}
                            {finding.fix_patch && (
                              <div className="flex items-start gap-2">
                                <span className="text-zinc-600 min-w-24">Applied Patch:</span>
                                <span className="text-green-400">{finding.fix_patch}</span>
                              </div>
                            )}
                            {finding.regression_checks && (
                              <div className="flex items-start gap-2">
                                <span className="text-zinc-600 min-w-24">Regression:</span>
                                <span className="text-zinc-500">{finding.regression_checks}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {finding.auto_fixable && !finding.fix_applied && (
                          <Button
                            size="sm"
                            onClick={() => applyFixMutation.mutate(finding.id)}
                            disabled={applyFixMutation.isPending}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Apply Fix
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {(groupedFindings[severity] || []).length === 0 && (
                <div className="text-center py-12 text-zinc-500">
                  No {severity.toLowerCase()} severity issues found
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Audit History */}
      <Card className="bg-zinc-800/50 border-zinc-700 mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Audit History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {auditRuns.map(run => (
              <div key={run.id} className="flex items-center justify-between p-3 bg-zinc-900/50 rounded border border-zinc-700">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className={cn(
                      "text-xs",
                      run.status === 'COMPLETED' && "bg-green-500/10 text-green-400 border-green-500/20",
                      run.status === 'RUNNING' && "bg-blue-500/10 text-blue-400 border-blue-500/20",
                      run.status === 'FAILED' && "bg-red-500/10 text-red-400 border-red-500/20"
                    )}>
                      {run.status}
                    </Badge>
                    <Badge variant="outline" className="text-xs bg-zinc-800 border-zinc-700">
                      {run.scope}
                    </Badge>
                  </div>
                  <div className="text-sm text-white">{run.summary || 'Audit in progress...'}</div>
                  <div className="text-xs text-zinc-500 mt-1">
                    Started {new Date(run.started_at).toLocaleString()} by {run.triggered_by_user_id}
                  </div>
                </div>
                {run.counts && (
                  <div className="flex gap-4 text-xs">
                    {run.counts.critical > 0 && <span className="text-red-400">{run.counts.critical} critical</span>}
                    {run.counts.high > 0 && <span className="text-orange-400">{run.counts.high} high</span>}
                    {run.counts.medium > 0 && <span className="text-amber-400">{run.counts.medium} med</span>}
                    {run.counts.auto_fixed > 0 && <span className="text-green-400">{run.counts.auto_fixed} fixed</span>}
                  </div>
                )}
              </div>
            ))}
            {auditRuns.length === 0 && (
              <div className="text-center py-8 text-zinc-500">No audits run yet</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}