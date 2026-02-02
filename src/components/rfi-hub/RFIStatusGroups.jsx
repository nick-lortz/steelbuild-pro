import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function RFIStatusGroups({ rfis, onSelectRFI }) {
  const groups = {
    draft: rfis.filter(r => r.status === 'draft'),
    internal_review: rfis.filter(r => r.status === 'internal_review'),
    submitted: rfis.filter(r => r.status === 'submitted'),
    under_review: rfis.filter(r => r.status === 'under_review'),
    answered: rfis.filter(r => r.status === 'answered'),
    closed: rfis.filter(r => r.status === 'closed')
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-base uppercase tracking-wider">RFIs by Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Object.entries(groups).map(([status, statusRFIs]) => (
            <div key={status}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">
                  {status.replace('_', ' ')}
                </h3>
                <Badge className="bg-zinc-800 text-zinc-400">
                  {statusRFIs.length}
                </Badge>
              </div>
              
              {statusRFIs.length === 0 ? (
                <p className="text-xs text-zinc-600 italic py-2">No RFIs</p>
              ) : (
                <div className="space-y-1">
                  {statusRFIs.slice(0, 5).map(rfi => (
                    <div
                      key={rfi.id}
                      onClick={() => onSelectRFI(rfi)}
                      className="p-2 bg-zinc-950 border border-zinc-800 rounded hover:border-zinc-700 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{rfi.subject}</p>
                          <p className="text-xs text-zinc-500 font-mono">RFI-{rfi.rfi_number}</p>
                        </div>
                        <Badge className={getPriorityBadge(rfi.priority)}>
                          {rfi.priority}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {statusRFIs.length > 5 && (
                    <p className="text-xs text-zinc-600 italic pt-1">
                      +{statusRFIs.length - 5} more
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function getPriorityBadge(priority) {
  switch(priority) {
    case 'critical': return 'bg-red-700 text-red-100';
    case 'high': return 'bg-amber-700 text-amber-100';
    case 'medium': return 'bg-blue-700 text-blue-100';
    default: return 'bg-zinc-700 text-zinc-300';
  }
}