import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2, XCircle, ChevronRight, X } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

export default function WorkflowGuidancePanel({ 
  validationResult, 
  workPackage,
  onDismiss,
  showHints = true 
}) {
  if (!showHints) return null;
  if (!validationResult) return null;
  
  const { blockers, canAdvance } = validationResult;
  
  if (canAdvance) {
    return (
      <Card className="bg-green-500/10 border-green-500/20">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <CheckCircle2 size={20} className="text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-green-400 mb-1">Ready to Advance</h4>
                <p className="text-sm text-zinc-300">
                  All prerequisites met. You can advance this work package to the next phase.
                </p>
              </div>
            </div>
            {onDismiss && (
              <Button variant="ghost" size="sm" onClick={onDismiss}>
                <X size={16} />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const criticalBlockers = blockers.filter(b => b.severity === 'CRITICAL');
  const warningBlockers = blockers.filter(b => b.severity === 'HIGH');
  
  return (
    <Card className="bg-amber-500/10 border-amber-500/20">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-amber-400 mb-1">What's Blocking Me?</h4>
              <p className="text-sm text-zinc-300">
                {criticalBlockers.length} critical blocker(s) prevent advancement
              </p>
            </div>
          </div>
          {onDismiss && (
            <Button variant="ghost" size="sm" onClick={onDismiss}>
              <X size={16} />
            </Button>
          )}
        </div>
        
        <div className="space-y-2">
          {criticalBlockers.map((blocker, idx) => (
            <div key={idx} className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="destructive" className="text-xs">
                      CRITICAL
                    </Badge>
                    <span className="text-sm font-medium text-white">
                      {blocker.message}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Responsible: {blocker.responsible}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">Next Step:</span>
                <span className="text-xs text-amber-400">{blocker.action}</span>
                {blocker.entity_ids?.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-auto text-xs h-7"
                    asChild
                  >
                    <Link to={getEntityLink(blocker.entity_type, blocker.entity_ids[0])}>
                      View <ChevronRight size={12} className="ml-1" />
                    </Link>
                  </Button>
                )}
              </div>
              
              {blocker.details && blocker.details.length > 0 && (
                <div className="mt-2 pt-2 border-t border-zinc-800">
                  <p className="text-xs text-zinc-500 mb-1">Details:</p>
                  {blocker.details.slice(0, 3).map((detail, i) => (
                    <p key={i} className="text-xs text-zinc-400">• {detail}</p>
                  ))}
                  {blocker.details.length > 3 && (
                    <p className="text-xs text-zinc-500 mt-1">
                      + {blocker.details.length - 3} more
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
          
          {warningBlockers.length > 0 && (
            <div className="pt-2">
              <p className="text-xs text-zinc-500 mb-2">
                {warningBlockers.length} warning(s):
              </p>
              {warningBlockers.map((blocker, idx) => (
                <div key={idx} className="text-xs text-zinc-400 mb-1">
                  • {blocker.message}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function getEntityLink(entityType, entityId) {
  const routes = {
    'DrawingSet': createPageUrl('Drawings'),
    'RFI': createPageUrl('RFIHub'),
    'FabReadinessItem': createPageUrl('Fabrication'),
    'Fabrication': createPageUrl('Fabrication'),
    'Delivery': createPageUrl('Deliveries'),
    'DesignIntentFlag': createPageUrl('Drawings')
  };
  
  return routes[entityType] || createPageUrl('ProjectDashboard');
}