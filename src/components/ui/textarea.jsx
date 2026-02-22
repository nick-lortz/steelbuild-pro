import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef((/** @type {any} */ { className, ...props }, /** @type {any} */ ref) => {
  return (
    (<textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-2))] px-3 py-2 text-sm text-[hsl(var(--text-primary))] shadow-[var(--shadow-sm)]",
        "placeholder:text-[hsl(var(--text-muted))]",
        "hover:border-[hsl(var(--border-strong))]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--focus-ring))] focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props} />)
  );
})
Textarea.displayName = "Textarea"

export { Textarea }