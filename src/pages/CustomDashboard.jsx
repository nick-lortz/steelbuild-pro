import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, GripVertical, Save } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import EVMDashboard from '@/components/analytics/EVMDashboard';
import ProjectComparison from '@/components/analytics/ProjectComparison';
import ExportReports from '@/components/analytics/ExportReports';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { toast } from '@/components/ui/notifications';

const widgetTypes = [
  { id: 'evm', name: 'EVM Dashboard', component: EVMDashboard },
  { id: 'comparison', name: 'Project Comparison', component: ProjectComparison },
  { id: 'export', name: 'Export Tools', component: ExportReports }
];

export default function CustomDashboard() {
  const [widgets, setWidgets] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-updated_date')
  });

  const { data: project } = useQuery({
    queryKey: ['project', selectedProject],
    queryFn: () => base44.entities.Project.list().then(p => p.find(pr => pr.id === selectedProject)),
    enabled: !!selectedProject
  });

  const { data: financials = [] } = useQuery({
    queryKey: ['financials', selectedProject],
    queryFn: () => base44.entities.Financial.filter({ project_id: selectedProject }),
    enabled: !!selectedProject
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', selectedProject],
    queryFn: () => base44.entities.Task.filter({ project_id: selectedProject }),
    enabled: !!selectedProject
  });

  const { data: rfis = [] } = useQuery({
    queryKey: ['rfis', selectedProject],
    queryFn: () => base44.entities.RFI.filter({ project_id: selectedProject }),
    enabled: !!selectedProject
  });

  const { data: changeOrders = [] } = useQuery({
    queryKey: ['changeOrders', selectedProject],
    queryFn: () => base44.entities.ChangeOrder.filter({ project_id: selectedProject }),
    enabled: !!selectedProject
  });

  const addWidget = (widgetTypeId) => {
    const widgetType = widgetTypes.find(w => w.id === widgetTypeId);
    if (widgetType) {
      setWidgets([...widgets, { id: Date.now().toString(), type: widgetTypeId, name: widgetType.name }]);
    }
  };

  const removeWidget = (widgetId) => {
    setWidgets(widgets.filter(w => w.id !== widgetId));
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const items = Array.from(widgets);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    
    setWidgets(items);
  };

  const saveDashboard = () => {
    localStorage.setItem('custom_dashboard', JSON.stringify(widgets));
    toast.success('Dashboard layout saved');
  };

  React.useEffect(() => {
    const saved = localStorage.getItem('custom_dashboard');
    if (saved) {
      try {
        setWidgets(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  return (
    <div className="p-6">
      <PageHeader 
        title="Custom Dashboard" 
        subtitle="Build your personalized analytics view"
        actions={
          <Button onClick={saveDashboard}>
            <Save size={16} className="mr-2" />
            Save Layout
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <Select onValueChange={addWidget}>
              <SelectTrigger>
                <SelectValue placeholder="Add widget..." />
              </SelectTrigger>
              <SelectContent>
                {widgetTypes.map(wt => (
                  <SelectItem key={wt.id} value={wt.id}>
                    <Plus size={14} className="inline mr-2" />
                    {wt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="p-4">
            <Select value={selectedProject || ''} onValueChange={setSelectedProject}>
              <SelectTrigger>
                <SelectValue placeholder="Select project for analysis..." />
              </SelectTrigger>
              <SelectContent>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.project_number} - {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {widgets.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
            Add widgets above to build your custom dashboard
          </CardContent>
        </Card>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="widgets">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                {widgets.map((widget, index) => {
                  const WidgetComponent = widgetTypes.find(w => w.id === widget.type)?.component;
                  
                  return (
                    <Draggable key={widget.id} draggableId={widget.id} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                        >
                          <Card>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                  <div {...provided.dragHandleProps}>
                                    <GripVertical size={18} className="text-muted-foreground cursor-move" />
                                  </div>
                                  <h3 className="font-semibold">{widget.name}</h3>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeWidget(widget.id)}
                                >
                                  <X size={16} />
                                </Button>
                              </div>
                              {WidgetComponent && (
                                <WidgetComponent
                                  project={project}
                                  financials={financials}
                                  tasks={tasks}
                                  projectId={selectedProject}
                                  projectName={project?.name}
                                  data={{ financials, tasks, rfis, changeOrders }}
                                />
                              )}
                            </CardContent>
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
      )}
    </div>
  );
}