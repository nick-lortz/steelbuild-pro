import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef((/** @type {any} */ { className, type, ...props }, /** @type {any} */ ref) => {
  return (
    (<input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-2))] px-3 py-2 text-sm text-[hsl(var(--text-primary))] shadow-[var(--shadow-sm)] transition-colors",
        "placeholder:text-[hsl(var(--text-muted))]",
        "hover:border-[hsl(var(--border-strong))]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--focus-ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--app-bg))]",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[hsl(var(--disabled-bg))]",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className
      )}
      ref={ref}
      {...props} />)
  );
})
Input.displayName = "Input"

export { Input }