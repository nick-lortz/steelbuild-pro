import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const statusConfig = {
  // Project/Task Status
  not_started: { 
    label: 'Not Started', 
    className: 'bg-[hsl(var(--surface-2))] text-[hsl(var(--text-muted))] border border-[hsl(var(--border-default))]' 
  },
  in_progress: { 
    label: 'In Progress', 
    className: 'bg-[hsl(var(--info-bg))] text-[hsl(var(--info-text))] border border-[hsl(var(--info-border))]' 
  },
  completed: { 
    label: 'Completed', 
    className: 'bg-[hsl(var(--success-bg))] text-[hsl(var(--success-text))] border border-[hsl(var(--success-border))]' 
  },
  on_hold: { 
    label: 'On Hold', 
    className: 'bg-[hsl(var(--warning-bg))] text-[hsl(var(--warning-text))] border border-[hsl(var(--warning-border))]' 
  },
  blocked: { 
    label: 'Blocked', 
    className: 'bg-[hsl(var(--error-bg))] text-[hsl(var(--error-text))] border border-[hsl(var(--error-border))]' 
  },
  cancelled: { 
    label: 'Cancelled', 
    className: 'bg-[hsl(var(--surface-2))] text-[hsl(var(--text-muted))] border border-[hsl(var(--border-default))]' 
  },

  // RFI Status
  draft: { 
    label: 'Draft', 
    className: 'bg-[hsl(var(--surface-2))] text-[hsl(var(--text-muted))] border border-[hsl(var(--border-default))]' 
  },
  internal_review: { 
    label: 'Internal Review', 
    className: 'bg-[hsl(var(--info-bg))] text-[hsl(var(--info-text))] border border-[hsl(var(--info-border))]' 
  },
  submitted: { 
    label: 'Submitted', 
    className: 'bg-[hsl(var(--warning-bg))] text-[hsl(var(--warning-text))] border border-[hsl(var(--warning-border))]' 
  },
  under_review: { 
    label: 'Under Review', 
    className: 'bg-[hsl(var(--info-bg))] text-[hsl(var(--info-text))] border border-[hsl(var(--info-border))]' 
  },
  answered: { 
    label: 'Answered', 
    className: 'bg-[hsl(var(--success-bg))] text-[hsl(var(--success-text))] border border-[hsl(var(--success-border))]' 
  },
  closed: { 
    label: 'Closed', 
    className: 'bg-[hsl(var(--surface-2))] text-[hsl(var(--text-secondary))] border border-[hsl(var(--border-default))]' 
  },

  // Priority
  low: { 
    label: 'Low', 
    className: 'bg-[hsl(var(--info-bg))] text-[hsl(var(--info-text))] border border-[hsl(var(--info-border))]' 
  },
  medium: { 
    label: 'Medium', 
    className: 'bg-[hsl(var(--warning-bg))] text-[hsl(var(--warning-text))] border border-[hsl(var(--warning-border))]' 
  },
  high: { 
    label: 'High', 
    className: 'bg-[hsl(var(--error-bg))] text-[hsl(var(--error-text))] border border-[hsl(var(--error-border))]' 
  },
  critical: { 
    label: 'Critical', 
    className: 'bg-[hsl(var(--error-bg))] text-[hsl(var(--error-text))] border border-[hsl(var(--error-border))] font-bold' 
  },

  // Work Package Phases
  pre_fab: { 
    label: 'Pre-Fab', 
    className: 'bg-[hsl(var(--surface-2))] text-[hsl(var(--text-secondary))] border border-[hsl(var(--border-default))]' 
  },
  shop: { 
    label: 'Shop', 
    className: 'bg-[hsl(var(--info-bg))] text-[hsl(var(--info-text))] border border-[hsl(var(--info-border))]' 
  },
  delivery: { 
    label: 'Delivery', 
    className: 'bg-[hsl(var(--warning-bg))] text-[hsl(var(--warning-text))] border border-[hsl(var(--warning-border))]' 
  },
  erection: { 
    label: 'Erection', 
    className: 'bg-[hsl(var(--success-bg))] text-[hsl(var(--success-text))] border border-[hsl(var(--success-border))]' 
  },
  punch: { 
    label: 'Punch', 
    className: 'bg-[hsl(var(--surface-2))] text-[hsl(var(--text-secondary))] border border-[hsl(var(--border-default))]' 
  },

  // Drawing Status
  IFA: { 
    label: 'IFA', 
    className: 'bg-[hsl(var(--warning-bg))] text-[hsl(var(--warning-text))] border border-[hsl(var(--warning-border))]' 
  },
  BFA: { 
    label: 'BFA', 
    className: 'bg-[hsl(var(--info-bg))] text-[hsl(var(--info-text))] border border-[hsl(var(--info-border))]' 
  },
  BFS: { 
    label: 'BFS', 
    className: 'bg-[hsl(var(--info-bg))] text-[hsl(var(--info-text))] border border-[hsl(var(--info-border))]' 
  },
  FFF: { 
    label: 'FFF', 
    className: 'bg-[hsl(var(--success-bg))] text-[hsl(var(--success-text))] border border-[hsl(var(--success-border))]' 
  },
  superseded: { 
    label: 'Superseded', 
    className: 'bg-[hsl(var(--surface-2))] text-[hsl(var(--text-muted))] border border-[hsl(var(--border-default))]' 
  },

  // Generic
  active: { 
    label: 'Active', 
    className: 'bg-[hsl(var(--success-bg))] text-[hsl(var(--success-text))] border border-[hsl(var(--success-border))]' 
  },
  inactive: { 
    label: 'Inactive', 
    className: 'bg-[hsl(var(--surface-2))] text-[hsl(var(--text-muted))] border border-[hsl(var(--border-default))]' 
  },
  pending: { 
    label: 'Pending', 
    className: 'bg-[hsl(var(--warning-bg))] text-[hsl(var(--warning-text))] border border-[hsl(var(--warning-border))]' 
  },
  approved: { 
    label: 'Approved', 
    className: 'bg-[hsl(var(--success-bg))] text-[hsl(var(--success-text))] border border-[hsl(var(--success-border))]' 
  },
  rejected: { 
    label: 'Rejected', 
    className: 'bg-[hsl(var(--error-bg))] text-[hsl(var(--error-text))] border border-[hsl(var(--error-border))]' 
  },
};

export default function StatusBadge({ status, label, className }) {
  const config = statusConfig[status] || { 
    label: status, 
    className: 'bg-[hsl(var(--surface-2))] text-[hsl(var(--text-secondary))] border border-[hsl(var(--border-default))]' 
  };

  return (
    <Badge className={cn(config.className, className)}>
      {label || config.label}
    </Badge>
  );
}