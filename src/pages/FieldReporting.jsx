import React, { useState } from 'react';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Camera, ClipboardList, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';
import DailyReportForm from '@/components/field-reporting/DailyReportForm';
import PhotoUploadPanel from '@/components/field-reporting/PhotoUploadPanel';
import SafetyReportForm from '@/components/field-reporting/SafetyReportForm';
import DrawingRFIViewer from '@/components/field-reporting/DrawingRFIViewer';

export default function FieldReporting() {
  const { activeProjectId } = useActiveProject();
  const [activeTab, setActiveTab] = useState('daily');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: project } = useQuery({
    queryKey: ['project', activeProjectId],
    queryFn: async () => {
      const projects = await base44.entities.Project.filter({ id: activeProjectId });
      return projects[0];
    },
    enabled: !!activeProjectId
  });

  if (!activeProjectId || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#E5E7EB] mb-2">No Project Selected</h2>
          <p className="text-[#9CA3AF]">Select a project to access field reporting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-24 lg:pb-6">
      {/* Mobile Header */}
      <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-md border-b border-[rgba(255,255,255,0.05)] p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#E5E7EB]">Field Reporting</h1>
            <p className="text-sm text-[#6B7280]">{project.name}</p>
          </div>
          <div className="px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-lg text-xs text-green-400 font-medium">
            Live
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6 bg-[#0A0A0A] border border-[rgba(255,255,255,0.05)] h-auto">
            <TabsTrigger 
              value="daily" 
              className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FF6B2C] data-[state=active]:to-[#FF9D42] data-[state=active]:text-black"
            >
              <ClipboardList className="w-5 h-5" />
              <span className="text-xs font-medium">Daily Log</span>
            </TabsTrigger>
            <TabsTrigger 
              value="photos" 
              className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FF6B2C] data-[state=active]:to-[#FF9D42] data-[state=active]:text-black"
            >
              <Camera className="w-5 h-5" />
              <span className="text-xs font-medium">Photos</span>
            </TabsTrigger>
            <TabsTrigger 
              value="safety" 
              className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FF6B2C] data-[state=active]:to-[#FF9D42] data-[state=active]:text-black"
            >
              <AlertTriangle className="w-5 h-5" />
              <span className="text-xs font-medium">Safety</span>
            </TabsTrigger>
            <TabsTrigger 
              value="docs" 
              className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FF6B2C] data-[state=active]:to-[#FF9D42] data-[state=active]:text-black"
            >
              <FileText className="w-5 h-5" />
              <span className="text-xs font-medium">Docs</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="mt-0">
            <DailyReportForm projectId={activeProjectId} user={currentUser} />
          </TabsContent>

          <TabsContent value="photos" className="mt-0">
            <PhotoUploadPanel projectId={activeProjectId} user={currentUser} />
          </TabsContent>

          <TabsContent value="safety" className="mt-0">
            <SafetyReportForm projectId={activeProjectId} user={currentUser} />
          </TabsContent>

          <TabsContent value="docs" className="mt-0">
            <DrawingRFIViewer projectId={activeProjectId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}