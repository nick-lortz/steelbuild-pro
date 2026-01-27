import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Users, X, Check } from 'lucide-react';

export default function QuickResourceAssign({ 
  selectedResourceIds = [], 
  resources = [], 
  onChange,
  triggerClassName,
  placeholder = "Assign Resources"
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedResources = resources.filter(r => selectedResourceIds.includes(r.id));
  
  const filteredResources = resources.filter(r => 
    !search || 
    r.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.classification?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleResource = (resourceId) => {
    const updated = selectedResourceIds.includes(resourceId)
      ? selectedResourceIds.filter(id => id !== resourceId)
      : [...selectedResourceIds, resourceId];
    onChange(updated);
  };

  const removeResource = (resourceId, e) => {
    e.stopPropagation();
    onChange(selectedResourceIds.filter(id => id !== resourceId));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className={`justify-start h-auto min-h-9 ${triggerClassName}`}
        >
          {selectedResources.length === 0 ? (
            <div className="flex items-center gap-2 text-zinc-500">
              <Users size={14} />
              <span className="text-sm">{placeholder}</span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1">
              {selectedResources.map(r => (
                <Badge 
                  key={r.id} 
                  variant="secondary"
                  className="text-xs bg-amber-500/20 text-amber-400 border-amber-500/30"
                >
                  {r.name}
                  <X 
                    size={12} 
                    className="ml-1 cursor-pointer hover:text-white" 
                    onClick={(e) => removeResource(r.id, e)}
                  />
                </Badge>
              ))}
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-zinc-900 border-zinc-800" align="start">
        <Command className="bg-zinc-900">
          <CommandInput 
            placeholder="Search resources..." 
            value={search}
            onValueChange={setSearch}
            className="border-0 border-b border-zinc-800"
          />
          <CommandList className="max-h-64">
            <CommandEmpty>No resources found</CommandEmpty>
            <CommandGroup>
              {filteredResources.map(resource => (
                <CommandItem
                  key={resource.id}
                  onSelect={() => toggleResource(resource.id)}
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <Checkbox 
                      checked={selectedResourceIds.includes(resource.id)}
                      className="pointer-events-none"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{resource.name}</p>
                      <p className="text-xs text-zinc-500">
                        {resource.classification} • {resource.type}
                      </p>
                    </div>
                    {resource.status === 'unavailable' && (
                      <Badge variant="outline" className="text-[9px] bg-red-500/10 text-red-400 border-red-500/30">
                        Unavailable
                      </Badge>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}