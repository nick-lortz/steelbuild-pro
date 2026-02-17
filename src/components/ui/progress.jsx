
"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef((/** @type {any} */ { className, value, ...props }, /** @type {any} */ ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-2 w-full overflow-hidden rounded-full bg-[#151B24]",
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full w-full flex-1 bg-gradient-to-r from-[#FF6B2C] to-[#FF9D42] transition-all shadow-lg"
      style={{
        transform: `translateX(-${100 - (value || 0)}%)`,
        boxShadow: '0 0 12px rgba(255, 157, 66, 0.4)'
      }}
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
