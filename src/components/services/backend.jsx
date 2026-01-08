import { base44 } from '@/api/base44Client';

// SOV Operations
export const createSOVItem = (data) =>
  base44.functions.invoke('sovOperations', { operation: 'create', data });

export const updateSOVItem = (id, updates) =>
  base44.functions.invoke('sovOperations', { operation: 'update', data: { id, updates } });

export const deleteSOVItem = (id) =>
  base44.functions.invoke('sovOperations', { operation: 'delete', data: { id } });

// Expense Operations
export const createExpense = (data) =>
  base44.functions.invoke('expenseOperations', { operation: 'create', data });

export const updateExpense = (id, updates) =>
  base44.functions.invoke('expenseOperations', { operation: 'update', data: { id, updates } });

export const deleteExpense = (id) =>
  base44.functions.invoke('expenseOperations', { operation: 'delete', data: { id } });

// Budget Operations
export const createBudgetLine = (data) =>
  base44.functions.invoke('budgetOperations', { operation: 'create', data });

export const updateBudgetLine = (id, updates) =>
  base44.functions.invoke('budgetOperations', { operation: 'update', data: { id, updates } });

export const deleteBudgetLine = (id) =>
  base44.functions.invoke('budgetOperations', { operation: 'delete', data: { id } });

// Invoice Operations
export const createInvoice = (data) =>
  base44.functions.invoke('invoiceOperations', { operation: 'create', data });

export const updateInvoice = (id, updates) =>
  base44.functions.invoke('invoiceOperations', { operation: 'update', data: { id, updates } });

export const deleteInvoice = (id) =>
  base44.functions.invoke('invoiceOperations', { operation: 'delete', data: { id } });

// ETC Operations
export const createETC = (data) =>
  base44.functions.invoke('etcOperations', { operation: 'create', data });

export const updateETC = (id, updates) =>
  base44.functions.invoke('etcOperations', { operation: 'update', data: { id, updates } });

// Invoice Generation & Approval
export const generateInvoice = (projectId, periodStart, periodEnd) =>
  base44.functions.invoke('generateInvoice', { projectId, periodStart, periodEnd });

export const approveInvoice = (invoiceId) =>
  base44.functions.invoke('approveInvoice', { invoiceId });

export const deleteInvoiceById = (invoiceId) =>
  base44.functions.invoke('deleteInvoice', { invoiceId });

// SOV Cost Code Mapping
export const mapCostCodeToSOV = (sovItemId, costCodeId, allocationPercent = 100) =>
  base44.functions.invoke('mapCostCodeToSOV', { sovItemId, costCodeId, allocationPercent });

export const unmapCostCodeFromSOV = (mappingId) =>
  base44.functions.invoke('unmapCostCodeFromSOV', { mappingId });

export const updateSOVCostCodeAllocation = (mappingId, allocationPercent) =>
  base44.functions.invoke('updateSOVCostCodeAllocation', { mappingId, allocationPercent });

// Cost Code Creation
export const createCostCode = (data) =>
  base44.functions.invoke('createCostCode', data);

// SOV Reporting
export const getSOVCostSummary = (projectId) =>
  base44.functions.invoke('getSOVCostSummary', { projectId });

export const getProjectFinancialSummary = (projectId) =>
  base44.functions.invoke('getProjectFinancialSummary', { projectId });

export const getCostRiskSignal = (projectId) =>
  base44.functions.invoke('getCostRiskSignal', { projectId });

// SOV Updates
export const updateSOVPercentComplete = (sovItemId, percentComplete) =>
  base44.functions.invoke('updateSOVPercentComplete', { sovItemId, percentComplete });

export const createSOVItem2 = (projectId, sovCode, description, scheduledValue, category) =>
  base44.functions.invoke('createSOVItem', { projectId, sovCode, description, scheduledValue, category });

// Change Order Operations
export const approveChangeOrder = (changeOrderId) =>
  base44.functions.invoke('changeOrderOperations', { operation: 'approve', data: { changeOrderId } });