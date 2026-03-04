import React, { useMemo, useRef, useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CHART, rechartsProps, CustomTooltip, CustomLegend, SBPChartGradients } from '@/components/shared/chartTheme';

const COLORS = CHART.colors;

// Intersection Observer for visibility
function useIsVisible(ref) {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.1 });
    
    if (ref.current) {
      observer.observe(ref.current);
    }
    
    return () => observer.disconnect();
  }, [ref]);
  
  return isVisible;
}

export default function ChartWidget({ chartType, metrics, data, timeRange, title, tasks, financials, expenses }) {
  const containerRef = useRef(null);
  const isVisible = useIsVisible(containerRef);
  const chartData = useMemo(() => {
    // Generate time-series data based on timeRange
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
    const dataPoints = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const point = { date: dateStr };
      
      // Calculate metrics for this date
      if (expenses) {
        const dayExpenses = expenses.filter(e => e.expense_date <= dateStr);
        point.actual_cost = dayExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      }
      
      if (tasks) {
        point.tasks_completed = tasks.filter(t => 
          t.status === 'completed' && t.updated_date && t.updated_date.split('T')[0] <= dateStr
        ).length;
      }

      dataPoints.push(point);
    }

    return dataPoints;
  }, [timeRange, tasks, expenses]);

  const aggregateData = useMemo(() => {
    return metrics.map((metricId, idx) => ({
      name: metricId.replace(/_/g, ' '),
      value: data[metricId] || 0,
      color: COLORS[idx % COLORS.length]
    }));
  }, [metrics, data]);

  const sharedChartProps = {
    margin: { top: 8, right: 8, bottom: 0, left: 0 },
  };

  if (chartType === 'line') {
    return (
      <div ref={containerRef} className="min-h-[300px] w-full">
        {isVisible && (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} {...sharedChartProps}>
              <SBPChartGradients />
              <CartesianGrid {...rechartsProps.cartesianGrid} />
              <XAxis dataKey="date" {...rechartsProps.xAxis} />
              <YAxis {...rechartsProps.yAxis} />
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />
              {metrics.map((metric, idx) => (
                <Line key={metric} type="monotone" dataKey={metric}
                  stroke={COLORS[idx % COLORS.length]} strokeWidth={2} dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  strokeDasharray={idx > 0 ? `${(idx * 3)} 3` : undefined}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    );
  }

  if (chartType === 'bar') {
    return (
      <div ref={containerRef} className="min-h-[300px] w-full">
        {isVisible && (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} {...sharedChartProps} barCategoryGap="35%">
              <CartesianGrid {...rechartsProps.cartesianGrid} />
              <XAxis dataKey="date" {...rechartsProps.xAxis} />
              <YAxis {...rechartsProps.yAxis} />
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />
              {metrics.map((metric, idx) => (
                <Bar key={metric} dataKey={metric}
                  fill={COLORS[idx % COLORS.length]}
                  radius={[3, 3, 0, 0]}
                  fillOpacity={0.85}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    );
  }

  if (chartType === 'area') {
    const gradientIds = ['sbp-grad-blue','sbp-grad-orange','sbp-grad-teal','sbp-grad-amber','sbp-grad-violet','sbp-grad-red'];
    return (
      <div ref={containerRef} className="min-h-[300px] w-full">
        {isVisible && (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData} {...sharedChartProps}>
              <SBPChartGradients />
              <CartesianGrid {...rechartsProps.cartesianGrid} />
              <XAxis dataKey="date" {...rechartsProps.xAxis} />
              <YAxis {...rechartsProps.yAxis} />
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />
              {metrics.map((metric, idx) => (
                <Area key={metric} type="monotone" dataKey={metric}
                  stroke={COLORS[idx % COLORS.length]} strokeWidth={2}
                  fill={`url(#${gradientIds[idx % gradientIds.length]})`}
                  dot={false} activeDot={{ r: 4, strokeWidth: 0 }}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    );
  }

  if (chartType === 'pie') {
    return (
      <div ref={containerRef} className="min-h-[300px] w-full">
        {isVisible && (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={aggregateData} cx="50%" cy="50%"
                labelLine={false} outerRadius={100} innerRadius={40}
                dataKey="value" paddingAngle={2}
              >
                {aggregateData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    );
  }

        return null;
        }