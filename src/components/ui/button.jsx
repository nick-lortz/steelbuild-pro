import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--focus-ring))] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[hsl(var(--accent-primary))] text-[hsl(var(--accent-text))] font-semibold shadow-md hover:bg-[hsl(var(--accent-hover))] active:bg-[hsl(var(--accent-pressed))] hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]",
        destructive:
          "bg-[hsl(var(--error-border))] text-white shadow-md hover:opacity-90",
        outline:
          "border border-[hsl(var(--border-default))] bg-transparent text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--surface-hover))] hover:border-[hsl(var(--border-accent))]",
        secondary:
          "bg-[hsl(var(--surface-2))] text-[hsl(var(--text-primary))] border border-[hsl(var(--border-subtle))] hover:bg-[hsl(var(--surface-hover))]",
        ghost: "text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--surface-hover))] hover:text-[hsl(var(--text-primary))]",
        link: "text-[hsl(var(--link-default))] underline-offset-4 hover:underline hover:text-[hsl(var(--link-hover))]",
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