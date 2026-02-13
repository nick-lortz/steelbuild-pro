import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Accessible Reorderable List
 * Provides keyboard alternative to drag-and-drop
 */
export function KeyboardReorderList({ 
  items, 
  onReorder, 
  renderItem,
  getItemKey = (item) => item.id,
  getItemLabel = (item, index) => `Item ${index + 1}`
}) {
  const [focusedIndex, setFocusedIndex] = useState(null);

  const moveItem = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= items.length) return;
    
    const newItems = [...items];
    const [movedItem] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, movedItem);
    
    onReorder(newItems);
    setFocusedIndex(toIndex);
    
    // Announce change to screen readers
    const announcer = document.getElementById('a11y-announcer');
    if (announcer) {
      announcer.textContent = `Moved ${getItemLabel(movedItem, fromIndex)} to position ${toIndex + 1} of ${items.length}`;
    }
  };

  return (
    <ul className="space-y-2" role="list">
      {items.map((item, index) => {
        const key = getItemKey(item);
        const isFocused = focusedIndex === index;

        return (
          <li
            key={key}
            className={cn(
              "relative group",
              isFocused && "ring-2 ring-amber-500 rounded"
            )}
          >
            <div className="flex items-center gap-2">
              {/* Keyboard reorder controls */}
              <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => moveItem(index, index - 1)}
                  disabled={index === 0}
                  className="h-6 w-6 p-0"
                  aria-label={`Move ${getItemLabel(item, index)} up`}
                  onFocus={() => setFocusedIndex(index)}
                >
                  <ChevronUp size={14} aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => moveItem(index, index + 1)}
                  disabled={index === items.length - 1}
                  className="h-6 w-6 p-0"
                  aria-label={`Move ${getItemLabel(item, index)} down`}
                  onFocus={() => setFocusedIndex(index)}
                >
                  <ChevronDown size={14} aria-hidden="true" />
                </Button>
              </div>

              {/* Drag handle (visual only) */}
              <div 
                className="p-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-move" 
                aria-hidden="true"
              >
                <GripVertical size={16} className="text-zinc-600" />
              </div>

              {/* Item content */}
              <div className="flex-1" onFocus={() => setFocusedIndex(index)}>
                {renderItem(item, index)}
              </div>
            </div>

            {/* Position indicator for SR */}
            <span className="sr-only">
              {getItemLabel(item, index)}, position {index + 1} of {items.length}
            </span>
          </li>
        );
      })}
    </ul>
  );
}