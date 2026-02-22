import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef((/** @type {any} */ { className, type, ...props }, /** @type {any} */ ref) => {
  return (
    (<input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-lg border border-[rgba(255,255,255,0.1)] bg-[#0F1419] px-4 py-2.5 text-sm text-[#E5E7EB]",
        "shadow-sm transition-all duration-250",
        "placeholder:text-[#6B7280]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9D42] focus-visible:border-[rgba(255,157,66,0.3)]",
        "hover:border-[rgba(255,255,255,0.15)]",
        "disabled:cursor-not-allowed disabled:opacity-40",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[#E5E7EB]",
        className
      )}
      ref={ref}
      {...props} />)
  );
})
Input.displayName = "Input"

export { Input }