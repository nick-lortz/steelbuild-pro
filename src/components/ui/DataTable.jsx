import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow } from
"@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function DataTable({ columns, data, onRowClick = null, emptyMessage = "No data found" }) {
  return (
    <>
      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3">
        {data.length === 0 ? (
          <Card className="py-12">
            <p className="text-sm text-[#9CA3AF] text-center">{emptyMessage}</p>
          </Card>
        ) : (
          data.map((row, rowIdx) => (
            <Card
              key={row.id || rowIdx}
              onClick={() => onRowClick?.(row)}
              onKeyDown={(e) => {
                if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onRowClick(row);
                }
              }}
              tabIndex={onRowClick ? 0 : -1}
              role={onRowClick ? "button" : undefined}
              aria-label={onRowClick ? `View details for row ${rowIdx + 1}` : undefined}
              className={cn(
                "min-h-[44px]",
                onRowClick && "cursor-pointer hover:bg-[rgba(255,157,66,0.03)] transition-colors active:bg-[rgba(255,157,66,0.05)] focus:outline-none focus:ring-2 focus:ring-[#FF9D42]"
              )}
            >
              <CardContent className="pt-6 pb-6 space-y-3">
                {columns.map((col, colIdx) => (
                  <div key={colIdx}>
                    <div className="text-[10px] uppercase tracking-wider text-[#6B7280] font-bold mb-1">
                      {col.header}
                    </div>
                    <div className="text-sm">
                      {col.render ? col.render(row) : row[col.accessor]}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block border border-[rgba(255,255,255,0.05)] rounded-lg overflow-hidden" role="region" aria-label="Data table">
        <Table role="table">
        <TableHeader>
          <TableRow role="row" className="border-b border-[rgba(255,255,255,0.08)] hover:bg-transparent">
            {columns.map((col, idx) =>
            <TableHead
              key={idx}
              role="columnheader"
              scope="col"
              className={cn(
                "text-[#9CA3AF] font-semibold text-xs uppercase tracking-wide bg-[rgba(255,255,255,0.02)] h-11",
                col.className
              )}>

                {col.header}
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow role="row">
              <TableCell
                role="cell"
                colSpan={columns.length}
                className="text-center text-[#9CA3AF] py-12 text-sm">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, rowIdx) => (
              <TableRow
                role="row"
                key={row.id || rowIdx}
                onClick={() => onRowClick?.(row)}
                onKeyDown={(e) => {
                  if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onRowClick(row);
                  }
                }}
                tabIndex={onRowClick ? 0 : -1}
                aria-label={`Row ${rowIdx + 1}`}
                className={cn(
                  "border-b border-[rgba(255,255,255,0.03)]",
                  rowIdx % 2 === 0 ? "bg-transparent" : "bg-[rgba(255,255,255,0.01)]",
                  onRowClick && "cursor-pointer hover:bg-[rgba(255,157,66,0.05)] transition-colors focus:outline-none focus:ring-2 focus:ring-[#FF9D42]"
                )}>
                {columns.map((col, colIdx) => (
                  <TableCell role="cell" key={colIdx} className="py-3.5 px-4 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">
                    {col.render ? col.render(row) : row[col.accessor]}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      </div>
    </>);

}