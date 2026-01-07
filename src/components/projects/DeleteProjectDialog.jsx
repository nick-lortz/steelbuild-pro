import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from '@/components/ui/notifications';

export default function DeleteProjectDialog({ project, open, onOpenChange, onSuccess }) {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirmText !== project.project_number) {
      toast.error('Project number does not match');
      return;
    }

    setIsDeleting(true);

    try {
      // Call cascade delete function
      const response = await base44.functions.invoke('cascadeDeleteProject', {
        project_id: project.id
      });

      if (response.data.success) {
        toast.success('Project and all related data deleted');
        onSuccess?.();
        onOpenChange(false);
      } else {
        throw new Error(response.data.error || 'Delete failed');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete project: ' + error.message);
    } finally {
      setIsDeleting(false);
      setConfirmText('');
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-zinc-900 border-red-500/30 max-w-2xl">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-500/20 rounded">
              <AlertTriangle className="text-red-500" size={24} />
            </div>
            <AlertDialogTitle className="text-white text-xl">
              Delete Project: {project?.project_number}
            </AlertDialogTitle>
          </div>
          
          <AlertDialogDescription className="text-zinc-300 space-y-4 pt-4">
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="font-semibold text-red-400 mb-2">⚠️ This action cannot be undone</p>
              <p className="text-sm text-zinc-400">
                Deleting <span className="font-mono text-white">{project?.name}</span> will permanently remove:
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="p-2 bg-zinc-800/50 rounded border border-zinc-700">
                <span className="text-zinc-400">• Tasks & Schedules</span>
              </div>
              <div className="p-2 bg-zinc-800/50 rounded border border-zinc-700">
                <span className="text-zinc-400">• Documents & Drawings</span>
              </div>
              <div className="p-2 bg-zinc-800/50 rounded border border-zinc-700">
                <span className="text-zinc-400">• RFIs & Change Orders</span>
              </div>
              <div className="p-2 bg-zinc-800/50 rounded border border-zinc-700">
                <span className="text-zinc-400">• Financial Records</span>
              </div>
              <div className="p-2 bg-zinc-800/50 rounded border border-zinc-700">
                <span className="text-zinc-400">• Labor & Equipment</span>
              </div>
              <div className="p-2 bg-zinc-800/50 rounded border border-zinc-700">
                <span className="text-zinc-400">• Deliveries & Fabrication</span>
              </div>
              <div className="p-2 bg-zinc-800/50 rounded border border-zinc-700">
                <span className="text-zinc-400">• Meeting Notes</span>
              </div>
              <div className="p-2 bg-zinc-800/50 rounded border border-zinc-700">
                <span className="text-zinc-400">• All Other Project Data</span>
              </div>
            </div>

            <div className="space-y-2 pt-4">
              <Label className="text-white">
                Type <span className="font-mono text-amber-500">{project?.project_number}</span> to confirm deletion
              </Label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Enter project number"
                className="bg-zinc-800 border-zinc-700 text-white font-mono"
                disabled={isDeleting}
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel 
            className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
            disabled={isDeleting}
          >
            Cancel
          </AlertDialogCancel>
          <Button
            onClick={handleDelete}
            disabled={confirmText !== project?.project_number || isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Project & All Data'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}