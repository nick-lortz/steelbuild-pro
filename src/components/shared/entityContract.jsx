/**
 * PROJECT-OWNED ENTITY CONTRACT
 * 
 * Central source of truth for entity validation rules.
 * Used by both UI and backend to enforce consistent data integrity.
 * 
 * Every project-owned entity MUST:
 * 1. Have project_id field (required)
 * 2. Have title field (if human-facing)
 * 3. Have index on project_id
 */

export const ENTITY_CONTRACT = {
  // Core execution entities
  WorkPackage: {
    requiredFields: ['project_id', 'title'],
    indexes: ['project_id', 'status', 'phase'],
    humanFacing: true,
    description: 'Work package for project execution tracking'
  },
  
  Task: {
    requiredFields: ['project_id', 'title'],
    indexes: ['project_id', 'status', 'assigned_to', 'start_date', 'work_package_id'],
    humanFacing: true,
    description: 'Scheduled task within a project'
  },
  
  RFI: {
    requiredFields: ['project_id', 'subject'],
    indexes: ['project_id', 'status', 'ball_in_court', 'escalation_flag', 'due_date'],
    humanFacing: true,
    description: 'Request for Information',
    titleField: 'subject' // Uses 'subject' instead of 'title'
  },
  
  ChangeOrder: {
    requiredFields: ['project_id', 'title'],
    indexes: ['project_id', 'status', 'co_number'],
    humanFacing: true,
    description: 'Change order tracking'
  },
  
  ChangeOrderLineItem: {
    requiredFields: ['project_id', 'change_order_id', 'description'],
    indexes: ['project_id', 'change_order_id'],
    humanFacing: true,
    description: 'Line items for change orders',
    titleField: 'description'
  },
  
  Delivery: {
    requiredFields: ['project_id', 'description'],
    indexes: ['project_id', 'status', 'scheduled_date'],
    humanFacing: true,
    description: 'Material delivery tracking',
    titleField: 'description'
  },
  
  // Documents & drawings
  Document: {
    requiredFields: ['project_id', 'title'],
    indexes: ['project_id', 'category', 'status'],
    humanFacing: true,
    description: 'Project documents'
  },
  
  DrawingSet: {
    requiredFields: ['project_id', 'set_number', 'title'],
    indexes: ['project_id', 'status', 'discipline'],
    humanFacing: true,
    description: 'Drawing set management'
  },
  
  DrawingSheet: {
    requiredFields: ['project_id', 'sheet_number'],
    indexes: ['project_id', 'drawing_set_id', 'status'],
    humanFacing: false,
    description: 'Individual drawing sheets'
  },
  
  // Financial entities
  Financial: {
    requiredFields: ['project_id', 'cost_code_id'],
    indexes: ['project_id', 'cost_code_id', 'category'],
    humanFacing: false,
    description: 'Financial tracking by cost code'
  },
  
  Expense: {
    requiredFields: ['project_id', 'description'],
    indexes: ['project_id', 'cost_code_id', 'expense_date'],
    humanFacing: true,
    description: 'Project expenses',
    titleField: 'description'
  },
  
  SOVItem: {
    requiredFields: ['project_id', 'description'],
    indexes: ['project_id', 'line_number'],
    humanFacing: true,
    description: 'Schedule of Values items',
    titleField: 'description'
  },
  
  // Resources
  ResourceAllocation: {
    requiredFields: ['project_id', 'resource_id'],
    indexes: ['project_id', 'resource_id', 'task_id'],
    humanFacing: false,
    description: 'Resource allocation to projects/tasks'
  },
  
  LaborEntry: {
    requiredFields: ['project_id', 'crew_id'],
    indexes: ['project_id', 'crew_id', 'work_date'],
    humanFacing: false,
    description: 'Labor hours tracking'
  },
  
  // Checklists & contacts
  ProjectChecklistItem: {
    requiredFields: ['project_id', 'title'],
    indexes: ['project_id', 'category', 'status'],
    humanFacing: true,
    description: 'Project checklist tasks'
  },
  
  ProjectContact: {
    requiredFields: ['project_id', 'name'],
    indexes: ['project_id', 'tags'],
    humanFacing: true,
    description: 'Project contact directory',
    titleField: 'name'
  },
  
  // PM Toolkit
  ScopeReference: {
    requiredFields: ['project_id'],
    indexes: ['project_id', 'is_current'],
    humanFacing: false,
    description: 'Scope of work reference'
  },
  
  ShippingCostRecord: {
    requiredFields: ['project_id', 'loads_shipped'],
    indexes: ['project_id', 'change_order_id'],
    humanFacing: false,
    description: 'Shipping cost calculations'
  },
  
  TravelCostRecord: {
    requiredFields: ['project_id'],
    indexes: ['project_id', 'change_order_id'],
    humanFacing: false,
    description: 'Travel cost calculations'
  },
  
  ProjectEmailDraft: {
    requiredFields: ['project_id', 'subject', 'body'],
    indexes: ['project_id', 'status'],
    humanFacing: true,
    description: 'Draft project emails',
    titleField: 'subject'
  },
  
  DailyLog: {
    requiredFields: ['project_id', 'log_date'],
    indexes: ['project_id', 'log_date'],
    humanFacing: false,
    description: 'Daily field logs'
  },
  
  // Fabrication & detailing
  Fabrication: {
    requiredFields: ['project_id'],
    indexes: ['project_id', 'status'],
    humanFacing: false,
    description: 'Fabrication tracking'
  },
  
  Detailing: {
    requiredFields: ['project_id'],
    indexes: ['project_id', 'status'],
    humanFacing: false,
    description: 'Detailing tracking'
  },
  
  FabReleaseGroup: {
    requiredFields: ['project_id', 'group_name'],
    indexes: ['project_id', 'status'],
    humanFacing: true,
    description: 'Fabrication release groups',
    titleField: 'group_name'
  },
  
  // Field execution
  FieldIssue: {
    requiredFields: ['project_id', 'description'],
    indexes: ['project_id', 'status', 'severity'],
    humanFacing: true,
    description: 'Field issues and observations',
    titleField: 'description'
  },
  
  PunchItem: {
    requiredFields: ['project_id', 'description'],
    indexes: ['project_id', 'status'],
    humanFacing: true,
    description: 'Punch list items',
    titleField: 'description'
  },
  
  FieldDailyReport: {
    requiredFields: ['project_id', 'report_date'],
    indexes: ['project_id', 'report_date'],
    humanFacing: false,
    description: 'Daily field reports'
  }
};

/**
 * Validate entity data against contract
 * @param {string} entityName - Entity type (e.g., 'Task', 'RFI')
 * @param {object} data - Entity data to validate
 * @returns {object} { valid: boolean, errors: string[] }
 */
export function validateEntityData(entityName, data) {
  const contract = ENTITY_CONTRACT[entityName];
  
  if (!contract) {
    return { valid: true, errors: [], warnings: [`No contract defined for ${entityName}`] };
  }
  
  const errors = [];
  
  // Check required fields
  for (const field of contract.requiredFields) {
    if (!data[field] && data[field] !== 0) {
      errors.push(`Missing required field: ${field}`);
    }
  }
  
  // Check title field for human-facing entities
  if (contract.humanFacing) {
    const titleField = contract.titleField || 'title';
    if (!data[titleField]) {
      errors.push(`Missing required field: ${titleField} (human-facing entity)`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get required fields for an entity
 * @param {string} entityName - Entity type
 * @returns {string[]} Required field names
 */
export function getRequiredFields(entityName) {
  const contract = ENTITY_CONTRACT[entityName];
  if (!contract) return [];
  
  const fields = [...contract.requiredFields];
  
  // Add title field if human-facing
  if (contract.humanFacing) {
    const titleField = contract.titleField || 'title';
    if (!fields.includes(titleField)) {
      fields.push(titleField);
    }
  }
  
  return fields;
}

/**
 * Check if entity requires project_id
 * @param {string} entityName - Entity type
 * @returns {boolean}
 */
export function requiresProjectId(entityName) {
  const contract = ENTITY_CONTRACT[entityName];
  return contract?.requiredFields.includes('project_id') || false;
}

/**
 * Get title field name for entity (defaults to 'title')
 * @param {string} entityName - Entity type
 * @returns {string} Field name used for title/label
 */
export function getTitleField(entityName) {
  const contract = ENTITY_CONTRACT[entityName];
  return contract?.titleField || 'title';
}