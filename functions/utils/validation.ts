/**
 * Input Validation Utilities for Backend Functions
 * 
 * Validates entity data before create/update operations
 * Enforces business rules, data types, constraints
 */

/**
 * Validation result type
 * @typedef {{ valid: boolean, errors: string[] }} ValidationResult
 */

/**
 * Common field validators
 */
export const validators = {
  required: (value, fieldName) => {
    if (value === null || value === undefined || value === '') {
      return `${fieldName} is required`;
    }
    return null;
  },
  
  email: (value, fieldName) => {
    if (!value) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return `${fieldName} must be a valid email address`;
    }
    return null;
  },
  
  positiveNumber: (value, fieldName) => {
    if (value === null || value === undefined) return null;
    if (typeof value !== 'number' || value < 0) {
      return `${fieldName} must be a positive number`;
    }
    return null;
  },
  
  percentage: (value, fieldName) => {
    if (value === null || value === undefined) return null;
    if (typeof value !== 'number' || value < 0 || value > 100) {
      return `${fieldName} must be between 0 and 100`;
    }
    return null;
  },
  
  date: (value, fieldName) => {
    if (!value) return null;
    if (isNaN(Date.parse(value))) {
      return `${fieldName} must be a valid date`;
    }
    return null;
  },
  
  dateOrder: (startDate, endDate, startFieldName, endFieldName) => {
    if (!startDate || !endDate) return null;
    if (new Date(startDate) > new Date(endDate)) {
      return `${startFieldName} must be before ${endFieldName}`;
    }
    return null;
  },
  
  enum: (value, allowedValues, fieldName) => {
    if (!value) return null;
    if (!allowedValues.includes(value)) {
      return `${fieldName} must be one of: ${allowedValues.join(', ')}`;
    }
    return null;
  },
  
  maxLength: (value, maxLen, fieldName) => {
    if (!value) return null;
    if (value.length > maxLen) {
      return `${fieldName} must be ${maxLen} characters or less`;
    }
    return null;
  },
  
  emailArray: (value, fieldName) => {
    if (!value || !Array.isArray(value)) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const email of value) {
      if (!emailRegex.test(email)) {
        return `${fieldName} contains invalid email: ${email}`;
      }
    }
    return null;
  }
};

/**
 * Validate Project data
 */
export function validateProject(data, isUpdate = false) {
  const errors = [];
  
  // Required fields (only for create)
  if (!isUpdate) {
    const reqError = validators.required(data.project_number, 'Project number');
    if (reqError) errors.push(reqError);
    
    const nameError = validators.required(data.name, 'Project name');
    if (nameError) errors.push(nameError);
  }
  
  // Numeric validations
  if (data.contract_value !== undefined) {
    const error = validators.positiveNumber(data.contract_value, 'Contract value');
    if (error) errors.push(error);
  }
  
  if (data.rough_square_footage !== undefined) {
    const error = validators.positiveNumber(data.rough_square_footage, 'Square footage');
    if (error) errors.push(error);
  }
  
  if (data.crane_budget !== undefined) {
    const error = validators.positiveNumber(data.crane_budget, 'Crane budget');
    if (error) errors.push(error);
  }
  
  if (data.sub_budget !== undefined) {
    const error = validators.positiveNumber(data.sub_budget, 'Sub budget');
    if (error) errors.push(error);
  }
  
  // Date validations
  const dateOrderError = validators.dateOrder(
    data.start_date, 
    data.target_completion, 
    'Start date', 
    'Target completion'
  );
  if (dateOrderError) errors.push(dateOrderError);
  
  // Email validations
  if (data.gc_email) {
    const error = validators.email(data.gc_email, 'GC email');
    if (error) errors.push(error);
  }
  
  if (data.project_manager) {
    const error = validators.email(data.project_manager, 'Project manager');
    if (error) errors.push(error);
  }
  
  if (data.superintendent) {
    const error = validators.email(data.superintendent, 'Superintendent');
    if (error) errors.push(error);
  }
  
  if (data.assigned_users) {
    const error = validators.emailArray(data.assigned_users, 'Assigned users');
    if (error) errors.push(error);
  }
  
  // Enum validations
  if (data.status) {
    const error = validators.enum(
      data.status, 
      ['bidding', 'awarded', 'in_progress', 'on_hold', 'completed', 'closed'],
      'Status'
    );
    if (error) errors.push(error);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate RFI data
 */
export function validateRFI(data, isUpdate = false) {
  const errors = [];
  
  // Required fields
  if (!isUpdate) {
    if (!data.project_id) errors.push('Project ID is required');
    if (!data.subject) errors.push('Subject is required');
  }
  
  // Status workflow validation
  if (data.status === 'closed' && !data.response) {
    errors.push('Response is required when closing an RFI');
  }
  
  // Date validations
  const dateChecks = [
    [data.submitted_date, data.response_date, 'Submitted date', 'Response date'],
    [data.response_date, data.closed_date, 'Response date', 'Closed date']
  ];
  
  for (const [start, end, startName, endName] of dateChecks) {
    const error = validators.dateOrder(start, end, startName, endName);
    if (error) errors.push(error);
  }
  
  // Enum validations
  if (data.status) {
    const error = validators.enum(
      data.status,
      ['draft', 'internal_review', 'submitted', 'under_review', 'answered', 'closed', 'reopened'],
      'Status'
    );
    if (error) errors.push(error);
  }
  
  if (data.priority) {
    const error = validators.enum(
      data.priority,
      ['low', 'medium', 'high', 'critical'],
      'Priority'
    );
    if (error) errors.push(error);
  }
  
  // Email validations
  if (data.assigned_to) {
    const error = validators.email(data.assigned_to, 'Assigned to');
    if (error) errors.push(error);
  }
  
  if (data.response_owner) {
    const error = validators.email(data.response_owner, 'Response owner');
    if (error) errors.push(error);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate Task data
 */
export function validateTask(data, isUpdate = false) {
  const errors = [];
  
  // Required fields
  if (!isUpdate) {
    if (!data.project_id) errors.push('Project ID is required');
    if (!data.name) errors.push('Task name is required');
    if (!data.start_date) errors.push('Start date is required');
    if (!data.end_date) errors.push('End date is required');
  }
  
  // Date ordering
  const dateOrderError = validators.dateOrder(
    data.start_date,
    data.end_date,
    'Start date',
    'End date'
  );
  if (dateOrderError) errors.push(dateOrderError);
  
  // Percentage validation
  if (data.progress_percent !== undefined) {
    const error = validators.percentage(data.progress_percent, 'Progress');
    if (error) errors.push(error);
  }
  
  // Hours validation
  if (data.estimated_hours !== undefined) {
    const error = validators.positiveNumber(data.estimated_hours, 'Estimated hours');
    if (error) errors.push(error);
  }
  
  if (data.actual_hours !== undefined) {
    const error = validators.positiveNumber(data.actual_hours, 'Actual hours');
    if (error) errors.push(error);
  }
  
  // Status validation
  if (data.status) {
    const error = validators.enum(
      data.status,
      ['not_started', 'in_progress', 'completed', 'on_hold', 'cancelled', 'blocked'],
      'Status'
    );
    if (error) errors.push(error);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate Financial data
 */
export function validateFinancial(data, isUpdate = false) {
  const errors = [];
  
  if (!isUpdate) {
    if (!data.project_id) errors.push('Project ID is required');
    if (!data.cost_code_id) errors.push('Cost code ID is required');
  }
  
  // All amounts must be non-negative
  const amountFields = [
    'original_budget',
    'approved_changes',
    'current_budget',
    'committed_amount',
    'actual_amount',
    'forecast_amount'
  ];
  
  for (const field of amountFields) {
    if (data[field] !== undefined) {
      const error = validators.positiveNumber(data[field], field);
      if (error) errors.push(error);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate Expense data
 */
export function validateExpense(data, isUpdate = false) {
  const errors = [];
  
  if (!isUpdate) {
    if (!data.project_id) errors.push('Project ID is required');
    if (!data.expense_date) errors.push('Expense date is required');
    if (data.amount === undefined) errors.push('Amount is required');
  }
  
  if (data.amount !== undefined) {
    const error = validators.positiveNumber(data.amount, 'Amount');
    if (error) errors.push(error);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Generic validation helper
 */
export function validate(entityType, data, isUpdate = false) {
  switch (entityType) {
    case 'Project':
      return validateProject(data, isUpdate);
    case 'RFI':
      return validateRFI(data, isUpdate);
    case 'Task':
      return validateTask(data, isUpdate);
    case 'Financial':
      return validateFinancial(data, isUpdate);
    case 'Expense':
      return validateExpense(data, isUpdate);
    default:
      return { valid: true, errors: [] };
  }
}