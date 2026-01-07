import React, { useState, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, File, Eye, Download, AlertTriangle, CheckCircle } from 'lucide-react';
import { format, isPast, parseISO } from 'date-fns';
import StatusBadge from '@/components/ui/StatusBadge';

export default function DocumentTreeView({ documents, projects, onDocClick }) {
  const [collapsedProjects, setCollapsedProjects] = useState(new Set());
  const [collapsedCategories, setCollapsedCategories] = useState(new Set());

  const toggleProject = (projectId) => {
    const newSet = new Set(collapsedProjects);
    newSet.has(projectId) ? newSet.delete(projectId) : newSet.add(projectId);
    setCollapsedProjects(newSet);
  };

  const toggleCategory = (key) => {
    const newSet = new Set(collapsedCategories);
    newSet.has(key) ? newSet.delete(key) : newSet.add(key);
    setCollapsedCategories(newSet);
  };

  const isReviewOverdue = (doc) => {
    if (!doc.review_due_date || doc.status === 'approved' || doc.status === 'void') return false;
    try {
      return isPast(parseISO(doc.review_due_date));
    } catch {
      return false;
    }
  };

  // Group documents by project -> category
  const groupedDocs = useMemo(() => {
    const groups = {};
    
    // Only show current versions
    const currentDocs = documents.filter(d => d.is_current && d.status !== 'superseded');
    
    currentDocs.forEach(doc => {
      const projectId = doc.project_id || 'unassigned';
      const category = doc.category || 'other';
      
      if (!groups[projectId]) groups[projectId] = {};
      if (!groups[projectId][category]) groups[projectId][category] = [];
      groups[projectId][category].push(doc);
    });

    return groups;
  }, [documents]);

  const categories = {
    drawing: { label: 'Drawings', icon: '📐' },
    specification: { label: 'Specifications', icon: '📋' },
    rfi: { label: 'RFIs', icon: '❓' },
    submittal: { label: 'Submittals', icon: '📤' },
    contract: { label: 'Contracts', icon: '📜' },
    report: { label: 'Reports', icon: '📊' },
    photo: { label: 'Photos', icon: '📷' },
    correspondence: { label: 'Correspondence', icon: '✉️' },
    other: { label: 'Other', icon: '📁' }
  };

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardContent className="p-0">
        <div className="divide-y divide-zinc-800">
          {Object.entries(groupedDocs).map(([projectId, categoryGroups]) => {
            const project = projects.find(p => p.id === projectId) || { name: 'Unassigned', project_number: 'N/A' };
            const isProjectCollapsed = collapsedProjects.has(projectId);
            const projectDocs = Object.values(categoryGroups).flat();
            const pendingReview = projectDocs.filter(d => d.workflow_stage === 'pending_review').length;
            const overdue = projectDocs.filter(isReviewOverdue).length;

            return (
              <div key={projectId}>
                {/* Project Header */}
                <button
                  onClick={() => toggleProject(projectId)}
                  className="w-full text-left p-4 hover:bg-zinc-800/30 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    {isProjectCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                    <span className="font-bold text-amber-400">
                      {project.project_number} - {project.name}
                    </span>
                    <span className="text-xs text-zinc-500">
                      ({projectDocs.length} docs)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {pendingReview > 0 && (
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40 text-xs">
                        {pendingReview} pending
                      </Badge>
                    )}
                    {overdue > 0 && (
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/40 text-xs">
                        <AlertTriangle size={10} className="mr-1" />
                        {overdue} overdue
                      </Badge>
                    )}
                  </div>
                </button>

                {/* Category Groups */}
                {!isProjectCollapsed && Object.entries(categoryGroups).map(([category, docs]) => {
                  const catKey = `${projectId}-${category}`;
                  const isCategoryCollapsed = collapsedCategories.has(catKey);
                  const catInfo = categories[category] || categories.other;
                  const catPendingReview = docs.filter(d => d.workflow_stage === 'pending_review').length;
                  const catOverdue = docs.filter(isReviewOverdue).length;

                  return (
                    <div key={catKey} className="bg-zinc-900/30">
                      {/* Category Header */}
                      <button
                        onClick={() => toggleCategory(catKey)}
                        className="w-full text-left p-3 pl-12 hover:bg-zinc-800/30 transition-colors flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          {isCategoryCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                          <span className="text-lg">{catInfo.icon}</span>
                          <span className="font-semibold text-zinc-300">{catInfo.label}</span>
                          <span className="text-xs text-zinc-500">({docs.length})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {catPendingReview > 0 && (
                            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40 text-[10px]">
                              {catPendingReview}
                            </Badge>
                          )}
                          {catOverdue > 0 && (
                            <Badge className="bg-red-500/20 text-red-400 border-red-500/40 text-[10px]">
                              {catOverdue}
                            </Badge>
                          )}
                        </div>
                      </button>

                      {/* Documents */}
                      {!isCategoryCollapsed && (
                        <div className="divide-y divide-zinc-800/50">
                          {docs.map(doc => {
                            const overdue = isReviewOverdue(doc);
                            
                            return (
                              <div
                                key={doc.id}
                                className="p-3 pl-20 hover:bg-zinc-800/20 transition-colors flex items-center justify-between"
                              >
                                <button
                                  onClick={() => onDocClick(doc)}
                                  className="flex-1 text-left flex items-center gap-3"
                                >
                                  <File size={16} className="text-zinc-500 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-white font-medium truncate">
                                        {doc.title}
                                      </span>
                                      {doc.revision && (
                                        <Badge variant="outline" className="bg-zinc-800 text-zinc-300 border-zinc-700 text-[10px]">
                                          Rev {doc.revision}
                                        </Badge>
                                      )}
                                      {doc.phase && (
                                        <Badge variant="outline" className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px] capitalize">
                                          {doc.phase}
                                        </Badge>
                                      )}
                                      <StatusBadge status={doc.status} className="text-[10px]" />
                                      {overdue && (
                                        <Badge className="bg-red-500/20 text-red-400 border-red-500/40 text-[10px]">
                                          <AlertTriangle size={10} className="mr-1" />
                                          Overdue
                                        </Badge>
                                      )}
                                      {doc.status === 'approved' && (
                                        <CheckCircle size={12} className="text-green-400" />
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
                                      <span>v{doc.version}</span>
                                      <span>•</span>
                                      <span>{format(new Date(doc.created_date), 'MMM d, yyyy')}</span>
                                      {doc.review_due_date && (
                                        <>
                                          <span>•</span>
                                          <span className={overdue ? 'text-red-400' : ''}>
                                            Due: {format(parseISO(doc.review_due_date), 'MMM d')}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </button>

                                <div className="flex items-center gap-1 ml-2">
                                  {doc.file_url && (
                                    <>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          window.open(doc.file_url, '_blank');
                                        }}
                                        className="h-7 w-7 text-zinc-500 hover:text-white"
                                      >
                                        <Eye size={14} />
                                      </Button>
                                      <a
                                        href={doc.file_url}
                                        download={doc.file_name}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-7 w-7 text-zinc-500 hover:text-white"
                                        >
                                          <Download size={14} />
                                        </Button>
                                      </a>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}