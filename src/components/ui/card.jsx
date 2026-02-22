
import * as React from "react"

import { cn } from "@/lib/utils"

const Card = React.forwardRef((/** @type {any} */ { className, ...props }, /** @type {any} */ ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] text-[hsl(var(--text-primary))] shadow-[var(--shadow-md)]",
      "hover:border-[hsl(var(--border-strong))] transition-all duration-300",
      className
    )}
    {...props} />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef((/** @type {any} */ { className, ...props }, /** @type {any} */ ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-2 p-6 border-b border-[hsl(var(--border-subtle))]", className)}
    {...props} />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef((/** @type {any} */ { className, ...props }, /** @type {any} */ ref) => (
  <h3
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-wide text-[hsl(var(--text-primary))]", className)}
    {...props} />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef((/** @type {any} */ { className, ...props }, /** @type {any} */ ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-[hsl(var(--text-secondary))]", className)}
    {...props} />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef((/** @type {any} */ { className, ...props }, /** @type {any} */ ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef((/** @type {any} */ { className, ...props }, /** @type {any} */ ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props} />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
