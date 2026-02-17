import * as React from "react"
import { cn } from "@/lib/utils"

const Table = React.forwardRef((/** @type {any} */ { className, ...props }, /** @type {any} */ ref) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm", className)}
      {...props} />
  </div>
))
Table.displayName = "Table"

const TableHeader = React.forwardRef((/** @type {any} */ { className, ...props }, /** @type {any} */ ref) => (
  <thead 
    ref={ref} 
    className={cn(
      "border-b border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)]",
      className
    )} 
    {...props} />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef((/** @type {any} */ { className, ...props }, /** @type {any} */ ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props} />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef((/** @type {any} */ { className, ...props }, /** @type {any} */ ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] font-medium",
      className
    )}
    {...props} />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef((/** @type {any} */ { className, ...props }, /** @type {any} */ ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b border-[rgba(255,255,255,0.03)] transition-colors",
      "hover:bg-[rgba(255,157,66,0.03)] data-[state=selected]:bg-[rgba(255,157,66,0.05)]",
      className
    )}
    {...props} />
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef((/** @type {any} */ { className, ...props }, /** @type {any} */ ref) => (
  <th
    ref={ref}
    className={cn(
      "h-12 px-4 text-left align-middle font-semibold text-[#9CA3AF] text-xs uppercase tracking-wider",
      "[&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className
    )}
    {...props} />
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef((/** @type {any} */ { className, ...props }, /** @type {any} */ ref) => (
  <td
    ref={ref}
    className={cn(
      "p-4 align-middle text-[#E5E7EB]",
      "[&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className
    )}
    {...props} />
))
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef((/** @type {any} */ { className, ...props }, /** @type {any} */ ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-[#6B7280]", className)}
    {...props} />
))
TableCaption.displayName = "TableCaption"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}