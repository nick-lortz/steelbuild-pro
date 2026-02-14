import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { project_id } = await req.json();

        if (!project_id) {
            return Response.json({ error: 'project_id required' }, { status: 400 });
        }

        // Fetch all project data
        const [project, tasks, rfis, changeOrders, financials, drawingSets] = await Promise.all([
            base44.entities.Project.filter({ id: project_id }).then(p => p[0]),
            base44.entities.Task.filter({ project_id }),
            base44.entities.RFI.filter({ project_id }),
            base44.entities.ChangeOrder.filter({ project_id }),
            base44.entities.Financial.filter({ project_id }),
            base44.entities.DrawingSet.filter({ project_id })
        ]);

        if (!project) {
            return Response.json({ error: 'Project not found' }, { status: 404 });
        }

        // Prepare data summary
        const today = new Date().toISOString().split('T')[0];
        const completedTasks = tasks.filter(t => t.status === 'completed').length;
        const overdueTasks = tasks.filter(t => t.status !== 'completed' && t.end_date && t.end_date < today).length;
        const openRFIs = rfis.filter(r => !['answered', 'closed'].includes(r.status)).length;
        const criticalRFIs = rfis.filter(r => r.priority === 'critical').length;
        const pendingCOs = changeOrders.filter(c => c.status === 'submitted' || c.status === 'under_review').length;
        
        const budget = financials.reduce((sum, f) => sum + (f.current_budget || 0), 0);
        const actual = financials.reduce((sum, f) => sum + (f.actual_amount || 0), 0);
        const variance = budget - actual;
        
        const releasedDrawings = drawingSets.filter(d => d.status === 'FFF' || d.released_for_fab_date).length;
        const pendingDrawings = drawingSets.filter(d => ['IFA', 'BFA'].includes(d.status)).length;

        const prompt = `You are a steel fabrication and erection project manager. Analyze this project and provide a concise executive summary.

Project: ${project.name} (${project.project_number})
Status: ${project.status}
Phase: ${project.phase}
Contract Value: $${project.contract_value?.toLocaleString() || '0'}
Start: ${project.start_date || 'TBD'}
Target Completion: ${project.target_completion || 'TBD'}

Schedule:
- Total Tasks: ${tasks.length}
- Completed: ${completedTasks} (${tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0}%)
- Overdue: ${overdueTasks}

Financials:
- Budget: $${budget.toFixed(0)}
- Actual: $${actual.toFixed(0)}
- Variance: $${variance.toFixed(0)} (${budget > 0 ? ((variance / budget) * 100).toFixed(1) : 0}%)

RFIs:
- Open: ${openRFIs}
- Critical: ${criticalRFIs}

Change Orders:
- Pending: ${pendingCOs}
- Total Cost Impact: $${changeOrders.reduce((sum, c) => sum + (c.cost_impact || 0), 0).toFixed(0)}

Drawings:
- Released for Fab: ${releasedDrawings}
- Pending Approval: ${pendingDrawings}

Provide a brief executive summary (2-3 sentences) covering:
1. Overall project status
2. Top 2-3 risk factors (schedule delays, budget overruns, fabrication holds, RFI blockers)
3. Key action items or focus areas

Keep it direct and jobsite-focused. Use steel industry terminology.`;

        const aiResponse = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    executive_summary: { type: "string" },
                    risk_factors: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                category: { type: "string" },
                                description: { type: "string" },
                                severity: { type: "string", enum: ["low", "medium", "high", "critical"] }
                            }
                        }
                    },
                    action_items: {
                        type: "array",
                        items: { type: "string" }
                    },
                    health_score: { type: "number", description: "0-100" }
                }
            }
        });

        return Response.json({
            summary: aiResponse.executive_summary,
            risk_factors: aiResponse.risk_factors,
            action_items: aiResponse.action_items,
            health_score: aiResponse.health_score,
            generated_at: new Date().toISOString()
        });

    } catch (error) {
        console.error("Error generating AI summary:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});