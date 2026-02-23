import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldAlert, ShieldX, ArrowRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function StopTheLineGatesWidget({ projectId }) {
  const { data: gates, isLoading } = useQuery({
    queryKey: ['blockedGates', projectId],
    queryFn: async () => {
      const query = projectId 
        ? { project_id: projectId, gate_status: { $in: ['blocked', 'conditional'] } }
        : { gate_status: { $in: ['blocked', 'conditional'] } };
      
      const results = await base44.entities.ExecutionGate.filter(query);
      return results.sort((a, b) => {
        if (a.gate_status === 'blocked' && b.gate_status !== 'blocked') return -1;
        if (a.gate_status !== 'blocked' && b.gate_status === 'blocked') return 1;
        return 0;
      });
    }
  });
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
            Stop-the-Line Gates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }
  
  const blocked = gates?.filter(g => g.gate_status === 'blocked') || [];
  const conditional = gates?.filter(g => g.gate_status === 'conditional') || [];
  
  return (
    <Card className="border-red-500/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
            Stop-the-Line Gates
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="destructive">{blocked.length} Blocked</Badge>
            <Badge variant="warning">{conditional.length} Conditional</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {gates?.length === 0 ? (
          <div className="text-center py-6">
            <ShieldX className="w-12 h-12 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">All gates clear</p>
          </div>
        ) : (
          <div className="space-y-3">
            {gates?.map((gate) => (
              <div key={gate.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={gate.gate_status === 'blocked' ? 'destructive' : 'warning'}>
                        {gate.gate_type.toUpperCase()}
                      </Badge>
                      <span className="text-sm font-medium">
                        {gate.entity_type} - ID: {gate.entity_id.slice(0, 8)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {gate.blockers?.length || 0} blocker(s) · {gate.required_actions?.length || 0} action(s) required
                    </div>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <Link to={createPageUrl(gate.entity_type === 'WorkPackage' ? 'WorkPackages' : 'Deliveries')}>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
                </div>
                
                {gate.required_actions?.length > 0 && (
                  <div className="text-xs space-y-1">
                    <p className="font-medium">Required Actions:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                      {gate.required_actions.slice(0, 3).map((action, idx) => (
                        <li key={idx}>{action}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}