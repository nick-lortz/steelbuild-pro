
/**
 * WorkPackage Progression Validation Engine
 * 
 * Frontend wrapper - imports from backend-safe module
 * Use functions/_lib/stateMachine.js for backend imports
 */

export { PHASE_TRANSITIONS, STATUS_TRANSITIONS, validatePhaseTransition, getWorkflowGuidance } from '../../../functions/_lib/stateMachine';
