import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Search, ExternalLink, Clock, AlertCircle } from 'lucide-react';

export default function DrawingRFIViewer({ projectId }) {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: drawingSets, isLoading: drawingsLoading } = useQuery({
    queryKey: ['drawingSets', projectId],
    queryFn: async () => {
      return await base44.entities.DrawingSet.filter({ project_id: projectId });
    }
  });

  const { data: rfis, isLoading: rfisLoading } = useQuery({
    queryKey: ['rfis', projectId],
    queryFn: async () => {
      return await base44.entities.RFI.filter({ 
        project_id: projectId,
        status: { $in: ['submitted', 'under_review', 'answered'] }
      });
    }
  });

  const filteredDrawings = drawingSets?.filter(ds =>
    ds.set_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ds.title?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const filteredRFIs = rfis?.filter(rfi =>
    rfi.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rfi.rfi_number?.toString().includes(searchTerm)
  ) || [];

  const getStatusBadge = (status) => {
    const config = {
      'IFA': { variant: 'secondary', label: 'IFA' },
      'BFA': { variant: 'warning', label: 'BFA' },
      'FFF': { variant: 'success', label: 'FFF' },
      'submitted': { variant: 'warning', label: 'Submitted' },
      'under_review': { variant: 'warning', label: 'Under Review' },
      'answered': { variant: 'success', label: 'Answered' }
    };
    const c = config[status] || { variant: 'secondary', label: status };
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7280]" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search drawings or RFIs..."
          className="pl-10 bg-black border-[rgba(255,255,255,0.1)] text-[#E5E7EB] h-12"
        />
      </div>

      <Tabs defaultValue="drawings" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-[#0A0A0A] border border-[rgba(255,255,255,0.05)]">
          <TabsTrigger value="drawings">
            Drawings ({filteredDrawings.length})
          </TabsTrigger>
          <TabsTrigger value="rfis">
            RFIs ({filteredRFIs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="drawings" className="mt-4 space-y-3">
          {drawingsLoading ? (
            <div className="text-center py-8 text-[#6B7280]">Loading drawings...</div>
          ) : filteredDrawings.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-[#6B7280] mx-auto mb-3" />
              <p className="text-[#9CA3AF]">No drawings found</p>
            </div>
          ) : (
            filteredDrawings.map(drawing => (
              <Card key={drawing.id} className="bg-[#0A0A0A] border-[rgba(255,255,255,0.05)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-5 h-5 text-[#FF9D42] flex-shrink-0" />
                      <span className="font-bold text-[#E5E7EB]">{drawing.set_number}</span>
                      {getStatusBadge(drawing.status)}
                    </div>
                    <p className="text-sm text-[#9CA3AF] mb-2">{drawing.title}</p>
                    {drawing.spec_section && (
                      <p className="text-xs text-[#6B7280]">Spec: {drawing.spec_section}</p>
                    )}
                  </div>
                  <button className="p-2 hover:bg-[rgba(255,157,66,0.1)] rounded-lg transition-colors">
                    <ExternalLink className="w-5 h-5 text-[#FF9D42]" />
                  </button>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="rfis" className="mt-4 space-y-3">
          {rfisLoading ? (
            <div className="text-center py-8 text-[#6B7280]">Loading RFIs...</div>
          ) : filteredRFIs.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-[#6B7280] mx-auto mb-3" />
              <p className="text-[#9CA3AF]">No RFIs found</p>
            </div>
          ) : (
            filteredRFIs.map(rfi => (
              <Card key={rfi.id} className="bg-[#0A0A0A] border-[rgba(255,255,255,0.05)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-[#E5E7EB]">RFI #{rfi.rfi_number}</span>
                      {getStatusBadge(rfi.status)}
                      {rfi.priority === 'critical' && (
                        <Badge variant="destructive">Critical</Badge>
                      )}
                    </div>
                    <p className="text-sm text-[#9CA3AF] mb-2">{rfi.subject}</p>
                    <div className="flex items-center gap-4 text-xs text-[#6B7280]">
                      {rfi.submitted_date && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(rfi.submitted_date).toLocaleDateString()}
                        </div>
                      )}
                      {rfi.ball_in_court && (
                        <span className="capitalize">{rfi.ball_in_court}</span>
                      )}
                    </div>
                  </div>
                  <button className="p-2 hover:bg-[rgba(255,157,66,0.1)] rounded-lg transition-colors">
                    <ExternalLink className="w-5 h-5 text-[#FF9D42]" />
                  </button>
                </div>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}