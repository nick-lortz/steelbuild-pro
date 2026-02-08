import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, Copy, Loader } from 'lucide-react';
import { toast } from '@/components/ui/notifications';

export default function ScopeChangeDetector({ currentSet, previousSet, onDetectComplete }) {
  const [detecting, setDetecting] = useState(false);
  const [result, setResult] = useState(null);

  const detectMutation = useMutation({
    mutationFn: async () => {
      setDetecting(true);
      const res = await base44.functions.invoke('detectScopeChanges', {
        current_drawing_set_id: currentSet.id,
        previous_drawing_set_id: previousSet.id
      });
      return res.data;
    },
    onSuccess: (data) => {
      setDetecting(false);
      setResult(data);
      onDetectComplete?.(data);
    },
    onError: () => {
      setDetecting(false);
      toast.error('Scope detection failed');
    }
  });

  const copyCO = () => {
    navigator.clipboard.writeText(result.co_draft);
    toast.success('CO draft copied');
  };

  if (!previousSet) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground">
            Select a previous revision to detect scope changes
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <TrendingUp size={18} className="text-amber-500" />
            Scope Change Detector
          </span>
          <Button
            onClick={() => detectMutation.mutate()}
            disabled={detecting || detectMutation.isPending}
            size="sm"
            variant="outline"
          >
            {detecting ? (
              <>
                <Loader size={14} className="mr-1 animate-spin" />
                Analyzing...
              </>
            ) : (
              'Compare Revisions'
            )}
          </Button>
        </CardTitle>
      </CardHeader>

      {result && (
        <CardContent className="space-y-4">
          {/* Tonnage Impact */}
          <div className={`p-4 rounded border-2 ${
            result.severity === 'high' ? 'bg-red-950/20 border-red-800' :
            result.severity === 'medium' ? 'bg-yellow-950/20 border-yellow-800' :
            'bg-blue-950/20 border-blue-800'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">
                  Tonnage Delta
                </div>
                <div className={`text-3xl font-bold ${
                  result.tonnage_delta > 0 ? 'text-red-400' : 'text-green-400'
                }`}>
                  {result.tonnage_delta > 0 ? '+' : ''}{result.tonnage_delta} tons
                </div>
              </div>
              <Badge className={
                result.severity === 'high' ? 'bg-red-600' :
                result.severity === 'medium' ? 'bg-yellow-600' :
                'bg-blue-600'
              }>
                {result.severity.toUpperCase()}
              </Badge>
            </div>
          </div>

          {/* Changes Breakdown */}
          {(result.changes.added.length > 0 || result.changes.increased.length > 0 || 
            result.changes.removed.length > 0 || result.changes.decreased.length > 0) && (
            <div className="space-y-3">
              {result.changes.added.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm text-green-400 mb-1">Added Members</h4>
                  <div className="space-y-1">
                    {result.changes.added.map((item, idx) => (
                      <div key={idx} className="text-xs text-muted-foreground">
                        • {item.member} ({item.quantity}x)
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.changes.increased.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm text-amber-400 mb-1">Increased Quantities</h4>
                  <div className="space-y-1">
                    {result.changes.increased.map((item, idx) => (
                      <div key={idx} className="text-xs text-muted-foreground">
                        • {item.member}: {item.from} → {item.to}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.changes.decreased.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm text-blue-400 mb-1">Decreased Quantities</h4>
                  <div className="space-y-1">
                    {result.changes.decreased.map((item, idx) => (
                      <div key={idx} className="text-xs text-muted-foreground">
                        • {item.member}: {item.from} → {item.to}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.changes.removed.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm text-red-400 mb-1">Removed Members</h4>
                  <div className="space-y-1">
                    {result.changes.removed.map((item, idx) => (
                      <div key={idx} className="text-xs text-muted-foreground">
                        • {item.member} ({item.quantity}x)
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CO Draft */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Change Order Draft</h4>
            <div className="p-3 bg-slate-900 rounded border border-slate-700 text-xs text-slate-300 whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">
              {result.co_draft}
            </div>
            <Button onClick={copyCO} size="sm" variant="outline" className="w-full">
              <Copy size={14} className="mr-1" />
              Copy to Clipboard
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}