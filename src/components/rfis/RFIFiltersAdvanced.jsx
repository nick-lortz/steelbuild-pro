import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, X, Filter } from 'lucide-react';

export default function RFIFiltersAdvanced({ 
  filters, 
  onFilterChange, 
  onClearFilters,
  projects = [],
  showProjectFilter = true 
}) {
  const activeFilterCount = Object.values(filters).filter(v => v && v !== 'all').length;

  return (
    <div className="bg-card border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Filter size={16} className="text-muted-foreground" />
        <span className="text-sm font-medium">Filters</span>
        {activeFilterCount > 0 && (
          <Badge variant="outline">{activeFilterCount}</Badge>
        )}
        {activeFilterCount > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClearFilters}
            className="ml-auto text-xs"
          >
            Clear All
          </Button>
        )}
      </div>

      <div className="grid grid-cols-6 gap-3">
        {/* Search */}
        <div className="col-span-2 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search RFIs..."
            value={filters.search || ''}
            onChange={(e) => onFilterChange('search', e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Project Filter */}
        {showProjectFilter && (
          <Select 
            value={filters.project_id || 'all'} 
            onValueChange={(val) => onFilterChange('project_id', val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Status */}
        <Select 
          value={filters.status || 'all'} 
          onValueChange={(val) => onFilterChange('status', val)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="internal_review">Internal Review</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="answered">Answered</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="reopened">Reopened</SelectItem>
          </SelectContent>
        </Select>

        {/* Priority */}
        <Select 
          value={filters.priority || 'all'} 
          onValueChange={(val) => onFilterChange('priority', val)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        {/* Ball in Court */}
        <Select 
          value={filters.ball_in_court || 'all'} 
          onValueChange={(val) => onFilterChange('ball_in_court', val)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Ball in Court" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Parties</SelectItem>
            <SelectItem value="internal">Internal</SelectItem>
            <SelectItem value="external">External</SelectItem>
            <SelectItem value="gc">GC</SelectItem>
            <SelectItem value="architect">Architect</SelectItem>
            <SelectItem value="engineer">Engineer</SelectItem>
            <SelectItem value="vendor">Vendor</SelectItem>
          </SelectContent>
        </Select>

        {/* RFI Type */}
        <Select 
          value={filters.rfi_type || 'all'} 
          onValueChange={(val) => onFilterChange('rfi_type', val)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="connection_detail">Connection Detail</SelectItem>
            <SelectItem value="member_size_length">Member Size/Length</SelectItem>
            <SelectItem value="embed_anchor">Embed/Anchor</SelectItem>
            <SelectItem value="tolerance_fitup">Tolerance/Fitup</SelectItem>
            <SelectItem value="coating_finish">Coating/Finish</SelectItem>
            <SelectItem value="erection_sequence">Erection Sequence</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Secondary Filters */}
      <div className="grid grid-cols-4 gap-3 mt-3">
        {/* View Mode */}
        <Select 
          value={filters.view || 'active'} 
          onValueChange={(val) => onFilterChange('view', val)}
        >
          <SelectTrigger>
            <SelectValue placeholder="View" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active RFIs</SelectItem>
            <SelectItem value="awaiting">Awaiting Response</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="blockers">Blockers</SelectItem>
            <SelectItem value="answered">Answered</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="all">All RFIs</SelectItem>
          </SelectContent>
        </Select>

        {/* Assigned To */}
        <Input
          placeholder="Assigned to..."
          value={filters.assigned_to || ''}
          onChange={(e) => onFilterChange('assigned_to', e.target.value)}
        />

        {/* Category */}
        <Select 
          value={filters.category || 'all'} 
          onValueChange={(val) => onFilterChange('category', val)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="structural">Structural</SelectItem>
            <SelectItem value="architectural">Architectural</SelectItem>
            <SelectItem value="mep">MEP</SelectItem>
            <SelectItem value="coordination">Coordination</SelectItem>
            <SelectItem value="clarification">Clarification</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>

        {/* Show Blockers Only */}
        <Select 
          value={filters.blockers_only || 'all'} 
          onValueChange={(val) => onFilterChange('blockers_only', val)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Blockers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All RFIs</SelectItem>
            <SelectItem value="true">Blockers Only</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}