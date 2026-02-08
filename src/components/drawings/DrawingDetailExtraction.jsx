import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Loader, Zap, Wrench, Settings } from 'lucide-react';
import { toast } from '@/components/ui/notifications';

export default function DrawingDetailExtraction({ sheet, onExtracted }) {
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(null);
  const queryClient = useQueryClient();

  const extractMutation = useMutation({
    mutationFn: async () => {
      setExtracting(true);
      const result = await base44.functions.invoke('analyzeDrawingDetails', {
        drawing_file_url: sheet.file_url,
        drawing_sheet_id: sheet.id
      });
      return result.data;
    },
    onSuccess: (data) => {
      setExtracting(false);
      setExtracted(data);
      queryClient.invalidateQueries(['drawingSheet', sheet.id]);
      if (onExtracted) onExtracted(data);
      if (data.flag_count > 0) {
        toast.warning(`${data.p0_count} critical issues found in drawing`);
      } else {
        toast.success('Drawing analyzed — no issues found');
      }
    },
    onError: () => {
      setExtracting(false);
      toast.error('Drawing analysis failed');
    }
  });

  const p0Flags = (extracted?.flags || []).filter(f => f.severity === 'P0');
  const p1Flags = (extracted?.flags || []).filter(f => f.severity === 'P1');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Zap size={18} className="text-amber-500" />
            AI Drawing Analysis
          </CardTitle>
          <Button
            onClick={() => extractMutation.mutate()}
            disabled={extracting || extractMutation.isPending}
            size="sm"
            variant="outline"
          >
            {extracting ? (
              <>
                <Loader size={14} className="mr-1 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Zap size={14} className="mr-1" />
                Analyze Sheet
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      {!extracted && (
        <CardContent className="text-sm text-muted-foreground">
          Click "Analyze Sheet" to extract member types, connections, dimensions, and materials using AI.
        </CardContent>
      )}

      {extracted && (
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="members">Members</TabsTrigger>
              <TabsTrigger value="connections">Connections</TabsTrigger>
              <TabsTrigger value="flags">Flags</TabsTrigger>
            </TabsList>

            {/* Overview */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-card border rounded">
                  <div className="text-2xl font-bold">{extracted.member_count}</div>
                  <div className="text-xs text-muted-foreground">Members Identified</div>
                </div>
                <div className="p-3 bg-card border rounded">
                  <div className="text-2xl font-bold">{extracted.connection_count}</div>
                  <div className="text-xs text-muted-foreground">Connections</div>
                </div>
                <div className="p-3 bg-red-950/20 border border-red-800 rounded">
                  <div className="text-2xl font-bold text-red-500">{extracted.p0_count}</div>
                  <div className="text-xs text-red-400">Critical Issues</div>
                </div>
                <div className="p-3 bg-yellow-950/20 border border-yellow-800 rounded">
                  <div className="text-2xl font-bold text-yellow-500">{extracted.p1_count}</div>
                  <div className="text-xs text-yellow-400">Warnings</div>
                </div>
              </div>
            </TabsContent>

            {/* Members */}
            <TabsContent value="members" className="space-y-3">
              {extracted.members && extracted.members.length > 0 ? (
                extracted.members.map((member, idx) => (
                  <div key={idx} className="p-3 bg-card border rounded space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{member.type}</div>
                      <Badge variant="outline" className="text-xs">
                        {member.designation || 'N/A'}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {member.quantity > 1 ? `${member.quantity}x ` : ''}{member.grade || 'Grade not specified'}
                    </div>
                    {member.notes && <div className="text-xs text-muted-foreground">{member.notes}</div>}
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground py-4">No members extracted</div>
              )}
            </TabsContent>

            {/* Connections */}
            <TabsContent value="connections" className="space-y-3">
              {extracted.connections && extracted.connections.length > 0 ? (
                extracted.connections.map((conn, idx) => (
                  <div key={idx} className="p-3 bg-card border rounded space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm">{conn.location}</div>
                      <Badge className="text-xs">{conn.type}</Badge>
                    </div>
                    {conn.bolt_spec && (
                      <div className="text-xs text-muted-foreground">
                        <Wrench size={12} className="inline mr-1" />
                        Bolts: {conn.bolt_spec}
                      </div>
                    )}
                    {conn.weld_spec && (
                      <div className="text-xs text-muted-foreground">
                        <Settings size={12} className="inline mr-1" />
                        Welds: {conn.weld_spec}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground py-4">No connections extracted</div>
              )}
            </TabsContent>

            {/* Flags */}
            <TabsContent value="flags" className="space-y-3">
              {p0Flags.length > 0 && (
                <div className="space-y-2">
                  <div className="font-medium text-red-500 text-sm flex items-center gap-1">
                    <AlertCircle size={14} />
                    Critical Issues ({p0Flags.length})
                  </div>
                  {p0Flags.map((flag, idx) => (
                    <div key={idx} className="p-3 bg-red-950/20 border border-red-800 rounded text-sm space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-medium text-red-400">{flag.category}</div>
                        <span className="text-xs bg-red-900 text-red-200 px-2 py-0.5 rounded whitespace-nowrap">P0</span>
                      </div>
                      <div className="text-red-300 text-xs">{flag.message}</div>
                      {flag.location && (
                        <div className="text-red-300/70 text-xs">📍 {flag.location}</div>
                      )}
                      {flag.resolution_suggestion && (
                        <div className="bg-red-900/30 border-l-2 border-red-600 pl-2 py-1">
                          <div className="text-xs text-red-200 font-semibold">Fix:</div>
                          <div className="text-xs text-red-200/90">{flag.resolution_suggestion}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {p1Flags.length > 0 && (
                <div className="space-y-2">
                  <div className="font-medium text-yellow-500 text-sm flex items-center gap-1">
                    <AlertCircle size={14} />
                    Warnings ({p1Flags.length})
                  </div>
                  {p1Flags.map((flag, idx) => (
                    <div key={idx} className="p-3 bg-yellow-950/20 border border-yellow-800 rounded text-sm space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-medium text-yellow-400">{flag.category}</div>
                        <span className="text-xs bg-yellow-900 text-yellow-200 px-2 py-0.5 rounded whitespace-nowrap">P1</span>
                      </div>
                      <div className="text-yellow-300 text-xs">{flag.message}</div>
                      {flag.location && (
                        <div className="text-yellow-300/70 text-xs">📍 {flag.location}</div>
                      )}
                      {flag.resolution_suggestion && (
                        <div className="bg-yellow-900/30 border-l-2 border-yellow-600 pl-2 py-1">
                          <div className="text-xs text-yellow-200 font-semibold">Suggestion:</div>
                          <div className="text-xs text-yellow-200/90">{flag.resolution_suggestion}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {extracted.flag_count === 0 && (
                <div className="text-sm text-green-400 py-4 text-center">✓ No issues found</div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      )}
    </Card>
  );
}