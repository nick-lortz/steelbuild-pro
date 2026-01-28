import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Package, Calendar, Truck, MapPin, Phone, Mail, Clock, 
  AlertTriangle, CheckCircle2, FileText, MessageSquare, 
  Activity, Edit, Trash2, Upload, Camera, Navigation 
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import StatusBadge from '@/components/ui/StatusBadge';
import LocationTracker from './LocationTracker';

export default function DeliveryDetailPanel({ 
  delivery, 
  project, 
  onEdit, 
  onDelete, 
  onStatusChange,
  onAddException,
  onReceiveItems 
}) {
  const [activeTab, setActiveTab] = useState('overview');

  const statusColors = {
    draft: 'bg-zinc-700',
    requested: 'bg-blue-500',
    confirmed: 'bg-green-500',
    in_transit: 'bg-amber-500',
    arrived_on_site: 'bg-purple-500',
    partially_received: 'bg-orange-500',
    received: 'bg-green-600',
    closed: 'bg-zinc-600',
    exception: 'bg-red-500',
    cancelled: 'bg-zinc-500'
  };

  const hasExceptions = delivery.exceptions?.some(e => !e.resolved);
  const totalWeight = delivery.line_items?.reduce((sum, item) => sum + (item.weight_tons || 0), 0) || delivery.weight_tons || 0;
  const totalPieces = delivery.line_items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || delivery.piece_count || 0;
  const receivedPieces = delivery.line_items?.reduce((sum, item) => sum + (item.received_quantity || 0), 0) || 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">{delivery.package_name}</h2>
            <StatusBadge status={delivery.delivery_status} />
            {hasExceptions && <Badge className="bg-red-500"><AlertTriangle size={12} className="mr-1" /> Issues</Badge>}
          </div>
          <p className="text-sm text-zinc-400 mt-1">{delivery.delivery_number}</p>
          <p className="text-sm text-zinc-400">{project?.name}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => onEdit(delivery)} className="border-zinc-700">
            <Edit size={14} className="mr-2" />
            Edit
          </Button>
          <Button size="sm" variant="outline" onClick={() => onDelete(delivery)} className="border-zinc-700 text-red-400 hover:text-red-300">
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="text-xs text-zinc-500 uppercase">Weight</div>
            <div className="text-xl font-bold text-white mt-1">{totalWeight.toFixed(1)}</div>
            <div className="text-xs text-zinc-500">tons</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="text-xs text-zinc-500 uppercase">Pieces</div>
            <div className="text-xl font-bold text-white mt-1">{totalPieces}</div>
            <div className="text-xs text-zinc-500">{receivedPieces > 0 ? `${receivedPieces} received` : 'total'}</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="text-xs text-zinc-500 uppercase">Scheduled</div>
            <div className="text-sm font-bold text-white mt-1">
              {delivery.confirmed_date ? format(parseISO(delivery.confirmed_date), 'MMM d, yyyy') : '-'}
            </div>
            <div className="text-xs text-zinc-500">{delivery.confirmed_time_window || ''}</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="text-xs text-zinc-500 uppercase">Priority</div>
            <div className="mt-2">
              <StatusBadge status={delivery.priority} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="items">Line Items ({delivery.line_items?.length || 0})</TabsTrigger>
          <TabsTrigger value="tracking">
            <Navigation size={14} className="mr-2" />
            GPS Tracking
          </TabsTrigger>
          <TabsTrigger value="exceptions">
            Exceptions ({delivery.exceptions?.filter(e => !e.resolved).length || 0})
          </TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-sm">Logistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-zinc-500 text-xs mb-1">Vendor/Supplier</div>
                  <div className="text-white">{delivery.vendor_supplier || '-'}</div>
                </div>
                <div>
                  <div className="text-zinc-500 text-xs mb-1">Carrier</div>
                  <div className="text-white">{delivery.carrier || '-'}</div>
                </div>
                <div>
                  <div className="text-zinc-500 text-xs mb-1">Ship From</div>
                  <div className="text-white">{delivery.ship_from_location || '-'}</div>
                </div>
                <div>
                  <div className="text-zinc-500 text-xs mb-1">Ship To</div>
                  <div className="text-white">{delivery.ship_to_location || '-'}</div>
                </div>
                <div>
                  <div className="text-zinc-500 text-xs mb-1">Tracking #</div>
                  <div className="text-white font-mono">{delivery.tracking_number || '-'}</div>
                </div>
                <div>
                  <div className="text-zinc-500 text-xs mb-1">PO #</div>
                  <div className="text-white font-mono">{delivery.po_number || '-'}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-sm">Site Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-zinc-500" />
                <span>{delivery.contact_phone || '-'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-zinc-500" />
                <span>{delivery.contact_email || '-'}</span>
              </div>
            </CardContent>
          </Card>

          {delivery.notes && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-sm">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-zinc-300 whitespace-pre-wrap">{delivery.notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="items" className="space-y-3">
          {delivery.line_items?.map((item, idx) => (
            <Card key={idx} className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium">{item.item_type || `Item ${idx + 1}`}</p>
                    <p className="text-xs text-zinc-400">{item.description}</p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm mt-3">
                  <div>
                    <div className="text-zinc-500 text-xs">Quantity</div>
                    <div className="text-white">{item.quantity} {item.unit}</div>
                  </div>
                  <div>
                    <div className="text-zinc-500 text-xs">Weight</div>
                    <div className="text-white">{item.weight_tons?.toFixed(2) || 0} tons</div>
                  </div>
                  <div>
                    <div className="text-zinc-500 text-xs">Received</div>
                    <div className="text-white">{item.received_quantity || 0} / {item.quantity}</div>
                  </div>
                </div>
                {item.drawing_reference && (
                  <div className="mt-2 text-xs text-zinc-400">
                    Drawing: {item.drawing_reference}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {(!delivery.line_items || delivery.line_items.length === 0) && (
            <div className="text-center py-12 text-zinc-500">
              <Package size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No line items</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="tracking" className="space-y-4">
          {delivery.delivery_status === 'in_transit' || delivery.delivery_status === 'confirmed' ? (
            <LocationTracker 
              delivery={delivery} 
              onLocationUpdate={() => {
                // Trigger refresh
                if (onEdit) onEdit(delivery);
              }}
            />
          ) : (
            <div className="text-center py-8 text-zinc-500">
              <Navigation size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">GPS tracking available when delivery is in transit</p>
            </div>
          )}

          {delivery.location_history && delivery.location_history.length > 0 && (
            <Card className="bg-zinc-800 border-zinc-700">
              <CardHeader>
                <CardTitle className="text-sm">Location History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {delivery.location_history.slice(-10).reverse().map((loc, idx) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <span className="text-zinc-400 font-mono">
                        {loc.lat.toFixed(6)}, {loc.lng.toFixed(6)}
                      </span>
                      <span className="text-zinc-500">
                        {format(parseISO(loc.timestamp), 'h:mm a')}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="exceptions" className="space-y-3">
          {delivery.exceptions?.map((exception, idx) => (
            <Card key={idx} className={`border-2 ${exception.resolved ? 'bg-zinc-900 border-zinc-800' : 'bg-red-950/20 border-red-500/40'}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {exception.resolved ? (
                      <CheckCircle2 size={16} className="text-green-500" />
                    ) : (
                      <AlertTriangle size={16} className="text-red-500" />
                    )}
                    <Badge className={exception.resolved ? 'bg-zinc-700' : 'bg-red-500'}>
                      {exception.exception_type?.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                  <span className="text-xs text-zinc-500">
                    {exception.created_date && format(parseISO(exception.created_date), 'MMM d, h:mm a')}
                  </span>
                </div>
                <p className="text-sm text-white mb-2">{exception.description}</p>
                {exception.resolution_owner && (
                  <div className="text-xs text-zinc-400">Owner: {exception.resolution_owner}</div>
                )}
                {exception.resolved && exception.resolution_notes && (
                  <div className="mt-2 p-2 bg-zinc-800 rounded text-xs">
                    <div className="text-green-400 mb-1">Resolved:</div>
                    <div className="text-zinc-300">{exception.resolution_notes}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {(!delivery.exceptions || delivery.exceptions.length === 0) && (
            <div className="text-center py-12 text-zinc-500">
              <CheckCircle2 size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No exceptions reported</p>
            </div>
          )}

          <Button
            onClick={onAddException}
            variant="outline"
            className="w-full border-red-500 text-red-400 hover:bg-red-500/10"
          >
            <AlertTriangle size={14} className="mr-2" />
            Report Exception
          </Button>
        </TabsContent>

        <TabsContent value="activity" className="space-y-3">
          {delivery.activity_log?.map((log, idx) => (
            <div key={idx} className="flex gap-3 text-sm">
              <Activity size={16} className="text-zinc-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-white">{log.action}</p>
                <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
                  <span>{log.user}</span>
                  <span>•</span>
                  <span>{log.timestamp && format(parseISO(log.timestamp), 'MMM d, h:mm a')}</span>
                </div>
              </div>
            </div>
          ))}

          {(!delivery.activity_log || delivery.activity_log.length === 0) && (
            <div className="text-center py-12 text-zinc-500">
              <Activity size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No activity yet</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      {delivery.delivery_status !== 'closed' && delivery.delivery_status !== 'cancelled' && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {delivery.delivery_status === 'confirmed' && (
              <Button 
                onClick={() => onStatusChange(delivery.id, 'in_transit')}
                className="w-full bg-amber-500 hover:bg-amber-600 text-black"
              >
                <Truck size={14} className="mr-2" />
                Mark In Transit
              </Button>
            )}
            {delivery.delivery_status === 'in_transit' && (
              <Button 
                onClick={() => onStatusChange(delivery.id, 'arrived_on_site')}
                className="w-full bg-purple-500 hover:bg-purple-600 text-white"
              >
                <MapPin size={14} className="mr-2" />
                Mark Arrived
              </Button>
            )}
            {(delivery.delivery_status === 'arrived_on_site' || delivery.delivery_status === 'partially_received') && (
              <Button 
                onClick={onReceiveItems}
                className="w-full bg-green-500 hover:bg-green-600 text-white"
              >
                <CheckCircle2 size={14} className="mr-2" />
                Receive Items
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}