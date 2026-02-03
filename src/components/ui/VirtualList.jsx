/**
 * Virtual List Component
 * 
 * Renders large lists efficiently using virtualization
 */

import React, { useRef, useState, useEffect } from 'react';

export default function VirtualList({ 
  items = [], 
  height = 600, 
  itemHeight = 60, 
  renderItem,
  className = ''
}) {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);

  const totalHeight = items.length * itemHeight;
  const visibleCount = Math.ceil(height / itemHeight);
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(startIndex + visibleCount + 1, items.length);
  const offsetY = startIndex * itemHeight;

  const visibleItems = items.slice(startIndex, endIndex);

  const handleScroll = (e) => {
    setScrollTop(e.target.scrollTop);
  };

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        height: `${height}px`,
        overflow: 'auto',
        position: 'relative'
      }}
      onScroll={handleScroll}
    >
      <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, idx) => (
            <div key={startIndex + idx} style={{ height: `${itemHeight}px` }}>
              {renderItem(item, startIndex + idx)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}