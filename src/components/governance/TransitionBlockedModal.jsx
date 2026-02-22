import React from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel
} from '@/components/ui/alert-dialog';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function TransitionBlockedModal({ isOpen, onOpenChange, transition }) {
  if (!transition || transition.ok === true) return null;

  const { reasons = [], recommendations = [], entity_type = 'Entity', entity_name = '' } = transition;

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-red-950/80 border-red-800 max-w-md">
        <AlertDialogHeader>
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
            <div>
              <AlertDialogTitle className="text-red-200">Action Blocked</AlertDialogTitle>
              <AlertDialogDescription className="text-red-300 text-sm mt-1">
                This status change is not permitted.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* Entity info */}
          <div className="text-xs text-gray-300">
            <span className="text-gray-400">{entity_type}:</span> <span className="font-mono">{entity_name}</span>
          </div>

          {/* Reasons */}
          {reasons.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-red-200 mb-2">Why it's blocked:</div>
              <ul className="space-y-1">
                {reasons.map((reason, idx) => (
                  <li key={idx} className="text-xs text-red-300 leading-relaxed ml-3">
                    • {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-green-300 mb-2">What to do next:</div>
              <ul className="space-y-1">
                {recommendations.map((rec, idx) => (
                  <li key={idx} className="text-xs text-green-200 leading-relaxed ml-3">
                    <CheckCircle2 className="w-3 h-3 inline mr-1" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel className="border-red-800 text-red-200 hover:bg-red-900/50">
            Close
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}