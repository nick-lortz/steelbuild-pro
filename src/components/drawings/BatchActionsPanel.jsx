import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { X, CheckSquare } from 'lucide-react';
import { toast } from '@/components/ui/notifications';

export default function BatchActionsPanel({ 
  selectedSets, 
  onClearSelection, 
  onBatchUpdate,
  users = []
}) {
  const [showDialog, setShowDialog] = useState(false);
  const [action, setAction] = useState('');
  const [value, setValue] = useState('');

  const handleApply = async () => {
    if (!action || !value) {
      toast.error('Select both action and value');
      return;
    }

    const updateData = {};
    if (action === 'status') updateData.status = value;
    if (action === 'reviewer') updateData.reviewer = value;
    if (action === 'discipline') updateData.discipline = value;

    await onBatchUpdate(updateData);
    setShowDialog(false);
    setAction('');
    setValue('');
  };

  if (selectedSets.length === 0) return null;

  return (
    <>
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl p-4 flex items-center gap-4 z-50">
        <Badge variant="secondary" className="text-sm">
          <CheckSquare size={14} className="mr-1" />
          {selectedSets.length} Selected
        </Badge>
        
        <Button
          size="sm"
          onClick={() => setShowDialog(true)}
          className="bg-amber-500 hover:bg-amber-600 text-black font-bold"
        >
          Batch Update
        </Button>
        
        <Button
          size="sm"
          variant="ghost"
          onClick={onClearSelection}
          className="text-zinc-400 hover:text-white"
        >
          <X size={16} />
        </Button>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>Batch Update {selectedSets.length} Drawing Sets</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-xs text-zinc-400 uppercase tracking-widest font-bold mb-2 block">
                Action
              </label>
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800">
                  <SelectValue placeholder="Select action..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="status">Update Status</SelectItem>
                  <SelectItem value="reviewer">Assign Reviewer</SelectItem>
                  <SelectItem value="discipline">Change Discipline</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {action === 'status' && (
              <div>
                <label className="text-xs text-zinc-400 uppercase tracking-widest font-bold mb-2 block">
                  New Status
                </label>
                <Select value={value} onValueChange={setValue}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-800">
                    <SelectValue placeholder="Select status..." />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="IFA">Issued for Approval</SelectItem>
                    <SelectItem value="BFA">Back from Approval</SelectItem>
                    <SelectItem value="BFS">Back from Scrub</SelectItem>
                    <SelectItem value="FFF">Fit for Fabrication</SelectItem>
                    <SelectItem value="As-Built">As-Built</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {action === 'reviewer' && (
              <div>
                <label className="text-xs text-zinc-400 uppercase tracking-widest font-bold mb-2 block">
                  Assign To
                </label>
                <Select value={value} onValueChange={setValue}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-800">
                    <SelectValue placeholder="Select reviewer..." />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {users.map((u) => (
                      <SelectItem key={u.email} value={u.email}>{u.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {action === 'discipline' && (
              <div>
                <label className="text-xs text-zinc-400 uppercase tracking-widest font-bold mb-2 block">
                  Discipline
                </label>
                <Select value={value} onValueChange={setValue}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-800">
                    <SelectValue placeholder="Select discipline..." />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="structural">Structural</SelectItem>
                    <SelectItem value="misc_metals">Misc Metals</SelectItem>
                    <SelectItem value="stairs">Stairs</SelectItem>
                    <SelectItem value="handrails">Handrails</SelectItem>
                    <SelectItem value="connections">Connections</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} className="border-zinc-700">
              Cancel
            </Button>
            <Button 
              onClick={handleApply}
              disabled={!action || !value}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              Apply to {selectedSets.length} Sets
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}