import React from 'react';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusStyles = {
  // Project statuses
  bidding: "bg-[#3B82F6]/20 text-[#93C5FD] border-[#3B82F6]/30",
  awarded: "bg-[#10B981]/20 text-[#6EE7B7] border-[#10B981]/30",
  in_progress: "bg-[#FF9D42]/20 text-[#FCD34D] border-[#FF9D42]/30",
  on_hold: "bg-[#F59E0B]/20 text-[#FCD34D] border-[#F59E0B]/30",
  completed: "bg-[#10B981]/20 text-[#6EE7B7] border-[#10B981]/30",
  closed: "bg-[rgba(255,255,255,0.05)] text-[#9CA3AF] border-[rgba(255,255,255,0.1)]",
  
  // Drawing statuses
  IFA: "bg-[#3B82F6]/20 text-[#93C5FD] border-[#3B82F6]/30",
  BFA: "bg-[#3B82F6]/15 text-[#93C5FD] border-[#3B82F6]/25",
  BFS: "bg-[#06B6D4]/20 text-[#67E8F9] border-[#06B6D4]/30",
  FFF: "bg-[#10B981]/20 text-[#6EE7B7] border-[#10B981]/30",
  "As-Built": "bg-[#10B981]/25 text-[#6EE7B7] border-[#10B981]/35",
  
  // RFI statuses
  draft: "bg-[rgba(255,255,255,0.05)] text-[#9CA3AF] border-[rgba(255,255,255,0.1)]",
  submitted: "bg-[#3B82F6]/20 text-[#93C5FD] border-[#3B82F6]/30",
  pending: "bg-[#FF9D42]/20 text-[#FCD34D] border-[#FF9D42]/30",
  answered: "bg-[#10B981]/20 text-[#6EE7B7] border-[#10B981]/30",
  
  // Change Order statuses
  approved: "bg-[#10B981]/20 text-[#6EE7B7] border-[#10B981]/30",
  rejected: "bg-[#EF4444]/20 text-[#FCA5A5] border-[#EF4444]/30",
  void: "bg-[rgba(255,255,255,0.05)] text-[#9CA3AF] border-[rgba(255,255,255,0.1)]",
  
  // Priority
  low: "bg-[rgba(255,255,255,0.05)] text-[#9CA3AF] border-[rgba(255,255,255,0.1)]",
  medium: "bg-[#FF9D42]/20 text-[#FCD34D] border-[#FF9D42]/30",
  high: "bg-[#F59E0B]/25 text-[#FCD34D] border-[#F59E0B]/35",
  critical: "bg-[#EF4444]/25 text-[#FCA5A5] border-[#EF4444]/40",
  
  // Resource statuses
  available: "bg-[#10B981]/20 text-[#6EE7B7] border-[#10B981]/30",
  assigned: "bg-[#3B82F6]/20 text-[#93C5FD] border-[#3B82F6]/30",
  unavailable: "bg-[#EF4444]/20 text-[#FCA5A5] border-[#EF4444]/30",
  
  // Task statuses
  not_started: "bg-[rgba(255,255,255,0.05)] text-[#9CA3AF] border-[rgba(255,255,255,0.1)]",
  blocked: "bg-[#EF4444]/25 text-[#FCA5A5] border-[#EF4444]/40",
  cancelled: "bg-[rgba(255,255,255,0.05)] text-[#9CA3AF] border-[rgba(255,255,255,0.1)]",
};

const StatusBadge = React.memo(function StatusBadge({ status, className }) {
  const style = statusStyles[status] || "bg-[rgba(255,255,255,0.05)] text-[#9CA3AF] border-[rgba(255,255,255,0.1)]";
  const displayText = status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  
  return (
    <Badge 
      variant="outline" 
      className={cn("border px-3 py-1 text-xs font-medium", style, className)}
    >
      {displayText}
    </Badge>
  );
});

export default StatusBadge;