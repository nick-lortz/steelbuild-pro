import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Link as LinkIcon, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DrawingHeatMap({ sheets = [] }) {
  // Calculate reference counts for each drawing
  const heatMapData = useMemo(() => {
    const referenceCounts = {};
    
    // Count how many times each drawing is referenced
    sheets.forEach(sheet => {
      const sheetNum = sheet.sheet_number;
      if (!referenceCounts[sheetNum]) {
        referenceCounts[sheetNum] = {
          sheet,
          referenceCount: 0,
          referencedBy: []
        };
      }

      // Parse AI metadata for referenced drawings
      if (sheet.ai_metadata) {
        try {
          const metadata = JSON.parse(sheet.ai_metadata);
          const refs = metadata.referenced_drawings || [];
          
          refs.forEach(refNum => {
            if (!referenceCounts[refNum]) {
              referenceCounts[refNum] = {
                sheet: null,
                referenceCount: 0,
                referencedBy: []
              };
            }
            referenceCounts[refNum].referenceCount++;
            referenceCounts[refNum].referencedBy.push(sheetNum);
          });
        } catch (e) {
          console.error('Failed to parse metadata:', e);
        }
      }
    });

    // Sort by reference count
    return Object.entries(referenceCounts)
      .map(([sheetNum, data]) => ({ sheetNum, ...data }))
      .sort((a, b) => b.referenceCount - a.referenceCount);
  }, [sheets]);

  const maxReferences = Math.max(...heatMapData.map(d => d.referenceCount), 1);

  const getHeatColor = (count) => {
    if (count === 0) return 'bg-zinc-800';
    const intensity = Math.min(count / maxReferences, 1);
    if (intensity < 0.3) return 'bg-blue-500/30';
    if (intensity < 0.6) return 'bg-amber-500/50';
    return 'bg-red-500/70';
  };

  const getHeatLabel = (count) => {
    if (count === 0) return 'Not Referenced';
    if (count < 3) return 'Low Traffic';
    if (count < 7) return 'Medium Traffic';
    return 'High Traffic';
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp size={16} />
          Drawing Heat Map
          <Badge className="bg-zinc-800 text-xs ml-auto">
            {heatMapData.length} sheets
          </Badge>
        </CardTitle>
        <p className="text-xs text-zinc-500 mt-1">
          Shows which drawings are most referenced by other sheets
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {heatMapData.slice(0, 15).map((data) => (
            <div
              key={data.sheetNum}
              className={cn(
                'flex items-center justify-between p-3 rounded border border-zinc-800 transition-colors',
                getHeatColor(data.referenceCount)
              )}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-white">
                      {data.sheetNum}
                    </span>
                    {data.sheet && (
                      <FileText size={12} className="text-zinc-400" />
                    )}
                  </div>
                  {data.sheet?.sheet_name && (
                    <span className="text-xs text-zinc-400 truncate max-w-xs">
                      {data.sheet.sheet_name}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-right">
                  <div className="text-sm font-bold text-white">
                    {data.referenceCount}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {data.referenceCount === 1 ? 'reference' : 'references'}
                  </div>
                </div>
                <Badge className={cn(
                  'text-xs',
                  data.referenceCount === 0 ? 'bg-zinc-700' :
                  data.referenceCount < 3 ? 'bg-blue-500/30 text-blue-300' :
                  data.referenceCount < 7 ? 'bg-amber-500/30 text-amber-300' :
                  'bg-red-500/30 text-red-300'
                )}>
                  {getHeatLabel(data.referenceCount)}
                </Badge>
              </div>
            </div>
          ))}
        </div>

        {heatMapData.length > 15 && (
          <div className="text-center mt-4 text-xs text-zinc-500">
            Showing top 15 of {heatMapData.length} sheets
          </div>
        )}

        {heatMapData.length === 0 && (
          <div className="text-center py-8">
            <LinkIcon size={32} className="mx-auto mb-2 text-zinc-700" />
            <p className="text-sm text-zinc-500">
              No reference data available yet
            </p>
            <p className="text-xs text-zinc-600 mt-1">
              Upload drawings with AI analysis to see heat map
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}