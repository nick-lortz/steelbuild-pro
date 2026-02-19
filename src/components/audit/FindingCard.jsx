import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Link as LinkIcon, Code, Shield, Database, Zap, XCircle, FileWarning } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function FindingCard({ finding, onApplyFix }) {
  const getCategoryIcon = (category) => {
    switch (category) {
      case 'ROUTES': return LinkIcon;
      case 'IMPORTS': return Code;
      case 'AUTHZ': return Shield;
      case 'DATA_FLOW': return Database;
      case 'FORMULAS': return Zap;
      case 'RUNTIME_ERRORS': return XCircle;
      default: return FileWarning;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'HIGH': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'MEDIUM': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default: return 'bg-zinc-700/20 text-zinc-400 border-zinc-600/30';
    }
  };

  const CategoryIcon = getCategoryIcon(finding.category);

  return (
    <Card className="bg-zinc-800/50 border-zinc-700">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <CategoryIcon size={14} className="text-zinc-400" />
              <Badge variant="outline" className={cn("text-xs font-semibold", getSeverityColor(finding.severity))}>
                {finding.severity}
              </Badge>
              <Badge variant="outline" className="text-xs bg-zinc-900/50 border-zinc-700">
                {finding.category}
              </Badge>
              {finding.fix_applied && (
                <Badge className="text-xs bg-green-500/20 text-green-400 border-green-500/30">
                  <CheckCircle2 size={10} className="mr-1" />
                  FIXED
                </Badge>
              )}
              {finding.auto_fixable && !finding.fix_applied && (
                <Badge className="text-xs bg-blue-500/20 text-blue-400 border-blue-500/30">
                  AUTO-FIXABLE
                </Badge>
              )}
            </div>

            <div className="text-base font-semibold text-white mb-2">{finding.title}</div>
            <div className="text-sm text-zinc-300 mb-3">{finding.description}</div>

            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2">
                <span className="text-zinc-600 min-w-24">Location:</span>
                <span className="font-mono text-blue-400">{finding.location}</span>
              </div>
              {finding.root_cause && (
                <div className="flex items-start gap-2">
                  <span className="text-zinc-600 min-w-24">Root Cause:</span>
                  <span className="text-zinc-400">{finding.root_cause}</span>
                </div>
              )}
              {finding.proposed_fix && (
                <div className="flex items-start gap-2">
                  <span className="text-zinc-600 min-w-24">Proposed Fix:</span>
                  <span className="text-amber-400">{finding.proposed_fix}</span>
                </div>
              )}
              {finding.fix_patch && (
                <div className="flex items-start gap-2">
                  <span className="text-zinc-600 min-w-24">Applied Patch:</span>
                  <span className="text-green-400">{finding.fix_patch}</span>
                </div>
              )}
              {finding.regression_checks && (
                <div className="flex items-start gap-2">
                  <span className="text-zinc-600 min-w-24">Regression:</span>
                  <span className="text-zinc-500">{finding.regression_checks}</span>
                </div>
              )}
            </div>
          </div>

          {finding.auto_fixable && !finding.fix_applied && onApplyFix && (
            <Button
              size="sm"
              onClick={() => onApplyFix(finding.id)}
              className="bg-green-600 hover:bg-green-700"
            >
              Apply Fix
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}