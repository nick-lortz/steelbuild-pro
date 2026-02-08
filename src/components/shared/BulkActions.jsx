import React from 'react';
import { Button } from "@/components/ui/button";
import { X } from 'lucide-react';

export default function BulkActions({ selectedCount, onClear, actions }) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-4 left-1/2 -translate-x-1/2 bg-card border border-border rounded-lg shadow-lg p-3 flex items-center gap-3 z-50">
      <span className="text-sm font-medium">{selectedCount} selected</span>
      <div className="flex items-center gap-2">
        {actions.map((action, i) => (
          <Button
            key={i}
            variant={action.variant || "outline"}
            size="sm"
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        ))}
      </div>
      <Button variant="ghost" size="icon" onClick={onClear}>
        <X size={16} />
      </Button>
    </div>
  );
}