import React, { useState, useMemo } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import StatusBadge from '@/components/ui/StatusBadge';
import { ChevronDown, ChevronRight, FileText, AlertCircle, Clock, FolderOpen } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { safeFormat } from '@/components/shared/dateUtilsSafe';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function DrawingSetTable({ sets, sheets, revisions, projects, onSelectSet }) {
  const [expandedProjects, setExpandedProjects] = useState({});
  const [expandedSets, setExpandedSets] = useState(new Set());

  // Group drawing sets by project
  const setsByProject = useMemo(() => {
    const grouped = {};
    sets.forEach(set => {
      const project = projects.find(p => p.id === set.project_id);
      const projectKey = project?.id || 'unknown';
      const projectName = project ? `${project.project_number} - ${project.name}` : 'Unknown Project';
      
      if (!grouped[projectKey]) {
        grouped[projectKey] = {
          projectName,
          project,
          sets: []
        };
      }
      grouped[projectKey].sets.push(set);
    });
    
    // Sort by project name
    return Object.entries(grouped).sort(([, a], [, b]) => 
      a.projectName.localeCompare(b.projectName)
    );
  }, [sets, projects]);

  const toggleExpand = (setId) => {
    const newExpanded = new Set(expandedSets);
    if (newExpanded.has(setId)) {
      newExpanded.delete(setId);
    } else {
      newExpanded.add(setId);
    }
    setExpandedSets(newExpanded);
  };

  if (sets.length === 0) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800">
        <div className="p-8 text-center text-zinc-500">
          No drawing sets found. Create your first drawing set to get started.
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {setsByProject.map(([projectId, { projectName, sets: projectSets }]) => (
        <Collapsible
          key={projectId}
          open={expandedProjects[projectId] ?? true}
          onOpenChange={(open) => setExpandedProjects(prev => ({ ...prev, [projectId]: open }))}
        >
          <Card className="bg-zinc-900/50 border-zinc-800 overflow-hidden">
            <CollapsibleTrigger className="w-full p-4 hover:bg-zinc-800/50 transition-colors flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ChevronDown 
                  size={20} 
                  className={`text-amber-500 transition-transform ${expandedProjects[projectId] ?? true ? 'rotate-180' : ''}`} 
                />
                <FolderOpen size={20} className="text-amber-500" />
                <div className="text-left">
                  <h3 className="text-white font-semibold">{projectName}</h3>
                  <p className="text-xs text-zinc-500">{projectSets.length} drawing set{projectSets.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                {projectSets.length}
              </Badge>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <div className="border-t border-zinc-800">
                <div className="overflow-x-auto">
                  <table className="w-full table-fixed">
                    <colgroup>
                      <col style={{ width: '40px' }} />
                      <col style={{ width: '30%' }} />
                      <col style={{ width: '100px' }} />
                      <col style={{ width: '100px' }} />
                      <col style={{ width: '80px' }} />
                      <col style={{ width: '180px' }} />
                      <col style={{ width: '120px' }} />
                      <col />
                    </colgroup>
                    <thead className="bg-zinc-900 border-b border-zinc-800">
                      <tr>
                        <th className="text-left p-3 text-xs font-medium text-zinc-400 uppercase"></th>
                        <th className="text-left p-3 text-xs font-medium text-zinc-400 uppercase">Set</th>
                        <th className="text-left p-3 text-xs font-medium text-zinc-400 uppercase">Revision</th>
                        <th className="text-left p-3 text-xs font-medium text-zinc-400 uppercase">Status</th>
                        <th className="text-left p-3 text-xs font-medium text-zinc-400 uppercase">Sheets</th>
                        <th className="text-left p-3 text-xs font-medium text-zinc-400 uppercase">Milestones</th>
                        <th className="text-left p-3 text-xs font-medium text-zinc-400 uppercase">Due Date</th>
                        <th className="text-left p-3 text-xs font-medium text-zinc-400 uppercase">Alerts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectSets.map((set) => {
              const setSheets = sheets.filter(s => s.drawing_set_id === set.id);
              const setRevisions = revisions.filter(r => r.drawing_set_id === set.id);
              const isExpanded = expandedSets.has(set.id);
              const isOverdue = set.due_date && differenceInDays(new Date(), new Date(set.due_date)) > 0 && set.status !== 'FFF' && set.status !== 'As-Built';
              const needsRelease = set.status === 'BFS' && !set.released_for_fab_date;

              return (
                <React.Fragment key={set.id}>
                  <tr className="border-b border-zinc-800 hover:bg-zinc-800/30 cursor-pointer">
                    <td className="p-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(set.id);
                        }}
                      >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </Button>
                    </td>
                    <td className="p-3" onClick={() => onSelectSet(set)}>
                      <div>
                        <p className="font-medium text-white">{set.title || set.set_name}</p>
                        <p className="text-xs text-zinc-500 font-mono">{set.set_number || '-'}</p>
                      </div>
                    </td>
                    <td className="p-3" onClick={() => onSelectSet(set)}>
                      <span className="font-mono text-sm text-amber-500">{set.current_revision || '-'}</span>
                    </td>
                    <td className="p-3" onClick={() => onSelectSet(set)}>
                      <StatusBadge status={set.status} />
                    </td>
                    <td className="p-3" onClick={() => onSelectSet(set)}>
                      <div className="flex items-center gap-1 text-sm">
                        <FileText size={14} className="text-zinc-500" />
                        <span>{setSheets.length}</span>
                      </div>
                    </td>
                    <td className="p-3" onClick={() => onSelectSet(set)}>
                      <div className="flex gap-1">
                        {set.ifa_date && <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/20">IFA</Badge>}
                        {set.bfa_date && <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-400 border-purple-500/20">BFA</Badge>}
                        {set.bfs_date && <Badge variant="outline" className="text-xs bg-cyan-500/10 text-cyan-400 border-cyan-500/20">BFS</Badge>}
                        {set.released_for_fab_date && <Badge variant="outline" className="text-xs bg-green-500/10 text-green-400 border-green-500/20">Released</Badge>}
                      </div>
                    </td>
                    <td className="p-3 text-sm" onClick={() => onSelectSet(set)}>
                      {set.due_date ? (
                        <span className={isOverdue ? 'text-red-400 font-medium' : 'text-zinc-300'}>
                          {safeFormat(set.due_date, 'MMM d, yyyy')}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="p-3" onClick={() => onSelectSet(set)}>
                      {(isOverdue || needsRelease) && (
                        <div className="flex gap-1">
                          {isOverdue && (
                            <div className="flex items-center gap-1 text-red-400">
                              <AlertCircle size={14} />
                            </div>
                          )}
                          {needsRelease && (
                            <div className="flex items-center gap-1 text-amber-400">
                              <Clock size={14} />
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <tr className="bg-zinc-800/20 border-b border-zinc-800">
                      <td colSpan={9} className="p-4">
                        <div className="space-y-4">
                          {/* Milestone Timeline */}
                          {(set.ifa_date || set.bfa_date || set.bfs_date || set.released_for_fab_date) && (
                            <div>
                              <h4 className="text-xs font-medium text-zinc-400 mb-2">Milestone Timeline</h4>
                              <div className="flex gap-6 text-xs">
                                {set.ifa_date && (
                                  <div>
                                    <p className="text-zinc-500">IFA</p>
                                    <p className="text-zinc-300">{safeFormat(set.ifa_date, 'MMM d, yyyy')}</p>
                                  </div>
                                )}
                                {set.bfa_date && (
                                  <div>
                                    <p className="text-zinc-500">BFA</p>
                                    <p className="text-zinc-300">{safeFormat(set.bfa_date, 'MMM d, yyyy')}</p>
                                  </div>
                                )}
                                {set.bfs_date && (
                                  <div>
                                    <p className="text-zinc-500">BFS</p>
                                    <p className="text-zinc-300">{safeFormat(set.bfs_date, 'MMM d, yyyy')}</p>
                                  </div>
                                )}
                                {set.released_for_fab_date && (
                                  <div>
                                    <p className="text-zinc-500">Released</p>
                                    <p className="text-zinc-300">{safeFormat(set.released_for_fab_date, 'MMM d, yyyy')}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Sheets */}
                          {setSheets.length > 0 && (
                            <div>
                              <h4 className="text-xs font-medium text-zinc-400 mb-2">Sheets ({setSheets.length})</h4>
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                {setSheets.map(sheet => (
                                  <div key={sheet.id} className="p-2 bg-zinc-900/50 rounded border border-zinc-700 text-xs">
                                    <p className="font-mono text-amber-500">{sheet.sheet_number}</p>
                                    <p className="text-zinc-400 truncate">{sheet.sheet_name}</p>
                                    {sheet.ai_reviewed && (
                                      <Badge variant="outline" className="text-[10px] mt-1 bg-blue-500/10 text-blue-400 border-blue-500/20">
                                        AI Reviewed
                                      </Badge>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Revisions */}
                          {setRevisions.length > 0 && (
                            <div>
                              <h4 className="text-xs font-medium text-zinc-400 mb-2">Revision History ({setRevisions.length})</h4>
                              <div className="space-y-1">
                                {setRevisions.slice(0, 3).map(rev => (
                                  <div key={rev.id} className="flex items-center justify-between p-2 bg-zinc-900/50 rounded text-xs">
                                    <div className="flex items-center gap-3">
                                      <span className="font-mono text-amber-500">{rev.revision_number}</span>
                                      <span className="text-zinc-400">{rev.description}</span>
                                    </div>
                                    <span className="text-zinc-500">{safeFormat(rev.revision_date, 'MMM d, yyyy')}</span>
                                  </div>
                                ))}
                                {setRevisions.length > 3 && (
                                  <p className="text-zinc-500 text-xs">+{setRevisions.length - 3} more</p>
                                )}
                              </div>
                            </div>
                          )}

                          {set.notes && (
                            <div>
                              <h4 className="text-xs font-medium text-zinc-400 mb-1">Notes</h4>
                              <p className="text-sm text-zinc-300">{set.notes}</p>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  </CollapsibleContent>
</Card>
</Collapsible>
))}
</div>
);
}