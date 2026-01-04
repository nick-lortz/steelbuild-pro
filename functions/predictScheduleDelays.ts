import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { project_id } = await req.json();

    // Fetch all data needed for analysis
    const [allTasks, currentProjectTasks, resources, project] = await Promise.all([
      base44.entities.Task.list(),
      base44.entities.Task.filter({ project_id }),
      base44.entities.Resource.list(),
      base44.entities.Project.list().then(p => p.find(pr => pr.id === project_id))
    ]);

    // Calculate historical delay patterns by phase and task type
    const completedTasks = allTasks.filter(t => 
      t.status === 'completed' && 
      t.start_date && 
      t.end_date && 
      t.actual_completion_date
    );

    const delayPatterns = {};
    completedTasks.forEach(task => {
      const key = `${task.phase}_${task.labor_category_id || 'general'}`;
      const planned = new Date(task.end_date);
      const actual = new Date(task.actual_completion_date || task.end_date);
      const delayDays = Math.round((actual - planned) / (1000 * 60 * 60 * 24));
      
      if (!delayPatterns[key]) {
        delayPatterns[key] = { delays: [], count: 0 };
      }
      delayPatterns[key].delays.push(delayDays);
      delayPatterns[key].count++;
    });

    // Calculate average delay and variance for each pattern
    const delayStats = {};
    Object.keys(delayPatterns).forEach(key => {
      const delays = delayPatterns[key].delays;
      const avg = delays.reduce((sum, d) => sum + d, 0) / delays.length;
      const variance = delays.reduce((sum, d) => sum + Math.pow(d - avg, 2), 0) / delays.length;
      delayStats[key] = {
        avgDelay: avg,
        stdDev: Math.sqrt(variance),
        sampleSize: delays.length
      };
    });

    // Analyze resource availability
    const assignedResources = resources.filter(r => r.status === 'assigned' && r.current_project_id !== project_id);
    const availableResources = resources.filter(r => r.status === 'available');
    const resourceUtilization = assignedResources.length / Math.max(resources.length, 1);

    // Predict delays for active/upcoming tasks
    const predictions = currentProjectTasks
      .filter(t => ['not_started', 'in_progress'].includes(t.status))
      .map(task => {
        const key = `${task.phase}_${task.labor_category_id || 'general'}`;
        const stats = delayStats[key];
        
        // Base prediction from historical data
        let predictedDelay = stats?.avgDelay || 0;
        let confidence = 0;
        
        if (stats) {
          // Confidence based on sample size and variance
          const sizeScore = Math.min(stats.sampleSize / 10, 1); // Max confidence at 10+ samples
          const varianceScore = 1 / (1 + stats.stdDev / 5); // Lower variance = higher confidence
          confidence = (sizeScore + varianceScore) / 2;
        }

        // Adjust for resource constraints
        if (resourceUtilization > 0.8) {
          predictedDelay += 2; // High utilization adds 2 days
          confidence *= 0.9;
        }

        // Adjust for task dependencies
        const predecessorCount = task.predecessor_ids?.length || 0;
        if (predecessorCount > 3) {
          predictedDelay += predecessorCount * 0.5;
          confidence *= 0.85;
        }

        // Adjust for overdue predecessors
        const predecessors = allTasks.filter(t => task.predecessor_ids?.includes(t.id));
        const overduePredecessors = predecessors.filter(p => {
          if (p.status === 'completed') return false;
          return p.end_date && new Date(p.end_date) < new Date();
        });
        if (overduePredecessors.length > 0) {
          predictedDelay += overduePredecessors.length * 3;
          confidence *= 0.8;
        }

        // RFI/CO impact
        const linkedRFIs = task.linked_rfi_ids?.length || 0;
        const linkedCOs = task.linked_co_ids?.length || 0;
        if (linkedRFIs > 0) {
          predictedDelay += linkedRFIs * 2;
          confidence *= 0.85;
        }
        if (linkedCOs > 0) {
          predictedDelay += linkedCOs * 1.5;
          confidence *= 0.9;
        }

        // Drawing dependency check
        if (task.linked_drawing_set_ids?.length > 0) {
          // Would need to check drawing status - placeholder for now
          predictedDelay += 1;
          confidence *= 0.95;
        }

        // Determine risk level
        let riskLevel = 'low';
        if (predictedDelay >= 5) {
          riskLevel = 'high';
        } else if (predictedDelay >= 2) {
          riskLevel = 'medium';
        }

        // If task is already overdue, adjust
        const daysUntilDue = task.end_date 
          ? Math.ceil((new Date(task.end_date) - new Date()) / (1000 * 60 * 60 * 24))
          : 999;

        if (daysUntilDue < 0) {
          riskLevel = 'high';
          confidence = 1.0;
        }

        return {
          task_id: task.id,
          task_name: task.name,
          phase: task.phase,
          current_status: task.status,
          due_date: task.end_date,
          days_until_due: daysUntilDue,
          predicted_delay_days: Math.max(0, Math.round(predictedDelay)),
          risk_level: riskLevel,
          confidence_score: Math.round(confidence * 100) / 100,
          contributing_factors: {
            historical_pattern: stats?.avgDelay || 0,
            resource_constraint: resourceUtilization > 0.8,
            dependency_count: predecessorCount,
            overdue_predecessors: overduePredecessors.length,
            linked_rfis: linkedRFIs,
            linked_change_orders: linkedCOs
          }
        };
      })
      .sort((a, b) => {
        // Sort by risk level, then predicted delay
        const riskOrder = { high: 0, medium: 1, low: 2 };
        if (riskOrder[a.risk_level] !== riskOrder[b.risk_level]) {
          return riskOrder[a.risk_level] - riskOrder[b.risk_level];
        }
        return b.predicted_delay_days - a.predicted_delay_days;
      });

    return Response.json({
      project_id,
      project_name: project?.name,
      analysis_date: new Date().toISOString(),
      resource_utilization: Math.round(resourceUtilization * 100),
      historical_data_quality: {
        total_completed_tasks: completedTasks.length,
        pattern_count: Object.keys(delayStats).length,
        avg_sample_size: Object.values(delayStats).reduce((sum, s) => sum + s.sampleSize, 0) / Object.keys(delayStats).length
      },
      predictions,
      summary: {
        total_tasks_analyzed: predictions.length,
        high_risk_count: predictions.filter(p => p.risk_level === 'high').length,
        medium_risk_count: predictions.filter(p => p.risk_level === 'medium').length,
        low_risk_count: predictions.filter(p => p.risk_level === 'low').length,
        total_predicted_delay_days: predictions.reduce((sum, p) => sum + p.predicted_delay_days, 0)
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});