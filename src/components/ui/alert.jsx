import * as React from "react"
import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default: "bg-[hsl(var(--surface-1))] text-[hsl(var(--text-primary))] border-[hsl(var(--border-default))]",
        destructive:
          "border-[hsl(var(--error-border))] bg-[hsl(var(--error-bg))] text-[hsl(var(--error-text))] [&>svg]:text-[hsl(var(--error-text))]",
        success:
          "border-[hsl(var(--success-border))] bg-[hsl(var(--success-bg))] text-[hsl(var(--success-text))] [&>svg]:text-[hsl(var(--success-text))]",
        warning:
          "border-[hsl(var(--warning-border))] bg-[hsl(var(--warning-bg))] text-[hsl(var(--warning-text))] [&>svg]:text-[hsl(var(--warning-text))]",
        info:
          "border-[hsl(var(--info-border))] bg-[hsl(var(--info-bg))] text-[hsl(var(--info-text))] [&>svg]:text-[hsl(var(--info-text))]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Alert = React.forwardRef((/** @type {any} */ { className, variant, ...props }, /** @type {any} */ ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props} />
))
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef((/** @type {any} */ { className, ...props }, /** @type {any} */ ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props} />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef((/** @type {any} */ { className, ...props }, /** @type {any} */ ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props} />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }