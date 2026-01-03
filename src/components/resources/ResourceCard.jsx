import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, User, Wrench, Users } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function ResourceCard({ resource, project, allocation, onClick }) {
  const statusColors = {
    available: 'bg-green-500/20 text-green-400 border-green-500/30',
    assigned: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    unavailable: 'bg-red-500/20 text-red-400 border-red-500/30'
  };

  const typeIcons = {
    labor: User,
    equipment: Wrench,
    subcontractor: Users
  };

  const Icon = typeIcons[resource.type] || User;
  const allocationPercent = allocation ? Math.min(100, allocation.hoursUsed / allocation.totalHours * 100) : 0;

  return (
    <Card 
      className="border-border cursor-pointer active:scale-[0.98] transition-all"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <Icon size={18} className="text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{resource.name}</h3>
              {resource.classification && (
                <p className="text-xs text-muted-foreground">{resource.classification}</p>
              )}
            </div>
          </div>
          <ArrowRight size={14} className="text-muted-foreground flex-shrink-0 mt-1" />
        </div>

        <div className="flex items-center gap-2 mb-3">
          <Badge variant="outline" className={cn("text-xs", statusColors[resource.status])}>
            {resource.status.replace('_', ' ')}
          </Badge>
          <Badge variant="outline" className="text-xs capitalize">
            {resource.type}
          </Badge>
        </div>

        {resource.status === 'assigned' && project && (
          <div className="mb-3">
            <p className="text-xs text-muted-foreground mb-1">Currently on:</p>
            <p className="text-xs font-medium truncate">{project.name}</p>
          </div>
        )}

        {resource.rate && (
          <div className="flex items-center justify-between text-xs mb-3">
            <span className="text-muted-foreground">Rate</span>
            <span className="font-semibold">
              ${resource.rate.toLocaleString()}/{resource.rate_type || 'hour'}
            </span>
          </div>
        )}

        {allocation && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Utilization</span>
              <span className={cn(
                "font-semibold",
                allocationPercent > 90 ? "text-red-500" : allocationPercent > 70 ? "text-amber-500" : "text-green-500"
              )}>
                {allocationPercent.toFixed(0)}%
              </span>
            </div>
            <Progress value={allocationPercent} className="h-1.5" />
            <p className="text-[10px] text-muted-foreground">
              {allocation.hoursUsed}h / {allocation.totalHours}h allocated
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}