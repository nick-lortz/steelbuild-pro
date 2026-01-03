import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, X, Save, Bookmark, ChevronDown } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

/**
 * Advanced filter bar with multi-select, saved configs, and search
 * @param {Object} props
 * @param {string} props.searchTerm - Current search value
 * @param {Function} props.onSearchChange - Search change handler
 * @param {Array} props.filterGroups - Array of filter group configs
 * @param {Object} props.activeFilters - Current active filters
 * @param {Function} props.onFilterChange - Filter change handler
 * @param {Array} props.savedConfigs - Saved filter configurations
 * @param {Function} props.onSaveConfig - Save current config handler
 * @param {Function} props.onLoadConfig - Load config handler
 */
export default function FilterBar({
  searchTerm = '',
  onSearchChange,
  filterGroups = [],
  activeFilters = {},
  onFilterChange,
  savedConfigs = [],
  onSaveConfig,
  onLoadConfig,
  placeholder = "Search..."
}) {
  const [showFilters, setShowFilters] = useState(false);
  const [configName, setConfigName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const activeFilterCount = Object.values(activeFilters).filter((v) =>
  Array.isArray(v) ? v.length > 0 : v && v !== 'all'
  ).length;

  const clearFilters = () => {
    const cleared = {};
    filterGroups.forEach((group) => {
      cleared[group.key] = group.multiSelect ? [] : 'all';
    });
    onFilterChange(cleared);
  };

  const handleMultiSelectToggle = (groupKey, value) => {
    const current = activeFilters[groupKey] || [];
    const updated = current.includes(value) ?
    current.filter((v) => v !== value) :
    [...current, value];
    onFilterChange({ ...activeFilters, [groupKey]: updated });
  };

  const handleSaveConfig = () => {
    if (configName.trim()) {
      onSaveConfig({ name: configName, filters: activeFilters });
      setConfigName('');
      setShowSaveDialog(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 bg-zinc-900 border-zinc-800 text-white" />

          {searchTerm &&
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white">

              <X size={14} />
            </button>
          }
        </div>

        {/* Filter Toggle */}
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)} className="bg-background text-slate-950 px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border shadow-sm hover:bg-accent hover:text-accent-foreground h-9 border-zinc-700 gap-2">


          <Filter size={16} />
          Filters
          {activeFilterCount > 0 &&
          <Badge variant="secondary" className="ml-1 bg-amber-500 text-black px-1.5 py-0">
              {activeFilterCount}
            </Badge>
          }
          <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </Button>

        {/* Saved Configs */}
        {savedConfigs && savedConfigs.length > 0 &&
        <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="border-zinc-700 gap-2">
                <Bookmark size={16} />
                Saved
              </Button>
            </PopoverTrigger>
            <PopoverContent className="bg-zinc-900 border-zinc-800 w-64">
              <div className="space-y-2">
                <p className="text-xs font-medium text-zinc-400 mb-3">Saved Filters</p>
                {savedConfigs.map((config, idx) =>
              <button
                key={idx}
                onClick={() => onLoadConfig(config)}
                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-zinc-800 rounded transition-colors">

                    {config.name}
                  </button>
              )}
              </div>
            </PopoverContent>
          </Popover>
        }

        {/* Clear Filters */}
        {activeFilterCount > 0 &&
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="text-zinc-400 hover:text-white">

            Clear all
          </Button>
        }
      </div>

      {/* Filter Panel */}
      {showFilters &&
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filterGroups.map((group) =>
          <div key={group.key} className="space-y-2">
                <Label className="text-xs font-medium text-zinc-400">{group.label}</Label>
                
                {group.multiSelect ?
            <Popover>
                    <PopoverTrigger asChild>
                      <Button
                  variant="outline"
                  className="w-full justify-between bg-zinc-800 border-zinc-700 text-white">

                        <span className="truncate">
                          {activeFilters[group.key]?.length > 0 ?
                    `${activeFilters[group.key].length} selected` :
                    'Select...'}
                        </span>
                        <ChevronDown size={14} className="ml-2 flex-shrink-0" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="bg-zinc-900 border-zinc-800 w-64 p-2">
                      <div className="space-y-1 max-h-64 overflow-y-auto">
                        {group.options.map((option) => {
                    const isSelected = (activeFilters[group.key] || []).includes(option.value);
                    return (
                      <div
                        key={option.value}
                        className="flex items-center gap-2 px-2 py-1.5 hover:bg-zinc-800 rounded cursor-pointer"
                        onClick={() => handleMultiSelectToggle(group.key, option.value)}>

                              <Checkbox checked={isSelected} />
                              <span className="text-sm text-white">{option.label}</span>
                            </div>);

                  })}
                      </div>
                    </PopoverContent>
                  </Popover> :

            <Select
              value={activeFilters[group.key] || 'all'}
              onValueChange={(value) => onFilterChange({ ...activeFilters, [group.key]: value })}>

                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700">
                      <SelectItem value="all" className="text-white">All {group.label}</SelectItem>
                      {group.options.map((option) =>
                <SelectItem key={option.value} value={option.value} className="text-white">
                          {option.label}
                        </SelectItem>
                )}
                    </SelectContent>
                  </Select>
            }
              </div>
          )}
          </div>

          {/* Save Config */}
          {onSaveConfig && activeFilterCount > 0 &&
        <div className="mt-4 pt-4 border-t border-zinc-800 flex gap-2">
              {!showSaveDialog ?
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowSaveDialog(true)}
            className="border-zinc-700 gap-2">

                  <Save size={14} />
                  Save filter configuration
                </Button> :

          <>
                  <Input
              placeholder="Config name..."
              value={configName}
              onChange={(e) => setConfigName(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white h-8 flex-1" />

                  <Button
              size="sm"
              onClick={handleSaveConfig}
              className="bg-amber-500 hover:bg-amber-600 text-black h-8">

                    Save
                  </Button>
                  <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowSaveDialog(false);
                setConfigName('');
              }}
              className="h-8">

                    Cancel
                  </Button>
                </>
          }
            </div>
        }
        </div>
      }
    </div>);

}