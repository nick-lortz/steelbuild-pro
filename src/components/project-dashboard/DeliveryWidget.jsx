import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Truck, Calendar, Package } from 'lucide-react';
import { format, isWithinInterval, addDays } from 'date-fns';

export default function DeliveryWidget({ projectId }) {
  const { data: deliveries = [] } = useQuery({
    queryKey: ['deliveries', projectId],
    queryFn: () => base44.entities.Delivery.filter({ project_id: projectId })
  });

  const now = new Date();
  const upcoming = deliveries.filter(d => 
    d.scheduled_date && 
    new Date(d.scheduled_date) > now &&
    isWithinInterval(new Date(d.scheduled_date), { start: now, end: addDays(now, 14) })
  ).sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));

  const pending = deliveries.filter(d => d.status === 'pending').length;
  const inTransit = deliveries.filter(d => d.status === 'in_transit').length;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Truck size={16} className="text-amber-500" />
        <h3 className="text-sm font-semibold text-white">Upcoming Deliveries</h3>
      </div>
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-zinc-800/50 rounded p-2">
            <div className="text-[10px] text-zinc-500 uppercase">Next 14 Days</div>
            <div className="text-2xl font-bold text-amber-400">{upcoming.length}</div>
          </div>
          <div className="bg-zinc-800/50 rounded p-2">
            <div className="text-[10px] text-zinc-500 uppercase">Pending</div>
            <div className="text-2xl font-bold text-zinc-400">{pending}</div>
          </div>
          <div className="bg-zinc-800/50 rounded p-2">
            <div className="text-[10px] text-zinc-500 uppercase">In Transit</div>
            <div className="text-2xl font-bold text-blue-400">{inTransit}</div>
          </div>
        </div>
        <div className="space-y-2">
          {upcoming.slice(0, 4).map(delivery => (
            <div key={delivery.id} className="bg-zinc-800/30 rounded p-2">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Calendar size={12} className="text-zinc-500" />
                  <span className="text-xs font-medium text-white">
                    {format(new Date(delivery.scheduled_date), 'MMM d')}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-500">{delivery.status}</span>
              </div>
              <p className="text-xs text-zinc-400 truncate">{delivery.description || 'Delivery'}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}