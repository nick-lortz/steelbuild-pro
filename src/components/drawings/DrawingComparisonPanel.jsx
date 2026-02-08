import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GitCompare, AlertTriangle, AlertCircle, ArrowRight, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { apiClient } from '@/api/client';
import { toast } from '@/components/ui/notifications';
import { useQuery } from '@tanstack/react-query';

export default function DrawingComparisonPanel({ currentDrawingSet, projectId }) {
  const [comparing, setComparing] = useState(false);
  const [selectedSetId, setSelectedSetId] = useState('');
  const [comparisonResult, setComparisonResult] = useState(null);

  const { data: allSets } = useQuery({
    queryKey: ['drawing-sets-for-comparison', projectId],
    queryFn: async () => {
      return await apiClient.entities.DrawingSet.filter({ 
        project_id: projectId 
      });
    },
    enabled: !!projectId
  });

  const availableSets = allSets?.filter(s => 
    s.id !== currentDrawingSet.id && 
    (s.set_number === currentDrawingSet.set_number || s.set_name.includes(currentDrawingSet.set_name.split('-')[0]))
  ) || [];

  const handleCompare = async () => {
    if (!selectedSetId) {
      toast.error('Select a version to compare');
      return;
    }

    setComparing(true);
    try {
      const response = await apiClient.functions.invoke('compareDrawingVersions', {
        drawing_set_id_1: currentDrawingSet.id,
        drawing_set_id_2: selectedSetId
      });

      if (response.data.success) {
        setComparisonResult(response.data);
        toast.success('Comparison completed');
      } else {
        toast.error(response.data.error || 'Comparison failed');
      }
    } catch (error) {
      console.error('Comparison error:', error);
      toast.error('Failed to compare drawing versions');
    } finally {
      setComparing(false);
    }
  };

  const getChangeLevelColor = (level) => {
    switch (level) {
      case 'critical':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'major':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'moderate':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  const getImpactColor = (impact) => {
    switch (impact) {
      case 'critical':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'high':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'medium':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  if (availableSets.length === 0) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800 p-4">
        <div className="flex items-center gap-2 text-zinc-500 text-sm">
          <GitCompare size={16} />
          <span>No other versions available for comparison</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-900/50 border-zinc-800 p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitCompare size={16} className="text-amber-500" />
            <h3 className="text-sm font-medium text-white">Version Comparison</h3>
          </div>
        </div>

        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="text-xs text-zinc-400 mb-2 block">Compare with</label>
            <Select value={selectedSetId} onValueChange={setSelectedSetId}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                <SelectValue placeholder="Select version..." />
              </SelectTrigger>
              <SelectContent>
                {availableSets.map((set) => (
                  <SelectItem key={set.id} value={set.id}>
                    {set.set_name} (Rev {set.current_revision}) - {set.status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleCompare}
            disabled={comparing || !selectedSetId}
            className="bg-amber-500 hover:bg-amber-600 text-black"
          >
            {comparing ? (
              <>
                <Loader2 size={14} className="animate-spin mr-2" />
                Comparing...
              </>
            ) : (
              <>
                <GitCompare size={14} className="mr-2" />
                Compare
              </>
            )}
          </Button>
        </div>

        {comparisonResult && (
          <div className="border-t border-zinc-800 pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">
                  {comparisonResult.sets_compared.version_1.name} (Rev {comparisonResult.sets_compared.version_1.revision})
                </span>
                <ArrowRight size={12} className="text-zinc-600" />
                <span className="text-xs text-zinc-400">
                  {comparisonResult.sets_compared.version_2.name} (Rev {comparisonResult.sets_compared.version_2.revision})
                </span>
              </div>
              <Badge variant="outline" className={getChangeLevelColor(comparisonResult.comparison.overall_change_level)}>
                {comparisonResult.comparison.overall_change_level?.toUpperCase() || 'MODERATE'}
              </Badge>
            </div>

            <div className="prose prose-sm prose-invert max-w-none">
              <div className="text-sm text-zinc-300 whitespace-pre-line">
                {comparisonResult.report}
              </div>
            </div>

            {comparisonResult.comparison.discrepancies && comparisonResult.comparison.discrepancies.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <AlertTriangle size={14} className="text-amber-500" />
                  Detailed Discrepancies ({comparisonResult.comparison.discrepancies.length})
                </h4>
                <div className="space-y-2">
                  {comparisonResult.comparison.discrepancies.map((disc, idx) => (
                    <Card key={idx} className="bg-zinc-800/30 border-zinc-700 p-3">
                      <div className="flex items-start gap-3">
                        <AlertCircle size={14} className="text-amber-400 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-zinc-300">
                              {disc.category.replace(/_/g, ' ').toUpperCase()}
                            </span>
                            <Badge variant="outline" className={`text-[10px] ${getImpactColor(disc.impact)}`}>
                              {disc.impact}
                            </Badge>
                          </div>
                          <p className="text-xs text-zinc-400 mb-2">{disc.description}</p>
                          <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                            <div className="flex items-center gap-1">
                              <TrendingDown size={10} className="text-red-400" />
                              <span className="text-zinc-400">V1:</span> {disc.version_1_value}
                            </div>
                            <ArrowRight size={10} className="text-zinc-600" />
                            <div className="flex items-center gap-1">
                              <TrendingUp size={10} className="text-green-400" />
                              <span className="text-zinc-400">V2:</span> {disc.version_2_value}
                            </div>
                          </div>
                          {disc.location && (
                            <p className="text-[10px] text-zinc-600 mt-1">📍 {disc.location}</p>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {comparisonResult.comparison.conflicts && comparisonResult.comparison.conflicts.length > 0 && (
              <div className="border-t border-zinc-800 pt-3">
                <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <AlertTriangle size={14} className="text-red-500" />
                  Conflicts Requiring Resolution ({comparisonResult.comparison.conflicts.length})
                </h4>
                <div className="space-y-2">
                  {comparisonResult.comparison.conflicts.map((conflict, idx) => (
                    <Card key={idx} className="bg-red-500/5 border-red-500/20 p-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle size={14} className="text-red-400 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-red-300 mb-1">{conflict.conflict_type}</p>
                          <p className="text-xs text-zinc-400">{conflict.description}</p>
                          {conflict.resolution_needed && (
                            <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-400 border-red-500/20 mt-2">
                              Resolution Required
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}