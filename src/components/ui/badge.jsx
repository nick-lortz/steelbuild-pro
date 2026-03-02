import * as React from "react"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-250",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-[#FF6B2C] to-[#FF9D42] text-[#0A0E13] shadow-md",
        secondary:
          "bg-[#151B24] text-[#9CA3AF] border border-[rgba(255,255,255,0.1)]",
        destructive:
          "bg-[#EF4444]/20 text-[#FCA5A5] border border-[#EF4444]/30",
        outline: "text-[#E5E7EB] border border-[rgba(255,255,255,0.15)]",
        success:
          "bg-[#10B981]/20 text-[#6EE7B7] border border-[#10B981]/30",
        warning:
          "bg-[#F59E0B]/20 text-[#FCD34D] border border-[#F59E0B]/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  ...props
}) {
  return (<div className={cn(badgeVariants({ variant: /** @type {any} */ (variant) }), className)} {...props} />);
}

export { Badge, badgeVariants }