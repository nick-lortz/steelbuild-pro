import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/**
 * WCAG 2.1 AA Compliant Data Table
 * Uses semantic <table> with proper headers, scope, and keyboard navigation
 */
export default function AccessibleDataTable({ 
  columns, 
  data, 
  onRowClick = null,
  emptyMessage = "No data available",
  caption = null,
  className
}) {
  const hasRowClick = typeof onRowClick === 'function';

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-500">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full border-collapse", className)}>
        {caption && (
          <caption className="sr-only">{caption}</caption>
        )}
        <thead>
          <tr className="border-b border-zinc-800">
            {columns.map((col, idx) => (
              <th
                key={idx}
                scope="col"
                className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider"
              >
                {col.header}
              </th>
            ))}
            {hasRowClick && (
              <th scope="col" className="sr-only">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIdx) => {
            const RowWrapper = hasRowClick ? 'tr' : 'tr';
            const rowProps = hasRowClick ? {
              className: 'border-b border-zinc-800 hover:bg-zinc-800/30 cursor-pointer transition-colors',
              onClick: () => onRowClick(row),
              onKeyDown: (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onRowClick(row);
                }
              },
              tabIndex: 0,
              role: 'button'
            } : {
              className: 'border-b border-zinc-800'
            };

            return (
              <RowWrapper key={row.id || rowIdx} {...rowProps}>
                {columns.map((col, colIdx) => (
                  <td
                    key={colIdx}
                    className="px-4 py-3 text-sm text-zinc-300"
                  >
                    {col.render ? col.render(row) : row[col.accessor]}
                  </td>
                ))}
                {hasRowClick && (
                  <td className="sr-only">
                    <span>View details</span>
                  </td>
                )}
              </RowWrapper>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}