import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Users, X } from 'lucide-react';
import QuickResourceAssign from './QuickResourceAssign';

export default function BulkResourceAssign({ 
  open, 
  onOpenChange, 
  selectedItems = [], 
  resources = [],
  onAssign,
  itemType = "tasks" 
}) {
  const [selectedResourceIds, setSelectedResourceIds] = useState([]);

  const handleAssign = () => {
    onAssign(selectedResourceIds);
    setSelectedResourceIds([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle>Bulk Assign Resources</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-3 bg-zinc-800/50 rounded-lg">
            <p className="text-sm text-zinc-400">
              Assigning to <span className="font-semibold text-white">{selectedItems.length}</span> {itemType}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Select Resources to Assign</Label>
            <QuickResourceAssign
              selectedResourceIds={selectedResourceIds}
              resources={resources}
              onChange={setSelectedResourceIds}
              placeholder="Choose resources..."
              triggerClassName="w-full bg-zinc-800 border-zinc-700"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-zinc-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={selectedResourceIds.length === 0}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              <Users size={16} className="mr-2" />
              Assign to {selectedItems.length} {itemType}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}