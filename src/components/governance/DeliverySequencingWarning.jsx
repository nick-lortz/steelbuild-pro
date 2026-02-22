import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Link as LinkIcon } from 'lucide-react';

export default function DeliverySequencingWarning({ workPackage, delivery }) {
  if (!delivery) return null;

  // Show warning if delivery is out of sequence
  if (delivery.sequencing_valid === false || !delivery.is_installable_delivery) {
    return (
      <Alert className="border-amber-800 bg-amber-900/30">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <AlertDescription>
          <div className="text-sm text-amber-200">
            <strong>Delivery Out of Sequence</strong>
            <p className="text-xs text-amber-300 mt-1">
              {delivery.delivery_number} is not installable. {delivery.sequencing_block_reasons?.[0] || 'See delivery details for reasons.'}
            </p>
            <a
              href={`#delivery-${delivery.id}`}
              className="text-xs text-amber-400 underline mt-1 inline-block"
            >
              View delivery details
            </a>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}