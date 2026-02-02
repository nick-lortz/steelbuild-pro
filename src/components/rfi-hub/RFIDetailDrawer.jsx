import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { AlertCircle, Clock, User, FileText } from 'lucide-react';

export default function RFIDetailDrawer({ rfi, projects, open, onClose }) {
  if (!rfi) return null;
  
  const project = projects.find(p => p.id === rfi.project_id);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="bg-zinc-900 border-zinc-800 text-white w-[600px] sm:w-[800px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-white">
            RFI-{rfi.rfi_number}: {rfi.subject}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Project</p>
              <p className="text-sm text-white">{project?.name || 'Unknown'}</p>
              <p className="text-xs text-zinc-600 font-mono">{project?.project_number}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Status</p>
              <Badge className="capitalize">{rfi.status?.replace('_', ' ')}</Badge>
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Priority</p>
              <Badge className={getPriorityColor(rfi.priority)}>{rfi.priority}</Badge>
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Ball in Court</p>
              <p className="text-sm text-white capitalize">{rfi.ball_in_court}</p>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            {rfi.submitted_date && (
              <div>
                <p className="text-xs text-zinc-500 uppercase font-bold mb-1">
                  <Clock size={12} className="inline mr-1" />
                  Submitted
                </p>
                <p className="text-sm text-white">{format(new Date(rfi.submitted_date), 'MMM d, yyyy')}</p>
              </div>
            )}
            {rfi.due_date && (
              <div>
                <p className="text-xs text-zinc-500 uppercase font-bold mb-1">
                  <AlertCircle size={12} className="inline mr-1" />
                  Due Date
                </p>
                <p className="text-sm text-white">{format(new Date(rfi.due_date), 'MMM d, yyyy')}</p>
              </div>
            )}
            {rfi.response_date && (
              <div>
                <p className="text-xs text-zinc-500 uppercase font-bold mb-1">
                  <FileText size={12} className="inline mr-1" />
                  Responded
                </p>
                <p className="text-sm text-white">{format(new Date(rfi.response_date), 'MMM d, yyyy')}</p>
              </div>
            )}
          </div>

          {/* Blocker Info */}
          {rfi.blocker_info?.is_blocker && (
            <div className="p-4 bg-red-900/20 border border-red-800 rounded">
              <p className="text-xs text-red-500 uppercase font-bold mb-2">
                <AlertCircle size={12} className="inline mr-1" />
                Blocking Work
              </p>
              <p className="text-sm text-white">
                {rfi.blocker_info.blocked_work && (
                  <span className="capitalize">{rfi.blocker_info.blocked_work}</span>
                )}
              </p>
              {rfi.blocker_info.impact_summary && (
                <p className="text-sm text-zinc-400 mt-2">{rfi.blocker_info.impact_summary}</p>
              )}
            </div>
          )}

          {/* Question */}
          <div>
            <p className="text-xs text-zinc-500 uppercase font-bold mb-2">Question</p>
            <div className="p-4 bg-zinc-950 border border-zinc-800 rounded">
              <p className="text-sm text-white whitespace-pre-wrap">{rfi.question || 'No question provided'}</p>
            </div>
          </div>

          {/* Response */}
          {rfi.response && (
            <div>
              <p className="text-xs text-zinc-500 uppercase font-bold mb-2">Response</p>
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded">
                <p className="text-sm text-white whitespace-pre-wrap">{rfi.response}</p>
              </div>
            </div>
          )}

          {/* Location/Area */}
          {rfi.location_area && (
            <div>
              <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Location/Area</p>
              <p className="text-sm text-white">{rfi.location_area}</p>
            </div>
          )}

          {/* Assigned/Response Owner */}
          <div className="grid grid-cols-2 gap-4">
            {rfi.assigned_to && (
              <div>
                <p className="text-xs text-zinc-500 uppercase font-bold mb-1">
                  <User size={12} className="inline mr-1" />
                  Assigned To
                </p>
                <p className="text-sm text-white">{rfi.assigned_to}</p>
              </div>
            )}
            {rfi.response_owner && (
              <div>
                <p className="text-xs text-zinc-500 uppercase font-bold mb-1">
                  <User size={12} className="inline mr-1" />
                  Response Owner
                </p>
                <p className="text-sm text-white">{rfi.response_owner}</p>
              </div>
            )}
          </div>

          {/* Notes */}
          {rfi.notes && (
            <div>
              <p className="text-xs text-zinc-500 uppercase font-bold mb-2">Notes</p>
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded">
                <p className="text-sm text-zinc-400 whitespace-pre-wrap">{rfi.notes}</p>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function getPriorityColor(priority) {
  switch(priority) {
    case 'critical': return 'bg-red-700 text-red-100';
    case 'high': return 'bg-amber-700 text-amber-100';
    case 'medium': return 'bg-blue-700 text-blue-100';
    default: return 'bg-zinc-700 text-zinc-300';
  }
}