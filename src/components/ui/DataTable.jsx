import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow } from
"@/components/ui/table";
import { cn } from "@/lib/utils";

export default function DataTable({ columns, data, onRowClick, emptyMessage = "No data found" }) {
  return (
    <div className="border border-zinc-700 rounded-lg overflow-hidden bg-zinc-900">
      <Table>
        <TableHeader>
          <TableRow className="border-b-2 border-zinc-700 hover:bg-transparent">
            {columns.map((col, idx) =>
            <TableHead
              key={idx}
              className={cn(
                "text-zinc-200 font-semibold text-xs uppercase tracking-wide bg-zinc-800/80 h-11",
                col.className
              )}>

                {col.header}
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="text-center text-zinc-400 py-12 text-sm">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, rowIdx) => (
              <TableRow
                key={row.id || rowIdx}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  "border-b border-zinc-800/60",
                  rowIdx % 2 === 0 ? "bg-zinc-900" : "bg-zinc-900/40",
                  onRowClick && "cursor-pointer hover:bg-zinc-800 transition-colors"
                )}>
                {columns.map((col, colIdx) => (
                  <TableCell key={colIdx} className="text-white py-3.5 px-4 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">
                    {col.render ? col.render(row) : row[col.accessor]}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>);

}