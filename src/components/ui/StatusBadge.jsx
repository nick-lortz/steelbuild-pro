import React from 'react';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Clock, AlertCircle, FileText } from 'lucide-react';

const statusStyles = {
  // Project statuses
  bidding: "bg-blue-500/30 text-blue-300 border-blue-400/40 font-medium",
  awarded: "bg-green-500/30 text-green-300 border-green-400/40 font-medium",
  in_progress: "bg-amber-500/30 text-amber-300 border-amber-400/40 font-medium",
  on_hold: "bg-orange-500/30 text-orange-300 border-orange-400/40 font-medium",
  completed: "bg-emerald-500/30 text-emerald-300 border-emerald-400/40 font-medium",
  closed: "bg-zinc-500/30 text-zinc-300 border-zinc-400/40 font-medium",
  
  // Drawing statuses
  IFA: "bg-blue-500/30 text-blue-300 border-blue-400/40 font-medium",
  BFA: "bg-blue-900/40 text-blue-300 border-blue-700/50 font-medium",
  BFS: "bg-cyan-500/30 text-cyan-300 border-cyan-400/40 font-medium",
  FFF: "bg-green-500/30 text-green-300 border-green-400/40 font-medium",
  "As-Built": "bg-emerald-500/30 text-emerald-300 border-emerald-400/40 font-medium",
  
  // RFI statuses
  draft: "bg-zinc-500/30 text-zinc-300 border-zinc-400/40 font-medium",
  submitted: "bg-blue-500/30 text-blue-300 border-blue-400/40 font-medium",
  pending: "bg-amber-500/30 text-amber-300 border-amber-400/40 font-medium",
  answered: "bg-green-500/30 text-green-300 border-green-400/40 font-medium",
  
  // Change Order statuses
  approved: "bg-green-500/30 text-green-300 border-green-400/40 font-medium",
  rejected: "bg-red-500/30 text-red-300 border-red-400/40 font-medium",
  void: "bg-zinc-500/30 text-zinc-300 border-zinc-400/40 font-medium",
  
  // Priority
  low: "bg-slate-500/30 text-slate-300 border-slate-400/40 font-medium",
  medium: "bg-amber-500/30 text-amber-200 border-amber-400/50 font-semibold",
  high: "bg-orange-500/35 text-orange-200 border-orange-400/50 font-semibold",
  critical: "bg-red-500/40 text-red-200 border-red-400/60 font-bold",
  
  // Resource statuses
  available: "bg-green-500/30 text-green-300 border-green-400/40 font-medium",
  assigned: "bg-blue-500/30 text-blue-300 border-blue-400/40 font-medium",
  unavailable: "bg-red-500/30 text-red-300 border-red-400/40 font-medium",
  
  // Task statuses
  not_started: "bg-slate-500/30 text-slate-300 border-slate-400/40 font-medium",
  blocked: "bg-red-500/40 text-red-200 border-red-400/60 font-semibold",
  cancelled: "bg-zinc-500/30 text-zinc-300 border-zinc-400/40 font-medium",
};

// Icon mapping for WCAG 1.4.1 (non-color identification)
const statusIcons = {
  // Success states
  awarded: CheckCircle2,
  completed: CheckCircle2,
  approved: CheckCircle2,
  answered: CheckCircle2,
  FFF: CheckCircle2,
  'As-Built': CheckCircle2,
  
  // In-progress states
  in_progress: Clock,
  submitted: Clock,
  pending: Clock,
  under_review: Clock,
  
  // Warning states
  on_hold: AlertCircle,
  'Revise & Resubmit': AlertCircle,
  
  // Error states
  rejected: XCircle,
  void: XCircle,
  cancelled: XCircle,
  
  // Document states
  draft: FileText,
  IFA: FileText,
  BFA: FileText,
  BFS: FileText,
};

const StatusBadge = React.memo(function StatusBadge({ status, className, showIcon = true }) {
  const style = statusStyles[status] || "bg-zinc-500/30 text-zinc-300 border-zinc-400/40 font-medium";
  const displayText = status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  const Icon = statusIcons[status];
  
  return (
    <Badge 
      variant="outline" 
      className={cn("border px-2.5 py-0.5 text-xs inline-flex items-center gap-1", style, className)}
    >
      {showIcon && Icon && <Icon size={10} aria-hidden="true" />}
      <span>{displayText}</span>
    </Badge>
  );
});

export default StatusBadge;