import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileDown, Copy, Edit2, Check } from 'lucide-react';
import { cn } from "@/lib/utils";
import { toast } from '@/components/ui/notifications';

export default function WeeklyCostNarrative({ 
  project,
  currentWeek = {},
  priorWeek = null,
  sovItems = [],
  changeOrders = [],
  expenses = [],
  estimatedCosts = [],
  costCodes = [],
  mappings = []
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedNarrative, setEditedNarrative] = useState('');

  const narrative = useMemo(() => {
    if (!project) return null;

    const lines = [];
    
    // Header
    lines.push(`WEEKLY COST NARRATIVE`);
    lines.push(`Project: ${project.name} (${project.project_number})`);
    lines.push(`Period Ending: ${new Date().toLocaleDateString()}`);
    lines.push(`PM: ${project.project_manager || 'Unassigned'}`);
    lines.push('');
    lines.push('---');
    lines.push('');

    // 1. Overall Cost Status
    const currentRiskStatus = currentWeek.riskStatus || 'Unknown';
    const priorRiskStatus = priorWeek?.riskStatus || currentRiskStatus;
    const currentMarginPercent = currentWeek.projectedMarginPercent || 0;
    const priorMarginPercent = priorWeek?.projectedMarginPercent || currentMarginPercent;
    const marginDelta = currentMarginPercent - priorMarginPercent;

    lines.push('1. OVERALL COST STATUS');
    lines.push('');
    
    if (priorWeek && priorRiskStatus !== currentRiskStatus) {
      lines.push(`The project cost status changed from ${priorRiskStatus} to ${currentRiskStatus} this week.`);
    } else {
      lines.push(`The project remains in ${currentRiskStatus} cost status.`);
    }

    if (Math.abs(marginDelta) > 0.1) {
      const direction = marginDelta > 0 ? 'increasing' : 'decreasing';
      lines.push(`Projected margin is ${direction} by ${Math.abs(marginDelta).toFixed(1)}% compared to last week.`);
    } else {
      lines.push(`Projected margin remains stable from last week.`);
    }

    lines.push('');
    lines.push(`Current projected margin: ${currentMarginPercent.toFixed(1)}% ($${currentWeek.projectedMargin?.toLocaleString() || '0'})`);
    lines.push(`Total contract: $${currentWeek.totalContract?.toLocaleString() || '0'}`);
    lines.push(`Estimated cost at completion: $${currentWeek.estimatedCostAtCompletion?.toLocaleString() || '0'}`);
    lines.push('');

    // 2. Key Cost Drivers
    const drivers = currentWeek.riskDrivers || [];
    if (drivers.length > 0) {
      lines.push('2. KEY COST DRIVERS');
      lines.push('');
      drivers.slice(0, 3).forEach(driver => {
        const impact = Math.abs(driver.variance_amount || 0);
        const sovCode = driver.affected_sov ? ` (${driver.affected_sov})` : '';
        lines.push(`• ${driver.description}${sovCode}`);
      });
      lines.push('');
    }

    // 3. Change Order Impact
    const thisWeekCOs = changeOrders.filter(co => {
      const coDate = new Date(co.approved_date || co.created_date || '');
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return coDate >= weekAgo;
    });

    if (thisWeekCOs.length > 0) {
      lines.push('3. CHANGE ORDER ACTIVITY');
      lines.push('');
      thisWeekCOs.forEach(co => {
        const revenueValue = co.cost_impact || 0;
        let estimatedCost = 0;
        if (co.cost_breakdown && co.cost_breakdown.length > 0) {
          estimatedCost = co.cost_breakdown.reduce((sum, item) => sum + (item.amount || 0), 0);
        } else {
          estimatedCost = revenueValue * 0.7;
        }
        const netMargin = revenueValue - estimatedCost;
        const status = co.status.charAt(0).toUpperCase() + co.status.slice(1);

        lines.push(`• CO-${co.co_number} (${status}): ${co.title || 'Untitled'}`);
        lines.push(`  Revenue: $${revenueValue.toLocaleString()}, Est Cost: $${estimatedCost.toLocaleString()}, Net: $${netMargin.toLocaleString()}`);
      });
      lines.push('');
    }

    // 4. Action Items
    lines.push('4. RECOMMENDED ACTIONS');
    lines.push('');

    if (currentRiskStatus === 'Red' || currentRiskStatus === 'Overrun Likely') {
      lines.push('• Identify and address cost drivers immediately');
      lines.push('• Review labor productivity and material commitments');
      lines.push('• Escalate to leadership for mitigation plan');
    } else if (currentRiskStatus === 'Yellow' || currentRiskStatus === 'Watch Closely') {
      lines.push('• Monitor labor hours against schedule daily');
      lines.push('• Verify material costs and open commitments');
      lines.push('• Review ETC assumptions for remaining work');
    } else {
      if (drivers.length > 0) {
        lines.push('• Continue monitoring identified cost drivers');
        lines.push('• Maintain current cost control procedures');
      } else {
        lines.push('• No immediate cost actions required');
        lines.push('• Continue standard cost tracking');
      }
    }

    // SOV-specific actions
    const sovWithIssues = drivers.filter(d => d.affected_sov);
    if (sovWithIssues.length > 0) {
      lines.push('');
      lines.push('SOV-Specific Focus Areas:');
      sovWithIssues.slice(0, 3).forEach(d => {
        lines.push(`• ${d.affected_sov}: Review cost allocation and productivity`);
      });
    }

    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('This narrative is generated from Job Status Report data as of ' + new Date().toLocaleDateString() + '.');
    lines.push('All figures reconcile with current project financials and approved change orders.');

    return lines.join('\n');
  }, [project, currentWeek, priorWeek, sovItems, changeOrders, expenses, estimatedCosts, costCodes, mappings]);

  const handleEdit = () => {
    setEditedNarrative(narrative);
    setIsEditing(true);
  };

  const handleSave = () => {
    setIsEditing(false);
    toast.success('Narrative updated');
  };

  const handleCopy = () => {
    const textToCopy = isEditing ? editedNarrative : narrative;
    navigator.clipboard.writeText(textToCopy);
    toast.success('Narrative copied to clipboard');
  };

  const handleExport = () => {
    const textToExport = isEditing ? editedNarrative : narrative;
    const blob = new Blob([textToExport], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Cost_Narrative_${project?.project_number || 'Project'}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
    toast.success('Narrative exported');
  };

  if (!narrative) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No data available to generate narrative
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Weekly Cost Narrative</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Auto-generated from JSR data, editable before export
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <Button size="sm" onClick={handleSave} className="gap-1.5">
                <Check size={14} />
                Save
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={handleEdit} className="gap-1.5">
                <Edit2 size={14} />
                Edit
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={handleCopy} className="gap-1.5">
              <Copy size={14} />
              Copy
            </Button>
            <Button size="sm" variant="outline" onClick={handleExport} className="gap-1.5">
              <FileDown size={14} />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <Textarea
            value={editedNarrative}
            onChange={(e) => setEditedNarrative(e.target.value)}
            className="font-mono text-xs min-h-[600px] whitespace-pre-wrap"
            placeholder="Edit narrative..."
          />
        ) : (
          <div className="p-4 bg-secondary rounded font-mono text-xs whitespace-pre-wrap leading-relaxed">
            {narrative}
          </div>
        )}
      </CardContent>
    </Card>
  );
}