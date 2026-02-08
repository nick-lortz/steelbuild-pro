import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { format, parseISO, startOfDay, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';

export default function FieldIssueDashboard({ projectId }) {
  const [filter, setFilter] = useState('all');

  const { data: issues = [] } = useQuery({
    queryKey: ['field-issues', projectId],
    queryFn: () => base44.entities.FieldIssue.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  // Metrics
  const metrics = useMemo(() => {
    const open = issues.filter(i => i.status === 'open');
    const critical = issues.filter(i => i.severity === 'critical');
    const stoppedWork = issues.filter(i => i.work_stopped);
    const repeat = issues.filter(i => i.repeat_issue);

    const totalDelayHours = stoppedWork.reduce((sum, i) => sum + (i.estimated_delay_hours || 0), 0);

    return {
      total: issues.length,
      open: open.length,
      critical: critical.length,
      stoppedWork: stoppedWork.length,
      repeat: repeat.length,
      totalDelayHours
    };
  }, [issues]);

  // Issue type breakdown
  const issuesByType = useMemo(() => {
    const map = new Map();
    issues.forEach(issue => {
      const key = issue.issue_type;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map, ([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
  }, [issues]);

  // Issue root cause breakdown
  const issuesByRootCause = useMemo(() => {
    const map = new Map();
    issues.forEach(issue => {
      const key = issue.root_cause || 'unknown';
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map, ([cause, count]) => ({ cause, count })).sort((a, b) => b.count - a.count);
  }, [issues]);

  // Connection type heatmap
  const connectionHeatmap = useMemo(() => {
    const map = new Map();
    issues.forEach(issue => {
      if (issue.affected_connection_types?.length > 0) {
        issue.affected_connection_types.forEach(conn => {
          const existing = map.get(conn) || { count: 0, critical: 0, repeat: 0 };
          map.set(conn, {
            count: existing.count + 1,
            critical: existing.critical + (issue.severity === 'critical' ? 1 : 0),
            repeat: existing.repeat + (issue.repeat_issue ? 1 : 0)
          });
        });
      }
    });
    return Array.from(map, ([type, data]) => ({ type, ...data })).sort((a, b) => b.count - a.count);
  }, [issues]);

  // Erection zone heatmap
  const zoneHeatmap = useMemo(() => {
    const map = new Map();
    issues.forEach(issue => {
      if (issue.erection_zone) {
        const existing = map.get(issue.erection_zone) || { count: 0, critical: 0 };
        map.set(issue.erection_zone, {
          count: existing.count + 1,
          critical: existing.critical + (issue.severity === 'critical' ? 1 : 0)
        });
      }
    });
    return Array.from(map, ([zone, data]) => ({ zone, ...data })).sort((a, b) => b.count - a.count);
  }, [issues]);

  // Recent issues
  const recentIssues = useMemo(() => {
    return [...issues].sort((a, b) => new Date(b.issue_date) - new Date(a.issue_date)).slice(0, 10);
  }, [issues]);

  // Repeat issues
  const repeatIssues = useMemo(() => {
    return issues.filter(i => i.repeat_issue).sort((a, b) => new Date(b.issue_date) - new Date(a.issue_date));
  }, [issues]);

  const filteredIssues = useMemo(() => {
    if (filter === 'all') return recentIssues;
    if (filter === 'critical') return recentIssues.filter(i => i.severity === 'critical');
    if (filter === 'repeat') return repeatIssues;
    return recentIssues;
  }, [filter, recentIssues, repeatIssues]);

  return (
    <div className="space-y-4">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="pt-4">
            <div className="text-3xl font-bold text-white">{metrics.total}</div>
            <div className="text-xs text-zinc-400 mt-1">Total Issues</div>
          </CardContent>
        </Card>

        <Card className="bg-red-950/40 border-red-800">
          <CardContent className="pt-4">
            <div className="text-3xl font-bold text-red-400">{metrics.open}</div>
            <div className="text-xs text-red-300 mt-1">Open</div>
          </CardContent>
        </Card>

        <Card className="bg-orange-950/40 border-orange-800">
          <CardContent className="pt-4">
            <div className="text-3xl font-bold text-orange-400">{metrics.critical}</div>
            <div className="text-xs text-orange-300 mt-1">Critical</div>
          </CardContent>
        </Card>

        <Card className="bg-yellow-950/40 border-yellow-800">
          <CardContent className="pt-4">
            <div className="text-3xl font-bold text-yellow-400">{metrics.stoppedWork}</div>
            <div className="text-xs text-yellow-300 mt-1">Halted Work</div>
          </CardContent>
        </Card>

        <Card className="bg-blue-950/40 border-blue-800">
          <CardContent className="pt-4">
            <div className="text-3xl font-bold text-blue-400">{metrics.repeat}</div>
            <div className="text-xs text-blue-300 mt-1">Repeat</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="recent" className="w-full">
        <TabsList className="bg-zinc-800 border-zinc-700 grid w-full grid-cols-4">
          <TabsTrigger value="recent">Recent</TabsTrigger>
          <TabsTrigger value="connections">Connections</TabsTrigger>
          <TabsTrigger value="zones">Zones</TabsTrigger>
          <TabsTrigger value="analysis">Root Cause</TabsTrigger>
        </TabsList>

        {/* Recent Issues */}
        <TabsContent value="recent" className="mt-4 space-y-2">
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setFilter('all')}
              className={cn(
                'px-3 py-1 rounded text-xs font-bold',
                filter === 'all'
                  ? 'bg-zinc-600 text-white'
                  : 'bg-zinc-700 text-zinc-400 hover:text-white'
              )}
            >
              All ({recentIssues.length})
            </button>
            <button
              onClick={() => setFilter('critical')}
              className={cn(
                'px-3 py-1 rounded text-xs font-bold',
                filter === 'critical'
                  ? 'bg-orange-600 text-white'
                  : 'bg-zinc-700 text-zinc-400 hover:text-white'
              )}
            >
              Critical ({recentIssues.filter(i => i.severity === 'critical').length})
            </button>
            <button
              onClick={() => setFilter('repeat')}
              className={cn(
                'px-3 py-1 rounded text-xs font-bold',
                filter === 'repeat'
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-700 text-zinc-400 hover:text-white'
              )}
            >
              Repeat ({repeatIssues.length})
            </button>
          </div>

          {filteredIssues.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-sm">No issues matching filter</div>
          ) : (
            <div className="space-y-2">
              {filteredIssues.map(issue => (
                <Card key={issue.id} className="bg-zinc-900 border-zinc-700 hover:border-zinc-600 transition">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-white text-sm">{issue.issue_type}</span>
                          <Badge className={
                            issue.severity === 'critical'
                              ? 'bg-red-600'
                              : issue.severity === 'moderate'
                              ? 'bg-yellow-600'
                              : 'bg-green-600'
                          }>
                            {issue.severity}
                          </Badge>
                          {issue.work_stopped && (
                            <Badge className="bg-red-700">Work Stopped</Badge>
                          )}
                          {issue.repeat_issue && (
                            <Badge className="bg-blue-700">Repeat</Badge>
                          )}
                        </div>
                        <p className="text-xs text-zinc-300 line-clamp-1">{issue.description}</p>
                        <div className="text-xs text-zinc-500 mt-2 space-y-1">
                          <div>Zone: <span className="text-zinc-300">{issue.erection_zone || 'N/A'}</span></div>
                          <div>Crew: <span className="text-zinc-300">{issue.erection_crew || 'N/A'}</span></div>
                          {issue.affected_piece_marks?.length > 0 && (
                            <div>Piece Marks: <span className="text-zinc-300">{issue.affected_piece_marks.join(', ')}</span></div>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-xs text-zinc-400">{format(parseISO(issue.issue_date), 'MMM d')}</div>
                        <Badge variant="outline" className="mt-1 text-[10px]">{issue.status}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Connection Type Heatmap */}
        <TabsContent value="connections" className="mt-4 space-y-2">
          {connectionHeatmap.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-sm">No connection issues logged</div>
          ) : (
            connectionHeatmap.map(item => {
              const riskScore = item.critical + (item.repeat * 0.5);
              return (
                <Card key={item.type} className="bg-zinc-900 border-zinc-700">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-white text-sm">{item.type}</span>
                      <div className="flex gap-2">
                        <Badge className="bg-red-600">{item.critical} Critical</Badge>
                        <Badge className="bg-blue-600">{item.repeat} Repeat</Badge>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-zinc-700 rounded overflow-hidden">
                      <div
                        className={cn(
                          'h-full transition-all',
                          item.critical > 0 ? 'bg-red-600' : item.repeat > 0 ? 'bg-blue-600' : 'bg-yellow-600'
                        )}
                        style={{ width: `${Math.min(100, (item.count / connectionHeatmap[0].count) * 100)}%` }}
                      />
                    </div>
                    <div className="text-xs text-zinc-400 mt-2">{item.count} total issues</div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Erection Zone Heatmap */}
        <TabsContent value="zones" className="mt-4 space-y-2">
          {zoneHeatmap.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-sm">No zones logged</div>
          ) : (
            zoneHeatmap.map(item => (
              <Card key={item.zone} className="bg-zinc-900 border-zinc-700">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-white text-sm">{item.zone}</span>
                    {item.critical > 0 && (
                      <AlertTriangle size={16} className="text-red-500" />
                    )}
                  </div>
                  <div className="w-full h-2 bg-zinc-700 rounded overflow-hidden">
                    <div
                      className={item.critical > 0 ? 'bg-red-600' : 'bg-yellow-600'}
                      style={{ width: `${Math.min(100, (item.count / zoneHeatmap[0].count) * 100)}%` }}
                    />
                  </div>
                  <div className="text-xs text-zinc-400 mt-2">
                    {item.count} issue{item.count > 1 ? 's' : ''} ({item.critical} critical)
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Root Cause Analysis */}
        <TabsContent value="analysis" className="mt-4 space-y-2">
          {issuesByRootCause.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-sm">No root cause data</div>
          ) : (
            issuesByRootCause.map(item => (
              <Card key={item.cause} className="bg-zinc-900 border-zinc-700">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-white text-sm capitalize">{item.cause.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-700 rounded overflow-hidden">
                    <div
                      className="bg-purple-600"
                      style={{ width: `${(item.count / issuesByRootCause[0].count) * 100}%` }}
                    />
                  </div>
                  <div className="text-xs text-zinc-400 mt-2">{item.count} issue{item.count > 1 ? 's' : ''}</div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}