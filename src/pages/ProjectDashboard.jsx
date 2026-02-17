import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

const AVAILABLE_WIDGETS = [
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
  'progress',
  'budget',
  'ai_risk',
  'resource_optimization',
  'rfis',
  'deliveries'
];

export default function ProjectDashboard() {
  const { activeProjectId, setActiveProjectId } = useActiveProject();
  const [widgetLayout, setWidgetLayout] = useState([]);
  const [configOpen, setConfigOpen] = useState(false);

  const { data: allProjects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
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
      <div className="min-h-screen bg-black">
        <PageHeader 
          title="Project Dashboard" 
          subtitle="Select a project to view dashboard"
          actions={
            <Select value={activeProjectId || 'none'} onValueChange={(val) => setActiveProjectId(val === 'none' ? null : val)}>
              <SelectTrigger className="w-80">
                <SelectValue placeholder="Select project..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select project...</SelectItem>
                {allProjects.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.project_number} - {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />
        <div className="max-w-[1800px] mx-auto px-8 py-6">
          <Card className="p-12 text-center">
            <p className="text-[#6B7280]">No project selected</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <PageHeader
        title={project?.name || 'Project Dashboard'}
        subtitle={project?.project_number || 'Loading...'}
        actions={
          <>
            <Select value={activeProjectId} onValueChange={setActiveProjectId}>
              <SelectTrigger className="w-80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allProjects.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.project_number} - {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfigOpen(true)}
            >
              <Settings size={14} className="mr-2" />
              Configure Widgets
            </Button>
          </>
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
                  const canMoveUp = index > 0;
                  const canMoveDown = index < widgetLayout.length - 1;

                  const moveWidget = (fromIndex, toIndex) => {
                    const items = Array.from(widgetLayout);
                    const [moved] = items.splice(fromIndex, 1);
                    items.splice(toIndex, 0, moved);
                    handleUpdateLayout(items);
                  };

                  return (
                    <Draggable key={widgetId} draggableId={widgetId} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={snapshot.isDragging ? 'opacity-50' : ''}
                        >
                          <Card className="p-4 relative group">
                            {/* Keyboard reorder controls (WCAG 2.1.1) */}
                            <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-10">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => moveWidget(index, index - 1)}
                                disabled={!canMoveUp}
                                className="h-7 w-7 p-0"
                                aria-label={`Move ${widget.label} up`}
                              >
                                <span aria-hidden="true">↑</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => moveWidget(index, index + 1)}
                                disabled={!canMoveDown}
                                className="h-7 w-7 p-0"
                                aria-label={`Move ${widget.label} down`}
                              >
                                <span aria-hidden="true">↓</span>
                              </Button>
                            </div>

                            {/* Drag handle (mouse users) */}
                            <div
                              {...provided.dragHandleProps}
                              className="absolute top-2 right-2 p-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-move"
                              aria-hidden="true"
                            >
                              <GripVertical size={16} className="text-[#6B7280]" />
                            </div>

                            {/* Screen reader position info */}
                            <span className="sr-only">
                              {widget.label}, position {index + 1} of {widgetLayout.length}
                            </span>

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
          <Card className="p-12 text-center">
            <p className="text-[#6B7280] mb-4">No widgets configured</p>
            <Button
              onClick={() => setConfigOpen(true)}
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