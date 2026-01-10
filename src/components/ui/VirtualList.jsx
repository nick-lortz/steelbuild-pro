import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

const DEFAULT_ITEM_HEIGHT = 80;
const OVERSCAN = 3;

export function VirtualList({
  items,
  itemHeight = DEFAULT_ITEM_HEIGHT,
  renderItem,
  containerHeight = 600,
  className,
  emptyMessage = 'No items found'
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);

  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - OVERSCAN);
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + OVERSCAN
  );

  const visibleItems = items.slice(startIndex, endIndex);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  if (items.length === 0) {
    return (
      <div className={cn('flex items-center justify-center', className)} style={{ height: containerHeight }}>
        <p className="text-zinc-500 text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn('overflow-y-auto', className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (
            <div
              key={item.id || startIndex + index}
              style={{ height: itemHeight }}
            >
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function VirtualGrid({
  items,
  itemHeight = DEFAULT_ITEM_HEIGHT,
  columns = 3,
  gap = 24,
  renderItem,
  containerHeight = 600,
  className,
  emptyMessage = 'No items found'
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);

  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  const rowHeight = itemHeight + gap;
  const totalRows = Math.ceil(items.length / columns);
  
  const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN);
  const endRow = Math.min(
    totalRows,
    Math.ceil((scrollTop + containerHeight) / rowHeight) + OVERSCAN
  );

  const visibleRows = [];
  for (let row = startRow; row < endRow; row++) {
    const rowItems = items.slice(row * columns, (row + 1) * columns);
    if (rowItems.length > 0) {
      visibleRows.push({ row, items: rowItems });
    }
  }

  const totalHeight = totalRows * rowHeight;
  const offsetY = startRow * rowHeight;

  if (items.length === 0) {
    return (
      <div className={cn('flex items-center justify-center', className)} style={{ height: containerHeight }}>
        <p className="text-zinc-500 text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn('overflow-y-auto', className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleRows.map(({ row, items: rowItems }) => (
            <div
              key={row}
              className="grid gap-6"
              style={{ 
                gridTemplateColumns: `repeat(${columns}, 1fr)`,
                marginBottom: gap,
                height: itemHeight
              }}
            >
              {rowItems.map((item, colIndex) => (
                <div key={item.id || (row * columns + colIndex)}>
                  {renderItem(item, row * columns + colIndex)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}