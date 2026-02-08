import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { User, Wrench, Users, Phone, Mail, DollarSign } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function ResourceDetailView({ resource, project, allocation, tasks }) {
  const typeIcons = {
    labor: User,
    equipment: Wrench,
    subcontractor: Users
  };

  const statusColors = {
    available: 'bg-green-500/20 text-green-400 border-green-500/30',
    assigned: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    unavailable: 'bg-red-500/20 text-red-400 border-red-500/30'
  };

  const Icon = typeIcons[resource.type] || User;
  const allocationPercent = allocation ? Math.min(100, (allocation.hoursUsed / allocation.totalHours) * 100) : 0;

  return (
    <div className="space-y-4 mt-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
          <Icon size={28} className="text-amber-500" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold">{resource.name}</h2>
          {resource.classification && (
            <p className="text-sm text-muted-foreground">{resource.classification}</p>
          )}
          <div className="flex gap-2 mt-2">
            <Badge variant="outline" className={cn("text-xs", statusColors[resource.status])}>
              {resource.status.replace('_', ' ')}
            </Badge>
            <Badge variant="outline" className="text-xs capitalize">
              {resource.type}
            </Badge>
          </div>
        </div>
      </div>

      {/* Contact Info */}
      {(resource.contact_name || resource.contact_phone || resource.contact_email) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {resource.contact_name && (
              <div className="flex items-center gap-2 text-sm">
                <User size={14} className="text-muted-foreground" />
                <span>{resource.contact_name}</span>
              </div>
            )}
            {resource.contact_phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone size={14} className="text-muted-foreground" />
                <a href={`tel:${resource.contact_phone}`} className="hover:underline">
                  {resource.contact_phone}
                </a>
              </div>
            )}
            {resource.contact_email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail size={14} className="text-muted-foreground" />
                <a href={`mailto:${resource.contact_email}`} className="hover:underline">
                  {resource.contact_email}
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Rate Info */}
      {resource.rate && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Rate Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign size={16} className="text-amber-500" />
                <span className="text-sm text-muted-foreground">Rate</span>
              </div>
              <span className="font-semibold">
                ${resource.rate.toLocaleString()}/{resource.rate_type || 'hour'}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Assignment */}
      {resource.status === 'assigned' && project && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Current Assignment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="font-semibold">{project.name}</p>
              <p className="text-xs text-muted-foreground font-mono">{project.project_number}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Utilization */}
      {allocation && allocation.totalHours > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Utilization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Overall</span>
                <span className={cn(
                  "font-semibold",
                  allocationPercent > 90 ? "text-red-500" : allocationPercent > 70 ? "text-amber-500" : "text-green-500"
                )}>
                  {allocationPercent.toFixed(0)}%
                </span>
              </div>
              <Progress value={allocationPercent} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Logged Hours</p>
                <p className="font-semibold">{allocation.hoursUsed}h</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Allocated Hours</p>
                <p className="font-semibold">{allocation.totalHours}h</p>
              </div>
            </div>

            <div>
              <p className="text-muted-foreground text-sm mb-1">Active Tasks</p>
              <p className="font-semibold">{allocation.taskCount}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Certifications */}
      {resource.certifications && resource.certifications.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Certifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {resource.certifications.map((cert, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {cert}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assigned Tasks */}
      {tasks && tasks.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Assigned Tasks ({tasks.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {tasks.slice(0, 5).map((task) => (
              <div key={task.id} className="p-2 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium">{task.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs capitalize">
                    {task.phase}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {task.estimated_hours}h
                  </Badge>
                </div>
              </div>
            ))}
            {tasks.length > 5 && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                + {tasks.length - 5} more tasks
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {resource.notes && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{resource.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}