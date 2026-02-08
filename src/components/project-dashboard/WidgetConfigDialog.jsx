import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

export default function WidgetConfigDialog({ open, onClose, availableWidgets, currentLayout, onUpdateLayout }) {
  const [selected, setSelected] = useState(currentLayout);

  const handleToggle = (widgetId) => {
    setSelected(prev =>
      prev.includes(widgetId)
        ? prev.filter(id => id !== widgetId)
        : [...prev, widgetId]
    );
  };

  const handleSave = () => {
    onUpdateLayout(selected);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle>Configure Dashboard Widgets</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-4">
          {availableWidgets.map(widget => (
            <div key={widget.id} className="flex items-center gap-3 p-3 bg-zinc-800/30 rounded">
              <Checkbox
                checked={selected.includes(widget.id)}
                onCheckedChange={() => handleToggle(widget.id)}
              />
              <span className="text-sm text-white">{widget.label}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onClose} className="border-zinc-700 text-white">
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-amber-500 hover:bg-amber-600 text-black">
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}