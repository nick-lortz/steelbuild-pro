import React from 'react';
import { AlertTriangle, AlertCircle } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

export default function DailyResourceCell({ date, crews, equipment, deliveries, tasks, conflicts }) {
  const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
  
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 space-y-2">
      {/* Date Header */}
      <div className="font-bold text-sm text-zinc-200">{dateStr}</div>

      {/* Conflicts */}
      {conflicts && conflicts.length > 0 && (
        <div className="space-y-1">
          {conflicts.map((c, idx) => (
            <div key={idx} className="flex items-start gap-1.5 p-1.5 bg-red-900/30 rounded border border-red-700">
              <AlertTriangle size={12} className="text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-300">{c.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Crews Section */}
      {crews && crews.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-bold text-zinc-500 uppercase">Crews ({crews.length})</p>
          {crews.map((crew, idx) => (
            <div key={idx} className="bg-zinc-800 p-1.5 rounded text-xs">
              <div className="font-semibold text-blue-400">{crew.crew_name}</div>
              <div className="text-zinc-400">
                {crew.crew_size} ppl • {crew.task_name || 'Unassigned'}
              </div>
              {!crew.has_equipment && (
                <div className="flex items-center gap-1 text-yellow-500 mt-0.5">
                  <AlertCircle size={10} />
                  <span className="text-[10px]">No equipment</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Equipment Section */}
      {equipment && equipment.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-bold text-zinc-500 uppercase">Equipment ({equipment.length})</p>
          {equipment.map((eq, idx) => (
            <div key={idx} className="bg-zinc-800 p-1.5 rounded text-xs">
              <div className="font-semibold text-amber-400">
                {eq.equipment_type === 'mobile_crane' || eq.equipment_type === 'tower_crane' || eq.equipment_type === 'crawler_crane' ? '🏗️' : '⚙️'}
                {' '}{eq.equipment_id}
              </div>
              <div className="text-zinc-400">{eq.assigned_crew_id ? `Crew: ${eq.crew_name}` : 'No crew assigned'}</div>
              {eq.equipment_type.includes('crane') && (
                <div className="text-zinc-500 text-[10px] mt-0.5">
                  Cap: {eq.crane_data?.capacity_tons}T • Pick: {eq.crane_data?.pick_weight_tons}T
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Deliveries Section */}
      {deliveries && deliveries.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-bold text-zinc-500 uppercase">Deliveries ({deliveries.length})</p>
          {deliveries.map((del, idx) => (
            <div key={idx} className="bg-zinc-800 p-1.5 rounded text-xs">
              <div className="font-semibold text-green-400">{del.package_name}</div>
              <div className="text-zinc-400">{del.weight_tons}T • {del.piece_count} pcs</div>
              <Badge variant="outline" className="mt-0.5 text-[10px] h-4">
                {del.delivery_status}
              </Badge>
            </div>
          ))}
        </div>
      )}

      {/* No Data */}
      {(!crews || crews.length === 0) && (!equipment || equipment.length === 0) && (!deliveries || deliveries.length === 0) && (
        <div className="text-xs text-zinc-600 py-4 text-center">No activity</div>
      )}
    </div>
  );
}