import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Lock, Unlock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ReleaseGatingPanel({ wpId, projectId }) {
  const { data: gatingStatus, isLoading } = useQuery({
    queryKey: ['releaseGating', wpId],
    queryFn: async () => {
      const response = await base44.functions.invoke('enforceReleaseGating', {
        wpId,
        projectId
      });
      return response.data;
    },
    enabled: !!wpId && !!projectId
  });

  if (isLoading) return <div className="text-gray-400">Checking release gates...</div>;
  if (!gatingStatus) return null;

  const { can_release, blocking_issues } = gatingStatus;

  return (
    <Card className="border-amber-900/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {can_release ? (
              <>
                <Unlock className="w-5 h-5 text-green-500" />
                <span className="text-green-400">Release Gating: CLEAR</span>
              </>
            ) : (
              <>
                <Lock className="w-5 h-5 text-red-500" />
                <span className="text-red-400">Release Gating: BLOCKED</span>
              </>
            )}
          </CardTitle>
        </div>
        <CardDescription>Hard gates to erection phase release</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {blocking_issues.length > 0 ? (
          <Alert className="border-red-900/30 bg-red-950/20">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-200">
              {blocking_issues.length} blocking issue(s)
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-green-900/30 bg-green-950/20">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            <AlertDescription className="text-green-200">
              All release gates satisfied—ready to move to erection
            </AlertDescription>
          </Alert>
        )}

        {blocking_issues.map((issue) => (
          <div key={issue.category} className="border-l-2 border-amber-700/50 pl-4 py-2">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="destructive" className="text-xs">
                {issue.category === 'open_rfi' ? '🔴 OPEN RFI' : '📦 UNSHIPPED'}
              </Badge>
              <span className="text-sm text-amber-200">{issue.count} item(s)</span>
            </div>
            {issue.details && (
              <div className="text-xs text-gray-400 space-y-1">
                {issue.details.map((detail, idx) => (
                  <div key={idx}>
                    {issue.category === 'open_rfi' ? (
                      <div>RFI-{detail.rfi_number}: {detail.subject}</div>
                    ) : (
                      <div>DEL-{detail.delivery_number}: {detail.status}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}