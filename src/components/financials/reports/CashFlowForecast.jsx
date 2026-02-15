import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { format, addMonths, startOfMonth } from 'date-fns';

const formatCurrency = (value) => {
  if (value == null) return '$0.00';
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
  return value < 0 ? `( $${formatted} )` : `$${formatted}`;
};

export default function CashFlowForecast({ 
  earnedValue,
  actualCost,
  etc,
  billed,
  readyToBill,
  onExport 
}) {
  const monthlyData = useMemo(() => {
    const data = [];
    const today = new Date();
    const startMonth = startOfMonth(addMonths(today, -2));
    
    // Distribute costs and revenue across 8 months (2 past, current, 5 future)
    for (let i = 0; i < 8; i++) {
      const month = addMonths(startMonth, i);
      const isHistorical = i < 2;
      const isCurrent = i === 2;
      const progress = (i + 1) / 8;
      
      data.push({
        month: format(month, 'MMM yy'),
        revenue: isHistorical ? (billed * progress * 0.8) : 
                 isCurrent ? readyToBill * 0.5 : 
                 ((earnedValue - billed) / 5),
        cost: isHistorical ? (actualCost * progress * 0.8) :
              isCurrent ? (actualCost * 0.1) :
              (etc / 5),
        netCashFlow: 0 // Will calculate below
      });
    }

    // Calculate net cash flow
    data.forEach(d => {
      d.netCashFlow = d.revenue - d.cost;
    });

    return data;
  }, [earnedValue, actualCost, etc, billed, readyToBill]);

  const cumulativeCashFlow = useMemo(() => {
    let cumulative = 0;
    return monthlyData.map(d => {
      cumulative += d.netCashFlow;
      return { ...d, cumulative };
    });
  }, [monthlyData]);

  const totalProjectedRevenue = monthlyData.reduce((sum, d) => sum + d.revenue, 0);
  const totalProjectedCost = monthlyData.reduce((sum, d) => sum + d.cost, 0);
  const netProjection = totalProjectedRevenue - totalProjectedCost;

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white">Monthly Cash Flow Forecast</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={onExport}
            className="border-zinc-700 text-xs"
          >
            <Download size={12} className="mr-1" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-zinc-950 border border-zinc-800 rounded">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-1">
              Projected Revenue
            </p>
            <p className="text-xl font-bold text-green-400 mb-1">
              {formatCurrency(totalProjectedRevenue)}
            </p>
            <p className="text-xs text-zinc-600">Next 6 months</p>
          </div>
          <div className="p-4 bg-zinc-950 border border-zinc-800 rounded">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-1">
              Projected Costs
            </p>
            <p className="text-xl font-bold text-amber-400 mb-1">
              {formatCurrency(totalProjectedCost)}
            </p>
            <p className="text-xs text-zinc-600">Next 6 months</p>
          </div>
          <div className="p-4 bg-zinc-950 border border-zinc-800 rounded">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-1">
              Net Cash Flow
            </p>
            <p className={`text-xl font-bold mb-1 ${netProjection >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatCurrency(netProjection)}
            </p>
            <p className="text-xs text-zinc-600">Projected net</p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="month" stroke="#71717a" style={{ fontSize: 11 }} />
              <YAxis stroke="#71717a" style={{ fontSize: 11 }} tickFormatter={(val) => `$${(val/1000).toFixed(0)}k`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', color: '#fff' }}
                formatter={(val) => formatCurrency(val)}
              />
              <Legend />
              <ReferenceLine y={0} stroke="#71717a" strokeDasharray="3 3" />
              <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
              <Bar dataKey="cost" fill="#f59e0b" name="Cost" />
              <Bar dataKey="netCashFlow" fill="#3b82f6" name="Net Cash Flow" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Breakdown Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-zinc-950 border-b border-zinc-700">
              <tr>
                <th className="text-left p-2 text-zinc-400 font-bold uppercase">Month</th>
                <th className="text-right p-2 text-zinc-400 font-bold uppercase">Revenue</th>
                <th className="text-right p-2 text-zinc-400 font-bold uppercase">Cost</th>
                <th className="text-right p-2 text-zinc-400 font-bold uppercase">Net</th>
                <th className="text-right p-2 text-zinc-400 font-bold uppercase">Cumulative</th>
              </tr>
            </thead>
            <tbody>
              {cumulativeCashFlow.map((row, idx) => (
                <tr key={idx} className="border-b border-zinc-800 hover:bg-zinc-800/30">
                  <td className="p-2 text-white font-medium">{row.month}</td>
                  <td className="p-2 text-right text-green-400 font-mono">{formatCurrency(row.revenue)}</td>
                  <td className="p-2 text-right text-amber-400 font-mono">{formatCurrency(row.cost)}</td>
                  <td className={`p-2 text-right font-mono font-bold ${row.netCashFlow >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(row.netCashFlow)}
                  </td>
                  <td className={`p-2 text-right font-mono ${row.cumulative >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                    {formatCurrency(row.cumulative)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}