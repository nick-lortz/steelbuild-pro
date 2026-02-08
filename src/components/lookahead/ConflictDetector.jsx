import { useMemo } from 'react';

export default function ConflictDetector({ crews, equipment, deliveries, tasks, laborEntries, equipmentLogs }) {
  const conflicts = useMemo(() => {
    const flagged = [];

    // 1. Crews without equipment
    if (crews && equipment) {
      crews.forEach(crew => {
        const crewHasEquip = equipment.some(eq => eq.assigned_crew_id === crew.id);
        if (!crewHasEquip && crew.status === 'active') {
          flagged.push({
            severity: 'warning',
            type: 'crew_unequipped',
            crew_id: crew.id,
            label: `${crew.crew_name}: No equipment assigned`,
            date: crew.start_date
          });
        }
      });
    }

    // 2. Equipment without crew
    if (equipment) {
      equipment.forEach(eq => {
        const equipmentLogs_today = equipmentLogs?.filter(log => 
          log.equipment_id === eq.id && log.productive_hours > 0
        ) || [];
        
        if (equipmentLogs_today.length > 0 && !eq.assigned_crew_id) {
          flagged.push({
            severity: 'warning',
            type: 'equipment_uncrew',
            equipment_id: eq.id,
            label: `${eq.equipment_id}: Operating without assigned crew`,
            date: equipmentLogs_today[0]?.log_date
          });
        }
      });
    }

    // 3. Crane capacity overload
    if (equipment) {
      equipment.forEach(eq => {
        if (eq.equipment_type?.includes('crane') && eq.crane_data) {
          const pick = parseFloat(eq.crane_data.pick_weight_tons) || 0;
          const capacity = parseFloat(eq.crane_data.capacity_tons) || 0;
          
          if (pick > capacity) {
            flagged.push({
              severity: 'critical',
              type: 'crane_overload',
              equipment_id: eq.id,
              label: `${eq.equipment_id}: Pick (${pick}T) exceeds capacity (${capacity}T)`,
              date: eq.log_date
            });
          }
        }
      });
    }

    // 4. Labor before material arrives
    if (laborEntries && deliveries) {
      const activeLabor = laborEntries.filter(l => l.actual_hours > 0);
      
      activeLabor.forEach(labor => {
        const laborDate = new Date(labor.work_date);
        const relevantDeliveries = deliveries.filter(d => {
          const delDate = new Date(d.scheduled_date);
          return delDate > laborDate && (d.delivery_status === 'requested' || d.delivery_status === 'confirmed');
        });

        if (relevantDeliveries.length > 0) {
          const firstDelDate = new Date(Math.min(...relevantDeliveries.map(d => new Date(d.scheduled_date))));
          const daysGap = Math.ceil((firstDelDate - laborDate) / (1000 * 60 * 60 * 24));
          
          if (daysGap > 0 && daysGap <= 7) {
            flagged.push({
              severity: 'warning',
              type: 'labor_material_gap',
              crew_id: labor.crew_id,
              label: `${labor.crew_id}: Labor scheduled ${daysGap} day${daysGap > 1 ? 's' : ''} before material arrival`,
              date: labor.work_date
            });
          }
        }
      });
    }

    // 5. Too many cranes for one sequence
    if (equipment && tasks) {
      const cranesBySequence = {};
      equipment.forEach(eq => {
        if (eq.equipment_type?.includes('crane') && eq.erection_sequence) {
          if (!cranesBySequence[eq.erection_sequence]) cranesBySequence[eq.erection_sequence] = [];
          cranesBySequence[eq.erection_sequence].push(eq);
        }
      });

      Object.entries(cranesBySequence).forEach(([seq, cranes]) => {
        if (cranes.length > 2) {
          flagged.push({
            severity: 'info',
            type: 'crane_concentration',
            label: `Sequence ${seq}: ${cranes.length} cranes assigned (consider split)`,
            date: cranes[0]?.log_date
          });
        }
      });
    }

    return flagged;
  }, [crews, equipment, deliveries, tasks, laborEntries, equipmentLogs]);

  return conflicts;
}