import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  TrendingUp,
  Camera,
  Wrench,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function FieldIssuesDashboard({ projectId, onIssueClick }) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: issues = [], isLoading } = useQuery({
    queryKey: ['field-issues', projectId],
    queryFn: () => base44.entities.FieldIssue.filter(
      { project_id: projectId },
      '-issue_date'
    ),
    enabled: !!projectId,
    refetchInterval: 30000 // Refresh every 30s
  });

  // Pattern detection - group by connection type + root cause
  const repeatPatterns = useMemo(() => {
    const patterns = {};
    
    issues.forEach(issue => {
      issue.affected_connection_types?.forEach(connType => {
        const key = `${connType}::${issue.root_cause}`;
        if (!patterns[key]) {
          patterns[key] = {
            connection_type: connType,
            root_cause: issue.root_cause,
            count: 0,
            issues: []
          };
        }
        patterns[key].count++;
        patterns[key].issues.push(issue);
      });
    });

    return Object.values(patterns)
      .filter(p => p.count >= 2)
      .sort((a, b) => b.count - a.count);
  }, [issues]);

  const filteredIssues = useMemo(() => {
    return issues.filter(issue => {
      if (statusFilter !== 'all' && issue.status !== statusFilter) return false;
      if (severityFilter !== 'all' && issue.severity !== severityFilter) return false;
      
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          issue.description?.toLowerCase().includes(term) ||
          issue.affected_piece_marks?.some(pm => pm.toLowerCase().includes(term)) ||
          issue.erection_zone?.toLowerCase().includes(term)
        );
      }
      
      return true;
    });
  }, [issues, statusFilter, severityFilter, searchTerm]);

  const stats = useMemo(() => ({
    total: issues.length,
    open: issues.filter(i => i.status === 'open').length,
    critical: issues.filter(i => i.severity === 'critical').length,
    work_stopped: issues.filter(i => i.work_stopped).length,
    with_photos: issues.filter(i => i.photos && i.photos.length > 0).length,
    repeat_patterns: repeatPatterns.length
  }), [issues, repeatPatterns]);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'moderate': return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'minor': return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      default: return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open': return <AlertCircle size={14} className="text-amber-500" />;
      case 'documented': return <Clock size={14} className="text-blue-500" />;
      case 'resolved': return <CheckCircle size={14} className="text-green-500" />;
      default: return <AlertTriangle size={14} className="text-zinc-500" />;
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-zinc-500">Loading issues...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-3">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Total</div>
            <div className="text-2xl font-bold text-white">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-3">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Open</div>
            <div className="text-2xl font-bold text-amber-500">{stats.open}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-3">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Critical</div>
            <div className="text-2xl font-bold text-red-500">{stats.critical}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-3">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Work Stopped</div>
            <div className="text-2xl font-bold text-red-500">{stats.work_stopped}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-3">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">With Photos</div>
            <div className="text-2xl font-bold text-blue-500">{stats.with_photos}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-3">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Repeats</div>
            <div className="text-2xl font-bold text-purple-500">{stats.repeat_patterns}</div>
          </CardContent>
        </Card>
      </div>

      {/* Repeat Patterns Alert */}
      {repeatPatterns.length > 0 && (
        <Card className="bg-purple-500/5 border-purple-500/30">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-purple-400">
              <TrendingUp size={16} />
              Repeat Patterns Detected
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {repeatPatterns.slice(0, 3).map((pattern, idx) => (
              <div key={idx} className="p-3 bg-zinc-900 rounded border border-zinc-800">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                      {pattern.count}x
                    </Badge>
                    <span className="text-sm font-semibold text-white">
                      {pattern.connection_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-500">
                    {pattern.root_cause.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="text-xs text-zinc-400">
                  Piece marks: {pattern.issues.flatMap(i => i.affected_piece_marks || []).slice(0, 5).join(', ')}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Input
                placeholder="Search piece marks, zones, description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="documented">Documented</SelectItem>
                <SelectItem value="rfi_created">RFI Created</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="minor">Minor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Issues List */}
      <div className="space-y-3">
        {filteredIssues.length === 0 ? (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-8 text-center text-zinc-500">
              No issues found
            </CardContent>
          </Card>
        ) : (
          filteredIssues.map(issue => (
            <Card 
              key={issue.id} 
              className={cn(
                "bg-zinc-900 border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors",
                issue.work_stopped && "border-l-4 border-l-red-500"
              )}
              onClick={() => onIssueClick?.(issue)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(issue.status)}
                    <Badge className={cn("text-[10px]", getSeverityColor(issue.severity))}>
                      {issue.severity}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {issue.issue_type.replace(/_/g, ' ')}
                    </Badge>
                    {issue.work_stopped && (
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">
                        WORK STOPPED
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    {issue.photos?.length > 0 && (
                      <Camera size={14} className="text-blue-500" />
                    )}
                    {format(new Date(issue.issue_date), 'MMM d')}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <div className="text-sm text-white font-medium mb-1">
                        {issue.description?.substring(0, 120)}{issue.description?.length > 120 ? '...' : ''}
                      </div>
                      
                      <div className="flex flex-wrap gap-2 text-xs">
                        {issue.affected_piece_marks?.slice(0, 5).map(mark => (
                          <Badge key={mark} variant="outline" className="text-[10px]">
                            {mark}
                          </Badge>
                        ))}
                        {issue.affected_piece_marks?.length > 5 && (
                          <Badge variant="outline" className="text-[10px]">
                            +{issue.affected_piece_marks.length - 5}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-zinc-600 flex-shrink-0 mt-1" />
                  </div>

                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <div className="flex items-center gap-3">
                      {issue.erection_zone && (
                        <span>{issue.erection_zone}</span>
                      )}
                      {issue.erection_crew && (
                        <span>• {issue.erection_crew}</span>
                      )}
                      {issue.estimated_delay_hours > 0 && (
                        <span className="text-amber-500">• {issue.estimated_delay_hours}h delay</span>
                      )}
                    </div>
                    <span>{issue.root_cause.replace(/_/g, ' ')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}