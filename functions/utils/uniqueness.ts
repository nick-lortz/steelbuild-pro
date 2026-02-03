/**
 * Uniqueness Constraint Utilities
 * 
 * Enforce unique constraints that aren't natively supported in Base44 schemas
 */

/**
 * Check if project number is unique
 */
export async function checkProjectNumberUnique(base44, projectNumber, excludeId = null) {
  const projects = await base44.entities.Project.filter({ project_number: projectNumber });
  
  // If updating, exclude current project
  const duplicates = excludeId 
    ? projects.filter(p => p.id !== excludeId)
    : projects;
  
  if (duplicates.length > 0) {
    return {
      unique: false,
      error: `Project number ${projectNumber} already exists`
    };
  }
  
  return { unique: true, error: null };
}

/**
 * Check if RFI number is unique within project
 */
export async function checkRFINumberUnique(base44, projectId, rfiNumber, excludeId = null) {
  const rfis = await base44.entities.RFI.filter({ 
    project_id: projectId,
    rfi_number: rfiNumber
  });
  
  const duplicates = excludeId
    ? rfis.filter(r => r.id !== excludeId)
    : rfis;
  
  if (duplicates.length > 0) {
    return {
      unique: false,
      error: `RFI #${rfiNumber} already exists for this project`
    };
  }
  
  return { unique: true, error: null };
}

/**
 * Check if cost code is unique
 */
export async function checkCostCodeUnique(base44, code, excludeId = null) {
  const costCodes = await base44.entities.CostCode.filter({ code });
  
  const duplicates = excludeId
    ? costCodes.filter(c => c.id !== excludeId)
    : costCodes;
  
  if (duplicates.length > 0) {
    return {
      unique: false,
      error: `Cost code ${code} already exists`
    };
  }
  
  return { unique: true, error: null };
}

/**
 * Check if work package WPID is unique within project
 */
export async function checkWPIDUnique(base44, projectId, wpid, excludeId = null) {
  const workPackages = await base44.entities.WorkPackage.filter({
    project_id: projectId,
    wpid
  });
  
  const duplicates = excludeId
    ? workPackages.filter(wp => wp.id !== excludeId)
    : workPackages;
  
  if (duplicates.length > 0) {
    return {
      unique: false,
      error: `Work package ID ${wpid} already exists for this project`
    };
  }
  
  return { unique: true, error: null };
}

/**
 * Get next available RFI number for project
 * Thread-safe approach: get max and increment
 */
export async function getNextRFINumber(base44, projectId) {
  const rfis = await base44.entities.RFI.filter({ project_id: projectId });
  const maxNumber = rfis.reduce((max, r) => Math.max(max, r.rfi_number || 0), 0);
  return maxNumber + 1;
}

/**
 * Get next available change order number for project
 */
export async function getNextCONumber(base44, projectId) {
  const cos = await base44.entities.ChangeOrder.filter({ project_id: projectId });
  const maxNumber = cos.reduce((max, c) => Math.max(max, c.co_number || 0), 0);
  return maxNumber + 1;
}