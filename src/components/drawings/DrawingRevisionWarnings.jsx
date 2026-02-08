import React, { useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from 'lucide-react';
import { parseISO, differenceInDays } from 'date-fns';

export default function DrawingRevisionWarnings({ drawingSet, sheets = [] }) {
  const warnings = useMemo(() => {
    const issues = [];

    // Check for superseded status
    if (drawingSet.status === 'superseded') {
      issues.push({
        type: 'superseded',
        severity: 'critical',
        title: 'Drawing Set Superseded',
        message: 'This drawing set has been superseded by a newer revision',
        drawingSet: drawingSet.set_name
      });
    }

    // Check for mixed revisions within set
    const revisions = sheets.map(s => {
      try {
        const metadata = s.ai_metadata ? JSON.parse(s.ai_metadata) : {};
        return metadata.revision || s.current_revision || 'Unknown';
      } catch {
        return 'Unknown';
      }
    }).filter(r => r !== 'Unknown');

    if (new Set(revisions).size > 1) {
      issues.push({
        type: 'mixed_revisions',
        severity: 'warning',
        title: 'Mixed Revisions',
        message: `This set contains sheets from different revisions: ${[...new Set(revisions)].join(', ')}`,
        details: revisions
      });
    }

    // Check for old issue dates
    sheets.forEach(sheet => {
      try {
        const metadata = sheet.ai_metadata ? JSON.parse(sheet.ai_metadata) : {};
        if (metadata.issue_date) {
          const issueDate = parseISO(metadata.issue_date);
          const daysOld = differenceInDays(new Date(), issueDate);
          
          if (daysOld > 90) {
            issues.push({
              type: 'old_drawing',
              severity: 'info',
              title: 'Old Drawing',
              message: `${sheet.sheet_number}: Issued ${daysOld} days ago`,
              sheet: sheet.sheet_number,
              issueDate: metadata.issue_date
            });
          }
        }
      } catch (e) {
        // Skip if can't parse
      }
    });

    // Check for missing references
    const allSheetNumbers = new Set(sheets.map(s => s.sheet_number));
    sheets.forEach(sheet => {
      try {
        const metadata = sheet.ai_metadata ? JSON.parse(sheet.ai_metadata) : {};
        const refs = metadata.referenced_drawings || [];
        
        const missingRefs = refs.filter(ref => !allSheetNumbers.has(ref));
        if (missingRefs.length > 0) {
          issues.push({
            type: 'missing_references',
            severity: 'warning',
            title: 'Missing Referenced Drawings',
            message: `${sheet.sheet_number} references sheets not in this set: ${missingRefs.join(', ')}`,
            sheet: sheet.sheet_number,
            missingRefs
          });
        }
      } catch (e) {
        // Skip
      }
    });

    return issues;
  }, [drawingSet, sheets]);

  if (warnings.length === 0) return null;

  const criticalCount = warnings.filter(w => w.severity === 'critical').length;
  const warningCount = warnings.filter(w => w.severity === 'warning').length;

  return (
    <div className="space-y-2">
      {criticalCount > 0 && (
        <Card className="bg-red-950/30 border-red-500/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-bold text-red-400 mb-2">Critical Issues ({criticalCount})</div>
                <div className="space-y-2">
                  {warnings.filter(w => w.severity === 'critical').map((warning, idx) => (
                    <div key={idx} className="text-sm text-red-300">
                      <div className="font-semibold">{warning.title}</div>
                      <div className="text-xs text-red-400 mt-1">{warning.message}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {warningCount > 0 && (
        <Card className="bg-amber-950/30 border-amber-500/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-bold text-amber-400 mb-2">Warnings ({warningCount})</div>
                <div className="space-y-2">
                  {warnings.filter(w => w.severity === 'warning').map((warning, idx) => (
                    <div key={idx} className="text-sm text-amber-300">
                      <div className="font-semibold">{warning.title}</div>
                      <div className="text-xs text-amber-400 mt-1">{warning.message}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {warnings.filter(w => w.severity === 'info').length > 0 && (
        <details className="text-xs text-zinc-500">
          <summary className="cursor-pointer hover:text-zinc-400">
            Show {warnings.filter(w => w.severity === 'info').length} informational notices
          </summary>
          <div className="mt-2 space-y-1 pl-4">
            {warnings.filter(w => w.severity === 'info').map((warning, idx) => (
              <div key={idx}>• {warning.message}</div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}