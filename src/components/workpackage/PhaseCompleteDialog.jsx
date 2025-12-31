import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function PhaseCompleteDialog({ workPackage, phase, nextPhase, onConfirm, onCancel }) {
  const phaseLabels = {
    fabrication: 'Fabrication',
    delivery: 'Delivery',
    installation: 'Installation'
  };

  return (
    <AlertDialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-white">
        <AlertDialogHeader>
          <AlertDialogTitle>Complete {phaseLabels[phase]}?</AlertDialogTitle>
          <AlertDialogDescription className="text-zinc-400">
            This will mark <strong className="text-white">{workPackage.package_id}</strong> {phaseLabels[phase]} as complete
            and automatically move it to <strong className="text-amber-400">{phaseLabels[nextPhase]}</strong> phase.
            <br /><br />
            A new {phaseLabels[nextPhase]} task will be created with dependencies on the current phase.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-white">Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-green-600 hover:bg-green-700">
            Complete & Move to {phaseLabels[nextPhase]}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}