import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import StatusBadge from '@/components/ui/StatusBadge';
import { FileText, MessageSquareWarning, Wrench, AlertCircle, Users, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function LookAheadTable({ activities, resources, users, drawingSets, rfis, onActivityClick, onUpdateActivity }) {
  const [editingResourcesFor, setEditingResourcesFor] = useState(null);
  const [editingConstraintsFor, setEditingConstraintsFor] = useState(null);
  const [selectedResources, setSelectedResources] = useState([]);
  const [constraintNote, setConstraintNote] = useState('');

  const getConstraints = (activity) => {
    const constraints = [];

    if (activity.linked_drawing_ids?.length > 0) {
      const pendingDrawings = drawingSets.filter(ds => 
        activity.linked_drawing_ids.includes(ds.id) && ds.status !== 'FFF'
      );
      if (pendingDrawings.length > 0) {
        constraints.push({
          type: 'drawing',
          count: pendingDrawings.length,
          label: `${pendingDrawings.length} drawing${pendingDrawings.length > 1 ? 's' : ''} not FFF`
        });
      }
    }

    if (activity.linked_rfi_ids?.length > 0) {
      const openRFIs = rfis.filter(rfi => 
        activity.linked_rfi_ids.includes(rfi.id) && rfi.status !== 'answered'
      );
      if (openRFIs.length > 0) {
        constraints.push({
          type: 'rfi',
          count: openRFIs.length,
          label: `${openRFIs.length} open RFI${openRFIs.length > 1 ? 's' : ''}`
        });
      }
    }

    if (activity.constraint_notes) {
      constraints.push({
        type: 'note',
        label: activity.constraint_notes
      });
    }

    return constraints;
  };

  const columns = [
    {
      header: 'Activity',
      accessor: 'name',
      render: (row) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{row.name}</span>
            {row.is_critical && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                CRITICAL
              </Badge>
            )}
            {row.is_milestone && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-purple-500/20 text-purple-400 border-purple-500/30">
                Milestone
              </Badge>
            )}
          </div>
          <p className="text-xs text-zinc-500 capitalize">{row.phase} • {row.activity_type}</p>
        </div>
      )
    },
    {
      header: 'Start',
      accessor: 'start_date',
      render: (row) => (
        <Input
          type="date"
          value={row.start_date || ''}
          onChange={(e) => {
            e.stopPropagation();
            if (!row.source_entity) {
              onUpdateActivity(row.id, { start_date: e.target.value });
            }
          }}
          onClick={(e) => e.stopPropagation()}
          disabled={!!row.source_entity}
          className="w-36 h-8 text-xs bg-zinc-800 border-zinc-700 disabled:opacity-50"
        />
      )
    },
    {
      header: 'End',
      accessor: 'end_date',
      render: (row) => (
        <Input
          type="date"
          value={row.end_date || ''}
          onChange={(e) => {
            e.stopPropagation();
            if (!row.source_entity) {
              onUpdateActivity(row.id, { end_date: e.target.value });
            }
          }}
          onClick={(e) => e.stopPropagation()}
          disabled={!!row.source_entity}
          className="w-36 h-8 text-xs bg-zinc-800 border-zinc-700 disabled:opacity-50"
        />
      )
    },
    {
      header: 'Resources',
      accessor: 'resource_ids',
      render: (row) => {
        const assignedResources = resources.filter(r => 
          (row.resource_ids || []).includes(r.id)
        );
        return (
          <div 
            className="flex flex-wrap gap-1 cursor-pointer hover:bg-zinc-800/50 p-1 rounded transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              if (!row.source_entity) {
                setSelectedResources(row.resource_ids || []);
                setEditingResourcesFor(row);
              }
            }}
          >
            {assignedResources.length > 0 ? (
              assignedResources.slice(0, 2).map(r => (
                <Badge key={r.id} variant="outline" className="text-[10px] px-1.5 py-0">
                  {r.name}
                </Badge>
              ))
            ) : (
              <div className="flex items-center gap-1 text-xs text-zinc-500">
                <Users size={12} />
                <span>Assign</span>
              </div>
            )}
            {assignedResources.length > 2 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                +{assignedResources.length - 2}
              </Badge>
            )}
          </div>
        );
      }
    },
    {
      header: 'Constraints',
      accessor: 'constraints',
      render: (row) => {
        const constraints = getConstraints(row);
        return (
          <div 
            className="flex flex-wrap gap-1 cursor-pointer hover:bg-zinc-800/50 p-1 rounded transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              if (!row.source_entity) {
                setConstraintNote(row.constraint_notes || '');
                setEditingConstraintsFor(row);
              }
            }}
          >
            {constraints.length === 0 ? (
              <div className="flex items-center gap-1 text-xs text-zinc-500">
                <AlertCircle size={12} />
                <span>Add note</span>
              </div>
            ) : (
              constraints.map((c, idx) => (
                <div key={idx} className="flex items-center gap-1">
                  {c.type === 'drawing' && <FileText size={12} className="text-blue-400" />}
                  {c.type === 'rfi' && <MessageSquareWarning size={12} className="text-amber-400" />}
                  {c.type === 'note' && <AlertCircle size={12} className="text-zinc-500" />}
                  <span className="text-[10px] text-zinc-400">{c.label}</span>
                </div>
              ))
            )}
          </div>
        );
      }
    },
    {
      header: 'Progress',
      accessor: 'progress_percent',
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="flex-1 max-w-[80px]">
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all"
                style={{ width: `${row.progress_percent || 0}%` }}
              />
            </div>
          </div>
          <Input
            type="number"
            min="0"
            max="100"
            value={row.progress_percent || 0}
            onChange={(e) => {
              e.stopPropagation();
              const val = parseInt(e.target.value) || 0;
              if (val >= 0 && val <= 100 && !row.source_entity) {
                onUpdateActivity(row.id, { progress_percent: val });
              }
            }}
            onClick={(e) => e.stopPropagation()}
            disabled={!!row.source_entity}
            className="w-14 h-7 text-xs bg-zinc-800 border-zinc-700 text-center disabled:opacity-50"
          />
        </div>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => (
        <Select
          value={row.status || 'planned'}
          onValueChange={(value) => {
            if (!row.source_entity) {
              onUpdateActivity(row.id, { status: value });
            }
          }}
          disabled={!!row.source_entity}
        >
          <SelectTrigger 
            className="w-32 h-8 text-xs bg-zinc-800 border-zinc-700 disabled:opacity-50"
            onClick={(e) => e.stopPropagation()}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="planned">Planned</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="delayed">Delayed</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
          </SelectContent>
        </Select>
      )
    }
  ];

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-lg">Look-Ahead Activities ({activities.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            <p>No activities match current filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  {columns.map((col, idx) => (
                    <th key={idx} className="text-left py-3 px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activities.map(activity => (
                  <tr
                    key={activity.id}
                    onClick={() => onActivityClick(activity)}
                    className="border-b border-zinc-800 hover:bg-zinc-800/50 cursor-pointer transition-colors"
                  >
                    {columns.map((col, idx) => (
                      <td key={idx} className="py-3 px-4">
                        {col.render(activity)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      {/* Resource Assignment Dialog */}
      <Dialog open={!!editingResourcesFor} onOpenChange={() => setEditingResourcesFor(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle>Assign Resources</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {resources.map((resource) => (
                <label
                  key={resource.id}
                  className="flex items-center gap-2 p-2 rounded hover:bg-zinc-800 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedResources.includes(resource.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedResources([...selectedResources, resource.id]);
                      } else {
                        setSelectedResources(selectedResources.filter(id => id !== resource.id));
                      }
                    }}
                  />
                  <div>
                    <p className="text-sm font-medium">{resource.name}</p>
                    <p className="text-xs text-zinc-500 capitalize">{resource.type}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingResourcesFor(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  onUpdateActivity(editingResourcesFor.id, { resource_ids: selectedResources });
                  setEditingResourcesFor(null);
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Constraint Note Dialog */}
      <Dialog open={!!editingConstraintsFor} onOpenChange={() => setEditingConstraintsFor(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle>Constraint Notes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-zinc-400 mb-2">
                Add notes about constraints, blockers, or dependencies
              </p>
              <Textarea
                value={constraintNote}
                onChange={(e) => setConstraintNote(e.target.value)}
                placeholder="e.g., Waiting on steel delivery, Need final drawings, Weather delay..."
                rows={4}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingConstraintsFor(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  onUpdateActivity(editingConstraintsFor.id, { constraint_notes: constraintNote });
                  setEditingConstraintsFor(null);
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}