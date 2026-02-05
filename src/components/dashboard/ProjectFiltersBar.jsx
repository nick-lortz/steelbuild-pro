import React from 'react';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ProjectFiltersBar({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  riskFilter,
  onRiskChange,
  sortBy,
  onSortChange,
  onClearFilters,
  hasActiveFilters
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 card-elevated">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[280px] max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 h-9 bg-background border-border"
          />
        </div>

        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="w-40 h-9 bg-background border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={riskFilter} onValueChange={onRiskChange}>
          <SelectTrigger className="w-40 h-9 bg-background border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Risk</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="at_risk">At Risk</SelectItem>
            <SelectItem value="on_track">On Track</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-40 h-9 bg-background border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="risk">Sort by Risk</SelectItem>
            <SelectItem value="name">Sort by Name</SelectItem>
            <SelectItem value="progress">Sort by Progress</SelectItem>
            <SelectItem value="budget">Sort by Budget</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-9 gap-2 text-muted-foreground hover:text-foreground"
          >
            <X size={14} />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}