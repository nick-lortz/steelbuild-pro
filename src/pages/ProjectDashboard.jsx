import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import PageHeader from '@/components/ui/PageHeader';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import ProgressWidget from '@/components/project-dashboard/ProgressWidget';
import BudgetWidget from '@/components/project-dashboard/BudgetWidget';
import RFIWidget from '@/components/project-dashboard/RFIWidget';
import DeliveryWidget from '@/components/project-dashboard/DeliveryWidget';
import ChangeOrderWidget from '@/components/project-dashboard/ChangeOrderWidget';
import WorkPackageWidget from '@/components/project-dashboard/WorkPackageWidget';
import DrawingWidget from '@/components/project-dashboard/DrawingWidget';
import WidgetConfigDialog from '@/components/project-dashboard/WidgetConfigDialog';
import AIRiskWidget from '@/components/project-dashboard/AIRiskWidget';
import ResourceOptimizationWidget from '@/components/project-dashboard/ResourceOptimizationWidget';
import DocumentsWidget from '@/components/project-dashboard/DocumentsWidget';
import AISummaryPanel from '@/components/project-dashboard/AISummaryPanel';
import ProjectDocumentHub from '@/components/project-dashboard/ProjectDocumentHub';
import CriticalPathGantt from '@/components/project-dashboard/CriticalPathGantt';

const AVAILABLE_WIDGETS = [
  { id: 'ai_summary', label: 'AI Project Summary', component: AISummaryPanel },
  { id: 'gantt', label: 'Critical Path Timeline', component: CriticalPathGantt },
  { id: 'document_hub', label: 'Document Hub', component: ProjectDocumentHub },
  { id: 'progress', label: 'Project Progress', component: ProgressWidget },
  { id: 'budget', label: 'Budget vs Actual', component: BudgetWidget },
  { id: 'ai_risk', label: 'AI Risk Assessment', component: AIRiskWidget },
  { id: 'resource_optimization', label: 'Resource Optimization', component: ResourceOptimizationWidget },
  { id: 'documents', label: 'Documents', component: DocumentsWidget },
  { id: 'rfis', label: 'Open RFIs', component: RFIWidget },
  { id: 'deliveries', label: 'Upcoming Deliveries', component: DeliveryWidget },
  { id: 'change_orders', label: 'Change Orders', component: ChangeOrderWidget },
  { id: 'work_packages', label: 'Work Packages', component: WorkPackageWidget },
  { id: 'drawings', label: 'Drawing Status', component: DrawingWidget }
];

const DEFAULT_LAYOUT = [
  'ai_summary',
  'gantt',
  'document_hub',
  'progress',
  'budget',
  'resource_optimization'
];

export default function ProjectDashboard() {
  const { activeProjectId, setActiveProject } = useActiveProject();
  const [widgetLayout, setWidgetLayout] = useState([]);
  const [configOpen, setConfigOpen] = useState(false);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
    staleTime: 5 * 60 * 1000
  });

  const { data: project } = useQuery({
    queryKey: ['project', activeProjectId],
    queryFn: async () => {
      if (!activeProjectId) return null;
      const projects = await base44.entities.Project.filter({ id: activeProjectId });
      return projects[0];
    },
    enabled: !!activeProjectId
  });

  useEffect(() => {
    const saved = localStorage.getItem(`dashboard_layout_${activeProjectId}`);
    setWidgetLayout(saved ? JSON.parse(saved) : DEFAULT_LAYOUT);
  }, [activeProjectId]);

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(widgetLayout);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);

    setWidgetLayout(items);
    localStorage.setItem(`dashboard_layout_${activeProjectId}`, JSON.stringify(items));
  };

  const handleUpdateLayout = (newLayout) => {
    setWidgetLayout(newLayout);
    localStorage.setItem(`dashboard_layout_${activeProjectId}`, JSON.stringify(newLayout));
  };

  if (!activeProjectId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
        <PageHeader title="Project Dashboard" subtitle="Select a project to view dashboard" />
        <div className="max-w-[1800px] mx-auto px-8 py-6">
          <Card className="bg-zinc-900/50 border-zinc-800 p-12 text-center">
            <p className="text-zinc-500">No project selected</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      <PageHeader
        title="Project Dashboard"
        subtitle={project?.project_number || 'Select a project'}
        actions={
          <div className="flex items-center gap-3">
            <Select value={activeProjectId || ""} onValueChange={setActiveProject}>
              <SelectTrigger className="w-64 bg-zinc-900 border-zinc-700">
                <SelectValue placeholder="Select project..." />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id} className="text-white">
                    {p.project_number} - {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfigOpen(true)}
              className="border-amber-500/20 text-amber-500 hover:bg-amber-500/10"
            >
              <Settings size={14} className="mr-2" />
              Configure
            </Button>
          </div>
        }
      />

      <div className="max-w-[1800px] mx-auto px-8 py-6">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="dashboard">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="grid grid-cols-1 lg:grid-cols-2 gap-6"
              >
                {widgetLayout.map((widgetId, index) => {
                  const widget = AVAILABLE_WIDGETS.find(w => w.id === widgetId);
                  if (!widget) return null;

                  const WidgetComponent = widget.component;

                  return (
                    <Draggable key={widgetId} draggableId={widgetId} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={snapshot.isDragging ? 'opacity-50' : ''}
                        >
                          <Card className="bg-zinc-900/50 border-zinc-800 p-4 relative group">
                            <div
                              {...provided.dragHandleProps}
                              className="absolute top-2 right-2 p-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-move"
                            >
                              <GripVertical size={16} className="text-zinc-600" />
                            </div>
                            <WidgetComponent projectId={activeProjectId} />
                          </Card>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {widgetLayout.length === 0 && (
          <Card className="bg-zinc-900/50 border-zinc-800 p-12 text-center">
            <p className="text-zinc-500 mb-4">No widgets configured</p>
            <Button
              onClick={() => setConfigOpen(true)}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              Add Widgets
            </Button>
          </Card>
        )}
      </div>

      <WidgetConfigDialog
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        availableWidgets={AVAILABLE_WIDGETS}
        currentLayout={widgetLayout}
        onUpdateLayout={handleUpdateLayout}
      />
    </div>
  );
}