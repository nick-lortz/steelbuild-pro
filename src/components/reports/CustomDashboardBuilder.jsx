import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Layout, Save, Trash2, GripVertical } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from '@/components/ui/notifications';

const widgetTypes = [
  { id: 'kpi', name: 'KPI Card', description: 'Display key metric' },
  { id: 'chart', name: 'Chart Widget', description: 'Line/Bar/Pie chart' },
  { id: 'table', name: 'Data Table', description: 'Tabular data view' },
  { id: 'progress', name: 'Progress Tracker', description: 'Track completion' }
];

export default function CustomDashboardBuilder() {
  const [dashboards, setDashboards] = useState([
    {
      id: '1',
      name: 'Executive Overview',
      widgets: [
        { id: 'w1', type: 'kpi', title: 'Active Projects', position: { x: 0, y: 0 } },
        { id: 'w2', type: 'chart', title: 'Budget Trend', position: { x: 1, y: 0 } }
      ]
    }
  ]);
  
  const [selectedDashboard, setSelectedDashboard] = useState(dashboards[0]);
  const [showWidgetDialog, setShowWidgetDialog] = useState(false);
  const [newWidget, setNewWidget] = useState({ type: 'kpi', title: '' });

  const handleAddWidget = () => {
    const widget = {
      id: `w${Date.now()}`,
      ...newWidget,
      position: { x: 0, y: selectedDashboard.widgets.length }
    };
    
    setSelectedDashboard(prev => ({
      ...prev,
      widgets: [...prev.widgets, widget]
    }));
    
    setShowWidgetDialog(false);
    setNewWidget({ type: 'kpi', title: '' });
    toast.success('Widget added');
  };

  const handleRemoveWidget = (widgetId) => {
    setSelectedDashboard(prev => ({
      ...prev,
      widgets: prev.widgets.filter(w => w.id !== widgetId)
    }));
    toast.success('Widget removed');
  };

  const handleSaveDashboard = () => {
    setDashboards(prev => 
      prev.map(d => d.id === selectedDashboard.id ? selectedDashboard : d)
    );
    toast.success('Dashboard saved');
  };

  return (
    <div className="space-y-6">
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Dashboard Builder</CardTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="border-zinc-700"
                onClick={handleSaveDashboard}
              >
                <Save size={14} className="mr-2" />
                Save
              </Button>
              <Button
                size="sm"
                onClick={() => setShowWidgetDialog(true)}
                className="bg-amber-500 hover:bg-amber-600 text-black"
              >
                <Plus size={14} className="mr-2" />
                Add Widget
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Label>Dashboard:</Label>
              <Select 
                value={selectedDashboard.id}
                onValueChange={(id) => setSelectedDashboard(dashboards.find(d => d.id === id))}
              >
                <SelectTrigger className="w-64 bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {dashboards.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              {selectedDashboard.widgets.map(widget => (
                <Card key={widget.id} className="bg-zinc-950 border-zinc-800 relative group">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <GripVertical size={14} className="text-zinc-600" />
                        <div>
                          <p className="font-semibold text-sm text-white">{widget.title}</p>
                          <p className="text-xs text-zinc-500 capitalize">{widget.type} widget</p>
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveWidget(widget.id)}
                      >
                        <Trash2 size={14} className="text-red-400" />
                      </Button>
                    </div>
                    
                    <div className="h-32 bg-zinc-900 border border-zinc-800 rounded flex items-center justify-center">
                      <Layout size={32} className="text-zinc-700" />
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {selectedDashboard.widgets.length === 0 && (
                <div className="col-span-full text-center py-12 border-2 border-dashed border-zinc-800 rounded">
                  <Layout size={48} className="mx-auto text-zinc-700 mb-3" />
                  <p className="text-zinc-500">No widgets yet</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-4 border-zinc-700"
                    onClick={() => setShowWidgetDialog(true)}
                  >
                    Add Your First Widget
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showWidgetDialog} onOpenChange={setShowWidgetDialog}>
        <DialogContent className="max-w-md bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>Add Widget</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Widget Type</Label>
              <Select value={newWidget.type} onValueChange={(v) => setNewWidget({ ...newWidget, type: v })}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {widgetTypes.map(wt => (
                    <SelectItem key={wt.id} value={wt.id}>
                      {wt.name} - {wt.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Widget Title</Label>
              <Input
                value={newWidget.title}
                onChange={(e) => setNewWidget({ ...newWidget, title: e.target.value })}
                placeholder="e.g., Budget Overview"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
              <Button
                variant="outline"
                onClick={() => setShowWidgetDialog(false)}
                className="border-zinc-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddWidget}
                disabled={!newWidget.title}
                className="bg-amber-500 hover:bg-amber-600 text-black"
              >
                Add Widget
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}