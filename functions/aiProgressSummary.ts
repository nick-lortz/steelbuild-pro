import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { project_id, period = 'week' } = await req.json();

    if (!project_id) {
      return Response.json({ error: 'project_id required' }, { status: 400 });
    }

    const projects = await base44.entities.Project.filter({ id: project_id });
    const project = projects[0];

    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
    }

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Fetch activity in period
    const [tasks, rfis, submittals, dailyLogs, changeOrders, deliveries] = await Promise.all([
      base44.entities.Task.filter({ project_id }),
      base44.entities.RFI.filter({ project_id }),
      base44.entities.Submittal.filter({ project_id }),
      base44.entities.DailyLog.filter({ 
        project_id,
        log_date: { $gte: startDateStr, $lte: endDateStr }
      }),
      base44.entities.ChangeOrder.filter({ project_id }),
      base44.entities.Delivery.filter({ project_id })
    ]);

    // Calculate metrics
    const completedTasks = tasks.filter(t => 
      t.status === 'completed' && 
      t.updated_date >= startDateStr && 
      t.updated_date <= endDateStr
    );

    const newRFIs = rfis.filter(r => r.submitted_date >= startDateStr && r.submitted_date <= endDateStr);
    const closedRFIs = rfis.filter(r => r.closed_date >= startDateStr && r.closed_date <= endDateStr);
    const approvedCOs = changeOrders.filter(co => 
      co.status === 'approved' && 
      co.approved_date >= startDateStr && 
      co.approved_date <= endDateStr
    );

    const recentDeliveries = deliveries.filter(d => 
      d.scheduled_date >= startDateStr && 
      d.scheduled_date <= endDateStr
    );

    const totalLabor = dailyLogs.reduce((sum, log) => sum + (log.hours_worked || 0), 0);
    const avgCrew = dailyLogs.length > 0 
      ? (dailyLogs.reduce((sum, log) => sum + (log.crew_count || 0), 0) / dailyLogs.length).toFixed(1)
      : 0;

    const safetyIncidents = dailyLogs.filter(log => log.safety_incidents).length;
    const weatherDelays = dailyLogs.filter(log => log.delays && log.delay_reason?.toLowerCase().includes('weather')).length;

    const overallProgress = tasks.length > 0 
      ? (tasks.reduce((sum, t) => sum + (t.progress_percent || 0), 0) / tasks.length).toFixed(1)
      : 0;

    const prompt = `Generate a concise executive progress summary for this steel construction project.

PROJECT: ${project.name}
Phase: ${project.phase}
Period: ${period === 'week' ? 'Last 7 Days' : 'Last 30 Days'}
Date Range: ${startDateStr} to ${endDateStr}

ACCOMPLISHMENTS:
- Tasks Completed: ${completedTasks.length} (${completedTasks.map(t => t.name).join(', ')})
- Overall Progress: ${overallProgress}%
- Labor Hours: ${totalLabor} hours (Avg Crew: ${avgCrew})
- Deliveries: ${recentDeliveries.length}

RFIs & SUBMITTALS:
- New RFIs: ${newRFIs.length}
- RFIs Closed: ${closedRFIs.length}
- Open RFIs: ${rfis.filter(r => r.status !== 'closed').length}
- Approved Change Orders: ${approvedCOs.length} (Total Impact: $${approvedCOs.reduce((sum, co) => sum + (co.cost_impact || 0), 0).toLocaleString()})

FIELD CONDITIONS:
- Days Logged: ${dailyLogs.length}
- Safety Incidents: ${safetyIncidents}
- Weather Delays: ${weatherDelays} days
- Recent Issues: ${dailyLogs.filter(l => l.delays).map(l => l.delay_reason).filter(Boolean).slice(0, 3).join('; ')}

KEY ACTIVITIES:
${dailyLogs.slice(0, 5).map(log => `${log.log_date}: ${log.work_performed || 'No details'}`).join('\n')}

Write a professional, direct summary suitable for client reporting or executive review. Focus on:
1. Key accomplishments and milestones
2. Current status vs plan
3. Issues resolved
4. Active challenges
5. Outlook and next steps

Return ONLY valid JSON:
{
  "summary": "string (2-3 paragraph executive summary)",
  "highlights": [
    {
      "category": "accomplishment|milestone|issue|risk",
      "title": "string",
      "description": "string"
    }
  ],
  "metrics": {
    "tasks_completed": number,
    "progress_percent": number,
    "labor_hours": number,
    "rfis_closed": number,
    "safety_record": "string"
  },
  "next_week_focus": ["string"],
  "concerns": ["string"],
  "client_ready": "string (1-2 paragraph version for client)"
}`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          highlights: {
            type: "array",
            items: {
              type: "object",
              properties: {
                category: { type: "string" },
                title: { type: "string" },
                description: { type: "string" }
              }
            }
          },
          metrics: {
            type: "object",
            properties: {
              tasks_completed: { type: "number" },
              progress_percent: { type: "number" },
              labor_hours: { type: "number" },
              rfis_closed: { type: "number" },
              safety_record: { type: "string" }
            }
          },
          next_week_focus: { type: "array", items: { type: "string" } },
          concerns: { type: "array", items: { type: "string" } },
          client_ready: { type: "string" }
        }
      }
    });

    return Response.json({
      success: true,
      report: response,
      period: { start: startDateStr, end: endDateStr },
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('AI Progress Summary Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});