import React from 'react';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusStyles = {
  // Project statuses
  bidding: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  awarded: "bg-green-500/20 text-green-400 border-green-500/30",
  in_progress: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  on_hold: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  completed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  closed: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  
  // Drawing statuses
  IFA: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  BFA: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  BFS: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  FFF: "bg-green-500/20 text-green-400 border-green-500/30",
  "As-Built": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  
  // RFI statuses
  draft: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  submitted: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  answered: "bg-green-500/20 text-green-400 border-green-500/30",
  
  // Change Order statuses
  approved: "bg-green-500/20 text-green-400 border-green-500/30",
  rejected: "bg-red-500/20 text-red-400 border-red-500/30",
  void: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  
  // Priority
  low: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  
  // Resource statuses
  available: "bg-green-500/20 text-green-400 border-green-500/30",
  assigned: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  unavailable: "bg-red-500/20 text-red-400 border-red-500/30",
  
  // Task statuses
  not_started: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  blocked: "bg-red-500/20 text-red-400 border-red-500/30",
  cancelled: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

export default function StatusBadge({ status, className }) {
  const style = statusStyles[status] || "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
  const displayText = status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  
  return (
    <Badge 
      variant="outline" 
      className={cn("font-medium border", style, className)}
    >
      {displayText}
    </Badge>
  );
}