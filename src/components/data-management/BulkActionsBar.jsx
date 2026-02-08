import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Edit, Copy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function BulkActionsBar({ selectedCount, onBulkEdit, onBulkDelete, onBulkDuplicate }) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl p-4 flex items-center gap-4">
      <Badge variant="outline" className="text-amber-500 border-amber-500">
        {selectedCount} selected
      </Badge>
      
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onBulkEdit}
          className="border-zinc-700 text-zinc-400 hover:text-white"
        >
          <Edit size={14} className="mr-2" />
          Bulk Edit
        </Button>
        
        <Button
          size="sm"
          variant="outline"
          onClick={onBulkDuplicate}
          className="border-zinc-700 text-zinc-400 hover:text-white"
        >
          <Copy size={14} className="mr-2" />
          Duplicate
        </Button>
        
        <Button
          size="sm"
          variant="outline"
          onClick={onBulkDelete}
          className="border-red-500 text-red-400 hover:bg-red-500/10"
        >
          <Trash2 size={14} className="mr-2" />
          Delete
        </Button>
      </div>
    </div>
  );
}