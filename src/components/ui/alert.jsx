
import * as React from "react"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-xl border px-5 py-4 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg~*]:pl-8",
  {
    variants: {
      variant: {
        default: "bg-[#0F1419]/60 backdrop-blur-md border-[rgba(255,255,255,0.1)] text-[#E5E7EB] [&>svg]:text-[#FF9D42]",
        destructive:
          "bg-[#EF4444]/10 border-[#EF4444]/30 text-[#FCA5A5] [&>svg]:text-[#EF4444]",
        success:
          "bg-[#10B981]/10 border-[#10B981]/30 text-[#6EE7B7] [&>svg]:text-[#10B981]",
        warning:
          "bg-[#F59E0B]/10 border-[#F59E0B]/30 text-[#FCD34D] [&>svg]:text-[#F59E0B]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Alert = React.forwardRef(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props} />
))
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-2 font-semibold leading-none tracking-wide text-[#E5E7EB]", className)}
    {...props} />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props} />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }
