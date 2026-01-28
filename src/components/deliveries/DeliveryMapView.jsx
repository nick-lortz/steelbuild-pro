import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Truck, Navigation, Clock, AlertTriangle } from 'lucide-react';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import StatusBadge from '@/components/ui/StatusBadge';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons
const createCustomIcon = (color, icon) => L.divIcon({
  className: 'custom-marker',
  html: `<div style="background-color: ${color}; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
    <span style="color: white; font-size: 16px;">${icon}</span>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

const truckIcon = createCustomIcon('#f59e0b', '🚚');
const siteIcon = createCustomIcon('#10b981', '📍');
const originIcon = createCustomIcon('#6b7280', '🏭');

function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || 10);
    }
  }, [center, zoom, map]);
  return null;
}

export default function DeliveryMapView({ deliveries, projects, onSelectDelivery }) {
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [mapCenter, setMapCenter] = useState([39.8283, -98.5795]); // Center of US
  const [mapZoom, setMapZoom] = useState(4);

  // Filter deliveries with location data
  const trackableDeliveries = useMemo(() => {
    return deliveries.filter(d => 
      (d.current_location?.lat && d.current_location?.lng) ||
      (d.ship_to_coords?.lat && d.ship_to_coords?.lng)
    );
  }, [deliveries]);

  // Auto-center on first trackable delivery
  useEffect(() => {
    if (trackableDeliveries.length > 0) {
      const firstDelivery = trackableDeliveries[0];
      if (firstDelivery.current_location?.lat) {
        setMapCenter([firstDelivery.current_location.lat, firstDelivery.current_location.lng]);
        setMapZoom(10);
      } else if (firstDelivery.ship_to_coords?.lat) {
        setMapCenter([firstDelivery.ship_to_coords.lat, firstDelivery.ship_to_coords.lng]);
        setMapZoom(10);
      }
    }
  }, [trackableDeliveries]);

  const inTransitDeliveries = trackableDeliveries.filter(d => 
    d.delivery_status === 'in_transit' && d.current_location?.lat
  );

  const calculateETA = (delivery) => {
    if (!delivery.estimated_arrival) return null;
    const eta = parseISO(delivery.estimated_arrival);
    const minutesAway = differenceInMinutes(eta, new Date());
    
    if (minutesAway < 0) return 'Delayed';
    if (minutesAway < 60) return `${minutesAway}min`;
    const hours = Math.floor(minutesAway / 60);
    const mins = minutesAway % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Map */}
      <div className="lg:col-span-2">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin size={16} />
              Live Delivery Tracking
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[600px] relative">
              <MapContainer
                center={mapCenter}
                zoom={mapZoom}
                style={{ height: '100%', width: '100%' }}
                className="rounded-b-lg"
              >
                <MapController center={mapCenter} zoom={mapZoom} />
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />

                {/* Render delivery markers */}
                {trackableDeliveries.map(delivery => {
                  const project = projects.find(p => p.id === delivery.project_id);

                  // Current location (in transit)
                  if (delivery.current_location?.lat && delivery.delivery_status === 'in_transit') {
                    return (
                      <Marker
                        key={`current-${delivery.id}`}
                        position={[delivery.current_location.lat, delivery.current_location.lng]}
                        icon={truckIcon}
                        eventHandlers={{
                          click: () => {
                            setSelectedDelivery(delivery);
                            onSelectDelivery(delivery);
                          }
                        }}
                      >
                        <Popup>
                          <div className="text-sm">
                            <p className="font-bold">{delivery.package_name}</p>
                            <p className="text-xs text-gray-600">{project?.name}</p>
                            <p className="text-xs mt-1">
                              <strong>Status:</strong> In Transit
                            </p>
                            {delivery.estimated_arrival && (
                              <p className="text-xs">
                                <strong>ETA:</strong> {calculateETA(delivery)}
                              </p>
                            )}
                            {delivery.current_location.speed_mph && (
                              <p className="text-xs">
                                <strong>Speed:</strong> {delivery.current_location.speed_mph} mph
                              </p>
                            )}
                          </div>
                        </Popup>
                      </Marker>
                    );
                  }

                  // Destination marker
                  if (delivery.ship_to_coords?.lat) {
                    return (
                      <Marker
                        key={`dest-${delivery.id}`}
                        position={[delivery.ship_to_coords.lat, delivery.ship_to_coords.lng]}
                        icon={siteIcon}
                        eventHandlers={{
                          click: () => {
                            setSelectedDelivery(delivery);
                            onSelectDelivery(delivery);
                          }
                        }}
                      >
                        <Popup>
                          <div className="text-sm">
                            <p className="font-bold">{delivery.package_name}</p>
                            <p className="text-xs text-gray-600">{project?.name}</p>
                            <p className="text-xs mt-1">
                              <strong>Status:</strong> {delivery.delivery_status}
                            </p>
                            <p className="text-xs">
                              <strong>Location:</strong> {delivery.ship_to_location}
                            </p>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  }

                  return null;
                })}

                {/* Draw route for in-transit deliveries */}
                {trackableDeliveries.map(delivery => {
                  if (delivery.current_location?.lat && delivery.ship_to_coords?.lat && delivery.delivery_status === 'in_transit') {
                    return (
                      <Polyline
                        key={`route-${delivery.id}`}
                        positions={[
                          [delivery.current_location.lat, delivery.current_location.lng],
                          [delivery.ship_to_coords.lat, delivery.ship_to_coords.lng]
                        ]}
                        color="#f59e0b"
                        weight={3}
                        dashArray="10, 10"
                      />
                    );
                  }
                  return null;
                })}
              </MapContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar - Active Deliveries */}
      <div className="space-y-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm">In Transit ({inTransitDeliveries.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[560px] overflow-y-auto">
            {inTransitDeliveries.map(delivery => {
              const eta = calculateETA(delivery);
              const project = projects.find(p => p.id === delivery.project_id);
              
              return (
                <div
                  key={delivery.id}
                  onClick={() => {
                    if (delivery.current_location?.lat) {
                      setMapCenter([delivery.current_location.lat, delivery.current_location.lng]);
                      setMapZoom(12);
                    }
                    onSelectDelivery(delivery);
                  }}
                  className="p-3 bg-zinc-800 rounded-lg hover:bg-zinc-700 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{delivery.package_name}</p>
                      <p className="text-xs text-zinc-400">{project?.name}</p>
                    </div>
                    {eta && (
                      <Badge className={
                        eta === 'Delayed' ? 'bg-red-500' :
                        eta.includes('min') ? 'bg-green-500' :
                        'bg-amber-500'
                      }>
                        {eta}
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1 text-xs">
                    {delivery.carrier && (
                      <div className="flex items-center gap-2 text-zinc-400">
                        <Truck size={12} />
                        {delivery.carrier}
                      </div>
                    )}
                    {delivery.ship_to_location && (
                      <div className="flex items-center gap-2 text-zinc-400">
                        <MapPin size={12} />
                        {delivery.ship_to_location}
                      </div>
                    )}
                    {delivery.current_location?.timestamp && (
                      <div className="flex items-center gap-2 text-zinc-500">
                        <Clock size={12} />
                        Updated {format(parseISO(delivery.current_location.timestamp), 'h:mm a')}
                      </div>
                    )}
                    {delivery.distance_remaining_miles && (
                      <div className="text-zinc-400">
                        {delivery.distance_remaining_miles.toFixed(1)} mi remaining
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {inTransitDeliveries.length === 0 && (
              <div className="text-center py-8 text-zinc-500">
                <Truck size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-xs">No active deliveries in transit</p>
              </div>
            )}
          </CardContent>
        </Card>

        {trackableDeliveries.length === 0 && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-6 text-center">
              <MapPin size={32} className="mx-auto text-zinc-700 mb-3" />
              <p className="text-sm text-zinc-400 mb-2">No GPS data available</p>
              <p className="text-xs text-zinc-600">Location tracking will appear when deliveries are in transit</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}