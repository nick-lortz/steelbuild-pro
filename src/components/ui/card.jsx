
import * as React from "react"

import { cn } from "@/lib/utils"

const Card = React.forwardRef((/** @type {any} */ { className, ...props }, /** @type {any} */ ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border border-[rgba(255,255,255,0.05)] bg-[#0A0A0A]/90 backdrop-blur-sm text-[#E5E7EB] shadow-lg",
      "hover:border-[rgba(255,255,255,0.1)] transition-all duration-300",
      className
    )}
    {...props} />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef((/** @type {any} */ { className, ...props }, /** @type {any} */ ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-2 p-6 border-b border-[rgba(255,255,255,0.05)]", className)}
    {...props} />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef((/** @type {any} */ { className, ...props }, /** @type {any} */ ref) => (
  <h3
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-wide text-[#E5E7EB]", className)}
    {...props} />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef((/** @type {any} */ { className, ...props }, /** @type {any} */ ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-[#9CA3AF]", className)}
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
