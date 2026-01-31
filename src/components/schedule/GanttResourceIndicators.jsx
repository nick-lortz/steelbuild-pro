import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Users, Zap } from 'lucide-react';

export default function GanttResourceIndicators({ task, resources = [] }) {
  const { laborCount, equipmentCount, allocation } = useMemo(() => {
    const assigned = task.assigned_resources || [];
    const equipment = task.assigned_equipment || [];
    
    const labor = resources.filter(r => assigned.includes(r.id) && (r.type === 'labor' || r.type === 'subcontractor'));
    const equip = resources.filter(r => equipment.includes(r.id) && r.type === 'equipment');
    
    // Simple allocation based on resource count vs estimated hours
    const estimatedHours = task.estimated_hours || task.planned_shop_hours || 0;
    const totalFTE = labor.length; // Simplified: 1 person = 1 FTE
    const allocPct = estimatedHours > 0 && totalFTE > 0
      ? Math.min(100, Math.round((totalFTE * 40) / estimatedHours * 100)) // Assumes 40-hr week
      : 0;

    return {
      laborCount: labor.length,
      equipmentCount: equip.length,
      allocation: allocPct
    };
  }, [task, resources]);

  if (laborCount === 0 && equipmentCount === 0) return null;

  return (
    <div className="absolute inset-0 flex items-center gap-0.5 px-1 pointer-events-none">
      {laborCount > 0 && (
        <Badge 
          variant="outline" 
          className="text-[9px] bg-blue-500/20 border-blue-400/50 text-blue-300 h-4 px-1 flex items-center gap-0.5"
          title={`${laborCount} labor resources`}
        >
          <Users size={10} />
          {laborCount}
        </Badge>
      )}
      {equipmentCount > 0 && (
        <Badge 
          variant="outline" 
          className="text-[9px] bg-yellow-500/20 border-yellow-400/50 text-yellow-300 h-4 px-1 flex items-center gap-0.5"
          title={`${equipmentCount} equipment resources`}
        >
          <Zap size={10} />
          {equipmentCount}
        </Badge>
      )}
      {allocation > 80 && (
        <span className="text-[8px] text-red-400 font-bold ml-auto" title="Resource over-allocation">
          ⚠️
        </span>
      )}
    </div>
  );
}