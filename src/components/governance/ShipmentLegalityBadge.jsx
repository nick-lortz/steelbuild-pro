import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

export default function ShipmentLegalityBadge({ delivery }) {
  if (!delivery) return null;

  const safeToShip = delivery.is_safe_to_ship !== false;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-gray-400">Shipment Legality:</span>
        {safeToShip ? (
          <Badge className="bg-green-900 text-green-200 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            SAFE TO SHIP
          </Badge>
        ) : (
          <Badge className="bg-red-900 text-red-200 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            BLOCKED
          </Badge>
        )}
      </div>

      {!safeToShip && delivery.ship_block_reasons && delivery.ship_block_reasons.length > 0 && (
        <Card className="border-red-900/30 bg-red-950/20">
          <CardContent className="pt-3">
            <div className="text-xs space-y-1">
              {delivery.ship_block_reasons.map((reason, idx) => (
                <div key={idx} className="text-red-300">
                  • {reason}
                </div>
              ))}
            </div>
            {delivery.delivery_contains_non_install_ready && (
              <div className="mt-2 pt-2 border-t border-red-800/50 text-xs text-red-300">
                Contains WP(s) not install-ready
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}