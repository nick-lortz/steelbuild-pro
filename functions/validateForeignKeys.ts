import { createClientFromRequest } from "npm:@base44/sdk@0.8.20";

/**
 * Foreign Key Validation Utilities
 * Prevent orphaned records by validating references before creation/update
 */

/**
 * Validate all foreign key references in a task
 * Called before task creation/update
 */
export async function validateTaskFK(base44, data) {
  if (data.project_id) {
    const projects = await base44.entities.Project.filter({ id: data.project_id });
    if (!projects || projects.length === 0) {
      throw new Error(`Invalid project_id: ${data.project_id}`);
    }
  }
  
  if (data.work_package_id) {
    const wps = await base44.entities.WorkPackage.filter({ wpid: data.work_package_id });
    if (!wps || wps.length === 0) {
      throw new Error(`Invalid work_package_id: ${data.work_package_id}`);
    }
  }
  
  if (data.parent_task_id) {
    const tasks = await base44.entities.Task.filter({ id: data.parent_task_id });
    if (!tasks || tasks.length === 0) {
      throw new Error(`Invalid parent_task_id: ${data.parent_task_id}`);
    }
  }
  
  if (data.labor_category_id) {
    const cats = await base44.entities.LaborCategory.filter({ id: data.labor_category_id });
    if (!cats || cats.length === 0) {
      throw new Error(`Invalid labor_category_id: ${data.labor_category_id}`);
    }
  }
  
  if (data.cost_code_id) {
    const codes = await base44.entities.CostCode.filter({ id: data.cost_code_id });
    if (!codes || codes.length === 0) {
      throw new Error(`Invalid cost_code_id: ${data.cost_code_id}`);
    }
  }
  
  return data;  // All checks passed
}

/**
 * Validate SOVItem foreign keys
 */
export async function validateSOVItemFK(base44, data) {
  const projects = await base44.entities.Project.filter({ id: data.project_id });
  if (!projects || projects.length === 0) {
    throw new Error(`Invalid project_id: ${data.project_id}`);
  }
  
  if (data.sov_version_id) {
    const versions = await base44.entities.SOVVersion.filter({ id: data.sov_version_id });
    if (!versions || versions.length === 0) {
      throw new Error(`Invalid sov_version_id: ${data.sov_version_id}`);
    }
  }
  
  return data;
}

/**
 * Validate Delivery Work Package references
 */
export async function validateDeliveryWorkPackages(base44, delivery_project_id, wp_ids) {
  if (!wp_ids || !Array.isArray(wp_ids)) return;
  
  for (const wpid of wp_ids) {
    const wps = await base44.entities.WorkPackage.filter({ 
      wpid, 
      project_id: delivery_project_id 
    });
    if (!wps || wps.length === 0) {
      throw new Error(`Work package ${wpid} not found or not in project ${delivery_project_id}`);
    }
  }
}

/**
 * Validate Fabrication drawing set reference
 */
export async function validateFabricationDrawingSet(base44, drawing_set_id, project_id) {
  const sets = await base44.entities.DrawingSet.filter({ id: drawing_set_id, project_id });
  if (!sets || sets.length === 0) {
    throw new Error(`Invalid drawing_set_id: ${drawing_set_id}`);
  }
  
  return sets[0];
}

/**
 * Validate RFI references exist
 */
export async function validateRFIReferences(base44, project_id, rfi_ids) {
  if (!rfi_ids || !Array.isArray(rfi_ids)) return;
  
  for (const rfi_id of rfi_ids) {
    const rfis = await base44.entities.RFI.filter({ id: rfi_id, project_id });
    if (!rfis || rfis.length === 0) {
      throw new Error(`RFI ${rfi_id} not found in project ${project_id}`);
    }
  }
}

/**
 * Detect circular task dependencies
 */
export async function detectCircularDependencies(base44, task_id, predecessor_ids) {
  const visited = new Set();
  const inStack = new Set();
  
  async function hasCycle(current) {
    if (inStack.has(current)) return true;  // Cycle detected
    if (visited.has(current)) return false;
    
    visited.add(current);
    inStack.add(current);
    
    const tasks = await base44.entities.Task.filter({ id: current });
    if (!tasks || tasks.length === 0) {
      return false;  // Task not found, but let caller handle validation
    }
    
    const task = tasks[0];
    if (task.predecessor_ids && Array.isArray(task.predecessor_ids)) {
      for (const pred of task.predecessor_ids) {
        if (await hasCycle(pred)) return true;
      }
    }
    
    inStack.delete(current);
    return false;
  }
  
  // Check that all predecessors exist
  for (const predId of predecessor_ids) {
    const tasks = await base44.entities.Task.filter({ id: predId });
    if (!tasks || tasks.length === 0) {
      throw new Error(`Predecessor task ${predId} not found`);
    }
  }
  
  // Check for cycles
  if (await hasCycle(task_id)) {
    throw new Error('Circular task dependency detected');
  }
}