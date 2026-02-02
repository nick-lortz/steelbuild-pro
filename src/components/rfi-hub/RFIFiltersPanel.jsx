import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Filter, ArrowUpDown, X } from 'lucide-react';

export default function RFIFiltersPanel({ filters, onFiltersChange, sortBy, onSortChange, sortOrder, onSortOrderChange }) {
  const updateFilter = (key, value) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      status: 'all',
      priority: 'all',
      ballInCourt: 'all',
      discipline: 'all',
      agingBucket: 'all',
      searchTerm: '',
      dateRange: 'all'
    });
  };

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => 
    key !== 'searchTerm' && value !== 'all'
  ) || filters.searchTerm;

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <Filter size={16} className="text-zinc-500" />
          <p className="text-sm font-bold text-zinc-300 uppercase tracking-wider">Filters & Sort</p>
          {hasActiveFilters && (
            <Button
              size="sm"
              variant="ghost"
              onClick={clearFilters}
              className="ml-auto text-xs text-red-400 hover:text-red-300"
            >
              <X size={14} className="mr-1" />
              Clear
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500" size={16} />
            <Input
              placeholder="Search RFIs..."
              value={filters.searchTerm}
              onChange={(e) => updateFilter('searchTerm', e.target.value)}
              className="pl-10 bg-zinc-800 border-zinc-700 text-sm"
            />
          </div>

          {/* Status */}
          <Select value={filters.status} onValueChange={(v) => updateFilter('status', v)}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="internal_review">Internal Review</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="under_review">Under Review</SelectItem>
              <SelectItem value="answered">Answered</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>

          {/* Priority */}
          <Select value={filters.priority} onValueChange={(v) => updateFilter('priority', v)}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-sm">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>

          {/* Ball in Court */}
          <Select value={filters.ballInCourt} onValueChange={(v) => updateFilter('ballInCourt', v)}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-sm">
              <SelectValue placeholder="Ball in Court" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="internal">Internal</SelectItem>
              <SelectItem value="external">External</SelectItem>
              <SelectItem value="gc">GC</SelectItem>
              <SelectItem value="architect">Architect</SelectItem>
              <SelectItem value="engineer">Engineer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Aging Bucket */}
          <Select value={filters.agingBucket} onValueChange={(v) => updateFilter('agingBucket', v)}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-sm">
              <SelectValue placeholder="Aging" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="all">All Ages</SelectItem>
              <SelectItem value="1-7">1-7 days</SelectItem>
              <SelectItem value="8-14">8-14 days</SelectItem>
              <SelectItem value="15-30">15-30 days</SelectItem>
              <SelectItem value="30+">30+ days</SelectItem>
            </SelectContent>
          </Select>

          {/* Date Range */}
          <Select value={filters.dateRange} onValueChange={(v) => updateFilter('dateRange', v)}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-sm">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort By */}
          <Select value={sortBy} onValueChange={onSortChange}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-sm">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="created_date">Date Created</SelectItem>
              <SelectItem value="submitted_date">Date Submitted</SelectItem>
              <SelectItem value="due_date">Due Date</SelectItem>
              <SelectItem value="rfi_number">RFI Number</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort Order */}
          <Button
            variant="outline"
            onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="bg-zinc-800 border-zinc-700 text-sm"
          >
            <ArrowUpDown size={16} className="mr-2" />
            {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}