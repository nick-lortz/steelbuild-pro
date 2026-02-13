import * as React from "react"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button";

const Pagination = ({
  className,
  ...props
}) => (
  <nav
    role="navigation"
    aria-label="pagination"
    className={cn("mx-auto flex w-full justify-center", className)}
    {...props} />
)
Pagination.displayName = "Pagination"

const PaginationContent = React.forwardRef((/** @type {any} */ { className, ...props }, /** @type {any} */ ref) => (
  <ul
    ref={ref}
    className={cn("flex flex-row items-center gap-1", className)}
    {...props} />
))
PaginationContent.displayName = "PaginationContent"

const PaginationItem = React.forwardRef((/** @type {any} */ { className, ...props }, /** @type {any} */ ref) => (
  <li ref={ref} className={cn("", className)} {...props} />
))
PaginationItem.displayName = "PaginationItem"

const PaginationLink = ({
  className,
  isActive = false,
  size = "icon",
  ...props
}) => (
  <a
    aria-current={isActive ? "page" : undefined}
    className={cn(buttonVariants({
      variant: isActive ? "outline" : "ghost",
      size: /** @type {any} */ (size),
    }), className)}
    {...props} />
)
PaginationLink.displayName = "PaginationLink"

const PaginationPrevious = ({
  className,
  ...props
}) => (
  <PaginationLink
    aria-label="Go to previous page"
    size="default"
    className={cn("gap-1 pl-2.5", className)}
    {...props}>
    <ChevronLeft className="h-4 w-4" />
    <span>Previous</span>
  </PaginationLink>
)
PaginationPrevious.displayName = "PaginationPrevious"

const PaginationNext = ({
  className,
  ...props
}) => (
  <PaginationLink
    aria-label="Go to next page"
    size="default"
    className={cn("gap-1 pr-2.5", className)}
    {...props}>
    <span>Next</span>
    <ChevronRight className="h-4 w-4" />
  </PaginationLink>
)
PaginationNext.displayName = "PaginationNext"

const PaginationEllipsis = ({
  className,
  ...props
}) => (
  <span
    aria-hidden
    className={cn("flex h-9 w-9 items-center justify-center", className)}
    {...props}>
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More pages</span>
  </span>
)
PaginationEllipsis.displayName = "PaginationEllipsis"

export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
}

// Backward-compatible default export used across existing pages.
export default function PaginationCompat({
  total = 0,
  page = 1,
  pageSize = 25,
  onPageChange = undefined,
  onPageSizeChange = undefined,
  className = "",
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const startIndex = total === 0 ? 0 : (page - 1) * pageSize + 1
  const endIndex = Math.min(page * pageSize, total)
  const safePage = Math.min(page, totalPages)

  const canGoPrev = safePage > 1
  const canGoNext = safePage < totalPages

  const handlePageChange = (nextPage) => {
    if (typeof onPageChange === "function") {
      onPageChange(nextPage)
    }
  }

  const handlePageSizeChange = (event) => {
    if (typeof onPageSizeChange === "function") {
      onPageSizeChange(Number(event.target.value))
    }
  }

  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", className)}>
      <p className="text-sm text-muted-foreground">
        Showing {startIndex}-{endIndex} of {total}
      </p>

      <div className="flex items-center gap-2">
        {typeof onPageSizeChange === "function" && (
          <label className="flex items-center gap-2">
            <span className="sr-only">Results per page</span>
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm"
              value={pageSize}
              onChange={handlePageSizeChange}
              aria-label="Results per page"
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}/page
                </option>
              ))}
            </select>
          </label>
        )}

        <button
          type="button"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          disabled={!canGoPrev}
          onClick={() => handlePageChange(safePage - 1)}
          aria-label="Go to previous page"
        >
          <ChevronLeft className="mr-1 h-4 w-4" aria-hidden="true" />
          Prev
        </button>

        <span className="text-sm text-muted-foreground" aria-live="polite" aria-atomic="true">
          Page {safePage} of {totalPages}
        </span>

        <button
          type="button"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          disabled={!canGoNext}
          onClick={() => handlePageChange(safePage + 1)}
          aria-label="Go to next page"
        >
          Next
          <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}