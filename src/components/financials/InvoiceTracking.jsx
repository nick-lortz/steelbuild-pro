import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Receipt, AlertCircle } from 'lucide-react';

export default function InvoiceTracking({ financials, projects, costCodes, expenses = [] }) {
  const invoiceData = useMemo(() => {
    return financials.map(financial => {
      const project = projects.find(p => p.id === financial.project_id);
      const costCode = costCodes.find(c => c.id === financial.cost_code_id);
      
      // Calculate invoiced amount from expenses
      const invoiced = expenses
        .filter(e => 
          e.project_id === financial.project_id && 
          e.cost_code_id === financial.cost_code_id &&
          e.invoice_number // Only count items with invoice numbers
        )
        .reduce((sum, e) => sum + (e.amount || 0), 0);
      
      const budget = financial.budget_amount || 0;
      const remaining = budget - invoiced;
      const percentInvoiced = budget > 0 ? (invoiced / budget) * 100 : 0;
      const percentRemaining = budget > 0 ? (remaining / budget) * 100 : 0;
      
      return {
        id: financial.id,
        projectName: project?.name || 'Unknown',
        projectNumber: project?.project_number || '-',
        costCode: costCode?.code || '-',
        costCodeName: costCode?.name || 'Unknown',
        budget,
        invoiced,
        remaining,
        percentInvoiced,
        percentRemaining,
        overInvoiced: invoiced > budget
      };
    }).filter(d => d.budget > 0);
  }, [financials, projects, costCodes, expenses]);

  const totals = useMemo(() => {
    const totalBudget = invoiceData.reduce((sum, d) => sum + d.budget, 0);
    const totalInvoiced = invoiceData.reduce((sum, d) => sum + d.invoiced, 0);
    const totalRemaining = totalBudget - totalInvoiced;
    const percentInvoiced = totalBudget > 0 ? (totalInvoiced / totalBudget) * 100 : 0;
    
    return { totalBudget, totalInvoiced, totalRemaining, percentInvoiced };
  }, [invoiceData]);

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="text-amber-500" size={20} />
            <CardTitle className="text-lg">Invoice Tracking</CardTitle>
          </div>
          <div className="text-right">
            <p className="text-sm text-zinc-400">Total Invoiced</p>
            <p className="text-xl font-bold text-white">
              ${totals.totalInvoiced.toLocaleString()}
              <span className="text-sm text-zinc-400 font-normal ml-2">
                / ${totals.totalBudget.toLocaleString()}
              </span>
            </p>
            <p className="text-xs text-zinc-500">
              {totals.percentInvoiced.toFixed(1)}% of budget
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {invoiceData.length === 0 ? (
          <div className="text-center py-8 text-zinc-500">
            <Receipt size={32} className="mx-auto mb-2 opacity-50" />
            <p>No invoice data available</p>
          </div>
        ) : (
          invoiceData.map(item => (
            <div 
              key={item.id} 
              className={`p-4 rounded-lg border ${
                item.overInvoiced 
                  ? 'bg-red-500/5 border-red-500/20' 
                  : 'bg-zinc-800/50 border-zinc-700'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-white">
                      {item.projectNumber}
                    </span>
                    <span className="text-xs text-zinc-500">•</span>
                    <span className="text-xs text-zinc-400">{item.projectName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-amber-500">{item.costCode}</span>
                    <span className="text-xs text-zinc-400">{item.costCodeName}</span>
                  </div>
                </div>
                {item.overInvoiced && (
                  <AlertCircle size={16} className="text-red-400" />
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Invoiced</span>
                  <span className="font-medium text-white">
                    ${item.invoiced.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Budgeted</span>
                  <span className="text-zinc-300">
                    ${item.budget.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Remaining</span>
                  <span className={`font-medium ${
                    item.remaining < 0 ? 'text-red-400' : 'text-green-400'
                  }`}>
                    ${Math.abs(item.remaining).toLocaleString()}
                    <span className="text-xs ml-1">
                      ({Math.abs(item.percentRemaining).toFixed(1)}%)
                    </span>
                  </span>
                </div>
                
                <Progress 
                  value={Math.min(item.percentInvoiced, 100)} 
                  className="h-2 mt-2"
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}