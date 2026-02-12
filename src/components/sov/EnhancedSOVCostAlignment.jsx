import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DataTable from '@/components/ui/DataTable';
import { TrendingUp, TrendingDown, Eye, DollarSign } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

export default function EnhancedSOVCostAlignment({ sovItems = [], expenses = [] }) {
  const [selectedSOV, setSelectedSOV] = useState(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  const formatCurrency = (value) => {
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const alignment = useMemo(() => {
    return sovItems.map(sov => {
      const sovExpenses = expenses.filter(e => 
        e.sov_code === sov.sov_code && 
        (e.payment_status === 'paid' || e.payment_status === 'approved')
      );
      const actualCost = sovExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const earned = ((sov.scheduled_value || 0) * (sov.percent_complete || 0)) / 100;
      const billedToDate = sov.billed_to_date || 0;
      const margin = billedToDate - actualCost;
      const marginPct = billedToDate > 0 ? (margin / billedToDate) * 100 : 0;
      const costToComplete = (sov.scheduled_value || 0) - actualCost;
      const burnRate = (sov.percent_complete || 0) > 0 ? actualCost / (sov.percent_complete || 1) : 0;
      const projectedFinal = burnRate * 100;
      const projectedMargin = (sov.scheduled_value || 0) - projectedFinal;

      return {
        id: sov.id,
        sov_code: sov.sov_code,
        description: sov.description,
        category: sov.sov_category,
        scheduledValue: sov.scheduled_value || 0,
        percentComplete: sov.percent_complete || 0,
        earned,
        billed: billedToDate,
        cost: actualCost,
        margin,
        marginPct,
        costToComplete,
        projectedFinal,
        projectedMargin,
        expenseCount: sovExpenses.length,
        expenses: sovExpenses
      };
    }).filter(item => item.billed > 0 || item.cost > 0);
  }, [sovItems, expenses]);

  const handleViewDetail = (item) => {
    setSelectedSOV(item);
    setShowDetailDialog(true);
  };

  const columns = [
    { 
      header: 'SOV Code', 
      accessor: 'sov_code', 
      render: (row) => <span className="font-mono text-sm font-semibold">{row.sov_code}</span> 
    },
    { 
      header: 'Description', 
      accessor: 'description',
      render: (row) => <span className="text-xs truncate max-w-xs">{row.description}</span>
    },
    { 
      header: 'Scheduled', 
      accessor: 'scheduledValue', 
      render: (row) => <span className="text-xs">${formatCurrency(row.scheduledValue)}</span> 
    },
    { 
      header: '% Done', 
      accessor: 'percentComplete', 
      render: (row) => (
        <div className="w-20">
          <div className="flex justify-between text-xs mb-1">
            <span>{row.percentComplete.toFixed(0)}%</span>
          </div>
          <Progress value={row.percentComplete} className="h-1.5" />
        </div>
      )
    },
    { 
      header: 'Billed', 
      accessor: 'billed', 
      render: (row) => <span className="text-xs font-semibold">${formatCurrency(row.billed)}</span> 
    },
    { 
      header: 'Actual Cost', 
      accessor: 'cost', 
      render: (row) => (
        <div className="text-xs">
          <div className="font-semibold">${formatCurrency(row.cost)}</div>
          <div className="text-muted-foreground">{row.expenseCount} expenses</div>
        </div>
      )
    },
    { 
      header: 'Margin', 
      accessor: 'margin',
      render: (row) => (
        <div className="flex items-center gap-1">
          {row.margin >= 0 ? 
            <TrendingUp size={14} className="text-green-400" /> : 
            <TrendingDown size={14} className="text-red-400" />
          }
          <div className="text-xs">
            <div className={row.margin >= 0 ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
              ${formatCurrency(row.margin)}
            </div>
            <div className="text-muted-foreground">({row.marginPct.toFixed(1)}%)</div>
          </div>
        </div>
      )
    },
    {
      header: 'Projected',
      accessor: 'projectedMargin',
      render: (row) => (
        <div className="text-xs">
          <div className={row.projectedMargin >= 0 ? 'text-green-400' : 'text-red-400'}>
            ${formatCurrency(row.projectedMargin)}
          </div>
          <div className="text-muted-foreground">at completion</div>
        </div>
      )
    },
    {
      header: '',
      accessor: 'actions',
      render: (row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleViewDetail(row)}
          className="text-blue-400 hover:text-blue-300"
        >
          <Eye size={14} className="mr-1" />
          Details
        </Button>
      )
    }
  ];

  const totals = alignment.reduce((acc, item) => ({
    scheduled: acc.scheduled + item.scheduledValue,
    earned: acc.earned + item.earned,
    billed: acc.billed + item.billed,
    cost: acc.cost + item.cost,
    margin: acc.margin + item.margin,
    projectedMargin: acc.projectedMargin + item.projectedMargin
  }), { scheduled: 0, earned: 0, billed: 0, cost: 0, margin: 0, projectedMargin: 0 });

  const totalMarginPct = totals.billed > 0 ? (totals.margin / totals.billed) * 100 : 0;

  if (alignment.length === 0) {
    return null;
  }

  return (
    <>
      <div className="space-y-4">
        <h3 className="text-base font-semibold">Cost Alignment & Expense Mapping</h3>
        
        <Card className="bg-blue-500/5 border-blue-500/30">
          <CardContent className="p-4">
            <div className="grid grid-cols-6 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Scheduled Value</p>
                <p className="text-lg font-bold">${formatCurrency(totals.scheduled)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Billed</p>
                <p className="text-lg font-bold">${formatCurrency(totals.billed)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Cost</p>
                <p className="text-lg font-bold">${formatCurrency(totals.cost)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Current Margin</p>
                <p className={`text-lg font-bold ${totals.margin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  ${formatCurrency(totals.margin)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Margin %</p>
                <p className={`text-lg font-bold ${totalMarginPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {totalMarginPct.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Projected Margin</p>
                <p className={`text-lg font-bold ${totals.projectedMargin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  ${formatCurrency(totals.projectedMargin)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <DataTable
              columns={columns}
              data={alignment}
              emptyMessage="No cost alignment data"
            />
          </CardContent>
        </Card>
      </div>

      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign size={20} />
              {selectedSOV?.sov_code} - Expense Detail
            </DialogTitle>
          </DialogHeader>
          {selectedSOV && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4 p-3 bg-muted rounded">
                <div>
                  <p className="text-xs text-muted-foreground">Scheduled Value</p>
                  <p className="text-sm font-bold">${formatCurrency(selectedSOV.scheduledValue)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">% Complete</p>
                  <p className="text-sm font-bold">{selectedSOV.percentComplete.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Actual Cost</p>
                  <p className="text-sm font-bold">${formatCurrency(selectedSOV.cost)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Margin</p>
                  <p className={`text-sm font-bold ${selectedSOV.margin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${formatCurrency(selectedSOV.margin)} ({selectedSOV.marginPct.toFixed(1)}%)
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Associated Expenses ({selectedSOV.expenses.length})</h4>
                <div className="border rounded max-h-[40vh] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="text-left p-2">Date</th>
                        <th className="text-left p-2">Description</th>
                        <th className="text-left p-2">Vendor</th>
                        <th className="text-right p-2">Amount</th>
                        <th className="text-left p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSOV.expenses.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-muted-foreground">
                            No expenses recorded for this SOV line
                          </td>
                        </tr>
                      ) : (
                        selectedSOV.expenses.map((expense, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="p-2 text-xs">{new Date(expense.expense_date).toLocaleDateString()}</td>
                            <td className="p-2 text-xs">{expense.description}</td>
                            <td className="p-2 text-xs">{expense.vendor || '-'}</td>
                            <td className="p-2 text-xs text-right font-semibold">${formatCurrency(expense.amount)}</td>
                            <td className="p-2 text-xs capitalize">{expense.payment_status}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}