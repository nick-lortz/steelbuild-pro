import React from 'react';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X, SlidersHorizontal } from 'lucide-react';

export default function ProjectsFilters({ 
  searchTerm, 
  onSearchChange, 
  statusFilter, 
  onStatusChange,
  pmFilter,
  onPMChange,
  sortBy,
  onSortChange,
  onClearFilters,
  hasActiveFilters,
  projectManagers = []
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
      {/* Search */}
      <div className="relative flex-1 w-full sm:max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="SEARCH PROJECTS..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 bg-background border-border h-9 placeholder:text-xs placeholder:text-muted-foreground"
        />
      </div>

      {/* Status Filter */}
      <Select value={statusFilter} onValueChange={onStatusChange}>
        <SelectTrigger className="w-36 h-9 bg-background border-border">
          <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="in_progress">Active</SelectItem>
          <SelectItem value="awarded">Awarded</SelectItem>
          <SelectItem value="bidding">Bidding</SelectItem>
          <SelectItem value="on_hold">On Hold</SelectItem>
          <SelectItem value="completed">Complete</SelectItem>
        </SelectContent>
      </Select>

      {/* PM Filter */}
      {projectManagers.length > 0 && (
        <Select value={pmFilter} onValueChange={onPMChange}>
          <SelectTrigger className="w-40 h-9 bg-background border-border">
            <SelectValue placeholder="All PMs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All PMs</SelectItem>
            {projectManagers.map(pm => (
              <SelectItem key={pm} value={pm}>{pm}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Sort */}
      <Select value={sortBy} onValueChange={onSortChange}>
        <SelectTrigger className="w-40 h-9 bg-background border-border">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="name">Name (A-Z)</SelectItem>
          <SelectItem value="target">Target Date</SelectItem>
          <SelectItem value="value">Value (High-Low)</SelectItem>
          <SelectItem value="progress">Progress</SelectItem>
          <SelectItem value="updated">Recently Updated</SelectItem>
        </SelectContent>
      </Select>

      {/* Clear */}
      {hasActiveFilters && (
        <Button 
          variant="ghost" 
          size="sm"
          onClick={onClearFilters}
          className="h-9 px-3"
        >
          <X size={14} className="mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}