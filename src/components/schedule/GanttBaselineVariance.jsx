import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { differenceInDays } from 'date-fns';

export default function GanttBaselineVariance({ task, getTaskPosition }) {
  if (!task.baseline_start || !task.baseline_end) return null;

  try {
    const baselineStart = new Date(task.baseline_start);
    const baselineEnd = new Date(task.baseline_end);
    const currentStart = new Date(task.start_date);
    const currentEnd = new Date(task.end_date);

    if (isNaN(baselineStart.getTime()) || isNaN(baselineEnd.getTime())) return null;

    const startVariance = differenceInDays(currentStart, baselineStart);
    const endVariance = differenceInDays(currentEnd, baselineEnd);
    const baselinePos = getTaskPosition({ start_date: task.baseline_start, end_date: task.baseline_end });

    // Variance color based on deviation
    const getVarianceColor = (variance) => {
      if (variance === 0) return 'text-green-400';
      if (variance > 0) return 'text-red-500'; // Behind schedule
      return 'text-blue-400'; // Ahead of schedule
    };

    return (
      <>
        {/* Baseline bar */}
        <div
          className="absolute h-2 bg-zinc-500/40 border border-zinc-400/40 rounded"
          style={{
            ...baselinePos,
            top: '65%',
          }}
          title={`Baseline: ${task.baseline_start} to ${task.baseline_end}`}
        />

        {/* Variance indicator - shows if delayed */}
        {(startVariance !== 0 || endVariance !== 0) && (
          <div
            className="absolute text-[10px] font-bold flex items-center gap-1 z-20 px-1"
            style={{
              left: baselinePos.left,
              top: '72%',
            }}
            title={`Start: ${startVariance > 0 ? '+' : ''}${startVariance}d | End: ${endVariance > 0 ? '+' : ''}${endVariance}d`}
          >
            {Math.abs(endVariance) > 0 && (
              <>
                <AlertTriangle size={10} className={getVarianceColor(endVariance)} />
                <span className={getVarianceColor(endVariance)}>
                  {endVariance > 0 ? '+' : ''}{endVariance}d
                </span>
              </>
            )}
          </div>
        )}
      </>
    );
  } catch {
    return null;
  }
}