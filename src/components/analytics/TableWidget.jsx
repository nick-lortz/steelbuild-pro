import React, { useMemo } from 'react';
import DataTable from '@/components/ui/DataTable';

export default function TableWidget({ metrics, data, timeRange }) {
  const columns = useMemo(() => {
    if (!data || data.length === 0) return [];

    const cols = [
      { header: 'Project', accessor: 'name' }
    ];

    metrics.forEach(metric => {
      cols.push({
        header: metric.replace(/_/g, ' ').toUpperCase(),
        accessor: metric,
        render: (row) => {
          const value = row[metric];
          if (typeof value === 'number') {
            if (metric.includes('value') || metric.includes('cost')) {
              return `$${value.toLocaleString()}`;
            }
            if (metric.includes('percent')) {
              return `${value.toFixed(1)}%`;
            }
            return value.toLocaleString();
          }
          return value || '-';
        }
      });
    });

    return cols;
  }, [metrics, data]);

  const tableData = useMemo(() => {
    if (!data) return [];
    return data.map(project => {
      const row = { ...project };
      // Calculate metrics per project
      metrics.forEach(metric => {
        if (!row[metric]) {
          row[metric] = 0; // Default value
        }
      });
      return row;
    });
  }, [data, metrics]);

  return (
    <div className="max-h-[400px] overflow-y-auto">
      <DataTable
        columns={columns}
        data={tableData}
        emptyMessage="No data available"
      />
    </div>
  );
}