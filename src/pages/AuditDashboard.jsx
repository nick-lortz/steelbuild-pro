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
import AuditSummaryCards from '@/components/audit/AuditSummaryCards';
import FindingCard from '@/components/audit/FindingCard';

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
      {latestRun && <AuditSummaryCards counts={latestRun.counts} />}

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
              {(groupedFindings[severity] || []).map(finding => (
                <FindingCard 
                  key={finding.id} 
                  finding={finding} 
                  onApplyFix={() => applyFixMutation.mutate(finding.id)}
                />
              ))}
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