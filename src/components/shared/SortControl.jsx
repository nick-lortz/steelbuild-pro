import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

/**
 * Sort control component for table views
 * @param {Object} props
 * @param {Array} props.sortOptions - Available sort options [{value, label}]
 * @param {string} props.sortBy - Current sort field
 * @param {string} props.sortOrder - 'asc' or 'desc'
 * @param {Function} props.onSortChange - Sort change handler
 */
export default function SortControl({ sortOptions, sortBy, sortOrder = 'desc', onSortChange }) {
  const toggleOrder = () => {
    onSortChange(sortBy, sortOrder === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={sortBy} onValueChange={(value) => onSortChange(value, sortOrder)}>
        <SelectTrigger className="w-48 bg-zinc-900 border-zinc-800 text-white h-9">
          <SelectValue placeholder="Sort by..." />
        </SelectTrigger>
        <SelectContent className="bg-zinc-900 border-zinc-700">
          {sortOptions.map((option) => (
            <SelectItem key={option.value} value={option.value} className="text-white">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Button
        variant="outline"
        size="icon"
        onClick={toggleOrder}
        className="border-zinc-700 h-9 w-9"
        title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
      >
        {sortOrder === 'asc' ? (
          <ArrowUp size={16} className="text-zinc-400" />
        ) : (
          <ArrowDown size={16} className="text-zinc-400" />
        )}
      </Button>
    </div>
  );
}