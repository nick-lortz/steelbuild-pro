import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Filter, X } from 'lucide-react';

export default function FacetedSearchPanel({ 
  documents = [],
  projects = [],
  workPackages = [],
  tasks = [],
  activeFilters = {},
  onFilterChange,
  onClearAll
}) {
  const facets = useMemo(() => {
    // Calculate facet counts
    const categoryCounts = {};
    const statusCounts = {};
    const phaseCounts = {};
    const tagCounts = {};
    const wpCounts = {};
    const projectCounts = {};

    (documents || []).forEach(doc => {
      // Category
      categoryCounts[doc.category] = (categoryCounts[doc.category] || 0) + 1;
      
      // Status
      if (doc.status) {
        statusCounts[doc.status] = (statusCounts[doc.status] || 0) + 1;
      }
      
      // Phase
      if (doc.phase) {
        phaseCounts[doc.phase] = (phaseCounts[doc.phase] || 0) + 1;
      }
      
      // Tags
      (doc.tags || []).forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
      
      // Work Package
      if (doc.work_package_id) {
        wpCounts[doc.work_package_id] = (wpCounts[doc.work_package_id] || 0) + 1;
      }
      
      // Project
      if (doc.project_id) {
        projectCounts[doc.project_id] = (projectCounts[doc.project_id] || 0) + 1;
      }
    });

    return {
      categories: Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]),
      statuses: Object.entries(statusCounts).sort((a, b) => b[1] - a[1]),
      phases: Object.entries(phaseCounts).sort((a, b) => b[1] - a[1]),
      tags: Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 10),
      workPackages: Object.entries(wpCounts).sort((a, b) => b[1] - a[1]).slice(0, 8),
      projects: Object.entries(projectCounts).sort((a, b) => b[1] - a[1])
    };
  }, [documents]);

  const activeFilterCount = Object.values(activeFilters).filter(v => v && v !== 'all').length;

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Filter size={16} />
            Faceted Filters
            {activeFilterCount > 0 && (
              <Badge className="bg-amber-500 text-black text-xs">{activeFilterCount}</Badge>
            )}
          </CardTitle>
          {activeFilterCount > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onClearAll}
              className="text-xs text-zinc-500 hover:text-white"
            >
              <X size={14} className="mr-1" />
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Project */}
        {facets.projects.length > 0 && (
          <div>
            <div className="text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Project</div>
            <div className="space-y-1">
              {facets.projects.map(([projectId, count]) => {
                const project = projects.find(p => p.id === projectId);
                const isActive = activeFilters.project === projectId;
                return (
                  <button
                    key={projectId}
                    onClick={() => onFilterChange('project', isActive ? 'all' : projectId)}
                    className={`w-full flex items-center justify-between p-2 rounded text-sm transition-colors ${
                      isActive ? 'bg-amber-500 text-black' : 'hover:bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    <span className="truncate">{project?.project_number || 'Unknown'}</span>
                    <Badge className={isActive ? 'bg-black/20 text-black' : 'bg-zinc-800 text-zinc-400'}>
                      {count}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Category */}
        {facets.categories.length > 0 && (
          <div>
            <div className="text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Category</div>
            <div className="flex flex-wrap gap-2">
              {facets.categories.map(([category, count]) => {
                const isActive = activeFilters.category === category;
                return (
                  <button
                    key={category}
                    onClick={() => onFilterChange('category', isActive ? 'all' : category)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
                      isActive 
                        ? 'bg-amber-500 text-black' 
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    <span className="capitalize">{category}</span>
                    <Badge className={isActive ? 'bg-black/20 text-black' : 'bg-zinc-700 text-zinc-400'}>
                      {count}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Status */}
        {facets.statuses.length > 0 && (
          <div>
            <div className="text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Status</div>
            <div className="flex flex-wrap gap-2">
              {facets.statuses.map(([status, count]) => {
                const isActive = activeFilters.status === status;
                return (
                  <button
                    key={status}
                    onClick={() => onFilterChange('status', isActive ? 'all' : status)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
                      isActive 
                        ? 'bg-amber-500 text-black' 
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    <span className="capitalize">{status.replace('_', ' ')}</span>
                    <Badge className={isActive ? 'bg-black/20 text-black' : 'bg-zinc-700 text-zinc-400'}>
                      {count}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Phase */}
        {facets.phases.length > 0 && (
          <div>
            <div className="text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Phase</div>
            <div className="flex flex-wrap gap-2">
              {facets.phases.map(([phase, count]) => {
                const isActive = activeFilters.phase === phase;
                return (
                  <button
                    key={phase}
                    onClick={() => onFilterChange('phase', isActive ? 'all' : phase)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
                      isActive 
                        ? 'bg-amber-500 text-black' 
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    <span className="capitalize">{phase}</span>
                    <Badge className={isActive ? 'bg-black/20 text-black' : 'bg-zinc-700 text-zinc-400'}>
                      {count}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tags */}
        {facets.tags.length > 0 && (
          <div>
            <div className="text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">
              Popular Tags ({facets.tags.length})
            </div>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {facets.tags.map(([tag, count]) => {
                const isActive = activeFilters.tag === tag;
                return (
                  <button
                    key={tag}
                    onClick={() => onFilterChange('tag', isActive ? 'all' : tag)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
                      isActive 
                        ? 'bg-amber-500 text-black' 
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    <span>{tag}</span>
                    <Badge className={isActive ? 'bg-black/20 text-black' : 'bg-zinc-700 text-zinc-400'}>
                      {count}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Work Packages */}
        {facets.workPackages.length > 0 && (
          <div>
            <div className="text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">
              Top Work Packages
            </div>
            <div className="space-y-1">
              {facets.workPackages.map(([wpId, count]) => {
                const wp = workPackages.find(w => w.id === wpId);
                const isActive = activeFilters.wp === wpId;
                return (
                  <button
                    key={wpId}
                    onClick={() => onFilterChange('wp', isActive ? 'all' : wpId)}
                    className={`w-full flex items-center justify-between p-2 rounded text-xs transition-colors ${
                      isActive ? 'bg-amber-500 text-black' : 'hover:bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    <span className="truncate font-mono">{wp?.wpid || 'Unknown'}</span>
                    <Badge className={isActive ? 'bg-black/20 text-black' : 'bg-zinc-800 text-zinc-400'}>
                      {count}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}