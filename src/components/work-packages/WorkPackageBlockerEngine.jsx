/**
 * WorkPackage Progression Validation Engine
 * 
 * Frontend wrapper - calls backend via SDK
 * All workflow logic enforced server-side via advanceWorkPackagePhase function
 */

import { base44 } from '@/api/base44Client';

/**
 * Call backend to validate and advance WP phase
 */
export async function getWorkflowGuidance(workPackage) {
  try {
    const result = await base44.functions.invoke('advanceWorkPackagePhase', {
      wpId: workPackage.id,
      projectId: workPackage.project_id,
      targetPhase: workPackage.phase,
      validate_only: true
    });
    return result.data;
  } catch (error) {
    console.error('Workflow guidance error:', error);
    return { pass: false, reasons: ['Error evaluating workflow'], required_actions: [] };
  }
}