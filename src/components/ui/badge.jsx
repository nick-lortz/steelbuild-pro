import * as React from "react"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[hsl(var(--focus-ring))] focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[hsl(var(--accent-primary))] text-[hsl(var(--accent-text))] shadow",
        secondary:
          "border-[hsl(var(--border-default))] bg-[hsl(var(--surface-2))] text-[hsl(var(--text-primary))]",
        destructive:
          "border-transparent bg-[hsl(var(--error-bg))] text-[hsl(var(--error-text))] border-[hsl(var(--error-border))]",
        outline:
          "border-[hsl(var(--border-default))] text-[hsl(var(--text-primary))] bg-transparent",
        success:
          "border-transparent bg-[hsl(var(--success-bg))] text-[hsl(var(--success-text))] border-[hsl(var(--success-border))]",
        warning:
          "border-transparent bg-[hsl(var(--warning-bg))] text-[hsl(var(--warning-text))] border-[hsl(var(--warning-border))]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge(/** @type {any} */ { className, variant, ...props }) {
  return (<div className={cn(badgeVariants({ variant }), className)} {...props} />)
}

export { Badge, badgeVariants }