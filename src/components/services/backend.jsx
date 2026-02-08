import { base44 } from '@/api/base44Client';
import { apiClient } from '@/api/client';

// SOV Operations
export const createSOVItem = (data) =>
  apiClient.functions.invoke('sovOperations', { operation: 'create', data });

export const updateSOVItem = (id, updates) =>
  apiClient.functions.invoke('sovOperations', { operation: 'update', data: { id, updates } });

export const deleteSOVItem = (id) =>
  apiClient.functions.invoke('sovOperations', { operation: 'delete', data: { id } });

// Expense Operations
export const createExpense = (data) =>
  apiClient.functions.invoke('expenseOperations', { operation: 'create', data });

export const updateExpense = (id, updates) =>
  apiClient.functions.invoke('expenseOperations', { operation: 'update', data: { id, updates } });

export const deleteExpense = (id) =>
  apiClient.functions.invoke('expenseOperations', { operation: 'delete', data: { id } });

// Budget Operations
export const createBudgetLine = (data) =>
  apiClient.functions.invoke('budgetOperations', { operation: 'create', data });

export const updateBudgetLine = (id, updates) =>
  apiClient.functions.invoke('budgetOperations', { operation: 'update', data: { id, updates } });

export const deleteBudgetLine = (id) =>
  apiClient.functions.invoke('budgetOperations', { operation: 'delete', data: { id } });

// Invoice Operations
export const createInvoice = (data) =>
  apiClient.functions.invoke('invoiceOperations', { operation: 'create', data });

export const updateInvoice = (id, updates) =>
  apiClient.functions.invoke('invoiceOperations', { operation: 'update', data: { id, updates } });

export const deleteInvoice = (id) =>
  apiClient.functions.invoke('invoiceOperations', { operation: 'delete', data: { id } });

// ETC Operations
export const createETC = (data) =>
  apiClient.functions.invoke('etcOperations', { operation: 'create', data });

export const updateETC = (id, updates) =>
  apiClient.functions.invoke('etcOperations', { operation: 'update', data: { id, updates } });

export const deleteETC = (id) =>
  apiClient.functions.invoke('etcOperations', { operation: 'delete', data: { id } });

// Invoice Generation & Approval
export const generateInvoice = (projectId, periodStart, periodEnd) =>
  apiClient.functions.invoke('generateInvoice', { projectId, periodStart, periodEnd });

export const approveInvoice = (invoiceId) =>
  apiClient.functions.invoke('approveInvoice', { invoiceId });

export const deleteInvoiceById = (invoiceId) =>
  apiClient.functions.invoke('deleteInvoice', { invoiceId });

// SOV Cost Code Mapping
export const mapCostCodeToSOV = (sovItemId, costCodeId, allocationPercent = 100) =>
  apiClient.functions.invoke('mapCostCodeToSOV', { sovItemId, costCodeId, allocationPercent });

export const unmapCostCodeFromSOV = (mappingId) =>
  apiClient.functions.invoke('unmapCostCodeFromSOV', { mappingId });

export const updateSOVCostCodeAllocation = (mappingId, allocationPercent) =>
  apiClient.functions.invoke('updateSOVCostCodeAllocation', { mappingId, allocationPercent });

// Cost Code Creation
export const createCostCode = (data) =>
  apiClient.functions.invoke('createCostCode', data);

// SOV Reporting
export const getSOVCostSummary = (projectId) =>
  apiClient.functions.invoke('getSOVCostSummary', { projectId });

export const getProjectFinancialSummary = (projectId) =>
  apiClient.functions.invoke('getProjectFinancialSummary', { projectId });

export const getCostRiskSignal = (projectId) =>
  apiClient.functions.invoke('getCostRiskSignal', { projectId });

// SOV Updates
export const updateSOVPercentComplete = (sovItemId, percentComplete) =>
  apiClient.functions.invoke('updateSOVPercentComplete', { sovItemId, percentComplete });

export const createSOVItem2 = (projectId, sovCode, description, scheduledValue, category) =>
  apiClient.functions.invoke('createSOVItem', { projectId, sovCode, description, scheduledValue, category });

// Change Order Operations
export const approveChangeOrder = (changeOrderId) =>
  apiClient.functions.invoke('changeOrderOperations', { operation: 'approve', data: { changeOrderId } });

// Data Integrity
export const checkDataIntegrity = (projectId) =>
  apiClient.functions.invoke('dataIntegrityCheck', { projectId });

// Drawing Operations
export const supersedeDrawingSet = (oldSetId, newRevision, status, ifa_date, sheet_count) =>
  apiClient.functions.invoke('drawingOperations', { operation: 'supersede', data: { oldSetId, newRevision, status, ifa_date, sheet_count } });

export const releaseDrawingForFab = (setId) =>
  apiClient.functions.invoke('drawingOperations', { operation: 'release_for_fab', data: { setId } });

// Governance
export const validateSchemaChange = (entity_name, proposed_changes, justification) =>
  apiClient.functions.invoke('validateSchemaChange', { entity_name, proposed_changes, justification });