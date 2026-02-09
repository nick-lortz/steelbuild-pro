import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, AlertTriangle, Sparkles } from 'lucide-react';

export default function PatternAnalysisPanel({ projectId, onCreateImprovement }) {
  const { data: issues = [] } = useQuery({
    queryKey: ['field-issues', projectId],
    queryFn: () => base44.entities.FieldIssue.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const patterns = useMemo(() => {
    const map = {};
    
    issues.forEach(issue => {
      issue.affected_connection_types?.forEach(connType => {
        const key = `${connType}::${issue.root_cause}`;
        if (!map[key]) {
          map[key] = {
            connection_type: connType,
            root_cause: issue.root_cause,
            count: 0,
            issues: [],
            piece_marks: new Set(),
            zones: new Set()
          };
        }
        map[key].count++;
        map[key].issues.push(issue);
        issue.affected_piece_marks?.forEach(pm => map[key].piece_marks.add(pm));
        if (issue.erection_zone) map[key].zones.add(issue.erection_zone);
      });
    });

    return Object.values(map)
      .filter(p => p.count >= 2)
      .map(p => ({
        ...p,
        piece_marks: Array.from(p.piece_marks),
        zones: Array.from(p.zones),
        confidence_score: Math.min(95, 50 + (p.count * 10)),
        priority: p.count >= 5 ? 'high' : p.count >= 3 ? 'medium' : 'low'
      }))
      .sort((a, b) => b.count - a.count);
  }, [issues]);

  if (patterns.length === 0) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-8 text-center text-zinc-500">
          No repeat patterns detected yet. Keep logging field issues.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-blue-500/5 border-blue-500/30">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2 text-blue-400">
            <TrendingUp size={16} />
            {patterns.length} Repeat Pattern{patterns.length !== 1 ? 's' : ''} Detected
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-zinc-400">
          These patterns indicate opportunities to improve standard details and prevent future rework.
        </CardContent>
      </Card>

      {patterns.map((pattern, idx) => (
        <Card key={idx} className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Badge className={
                  pattern.priority === 'high' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                  pattern.priority === 'medium' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                  'bg-blue-500/20 text-blue-400 border-blue-500/30'
                }>
                  {pattern.count}x Repeat
                </Badge>
                <span className="text-sm font-semibold text-white">
                  {pattern.connection_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {pattern.confidence_score}% confidence
              </Badge>
            </div>

            <div className="space-y-2 mb-4">
              <div className="text-xs text-zinc-400">
                <span className="font-semibold text-zinc-300">Root Cause:</span>{' '}
                {pattern.root_cause.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </div>
              
              <div className="text-xs text-zinc-400">
                <span className="font-semibold text-zinc-300">Affected Pieces:</span>{' '}
                {pattern.piece_marks.slice(0, 10).join(', ')}
                {pattern.piece_marks.length > 10 && ` +${pattern.piece_marks.length - 10} more`}
              </div>

              {pattern.zones.length > 0 && (
                <div className="text-xs text-zinc-400">
                  <span className="font-semibold text-zinc-300">Zones:</span>{' '}
                  {pattern.zones.slice(0, 3).join(', ')}
                  {pattern.zones.length > 3 && ` +${pattern.zones.length - 3} more`}
                </div>
              )}

              <div className="text-xs text-zinc-500 mt-2">
                Common descriptions: {pattern.issues.slice(0, 2).map(i => `"${i.description?.substring(0, 60)}..."`).join(' | ')}
              </div>
            </div>

            <Button
              onClick={() => onCreateImprovement(pattern)}
              className="w-full bg-amber-500 hover:bg-amber-600 text-black"
              size="sm"
            >
              <Sparkles size={14} className="mr-2" />
              Propose Detail Improvement
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}