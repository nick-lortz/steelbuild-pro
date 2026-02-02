import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function RFIHubTable({ rfis, onEdit, onDelete, title }) {
  if (!rfis || rfis.length === 0) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="py-12 text-center">
          <p className="text-zinc-500">No RFIs in this category</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'bg-zinc-700 text-zinc-300';
      case 'internal_review': return 'bg-blue-700 text-blue-300';
      case 'submitted': return 'bg-blue-900 text-blue-200';
      case 'under_review': return 'bg-amber-700 text-amber-300';
      case 'answered': return 'bg-green-700 text-green-300';
      case 'closed': return 'bg-zinc-700 text-zinc-400';
      default: return 'bg-zinc-700 text-zinc-300';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'bg-red-700 text-red-300 border-red-600';
      case 'high': return 'bg-orange-700 text-orange-300 border-orange-600';
      case 'medium': return 'bg-yellow-700 text-yellow-300 border-yellow-600';
      case 'low': return 'bg-zinc-700 text-zinc-400 border-zinc-600';
      default: return 'bg-zinc-700 text-zinc-400 border-zinc-600';
    }
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-base uppercase tracking-wider">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left py-2 px-3 text-[10px] text-zinc-500 uppercase font-bold tracking-widest">RFI #</th>
                <th className="text-left py-2 px-3 text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Project</th>
                <th className="text-left py-2 px-3 text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Subject</th>
                <th className="text-left py-2 px-3 text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Type</th>
                <th className="text-left py-2 px-3 text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Status</th>
                <th className="text-left py-2 px-3 text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Priority</th>
                <th className="text-left py-2 px-3 text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Owner</th>
                <th className="text-left py-2 px-3 text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Age</th>
                <th className="text-left py-2 px-3 text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Due</th>
                <th className="text-right py-2 px-3 text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rfis.map((rfi) => (
                <tr key={rfi.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                  <td className="py-2 px-3">
                    <span className="font-mono text-white font-bold">{rfi.rfi_number}</span>
                  </td>
                  <td className="py-2 px-3">
                    <div>
                      <p className="text-white text-xs font-medium">{rfi.project_number}</p>
                      <p className="text-zinc-500 text-[10px] truncate max-w-[150px]">{rfi.project_name}</p>
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <p className="text-white font-medium truncate max-w-[250px]">{rfi.subject}</p>
                  </td>
                  <td className="py-2 px-3">
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {rfi.rfi_type?.replace(/_/g, ' ') || 'N/A'}
                    </Badge>
                  </td>
                  <td className="py-2 px-3">
                    <Badge className={`text-[10px] capitalize ${getStatusColor(rfi.status)}`}>
                      {rfi.status?.replace(/_/g, ' ')}
                    </Badge>
                  </td>
                  <td className="py-2 px-3">
                    <Badge className={`text-[10px] capitalize ${getPriorityColor(rfi.priority)}`}>
                      {rfi.priority}
                    </Badge>
                  </td>
                  <td className="py-2 px-3">
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {rfi.ball_in_court || 'N/A'}
                    </Badge>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-1">
                      {rfi.is_at_risk && <AlertTriangle size={12} className="text-red-500" />}
                      <span className={rfi.is_at_risk ? 'text-red-400' : 'text-zinc-400'}>
                        {rfi.age_days}d
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    {rfi.due_date ? (
                      <div>
                        <p className={`text-xs ${rfi.is_overdue ? 'text-red-400' : 'text-zinc-400'}`}>
                          {format(parseISO(rfi.due_date), 'MMM d')}
                        </p>
                        {rfi.days_until_due !== null && (
                          <p className={`text-[10px] ${rfi.days_until_due < 0 ? 'text-red-500' : 'text-zinc-600'}`}>
                            {rfi.days_until_due < 0 ? `${Math.abs(rfi.days_until_due)}d late` : `${rfi.days_until_due}d`}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-zinc-600 text-xs">—</span>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onEdit(rfi)}
                        className="h-7 w-7 p-0 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                      >
                        <Pencil size={12} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDelete(rfi)}
                        className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}