import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9D42] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0E13] disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-[#FF6B2C] to-[#FF9D42] text-[#0A0E13] font-semibold shadow-lg hover:shadow-[0_0_30px_rgba(255,157,66,0.4)] hover:scale-[1.02] active:scale-[0.98]",
        destructive:
          "bg-[#EF4444] text-white shadow-md hover:bg-[#DC2626] hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]",
        outline:
          "border border-[rgba(255,255,255,0.1)] bg-transparent text-[#E5E7EB] hover:bg-[rgba(255,157,66,0.1)] hover:border-[rgba(255,157,66,0.3)] hover:text-[#FF9D42]",
        secondary:
          "bg-[#151B24] text-[#E5E7EB] border border-[rgba(255,255,255,0.05)] hover:bg-[#1A222D] hover:border-[rgba(255,255,255,0.1)]",
        ghost: "text-[#9CA3AF] hover:bg-[rgba(255,157,66,0.1)] hover:text-[#FF9D42]",
        link: "text-[#FF9D42] underline-offset-4 hover:underline hover:text-[#FFB84D]",
      },
      size: {
        default: "h-10 px-5 py-2.5",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-lg px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef((/** @type {any} */ { className, variant, size, asChild = false, ...props }, /** @type {any} */ ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    (<Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props} />)
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }