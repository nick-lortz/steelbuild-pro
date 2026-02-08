import React from 'react';
import { CheckCircle2, Circle, AlertTriangle } from 'lucide-react';

export default function DeliveryPrerequisiteChecklist({ delivery, onUpdate }) {
  const checks = [
    {
      id: 'shop_drawings_approved',
      label: 'Shop Drawings Approved',
      status: delivery.shop_drawings_approved,
      critical: true
    },
    {
      id: 'fabrication_complete',
      label: 'Fabrication Complete',
      status: delivery.fabrication_complete,
      critical: true
    },
    {
      id: 'paint_galvanizing_complete',
      label: 'Paint / Galvanizing Complete',
      status: delivery.paint_galvanizing_complete,
      critical: true
    },
    {
      id: 'site_access_confirmed',
      label: 'Site Access Confirmed',
      status: delivery.site_access_confirmed,
      critical: true
    },
    {
      id: 'crane_scheduled',
      label: 'Crane Scheduled',
      status: delivery.crane_scheduled,
      critical: false
    },
    {
      id: 'crew_assigned',
      label: 'Erection Crew Assigned',
      status: delivery.crew_assigned,
      critical: false
    }
  ];

  const completed = checks.filter(c => c.status).length;
  const critical = checks.filter(c => c.critical).length;
  const criticalCompleted = checks.filter(c => c.critical && c.status).length;
  const canShip = criticalCompleted === critical;

  const toggleCheck = (checkId) => {
    onUpdate({
      [checkId]: !delivery[checkId]
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold text-white">
          PREREQUISITES FOR SHIPMENT
        </h4>
        <div className="text-xs text-zinc-400">
          {completed}/{checks.length} done
        </div>
      </div>

      <div className="space-y-2">
        {checks.map(check => (
          <button
            key={check.id}
            onClick={() => toggleCheck(check.id)}
            className="w-full flex items-center gap-3 p-2 rounded hover:bg-zinc-800/50 transition-colors group"
          >
            <div>
              {check.status ? (
                <CheckCircle2 size={18} className="text-green-500" />
              ) : (
                <Circle size={18} className="text-zinc-500 group-hover:text-zinc-400" />
              )}
            </div>
            <span className={`flex-1 text-left text-sm ${check.status ? 'text-zinc-300 line-through' : 'text-white'}`}>
              {check.label}
            </span>
            {check.critical && !check.status && (
              <AlertTriangle size={14} className="text-red-500" />
            )}
          </button>
        ))}
      </div>

      {!canShip && (
        <div className="mt-3 p-2 bg-red-900/20 border border-red-800 rounded flex items-center gap-2 text-xs text-red-400">
          <AlertTriangle size={14} />
          <span>Cannot ship until all critical items are complete</span>
        </div>
      )}

      {canShip && (
        <div className="mt-3 p-2 bg-green-900/20 border border-green-800 rounded flex items-center gap-2 text-xs text-green-400">
          <CheckCircle2 size={14} />
          <span>Ready to ship</span>
        </div>
      )}
    </div>
  );
}