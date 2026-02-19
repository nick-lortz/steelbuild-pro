import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Navigation, Save, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { format, parseISO } from 'date-fns';

export default function LocationTracker({ delivery, onLocationUpdate }) {
  const [coords, setCoords] = useState({
    lat: delivery.current_location?.lat || '',
    lng: delivery.current_location?.lng || '',
    speed_mph: delivery.current_location?.speed_mph || 0
  });
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }

    setIsUpdating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          speed_mph: position.coords.speed ? (position.coords.speed * 2.237).toFixed(1) : 0 // m/s to mph
        });
        setIsUpdating(false);
        toast.success('Location captured');
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast.error('Failed to get location');
        setIsUpdating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSaveLocation = async () => {
    if (!coords.lat || !coords.lng) {
      toast.error('Latitude and longitude required');
      return;
    }

    setIsUpdating(true);
    try {
      const response = await base44.functions.invoke('updateDeliveryLocation', {
        delivery_id: delivery.id,
        lat: parseFloat(coords.lat),
        lng: parseFloat(coords.lng),
        speed_mph: parseFloat(coords.speed_mph) || 0,
        heading: 0
      });

      if (response.data.success) {
        toast.success('Location updated');
        onLocationUpdate();
      } else {
        toast.error('Failed to update location');
      }
    } catch (error) {
      console.error('Location update error:', error);
      toast.error('Failed to update location');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Navigation size={16} />
          GPS Location Update
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label className="text-xs">Latitude</Label>
            <Input
              type="number"
              step="0.000001"
              value={coords.lat}
              onChange={(e) => setCoords({ ...coords, lat: e.target.value })}
              className="bg-zinc-800 border-zinc-700 font-mono text-xs"
              placeholder="33.4484"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Longitude</Label>
            <Input
              type="number"
              step="0.000001"
              value={coords.lng}
              onChange={(e) => setCoords({ ...coords, lng: e.target.value })}
              className="bg-zinc-800 border-zinc-700 font-mono text-xs"
              placeholder="-112.0740"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Speed (mph)</Label>
            <Input
              type="number"
              value={coords.speed_mph}
              onChange={(e) => setCoords({ ...coords, speed_mph: e.target.value })}
              className="bg-zinc-800 border-zinc-700 font-mono text-xs"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleUseCurrentLocation}
            disabled={isUpdating}
            variant="outline"
            className="flex-1 border-zinc-700"
          >
            <MapPin size={14} className="mr-2" />
            {isUpdating ? 'Getting Location...' : 'Use My Location'}
          </Button>
          <Button
            onClick={handleSaveLocation}
            disabled={isUpdating || !coords.lat || !coords.lng}
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-black"
          >
            <Save size={14} className="mr-2" />
            Update Location
          </Button>
        </div>

        {delivery.current_location?.timestamp && (
          <div className="text-xs text-zinc-500 text-center">
            Last updated: {format(parseISO(delivery.current_location.timestamp), 'MMM d, h:mm a')}
          </div>
        )}

        {delivery.estimated_arrival && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded text-center">
            <div className="text-xs text-amber-400 uppercase tracking-wider mb-1">Estimated Arrival</div>
            <div className="text-sm font-bold text-white">
              {format(parseISO(delivery.estimated_arrival), 'h:mm a')}
            </div>
            {delivery.distance_remaining_miles && (
              <div className="text-xs text-zinc-400 mt-1">
                {delivery.distance_remaining_miles.toFixed(1)} mi remaining
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}