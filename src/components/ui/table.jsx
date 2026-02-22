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
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
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
      "border-t border-[hsl(var(--border-default))] bg-[hsl(var(--surface-2))] font-medium [&>tr]:last:border-b-0",
      className
    )}
    {...props} />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef((/** @type {any} */ { className, ...props }, /** @type {any} */ ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b border-[hsl(var(--border-subtle))] transition-colors hover:bg-[hsl(var(--surface-hover))] data-[state=selected]:bg-[hsl(var(--accent-subtle))]",
      className
    )}
    {...props} />
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef((/** @type {any} */ { className, ...props }, /** @type {any} */ ref) => (
  <th
    ref={ref}
    className={cn(
      "h-12 px-4 text-left align-middle font-medium text-[hsl(var(--text-secondary))] [&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props} />
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef((/** @type {any} */ { className, ...props }, /** @type {any} */ ref) => (
  <td
    ref={ref}
    className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0 text-[hsl(var(--text-primary))]", className)}
    {...props} />
))
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef((/** @type {any} */ { className, ...props }, /** @type {any} */ ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-[hsl(var(--text-muted))]", className)}
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