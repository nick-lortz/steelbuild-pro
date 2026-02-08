import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Classification logic - deterministic and auditable
function classifyExpense(expense, costCode) {
  const category = expense.category?.toLowerCase() || '';
  const codeName = costCode?.name?.toLowerCase() || '';
  const code = costCode?.code?.toLowerCase() || '';

  // Fabrication indicators
  const fabKeywords = ['shop', 'fab', 'fabrication', 'detail', 'coating', 'paint', 'weld prep', 'fit-up', 'assembly'];
  
  // Field indicators
  const fieldKeywords = ['field', 'erection', 'install', 'crane', 'lift', 'site', 'onsite', 'rigging', 'hoist'];

  const nameMatch = fabKeywords.some(kw => codeName.includes(kw)) ? 'fabrication' :
                    fieldKeywords.some(kw => codeName.includes(kw)) ? 'field' : null;

  if (nameMatch) return nameMatch;

  // Category-based classification
  if (category === 'equipment') {
    return fieldKeywords.some(kw => codeName.includes(kw)) ? 'field' : 'other';
  }

  if (category === 'labor') {
    // Default shop labor vs field labor based on cost code patterns
    if (code.startsWith('05-1') || code.startsWith('051')) return 'fabrication';
    if (code.startsWith('05-5') || code.startsWith('055')) return 'field';
  }

  return 'other';
}

export default function FabricationFieldDrift({ 
  expenses = [], 
  financials = [], 
  costCodes = [],
  sovItems = [],
  projectId = null 
}) {
  const [selectedSOV, setSelectedSOV] = useState('all');
  const [selectedCostCode, setSelectedCostCode] = useState('all');

  // Filter expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      if (selectedSOV !== 'all' && e.sov_code !== selectedSOV) return false;
      if (selectedCostCode !== 'all' && e.cost_code_id !== selectedCostCode) return false;
      return true;
    });
  }, [expenses, selectedSOV, selectedCostCode]);

  // Classify and aggregate expenses
  const classified = useMemo(() => {
    const fabricationExpenses = [];
    const fieldExpenses = [];
    const otherExpenses = [];

    filteredExpenses.forEach(expense => {
      const costCode = costCodes.find(cc => cc.id === expense.cost_code_id);
      const classification = classifyExpense(expense, costCode);

      if (classification === 'fabrication') {
        fabricationExpenses.push(expense);
      } else if (classification === 'field') {
        fieldExpenses.push(expense);
      } else {
        otherExpenses.push(expense);
      }
    });

    const fabricationActual = fabricationExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const fieldActual = fieldExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const otherActual = otherExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    return {
      fabrication: { actual: fabricationActual, expenses: fabricationExpenses },
      field: { actual: fieldActual, expenses: fieldExpenses },
      other: { actual: otherActual, expenses: otherExpenses }
    };
  }, [filteredExpenses, costCodes]);

  // Calculate budgets
  const budgets = useMemo(() => {
    const fabricationBudget = financials
      .filter(f => {
        const costCode = costCodes.find(cc => cc.id === f.cost_code_id);
        return classifyExpense({ category: f.category, cost_code_id: f.cost_code_id }, costCode) === 'fabrication';
      })
      .reduce((sum, f) => sum + (f.current_budget || 0), 0);

    const fieldBudget = financials
      .filter(f => {
        const costCode = costCodes.find(cc => cc.id === f.cost_code_id);
        return classifyExpense({ category: f.category, cost_code_id: f.cost_code_id }, costCode) === 'field';
      })
      .reduce((sum, f) => sum + (f.current_budget || 0), 0);

    const otherBudget = financials
      .filter(f => {
        const costCode = costCodes.find(cc => cc.id === f.cost_code_id);
        return classifyExpense({ category: f.category, cost_code_id: f.cost_code_id }, costCode) === 'other';
      })
      .reduce((sum, f) => sum + (f.current_budget || 0), 0);

    return {
      fabrication: fabricationBudget,
      field: fieldBudget,
      other: otherBudget
    };
  }, [financials, costCodes]);

  // Calculate variances and status
  const summary = useMemo(() => {
    const calcVariance = (budget, actual) => {
      const variance = budget - actual;
      const variancePercent = budget > 0 ? (variance / budget) * 100 : 0;
      
      let status, icon, color;
      if (variancePercent >= -5) {
        status = 'green';
        icon = CheckCircle;
        color = 'text-green-400';
      } else if (variancePercent >= -10) {
        status = 'yellow';
        icon = AlertCircle;
        color = 'text-amber-400';
      } else {
        status = 'red';
        icon = AlertTriangle;
        color = 'text-red-400';
      }

      return { variance, variancePercent, status, icon, color };
    };

    return {
      fabrication: {
        budget: budgets.fabrication,
        actual: classified.fabrication.actual,
        ...calcVariance(budgets.fabrication, classified.fabrication.actual)
      },
      field: {
        budget: budgets.field,
        actual: classified.field.actual,
        ...calcVariance(budgets.field, classified.field.actual)
      },
      other: {
        budget: budgets.other,
        actual: classified.other.actual,
        ...calcVariance(budgets.other, classified.other.actual)
      }
    };
  }, [budgets, classified]);

  // Trend analysis - group expenses by week
  const trends = useMemo(() => {
    const weeks = {};

    [...classified.fabrication.expenses, ...classified.field.expenses, ...classified.other.expenses].forEach(expense => {
      if (!expense.expense_date) return;
      
      try {
        const date = new Date(expense.expense_date);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];

        if (!weeks[weekKey]) {
          weeks[weekKey] = { week: weekKey, fabrication: 0, field: 0, other: 0 };
        }

        const costCode = costCodes.find(cc => cc.id === expense.cost_code_id);
        const classification = classifyExpense(expense, costCode);

        weeks[weekKey][classification] += expense.amount || 0;
      } catch {
        // Skip expenses with invalid dates
      }
    });

    return Object.values(weeks).sort((a, b) => a.week.localeCompare(b.week));
  }, [classified, costCodes]);

  // Divergence indicator
  const divergence = useMemo(() => {
    const fabVariance = summary.fabrication.variancePercent;
    const fieldVariance = summary.field.variancePercent;
    const diff = Math.abs(fabVariance - fieldVariance);

    if (diff > 10) {
      const worse = fabVariance < fieldVariance ? 'Fabrication' : 'Field';
      return {
        exists: true,
        message: `${worse} degrading ${diff.toFixed(1)}% faster`,
        severity: diff > 20 ? 'high' : 'medium'
      };
    }

    return { exists: false };
  }, [summary]);

  const categoryRows = [
    { category: 'Fabrication', ...summary.fabrication },
    { category: 'Field', ...summary.field },
    { category: 'Shared / Other', ...summary.other }
  ];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">SOV Line</label>
              <Select value={selectedSOV} onValueChange={setSelectedSOV}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All SOV Lines</SelectItem>
                  {sovItems.map(sov => (
                    <SelectItem key={sov.id} value={sov.sov_code}>
                      {sov.sov_code} - {sov.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Cost Code</label>
              <Select value={selectedCostCode} onValueChange={setSelectedCostCode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cost Codes</SelectItem>
                  {costCodes.map(cc => (
                    <SelectItem key={cc.id} value={cc.id}>
                      {cc.code} - {cc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fabrication vs Field Cost Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground">Category</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground">Budget</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground">Actual</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground">Variance</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {categoryRows.map((row, idx) => {
                  const Icon = row.icon;
                  return (
                    <tr key={idx} className="border-b border-border/50">
                      <td className="py-3 px-4 font-semibold">{row.category}</td>
                      <td className="py-3 px-4 text-right font-semibold">${row.budget.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-semibold text-red-400">${row.actual.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right">
                        <div className={cn('font-semibold', row.color)}>
                          ${Math.abs(row.variance).toLocaleString()}
                        </div>
                        <div className={cn('text-xs', row.color)}>
                          {row.variancePercent >= 0 ? '+' : ''}{row.variancePercent.toFixed(1)}%
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Icon size={16} className={row.color} />
                          <span className={cn('text-sm font-semibold uppercase', row.color)}>
                            {row.status}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {divergence.exists && (
            <div className={cn(
              'mt-4 p-3 rounded border text-sm',
              divergence.severity === 'high' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
              'bg-amber-500/10 border-amber-500/30 text-amber-400'
            )}>
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} />
                <span className="font-semibold">Cost Divergence Detected:</span>
                <span>{divergence.message}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trend Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cost Trend Analysis</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Weekly cost accumulation by category</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="week" 
                stroke="#9CA3AF" 
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => {
                  try {
                    return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  } catch {
                    return value;
                  }
                }}
              />
              <YAxis 
                stroke="#9CA3AF" 
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                formatter={(value) => `$${value.toLocaleString()}`}
                labelFormatter={(label) => {
                  try {
                    return new Date(label).toLocaleDateString();
                  } catch {
                    return label;
                  }
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="fabrication" stroke="#3B82F6" strokeWidth={2} name="Fabrication" />
              <Line type="monotone" dataKey="field" stroke="#EF4444" strokeWidth={2} name="Field" />
              <Line type="monotone" dataKey="other" stroke="#9CA3AF" strokeWidth={2} name="Other" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Classification Logic Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Classification Logic</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-2">
          <div>
            <span className="font-semibold text-blue-400">Fabrication:</span> Cost codes containing shop, fab, detail, coating, paint, weld prep, fit-up, assembly
          </div>
          <div>
            <span className="font-semibold text-red-400">Field:</span> Cost codes containing field, erection, install, crane, lift, site, onsite, rigging, hoist
          </div>
          <div>
            <span className="font-semibold text-muted-foreground">Other/Shared:</span> All other costs not classified above
          </div>
          <div className="pt-2 border-t border-border/50">
            Classification is deterministic and auditable based on cost code names and categories.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}