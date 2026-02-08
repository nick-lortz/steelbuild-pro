import React, { useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import DataTable from '@/components/ui/DataTable';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function SOVCostAlignment({ sovItems = [], expenses = [] }) {
  const alignment = useMemo(() => {
    return sovItems.map(sov => {
      const sovExpenses = expenses.filter(e => 
        (e.sov_code === sov.sov_code) && 
        (e.payment_status === 'paid' || e.payment_status === 'approved')
      );
      const actualCost = sovExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const billedToDate = sov.billed_to_date || 0;
      const margin = billedToDate - actualCost;
      const marginPct = billedToDate > 0 ? (margin / billedToDate) * 100 : 0;

      return {
        sov_code: sov.sov_code,
        description: sov.description,
        billed: billedToDate,
        cost: actualCost,
        margin,
        marginPct
      };
    }).filter(item => item.billed > 0 || item.cost > 0);
  }, [sovItems, expenses]);

  const columns = [
    { header: 'SOV Code', accessor: 'sov_code', render: (row) => <span className="font-mono text-sm">{row.sov_code}</span> },
    { header: 'Description', accessor: 'description' },
    { header: 'Billed', accessor: 'billed', render: (row) => <span>${row.billed.toLocaleString()}</span> },
    { header: 'Actual Cost', accessor: 'cost', render: (row) => <span>${row.cost.toLocaleString()}</span> },
    { 
      header: 'Margin', 
      accessor: 'margin',
      render: (row) => (
        <div className="flex items-center gap-1">
          {row.margin >= 0 ? <TrendingUp size={14} className="text-green-400" /> : <TrendingDown size={14} className="text-red-400" />}
          <span className={row.margin >= 0 ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
            ${row.margin.toLocaleString()}
          </span>
          <span className="text-muted-foreground text-xs">({row.marginPct.toFixed(1)}%)</span>
        </div>
      )
    }
  ];

  const totals = alignment.reduce((acc, item) => ({
    billed: acc.billed + item.billed,
    cost: acc.cost + item.cost,
    margin: acc.margin + item.margin
  }), { billed: 0, cost: 0, margin: 0 });

  const totalMarginPct = totals.billed > 0 ? (totals.margin / totals.billed) * 100 : 0;

  if (alignment.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold">Cost Alignment by SOV Line</h3>
      
      <Card className="bg-blue-500/5 border-blue-500/30">
        <CardContent className="p-4">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Total Billed</p>
              <p className="text-lg font-bold">${totals.billed.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Cost</p>
              <p className="text-lg font-bold">${totals.cost.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Margin</p>
              <p className={`text-lg font-bold ${totals.margin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${totals.margin.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Margin %</p>
              <p className={`text-lg font-bold ${totalMarginPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {totalMarginPct.toFixed(1)}%
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
  );
}