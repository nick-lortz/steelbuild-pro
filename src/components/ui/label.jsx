
import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const labelVariants = cva(
  "text-sm font-medium leading-none text-[#E5E7EB] tracking-wide peer-disabled:cursor-not-allowed peer-disabled:opacity-40"
)

const Label = React.forwardRef((/** @type {any} */ { className, ...props }, /** @type {any} */ ref) => (
  <LabelPrimitive.Root ref={ref} className={cn(labelVariants(), className)} {...props} />
))
Label.displayName = LabelPrimitive.Root.displayName

export { Label }
