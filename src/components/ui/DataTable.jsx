import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export default function DataTable({ columns, data, onRowClick, emptyMessage = "No data found" }) {
  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/50">
      <Table>
        <TableHeader>
          <TableRow className="border-zinc-800 hover:bg-transparent">
            {columns.map((col, idx) => (
              <TableHead 
                key={idx} 
                className={cn(
                  "text-zinc-400 font-medium text-xs uppercase tracking-wider bg-zinc-900",
                  col.className
                )}
              >
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell 
                colSpan={columns.length} 
                className="text-center text-zinc-500 py-8"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, rowIdx) => (
              <TableRow 
                key={row.id || rowIdx}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  "border-zinc-800",
                  onRowClick && "cursor-pointer hover:bg-zinc-800/50"
                )}
              >
                {columns.map((col, colIdx) => (
                  <TableCell key={colIdx} className={cn("text-zinc-200", col.cellClassName)}>
                    {col.render ? col.render(row) : row[col.accessor]}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}