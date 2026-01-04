import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Save, Bookmark, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/notifications';

export default function ViewConfiguration({ viewKey, currentFilters, onLoadView }) {
  const [views, setViews] = useState(() => {
    const saved = localStorage.getItem(`views_${viewKey}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [newViewName, setNewViewName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const saveView = () => {
    if (!newViewName.trim()) return;
    
    const newView = {
      id: Date.now().toString(),
      name: newViewName,
      filters: currentFilters,
      created: new Date().toISOString()
    };
    
    const updatedViews = [...views, newView];
    setViews(updatedViews);
    localStorage.setItem(`views_${viewKey}`, JSON.stringify(updatedViews));
    toast.success('View saved');
    setNewViewName('');
    setDialogOpen(false);
  };

  const deleteView = (viewId) => {
    const updatedViews = views.filter(v => v.id !== viewId);
    setViews(updatedViews);
    localStorage.setItem(`views_${viewKey}`, JSON.stringify(updatedViews));
    toast.success('View deleted');
  };

  return (
    <div className="flex items-center gap-2">
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Save size={14} className="mr-2" />
            Save View
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Current View</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Input
              placeholder="View name..."
              value={newViewName}
              onChange={(e) => setNewViewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveView()}
            />
            <Button onClick={saveView} className="w-full">
              Save View
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {views.length > 0 && (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Bookmark size={14} className="mr-2" />
              Load View
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Saved Views</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 pt-4">
              {views.map((view) => (
                <div key={view.id} className="flex items-center justify-between p-2 bg-secondary rounded">
                  <Button
                    variant="ghost"
                    className="flex-1 justify-start"
                    onClick={() => {
                      onLoadView(view.filters);
                      toast.success(`Loaded: ${view.name}`);
                    }}
                  >
                    {view.name}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteView(view.id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}