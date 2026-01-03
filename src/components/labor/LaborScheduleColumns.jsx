import React from 'react';
import { Badge } from "@/components/ui/badge";

/**
 * Column definitions for labor data in schedule views
 */
export function getLaborScheduleColumns(categories) {
  const getCategoryName = (categoryId) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat?.name || '-';
  };

  return [
    {
      header: 'Labor Category',
      accessor: 'labor_category_id',
      render: (row) => (
        <span className="text-zinc-300 text-sm">
          {row.labor_category_id ? getCategoryName(row.labor_category_id) : '-'}
        </span>
      )
    },
    {
      header: 'Shop Hrs',
      accessor: 'planned_shop_hours',
      render: (row) => (
        <span className="text-blue-400 font-mono text-sm">
          {row.planned_shop_hours || 0}
        </span>
      )
    },
    {
      header: 'Field Hrs',
      accessor: 'planned_field_hours',
      render: (row) => (
        <span className="text-green-400 font-mono text-sm">
          {row.planned_field_hours || 0}
        </span>
      )
    },
    {
      header: 'Total Hrs',
      accessor: 'total_planned_hours',
      render: (row) => {
        const total = (Number(row.planned_shop_hours) || 0) + (Number(row.planned_field_hours) || 0);
        return (
          <span className="text-white font-semibold text-sm">
            {total}
          </span>
        );
      }
    }
  ];
}

/**
 * Visual indicator for tasks with labor variance
 */
export function LaborVarianceIndicator({ task, breakdown, categories }) {
  if (!task.labor_category_id || !breakdown) return null;

  const categoryBreakdown = breakdown.find(b => b.labor_category_id === task.labor_category_id);
  if (!categoryBreakdown) return null;

  const budgetTotal = (Number(categoryBreakdown.shop_hours) || 0) + (Number(categoryBreakdown.field_hours) || 0);
  const taskTotal = (Number(task.planned_shop_hours) || 0) + (Number(task.planned_field_hours) || 0);

  if (taskTotal > budgetTotal) {
    return (
      <Badge variant="destructive" className="text-xs">
        Exceeds Budget
      </Badge>
    );
  }

  return null;
}