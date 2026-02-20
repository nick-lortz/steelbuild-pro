import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/components/ui/notifications';
import { Cloud, Scan, MapPin, FileText, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function RevisionCloudDetectionPanel({ sheetId, fileUrl }) {
  const queryClient = useQueryClient();

  const { data: sheet } = useQuery({
    queryKey: ['drawing-sheet', sheetId],
    queryFn: async () => {
      const sheets = await base44.entities.DrawingSheet.filter({ id: sheetId });
      return sheets[0];
    },
    enabled: !!sheetId
  });

  const revisionClouds = sheet?.revision_clouds ? JSON.parse(sheet.revision_clouds) : [];

  const detectMutation = useMutation({
    mutationFn: () => base44.functions.invoke('detectRevisionClouds', { 
      sheet_id: sheetId,
      file_url: fileUrl 
    }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['drawing-sheet', sheetId] });
      if (response.data.clouds_detected > 0) {
        toast.success(`Detected ${response.data.clouds_detected} revision clouds`);
      } else {
        toast.info('No revision clouds detected');
      }
    },
    onError: (error) => {
      toast.error('Failed to detect revision clouds: ' + error.message);
    }
  });

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-white">
            <Cloud size={20} />
            Revision Cloud Detection
          </CardTitle>
          <Button
            size="sm"
            onClick={() => detectMutation.mutate()}
            disabled={detectMutation.isPending}
            className="gap-2"
          >
            {detectMutation.isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Scan size={16} />
                Detect Clouds
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {sheet?.ai_reviewed ? (
          <Alert className="bg-blue-950/20 border-blue-500/30 mb-4">
            <CheckCircle2 className="h-4 w-4 text-blue-400" />
            <AlertDescription className="text-blue-300">
              Drawing scanned on {new Date(sheet.uploaded_date).toLocaleDateString()}
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="bg-amber-950/20 border-amber-500/30 mb-4">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <AlertDescription className="text-amber-300">
              Drawing has not been scanned for revision clouds yet
            </AlertDescription>
          </Alert>
        )}

        {revisionClouds.length === 0 ? (
          <div className="text-center py-8 text-zinc-500">
            <Cloud size={40} className="mx-auto mb-3 opacity-50" />
            <p>No revision clouds detected</p>
            <p className="text-xs mt-1">Click "Detect Clouds" to scan this drawing</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-zinc-400">
                Found {revisionClouds.length} revision {revisionClouds.length === 1 ? 'cloud' : 'clouds'}
              </div>
              <Badge className="bg-amber-500/20 text-amber-400">
                {revisionClouds.filter(c => c.confidence > 0.8).length} High Confidence
              </Badge>
            </div>

            {revisionClouds.map((cloud, idx) => (
              <div
                key={idx}
                className={cn(
                  "p-4 rounded-lg border",
                  cloud.confidence > 0.8 
                    ? "bg-amber-950/20 border-amber-500/30" 
                    : "bg-zinc-800/30 border-zinc-700"
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className={cloud.confidence > 0.8 ? "text-amber-400" : "text-zinc-500"} />
                    <span className="text-sm font-medium text-white">
                      Cloud #{idx + 1}
                    </span>
                  </div>
                  <Badge 
                    variant="outline"
                    className={cn(
                      cloud.confidence > 0.8 
                        ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                        : "bg-zinc-700/20 text-zinc-400 border-zinc-700/30"
                    )}
                  >
                    {(cloud.confidence * 100).toFixed(0)}% confidence
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400">
                  <div>Location: ({cloud.x.toFixed(0)}, {cloud.y.toFixed(0)})</div>
                  <div>Size: {cloud.width.toFixed(0)} × {cloud.height.toFixed(0)} px</div>
                </div>

                {cloud.nearby_text && (
                  <div className="mt-3 pt-3 border-t border-zinc-700">
                    <p className="text-xs text-zinc-500 mb-1">Nearby text:</p>
                    <p className="text-xs text-zinc-300 font-mono">{cloud.nearby_text}</p>
                  </div>
                )}

                {cloud.linked_changes && (
                  <div className="mt-2">
                    <p className="text-xs text-amber-400">
                      {cloud.linked_changes}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {sheet?.ai_findings && (
          <div className="mt-4 pt-4 border-t border-zinc-800">
            <p className="text-xs text-zinc-500 mb-2">AI Analysis Notes:</p>
            <p className="text-xs text-zinc-300">{sheet.ai_findings}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}