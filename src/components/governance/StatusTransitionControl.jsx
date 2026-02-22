import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import TransitionBlockedModal from './TransitionBlockedModal';

const WP_STATUSES = ['not_started', 'in_progress', 'on_hold', 'completed', 'closed'];
const DELIVERY_STATUSES = ['draft', 'requested', 'confirmed', 'in_transit', 'arrived_on_site', 'partially_received', 'received', 'closed'];

export default function StatusTransitionControl({ entity, entityType, onSuccess }) {
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [blockedModal, setBlockedModal] = useState(null);

  const statuses = entityType === 'WorkPackage' ? WP_STATUSES : DELIVERY_STATUSES;
  const currentStatus = entity?.status || entity?.delivery_status;
  const availableStatuses = statuses.filter(s => s !== currentStatus);
  const isWP = entityType === 'WorkPackage';
  const funcName = isWP ? 'transitionWorkPackage' : 'transitionDelivery';
  const idField = isWP ? 'work_package_id' : 'delivery_id';

  const handleTransition = async () => {
    if (!selectedStatus) return;

    setIsTransitioning(true);
    try {
      const response = await base44.functions.invoke(funcName, {
        [idField]: entity.id,
        target_status: selectedStatus
      });

      if (response.data.ok) {
        // Success
        if (onSuccess) onSuccess();
      } else {
        // Blocked - show modal
        setBlockedModal({
          ok: false,
          reasons: response.data.reasons,
          recommendations: response.data.recommendations,
          entity_type: entityType,
          entity_name: entity.wpid || entity.delivery_number || entity.id
        });
      }
      setSelectedStatus('');
    } catch (error) {
      console.error('Transition error:', error);
      setBlockedModal({
        ok: false,
        reasons: [`Error: ${error.message}`],
        recommendations: ['Check the transition details and try again'],
        entity_type: entityType,
        entity_name: entity.wpid || entity.delivery_number || entity.id
      });
    } finally {
      setIsTransitioning(false);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-40 bg-gray-900/50 border-gray-800 text-white text-sm">
            <SelectValue placeholder="Change status to..." />
          </SelectTrigger>
          <SelectContent>
            {availableStatuses.map(status => (
              <SelectItem key={status} value={status}>
                {status.replace(/_/g, ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          onClick={handleTransition}
          disabled={!selectedStatus || isTransitioning}
          className="bg-amber-700 hover:bg-amber-600"
          size="sm"
        >
          {isTransitioning ? 'Checking...' : 'Apply'}
        </Button>
      </div>

      <TransitionBlockedModal
        isOpen={!!blockedModal}
        onOpenChange={(open) => !open && setBlockedModal(null)}
        transition={blockedModal}
      />
    </>
  );
}