import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { format, subDays } from 'npm:date-fns@3.0.0';

/**
 * Seed realistic labor & equipment demo data for dashboard testing
 * Populates crews, labor entries, equipment logs across last 14 days
 * Safe: only creates if data doesn't exist
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { project_id } = await req.json();

    if (!project_id) {
      return Response.json({ error: 'project_id required' }, { status: 400 });
    }

    // Check if crews already exist
    const existingCrews = await base44.entities.Crew.filter({ project_id });
    if (existingCrews.length > 0) {
      return Response.json({ message: 'Crews already exist, skipping seed', existing_crews: existingCrews.length });
    }

    const today = new Date();

    // Create crews
    const crews = await base44.entities.Crew.bulkCreate([
      {
        project_id,
        crew_name: 'Erection Crew A',
        crew_lead: 'John Smith',
        crew_lead_phone: '(602) 555-0101',
        crew_type: 'erection',
        crew_size_planned: 6,
        crew_members: [
          { name: 'John Smith', role: 'Foreman', skills: ['bolting', 'rigging'] },
          { name: 'Mike Johnson', role: 'Lead Connector', skills: ['bolting', 'torque'] },
          { name: 'Carlos Rivera', role: 'Connector', skills: ['bolting'] },
          { name: 'David Lee', role: 'Connector', skills: ['bolting'] },
          { name: 'Tom Brady', role: 'Rigger', skills: ['rigging', 'signaling'] },
          { name: 'James Wilson', role: 'Laborer', skills: [] }
        ],
        status: 'active',
        start_date: format(subDays(today, 30), 'yyyy-MM-dd'),
        hourly_rate: 85
      },
      {
        project_id,
        crew_name: 'Bolting Crew B',
        crew_lead: 'Lisa Martinez',
        crew_lead_phone: '(602) 555-0102',
        crew_type: 'bolting',
        crew_size_planned: 4,
        crew_members: [
          { name: 'Lisa Martinez', role: 'Foreman', skills: ['bolting', 'torque'] },
          { name: 'Anthony Davis', role: 'Bolter', skills: ['bolting', 'torque'] },
          { name: 'Robert Kim', role: 'Bolter', skills: ['bolting', 'torque'] },
          { name: 'Frank Rodriguez', role: 'Laborer', skills: [] }
        ],
        status: 'active',
        start_date: format(subDays(today, 30), 'yyyy-MM-dd'),
        hourly_rate: 75
      },
      {
        project_id,
        crew_name: 'Welding Crew C',
        crew_lead: 'Patricia White',
        crew_lead_phone: '(602) 555-0103',
        crew_type: 'welding',
        crew_size_planned: 3,
        crew_members: [
          { name: 'Patricia White', role: 'Lead Welder', skills: ['AWS D1.1', 'structural'] },
          { name: 'George Brown', role: 'Welder', skills: ['AWS D1.1'] },
          { name: 'Sandra Hall', role: 'Welder', skills: ['AWS D1.1'] }
        ],
        status: 'active',
        start_date: format(subDays(today, 25), 'yyyy-MM-dd'),
        hourly_rate: 95
      }
    ]);

    // Create labor entries (last 14 days)
    const laborData = [];
    for (let i = 14; i >= 0; i--) {
      const workDate = subDays(today, i);
      const workDateStr = format(workDate, 'yyyy-MM-dd');
      const dayOfWeek = workDate.getDay();

      // Skip weekends
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      // Crew A - erection
      laborData.push({
        project_id,
        crew_id: crews[0].id,
        work_date: workDateStr,
        shift: 'day',
        crew_size: 5 + Math.floor(Math.random() * 2),
        crew_lead: 'John Smith',
        planned_hours: 8,
        actual_hours: 7 + Math.random() * 1.5,
        overtime_hours: Math.random() > 0.7 ? 2 : 0,
        productivity: {
          tons_installed: Math.floor(8 + Math.random() * 12),
          pieces_installed: Math.floor(15 + Math.random() * 10),
          bolts_torqued: Math.floor(80 + Math.random() * 40)
        },
        has_delay: Math.random() > 0.8,
        delay_reason: Math.random() > 0.8 ? 'waiting_steel' : null,
        delay_hours: Math.random() > 0.8 ? 1 : 0,
        weather: {
          condition: ['clear', 'cloudy'][Math.floor(Math.random() * 2)],
          temperature_high: 75 + Math.floor(Math.random() * 20),
          temperature_low: 65 + Math.floor(Math.random() * 10),
          wind_speed: 5 + Math.floor(Math.random() * 10)
        }
      });

      // Crew B - bolting
      laborData.push({
        project_id,
        crew_id: crews[1].id,
        work_date: workDateStr,
        shift: 'day',
        crew_size: 3 + Math.floor(Math.random() * 2),
        crew_lead: 'Lisa Martinez',
        planned_hours: 8,
        actual_hours: 7.5 + Math.random() * 0.5,
        overtime_hours: 0,
        productivity: {
          bolts_torqued: Math.floor(120 + Math.random() * 80)
        },
        has_delay: Math.random() > 0.85
      });

      // Crew C - welding (3x per week)
      if ([1, 3, 4].includes(dayOfWeek)) {
        laborData.push({
          project_id,
          crew_id: crews[2].id,
          work_date: workDateStr,
          shift: 'day',
          crew_size: 2 + Math.floor(Math.random() * 2),
          crew_lead: 'Patricia White',
          planned_hours: 8,
          actual_hours: 7 + Math.random() * 1,
          overtime_hours: Math.random() > 0.8 ? 1 : 0,
          productivity: {
            welds_completed: Math.floor(20 + Math.random() * 15)
          }
        });
      }
    }

    await base44.entities.LaborEntry.bulkCreate(laborData);

    // Create equipment & logs
    const equipmentLogs = [];
    for (let i = 12; i >= 0; i--) {
      const logDate = subDays(today, i);
      const logDateStr = format(logDate, 'yyyy-MM-dd');
      const dayOfWeek = logDate.getDay();

      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      // Mobile Crane
      equipmentLogs.push({
        project_id,
        equipment_id: 'Crane-01',
        equipment_type: 'mobile_crane',
        log_date: logDateStr,
        shift: 'day',
        assigned_crew_id: crews[0].id,
        operator_name: 'Mike Johnson',
        scheduled_start: `${logDateStr}T07:00:00Z`,
        scheduled_end: `${logDateStr}T15:30:00Z`,
        actual_start: `${logDateStr}T07:15:00Z`,
        actual_end: `${logDateStr}T15:15:00Z`,
        setup_time_hours: 1,
        productive_hours: 6.5 + Math.random() * 1,
        idle_hours: Math.random() * 1,
        idle_reason: Math.random() > 0.8 ? 'waiting_rigging' : null,
        crane_data: {
          capacity_tons: 80,
          max_reach_feet: 180,
          wind_speed_limit_mph: 35,
          pick_weight_tons: 12 + Math.random() * 15,
          weather_condition: 'clear'
        },
        inspection_completed: true
      });

      // Tower Crane
      if ([1, 2, 3, 4, 5].includes(dayOfWeek)) {
        equipmentLogs.push({
          project_id,
          equipment_id: 'Tower-Crane-A',
          equipment_type: 'tower_crane',
          log_date: logDateStr,
          shift: 'day',
          operator_name: 'Robert Kim',
          scheduled_start: `${logDateStr}T06:00:00Z`,
          scheduled_end: `${logDateStr}T16:00:00Z`,
          actual_start: `${logDateStr}T06:00:00Z`,
          actual_end: `${logDateStr}T16:00:00Z`,
          setup_time_hours: 0,
          productive_hours: 8 + Math.random() * 1.5,
          idle_hours: Math.random() * 0.5,
          crane_data: {
            capacity_tons: 150,
            max_reach_feet: 250,
            wind_speed_limit_mph: 40,
            pick_weight_tons: 20 + Math.random() * 30,
            weather_condition: 'clear'
          },
          inspection_completed: true
        });
      }

      // Forklift
      equipmentLogs.push({
        project_id,
        equipment_id: 'Forklift-02',
        equipment_type: 'forklift',
        log_date: logDateStr,
        shift: 'day',
        assigned_crew_id: crews[0].id,
        operator_name: 'James Wilson',
        productive_hours: 3 + Math.random() * 3,
        idle_hours: Math.random() * 1.5,
        inspection_completed: Math.random() > 0.1
      });
    }

    await base44.entities.EquipmentLog.bulkCreate(equipmentLogs);

    return Response.json({
      success: true,
      created: {
        crews: crews.length,
        labor_entries: laborData.length,
        equipment_logs: equipmentLogs.length
      },
      message: 'Demo data seeded successfully'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});