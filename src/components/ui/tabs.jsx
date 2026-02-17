
import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef((/** @type {any} */ { className, ...props }, /** @type {any} */ ref) => (
  <TabsPrimitive.List
    ref={ref}
    role="tablist"
    className={cn(
      "inline-flex h-11 items-center justify-center rounded-lg bg-[#0F1419] p-1 border border-[rgba(255,255,255,0.05)]",
      className
    )}
    {...props} />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef((/** @type {any} */ { className, ...props }, /** @type {any} */ ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    role="tab"
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all",
      "text-[#6B7280] hover:text-[#9CA3AF] hover:bg-[rgba(255,157,66,0.05)]",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9D42] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0E13]",
      "disabled:pointer-events-none disabled:opacity-40",
      "data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FF6B2C] data-[state=active]:to-[#FF9D42]",
      "data-[state=active]:text-[#0A0E13] data-[state=active]:font-semibold data-[state=active]:shadow-md",
      className
    )}
    {...props} />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef((/** @type {any} */ { className, ...props }, /** @type {any} */ ref) => (
  <TabsPrimitive.Content
    ref={ref}
    role="tabpanel"
    tabIndex={0}
    className={cn(
      "mt-4 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9D42] focus-visible:ring-offset-2",
      className
    )}
    {...props} />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
