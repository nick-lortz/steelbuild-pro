/**
 * GET PORTFOLIO PULSE
 * 
 * Multi-project health rollup for executive dashboard.
 * Returns health scores and top blockers across all accessible projects.
 * 
 * Health Score Calculation (0-100):
 * - Base: 100
 * - Deduct per blocker: critical (-15), high (-10), medium (-5), low (-2)
 * - Floor: 0 (can't go negative)
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireUser, ok, unauthorized, serverError } from './_lib/guard.js';

Deno.serve(async (req) => {
  try {
    const user = await requireUser(req);
    const base44 = createClientFromRequest(req);
    
    // Get user's accessible projects (RLS enforced)
    const projects = await base44.entities.Project.filter({
      status: { $in: ['awarded', 'in_progress', 'on_hold'] }
    });
    
    // Compute pulse for each project in parallel
    const pulsePromises = projects.map(async (project) => {
      try {
        // Call getProjectPulse for each project
        const pulseResponse = await fetch(`${req.url.replace(/\/[^/]+$/, '')}/getProjectPulse`, {
          method: 'POST',
          headers: req.headers,
          body: JSON.stringify({ project_id: project.id })
        });
        
        if (!pulseResponse.ok) {
          console.error(`Failed to get pulse for project ${project.id}`);
          return null;
        }
        
        const { data: pulse } = await pulseResponse.json();
        
        // Calculate health score
        const healthScore = calculateHealthScore(pulse.blockers);
        
        // Get latest AI insight
        const insights = await base44.entities.AIInsight.filter({
          project_id: project.id,
          insight_type: 'project_pulse',
          is_published: true
        });
        
        const latestInsight = insights.sort((a, b) => 
          new Date(b.generated_at) - new Date(a.generated_at)
        )[0];
        
        return {
          project_id: project.id,
          project_number: project.project_number,
          project_name: project.name,
          phase: project.phase,
          status: project.status,
          health_score: healthScore,
          health_grade: getHealthGrade(healthScore),
          top_blockers: pulse.blockers.slice(0, 3),
          key_counts: pulse.counts,
          last_generated_at: pulse.generated_at,
          latest_insight: latestInsight ? {
            summary: latestInsight.summary,
            generated_at: latestInsight.generated_at
          } : null
        };
      } catch (error) {
        console.error(`Error processing project ${project.id}:`, error);
        return null;
      }
    });
    
    const portfolioPulse = (await Promise.all(pulsePromises))
      .filter(p => p !== null)
      .sort((a, b) => a.health_score - b.health_score); // Worst health first
    
    // Portfolio-level stats
    const portfolioStats = {
      total_projects: portfolioPulse.length,
      avg_health_score: Math.round(
        portfolioPulse.reduce((sum, p) => sum + p.health_score, 0) / portfolioPulse.length
      ),
      critical_projects: portfolioPulse.filter(p => p.health_score < 50).length,
      total_blockers: portfolioPulse.reduce((sum, p) => sum + p.top_blockers.length, 0)
    };
    
    return ok({
      generated_at: new Date().toISOString(),
      projects: portfolioPulse,
      portfolio_stats: portfolioStats
    });
    
  } catch (error) {
    if (error.status === 401) return unauthorized(error.message);
    return serverError('Failed to compute portfolio pulse', error);
  }
});

function calculateHealthScore(blockers) {
  // Health score weights (deductions from 100)
  const weights = {
    critical: 15,
    high: 10,
    medium: 5,
    low: 2
  };
  
  let score = 100;
  
  for (const blocker of blockers) {
    score -= weights[blocker.severity] || 0;
  }
  
  return Math.max(0, score); // Floor at 0
}

function getHealthGrade(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}