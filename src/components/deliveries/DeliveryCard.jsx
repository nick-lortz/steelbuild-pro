import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ChevronDown, ChevronUp, AlertTriangle, Package, Truck, Wrench } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import DeliveryPrerequisiteChecklist from './DeliveryPrerequisiteChecklist';

export default function DeliveryCard({ delivery, project, onStatusChange, onViewDetails, onEdit, onReceive }) {
  const [expanded, setExpanded] = useState(false);

  const date = delivery.confirmed_date || delivery.scheduled_date;
  const allBundles = delivery.line_items || [];
  const totalWeight = allBundles.reduce((sum, b) => sum + (b.weight_tons || 0), 0);
  const totalPieces = allBundles.reduce((sum, b) => sum + (b.piece_count || 0), 0);

  const statusColors = {
    draft: 'bg-gray-600',
    requested: 'bg-blue-600',
    confirmed: 'bg-blue-700',
    in_transit: 'bg-purple-600',
    arrived_on_site: 'bg-orange-600',
    partially_received: 'bg-yellow-600',
    received: 'bg-green-600',
    closed: 'bg-green-700',
    cancelled: 'bg-red-600'
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
      {/* Header */}
      <div 
        className="p-4 border-b border-zinc-800 cursor-pointer hover:bg-zinc-800/50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-lg font-bold text-amber-400">
                {delivery.delivery_number}
              </span>
              <Badge className={`${statusColors[delivery.delivery_status] || 'bg-gray-600'} text-white`}>
                {delivery.delivery_status}
              </Badge>
              {delivery.exceptions?.some(e => !e.resolved) && (
                <AlertTriangle size={16} className="text-red-500" />
              )}
            </div>
            <p className="text-base font-semibold text-white">
              {delivery.package_name}
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-zinc-400">
              <span>{project?.project_number}</span>
              <span>•</span>
              <span>{delivery.vendor_supplier || 'TBD'}</span>
              {delivery.gridlines_zone && (
                <>
                  <span>•</span>
                  <span className="text-amber-400">Zone: {delivery.gridlines_zone}</span>
                </>
              )}
            </div>
          </div>

          <div className="text-right">
            {date && (
              <div className="text-sm">
                <p className="font-bold text-white">
                  {format(parseISO(date), 'MMM d')}
                </p>
                <p className="text-xs text-zinc-500">
                  {delivery.confirmed_time_window || 'TBD'}
                </p>
              </div>
            )}
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex gap-4 mt-3 pt-3 border-t border-zinc-700/50">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Package size={14} />
            <span>{totalPieces} pieces</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Truck size={14} />
            <span>{totalWeight.toFixed(1)} tons</span>
          </div>
          {delivery.required_crane && (
            <div className="flex items-center gap-2 text-xs text-amber-400">
              <Wrench size={14} />
              <span>{delivery.required_crane}</span>
            </div>
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <>
          {/* Prerequisite Checklist */}
          <div className="p-4 border-b border-zinc-800">
            <DeliveryPrerequisiteChecklist delivery={delivery} onUpdate={(updates) => onStatusChange(delivery.id, updates)} />
          </div>

          {/* Bundles */}
          {allBundles.length > 0 && (
            <div className="p-4 border-b border-zinc-800">
              <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Package size={14} />
                BUNDLES ({allBundles.length})
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {allBundles.map((bundle, idx) => (
                  <div key={idx} className="bg-zinc-800/50 rounded p-2 text-xs">
                    <div className="flex justify-between">
                      <span className="font-mono font-bold text-amber-400">
                        {bundle.bundle_id || `Bundle ${idx + 1}`}
                      </span>
                      <span className="text-zinc-400">
                        {bundle.weight_tons}T • {bundle.piece_count} pcs
                      </span>
                    </div>
                    {bundle.piece_marks?.length > 0 && (
                      <p className="text-zinc-500 mt-1">
                        Pieces: {bundle.piece_marks.slice(0, 5).join(', ')}
                        {bundle.piece_marks.length > 5 ? ` +${bundle.piece_marks.length - 5}` : ''}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Core Info */}
          <div className="p-4 border-b border-zinc-800 grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-zinc-500 font-mono uppercase">Sequence</p>
              <p className="text-white font-bold">{delivery.erection_sequence || 'TBD'}</p>
            </div>
            <div>
              <p className="text-zinc-500 font-mono uppercase">Assigned Crew</p>
              <p className="text-white font-bold">{delivery.required_crew || 'TBD'}</p>
            </div>
            <div>
              <p className="text-zinc-500 font-mono uppercase">Laydown Area</p>
              <p className="text-white font-bold">{delivery.laydown_area || 'TBD'}</p>
            </div>
            <div>
              <p className="text-zinc-500 font-mono uppercase">Max Piece Length</p>
              <p className="text-white font-bold">{delivery.longest_piece_length || 'TBD'}</p>
            </div>
          </div>

          {/* Safety & Notes */}
          {delivery.handling_notes && (
            <div className="p-4 border-b border-zinc-800">
              <p className="text-xs text-zinc-500 font-mono uppercase mb-2">Handling Notes</p>
              <p className="text-sm text-zinc-300 bg-zinc-800/50 rounded p-2">
                {delivery.handling_notes}
              </p>
            </div>
          )}

          {/* Attachments */}
          {delivery.attachments?.length > 0 && (
            <div className="p-4 border-b border-zinc-800">
              <p className="text-xs text-zinc-500 font-mono uppercase mb-2">Docs</p>
              <div className="flex flex-wrap gap-2">
                {delivery.attachments.map((att, idx) => (
                  <a key={idx} href={att.file_url} target="_blank" rel="noopener noreferrer" className="text-xs bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded text-amber-400">
                    {att.file_name}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="p-4 flex gap-2 flex-wrap">
            {delivery.delivery_status === 'confirmed' && (
              <Button size="sm" variant="default" onClick={() => onStatusChange(delivery.id, 'in_transit')}>
                Mark In Transit
              </Button>
            )}
            {delivery.delivery_status === 'in_transit' && (
              <Button size="sm" variant="default" onClick={() => onStatusChange(delivery.id, 'arrived_on_site')}>
                Mark Arrived
              </Button>
            )}
            {['arrived_on_site', 'partially_received'].includes(delivery.delivery_status) && (
              <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700" onClick={onReceive}>
                Receive Items
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={onViewDetails}>
              Details
            </Button>
            <Button size="sm" variant="outline" onClick={onEdit}>
              Edit
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}