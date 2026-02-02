import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Filter, X } from 'lucide-react';

export default function RFIHubFilters({ filters, onFilterChange }) {
  const hasActiveFilters = Object.values(filters).some(v => v !== 'all');

  const clearFilters = () => {
    onFilterChange({
      status: 'all',
      priority: 'all',
      ball_in_court: 'all',
      rfi_type: 'all',
      aging_bucket: 'all',
      date_range: 'all'
    });
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <Filter size={14} />
        <span className="font-mono uppercase tracking-wider">Filters:</span>
      </div>

      <Select 
        value={filters.status} 
        onValueChange={(v) => onFilterChange({ ...filters, status: v })}
      >
        <SelectTrigger className="w-32 h-8 bg-zinc-900 border-zinc-800 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-zinc-900 border-zinc-800">
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="draft">Draft</SelectItem>
          <SelectItem value="submitted">Submitted</SelectItem>
          <SelectItem value="under_review">Under Review</SelectItem>
          <SelectItem value="answered">Answered</SelectItem>
          <SelectItem value="closed">Closed</SelectItem>
        </SelectContent>
      </Select>

      <Select 
        value={filters.priority} 
        onValueChange={(v) => onFilterChange({ ...filters, priority: v })}
      >
        <SelectTrigger className="w-32 h-8 bg-zinc-900 border-zinc-800 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-zinc-900 border-zinc-800">
          <SelectItem value="all">All Priority</SelectItem>
          <SelectItem value="low">Low</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="critical">Critical</SelectItem>
        </SelectContent>
      </Select>

      <Select 
        value={filters.ball_in_court} 
        onValueChange={(v) => onFilterChange({ ...filters, ball_in_court: v })}
      >
        <SelectTrigger className="w-32 h-8 bg-zinc-900 border-zinc-800 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-zinc-900 border-zinc-800">
          <SelectItem value="all">All Owners</SelectItem>
          <SelectItem value="internal">Internal</SelectItem>
          <SelectItem value="external">External</SelectItem>
          <SelectItem value="gc">GC</SelectItem>
          <SelectItem value="architect">Architect</SelectItem>
          <SelectItem value="engineer">Engineer</SelectItem>
        </SelectContent>
      </Select>

      <Select 
        value={filters.rfi_type} 
        onValueChange={(v) => onFilterChange({ ...filters, rfi_type: v })}
      >
        <SelectTrigger className="w-40 h-8 bg-zinc-900 border-zinc-800 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-zinc-900 border-zinc-800">
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

      <Select 
        value={filters.aging_bucket} 
        onValueChange={(v) => onFilterChange({ ...filters, aging_bucket: v })}
      >
        <SelectTrigger className="w-32 h-8 bg-zinc-900 border-zinc-800 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-zinc-900 border-zinc-800">
          <SelectItem value="all">All Ages</SelectItem>
          <SelectItem value="0-7 days">0-7 days</SelectItem>
          <SelectItem value="8-14 days">8-14 days</SelectItem>
          <SelectItem value="15-30 days">15-30 days</SelectItem>
          <SelectItem value="30+ days">30+ days</SelectItem>
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button
          size="sm"
          variant="ghost"
          onClick={clearFilters}
          className="h-8 px-2 text-xs text-zinc-500 hover:text-white"
        >
          <X size={14} className="mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}