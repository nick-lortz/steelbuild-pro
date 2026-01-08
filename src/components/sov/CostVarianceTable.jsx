import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight, ChevronDown, AlertCircle } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function CostVarianceTable({ 
  sovItems = [], 
  expenses = [], 
  costCodes = [],
  mappings = []
}) {
  const [expandedRows, setExpandedRows] = useState({});

  const costVarianceData = useMemo(() => {
    return sovItems.map(sov => {
      const earned = (sov.scheduled_value || 0) * ((sov.percent_complete || 0) / 100);
      const billed = sov.billed_to_date || 0;
      
      // Find cost codes mapped to this SOV
      const sovMappings = mappings.filter(m => m.sov_item_id === sov.id);
      
      // Calculate actual cost by cost code
      const costCodeBreakdown = sovMappings.map(mapping => {
        const costCode = costCodes.find(cc => cc.id === mapping.cost_code_id);
        const ccExpenses = expenses.filter(e => 
          e.cost_code_id === mapping.cost_code_id &&
          (e.payment_status === 'paid' || e.payment_status === 'approved')
        );
        
        const actualCost = ccExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const allocatedCost = actualCost * (mapping.allocation_percent / 100);
        
        // Allocated SOV value for this cost code
        const allocatedSOVValue = earned * (mapping.allocation_percent / 100);
        const variance = allocatedSOVValue - allocatedCost;
        const variancePercent = allocatedSOVValue > 0 ? (variance / allocatedSOVValue) * 100 : 0;

        return {
          cost_code_id: mapping.cost_code_id,
          cost_code: costCode?.code || 'Unknown',
          description: costCode?.description || costCode?.name || 'Unknown',
          category: costCode?.category || 'other',
          allocation_percent: mapping.allocation_percent,
          allocated_sov_value: allocatedSOVValue,
          actual_cost: allocatedCost,
          variance,
          variance_percent: variancePercent
        };
      });

      // Expenses not mapped to cost codes
      const unmappedExpenses = expenses.filter(e => 
        e.sov_code === sov.sov_code &&
        (e.payment_status === 'paid' || e.payment_status === 'approved') &&
        !sovMappings.find(m => m.cost_code_id === e.cost_code_id)
      );

      const unmappedCost = unmappedExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

      // Total actual cost
      const totalActualCost = costCodeBreakdown.reduce((sum, cc) => sum + cc.actual_cost, 0) + unmappedCost;
      
      // Cost variance at SOV level
      const costVariance = earned - totalActualCost;
      const costVariancePercent = earned > 0 ? (costVariance / earned) * 100 : 0;

      // Status determination
      let status = 'green';
      if (costVariancePercent < -5) {
        status = 'red';
      } else if (costVariancePercent < -2) {
        status = 'yellow';
      }

      return {
        ...sov,
        earned,
        billed,
        actual_cost: totalActualCost,
        cost_variance: costVariance,
        cost_variance_percent: costVariancePercent,
        status,
        cost_code_breakdown: costCodeBreakdown,
        unmapped_cost: unmappedCost,
        has_cost_codes: costCodeBreakdown.length > 0
      };
    });
  }, [sovItems, expenses, costCodes, mappings]);

  const toggleRow = (sovId) => {
    setExpandedRows(prev => ({ ...prev, [sovId]: !prev[sovId] }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'green': return 'text-green-400';
      case 'yellow': return 'text-amber-400';
      case 'red': return 'text-red-400';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusBg = (status) => {
    switch (status) {
      case 'green': return 'bg-green-500/10 border-green-500/30';
      case 'yellow': return 'bg-amber-500/10 border-amber-500/30';
      case 'red': return 'bg-red-500/10 border-red-500/30';
      default: return '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cost Variance Analysis</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Earned vs Actual Cost by SOV line with cost code breakdown
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {/* Header Row */}
          <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-secondary/50 rounded text-xs font-semibold text-muted-foreground">
            <div className="col-span-1"></div>
            <div className="col-span-1">SOV</div>
            <div className="col-span-2">Description</div>
            <div className="col-span-1 text-right">Scheduled</div>
            <div className="col-span-1 text-right">Earned</div>
            <div className="col-span-1 text-right">Billed</div>
            <div className="col-span-2 text-right">Actual Cost</div>
            <div className="col-span-2 text-right">Cost Variance</div>
            <div className="col-span-1 text-center">Status</div>
          </div>

          {/* Data Rows */}
          {costVarianceData.map((row) => (
            <div key={row.id}>
              {/* Parent Row (SOV Level) */}
              <div 
                className={cn(
                  "grid grid-cols-12 gap-2 px-3 py-2.5 hover:bg-secondary/50 transition-colors cursor-pointer rounded",
                  getStatusBg(row.status)
                )}
                onClick={() => row.has_cost_codes && toggleRow(row.id)}
              >
                <div className="col-span-1 flex items-center">
                  {row.has_cost_codes && (
                    expandedRows[row.id] ? 
                      <ChevronDown size={16} className="text-muted-foreground" /> : 
                      <ChevronRight size={16} className="text-muted-foreground" />
                  )}
                </div>
                <div className="col-span-1 font-mono text-sm font-semibold">{row.sov_code}</div>
                <div className="col-span-2 text-sm truncate">{row.description}</div>
                <div className="col-span-1 text-right text-sm">
                  ${row.scheduled_value.toLocaleString()}
                </div>
                <div className="col-span-1 text-right text-sm font-semibold text-green-400">
                  ${row.earned.toLocaleString()}
                </div>
                <div className="col-span-1 text-right text-sm">
                  ${row.billed.toLocaleString()}
                </div>
                <div className="col-span-2 text-right text-sm font-semibold text-red-400">
                  ${row.actual_cost.toLocaleString()}
                </div>
                <div className="col-span-2 text-right">
                  <div className={cn("text-sm font-bold", getStatusColor(row.status))}>
                    ${row.cost_variance.toLocaleString()}
                  </div>
                  <div className={cn("text-xs", getStatusColor(row.status))}>
                    {row.cost_variance_percent.toFixed(1)}%
                  </div>
                </div>
                <div className="col-span-1 flex justify-center">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center",
                    row.status === 'green' ? 'bg-green-500/20' :
                    row.status === 'yellow' ? 'bg-amber-500/20' :
                    'bg-red-500/20'
                  )}>
                    <div className={cn(
                      "w-3 h-3 rounded-full",
                      row.status === 'green' ? 'bg-green-500' :
                      row.status === 'yellow' ? 'bg-amber-500' :
                      'bg-red-500'
                    )} />
                  </div>
                </div>
              </div>

              {/* Child Rows (Cost Code Breakdown) */}
              {expandedRows[row.id] && row.has_cost_codes && (
                <div className="ml-8 mt-1 mb-2 space-y-1">
                  {row.cost_code_breakdown.map((cc, idx) => (
                    <div 
                      key={idx}
                      className="grid grid-cols-12 gap-2 px-3 py-2 bg-secondary/30 rounded text-xs"
                    >
                      <div className="col-span-1"></div>
                      <div className="col-span-1 font-mono">{cc.cost_code}</div>
                      <div className="col-span-2 truncate">{cc.description}</div>
                      <div className="col-span-1 text-right capitalize text-muted-foreground">
                        {cc.category}
                      </div>
                      <div className="col-span-1 text-right text-muted-foreground">
                        {cc.allocation_percent}%
                      </div>
                      <div className="col-span-1 text-right">
                        ${cc.allocated_sov_value.toLocaleString()}
                      </div>
                      <div className="col-span-2 text-right text-red-400">
                        ${cc.actual_cost.toLocaleString()}
                      </div>
                      <div className="col-span-2 text-right">
                        <div className={cc.variance >= 0 ? 'text-green-400' : 'text-red-400'}>
                          ${cc.variance.toLocaleString()}
                        </div>
                        <div className={cn("text-xs", cc.variance >= 0 ? 'text-green-400' : 'text-red-400')}>
                          {cc.variance_percent.toFixed(1)}%
                        </div>
                      </div>
                      <div className="col-span-1"></div>
                    </div>
                  ))}

                  {row.unmapped_cost > 0 && (
                    <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-amber-500/10 rounded text-xs">
                      <div className="col-span-1"></div>
                      <div className="col-span-1 flex items-center">
                        <AlertCircle size={12} className="text-amber-400" />
                      </div>
                      <div className="col-span-2 text-amber-400">Unmapped Costs</div>
                      <div className="col-span-1"></div>
                      <div className="col-span-1"></div>
                      <div className="col-span-1"></div>
                      <div className="col-span-2 text-right text-amber-400 font-semibold">
                        ${row.unmapped_cost.toLocaleString()}
                      </div>
                      <div className="col-span-2 text-right text-amber-400">
                        Unallocated
                      </div>
                      <div className="col-span-1"></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {costVarianceData.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No SOV data available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}