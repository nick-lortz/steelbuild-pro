import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function StagingConfirmationControl({ delivery, onConfirmed }) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [location, setLocation] = useState(delivery?.staged_location || '');

  const isConfirmed = delivery?.staged_confirmed === true;
  const confirmedAt = delivery?.staged_confirmed_at ? new Date(delivery.staged_confirmed_at).toLocaleString() : null;
  const confirmedBy = delivery?.staged_confirmed_by;

  const handleConfirm = async () => {
    if (!location.trim()) {
      alert('Please specify staging location');
      return;
    }

    setIsConfirming(true);
    try {
      await base44.entities.Delivery.update(delivery.id, {
        staged_location: location,
        staged_confirmed: true,
        staged_confirmed_at: new Date().toISOString(),
        staged_confirmed_by: 'current_user_email' // Replace with actual user email
      });

      if (onConfirmed) {
        onConfirmed();
      }
    } catch (error) {
      console.error('Error confirming staging:', error);
      alert('Failed to confirm staging');
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Card className={`border ${isConfirmed ? 'border-green-900/30 bg-green-950/20' : 'border-amber-900/30 bg-amber-950/20'}`}>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          {isConfirmed ? (
            <CheckCircle2 className="w-4 h-4 text-green-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-400" />
          )}
          Staging Confirmation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isConfirmed ? (
          <div className="space-y-2">
            <div className="text-xs">
              <span className="text-gray-400">Location: </span>
              <span className="text-green-300 font-medium">{delivery.staged_location}</span>
            </div>
            {confirmedAt && (
              <div className="text-xs">
                <span className="text-gray-400">Confirmed: </span>
                <span className="text-green-300">{confirmedAt}</span>
              </div>
            )}
            {confirmedBy && (
              <div className="text-xs">
                <span className="text-gray-400">By: </span>
                <span className="text-green-300">{confirmedBy}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Staging Location</label>
              <Input
                type="text"
                placeholder="e.g., North Yard, Laydown Area A"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="bg-gray-900/50 border-gray-800 text-white text-sm"
              />
            </div>
            <Button
              onClick={handleConfirm}
              disabled={isConfirming}
              className="w-full bg-amber-700 hover:bg-amber-600"
              size="sm"
            >
              {isConfirming ? 'Confirming...' : 'Confirm Staging'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}