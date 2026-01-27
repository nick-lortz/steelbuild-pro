import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { changeOrderData, projectId } = await req.json();

    // Fetch historical change orders for ML analysis
    const [historicalCOs, project, tasks, financials, workPackages] = await Promise.all([
      base44.entities.ChangeOrder.filter({ status: 'approved' }),
      base44.entities.Project.filter({ id: projectId }).then(r => r[0]),
      base44.entities.Task.filter({ project_id: projectId }),
      base44.entities.Financial.filter({ project_id: projectId }),
      base44.entities.WorkPackage.filter({ project_id: projectId })
    ]);

    // Build AI prompt with historical data
    const prompt = `You are analyzing a proposed change order for a structural steel project.

PROJECT CONTEXT:
- Contract Value: $${project.contract_value?.toLocaleString() || 'N/A'}
- Current Phase: ${project.phase}
- Status: ${project.status}
- Active Tasks: ${tasks.filter(t => t.status === 'in_progress').length}
- Schedule Health: ${tasks.filter(t => t.status === 'completed').length}/${tasks.length} tasks complete

PROPOSED CHANGE ORDER:
- Title: ${changeOrderData.title}
- Description: ${changeOrderData.description}
- Estimated Cost Impact: $${changeOrderData.cost_impact?.toLocaleString() || 0}
- Estimated Schedule Impact: ${changeOrderData.schedule_impact_days || 0} days

HISTORICAL DATA (Last 20 Approved COs):
${historicalCOs.slice(-20).map((co, i) => 
  `${i+1}. "${co.title}" - Cost: $${co.cost_impact?.toLocaleString() || 0}, Schedule: ${co.schedule_impact_days || 0} days`
).join('\n')}

TASK ANALYSIS:
- Total Tasks: ${tasks.length}
- Critical Path Tasks: ${tasks.filter(t => t.is_critical).length}
- Overdue Tasks: ${tasks.filter(t => t.end_date && new Date(t.end_date) < new Date() && t.status !== 'completed').length}

BUDGET STATUS:
- Total Budget: $${financials.reduce((sum, f) => sum + (f.current_budget || 0), 0).toLocaleString()}
- Actual Costs: $${financials.reduce((sum, f) => sum + (f.actual_amount || 0), 0).toLocaleString()}

Based on this data, provide a JSON response with:
1. predicted_cost_impact: realistic cost estimate (number)
2. predicted_schedule_impact: realistic schedule delay in days (number)
3. confidence_level: high/medium/low
4. risk_factors: array of specific risks this CO introduces
5. affected_areas: array of project areas/phases impacted
6. mitigation_strategies: array of recommended actions
7. approval_recommendation: approve/conditional/reject with reasoning
8. similar_historical_cos: array of 2-3 similar past COs with outcomes

Be specific to structural steel construction. Consider:
- Drawing revisions and detailing impact
- Fabrication delays and shop capacity
- Material lead times and procurement
- Field crew availability and sequencing
- Subcontractor coordination
- Inspection and approval cycles`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          predicted_cost_impact: { type: 'number' },
          predicted_schedule_impact: { type: 'number' },
          confidence_level: { type: 'string', enum: ['high', 'medium', 'low'] },
          risk_factors: { type: 'array', items: { type: 'string' } },
          affected_areas: { type: 'array', items: { type: 'string' } },
          mitigation_strategies: { type: 'array', items: { type: 'string' } },
          approval_recommendation: { type: 'string' },
          reasoning: { type: 'string' },
          similar_historical_cos: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                actual_cost: { type: 'number' },
                actual_schedule: { type: 'number' },
                outcome: { type: 'string' }
              }
            }
          }
        },
        required: ['predicted_cost_impact', 'predicted_schedule_impact', 'confidence_level', 'risk_factors']
      }
    });

    return Response.json({
      success: true,
      analysis: response,
      historical_context: {
        total_cos: historicalCOs.length,
        avg_cost_impact: historicalCOs.reduce((sum, co) => sum + (co.cost_impact || 0), 0) / historicalCOs.length,
        avg_schedule_impact: historicalCOs.reduce((sum, co) => sum + (co.schedule_impact_days || 0), 0) / historicalCOs.length
      }
    });

  } catch (error) {
    console.error('Change order analysis error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});