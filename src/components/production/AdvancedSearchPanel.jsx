import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Filter, X } from 'lucide-react';

export default function AdvancedSearchPanel({ onFilterChange, activeFilters }) {
  const [filters, setFilters] = useState({
    note_type: 'all',
    status: 'all',
    category: 'all',
    owner_email: '',
    keywords: '',
    priority: 'all',
    ...activeFilters
  });

  const applyFilters = () => {
    onFilterChange(filters);
  };

  const clearFilters = () => {
    const cleared = {
      note_type: 'all',
      status: 'all',
      category: 'all',
      owner_email: '',
      keywords: '',
      priority: 'all'
    };
    setFilters(cleared);
    onFilterChange(cleared);
  };

  const activeCount = Object.values(filters).filter(v => v && v !== 'all').length;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Filter size={14} className="mr-2" />
          Advanced Search
          {activeCount > 0 && (
            <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
              {activeCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Advanced Search</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-6">
          <div>
            <Label className="text-xs">Note Type</Label>
            <Select value={filters.note_type} onValueChange={(v) => setFilters({ ...filters, note_type: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="note">Notes</SelectItem>
                <SelectItem value="action">Action Items</SelectItem>
                <SelectItem value="decision">Decisions</SelectItem>
                <SelectItem value="risk">Risks</SelectItem>
                <SelectItem value="blocker">Blockers</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Status (Actions)</Label>
            <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
                <SelectItem value="done">Done</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Category</Label>
            <Select value={filters.category} onValueChange={(v) => setFilters({ ...filters, category: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="weld">Weld</SelectItem>
                <SelectItem value="fit_up">Fit Up</SelectItem>
                <SelectItem value="material">Material</SelectItem>
                <SelectItem value="qc">QC</SelectItem>
                <SelectItem value="coating">Coating</SelectItem>
                <SelectItem value="shipping">Shipping</SelectItem>
                <SelectItem value="safety">Safety</SelectItem>
                <SelectItem value="field_feedback">Field Feedback</SelectItem>
                <SelectItem value="shop">Shop</SelectItem>
                <SelectItem value="field">Field</SelectItem>
                <SelectItem value="meeting">Meeting</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Priority</Label>
            <Select value={filters.priority} onValueChange={(v) => setFilters({ ...filters, priority: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Owner Email</Label>
            <Input
              placeholder="Filter by owner..."
              value={filters.owner_email}
              onChange={(e) => setFilters({ ...filters, owner_email: e.target.value })}
            />
          </div>

          <div>
            <Label className="text-xs">Keywords</Label>
            <Input
              placeholder="Search in title and body..."
              value={filters.keywords}
              onChange={(e) => setFilters({ ...filters, keywords: e.target.value })}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={applyFilters} className="flex-1">
              Apply Filters
            </Button>
            <Button onClick={clearFilters} variant="outline">
              <X size={14} />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}