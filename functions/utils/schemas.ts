/**
 * Comprehensive Zod schemas for all backend functions
 * Centralized, reusable validation schemas
 */

import { z } from 'npm:zod@3.24.2';

// ============ COMMON SCHEMAS ============
export const ProjectIdSchema = z.object({
  project_id: z.string().min(1, 'project_id required')
});

export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(25)
});

// ============ PROJECT SCHEMAS ============
export const ProjectCreateSchema = z.object({
  project_number: z.string().min(1, 'project_number required'),
  name: z.string().min(3, 'name min 3 chars'),
  client: z.string().optional(),
  location: z.string().optional(),
  status: z.enum(['bidding', 'awarded', 'in_progress', 'on_hold', 'completed', 'closed']).default('bidding'),
  phase: z.enum(['planning', 'detailing', 'fabrication', 'erection', 'closeout']).default('planning'),
  contract_value: z.number().min(0).optional(),
  start_date: z.string().date().optional(),
  target_completion: z.string().date().optional()
});

export const ProjectUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(3).optional(),
  status: z.enum(['bidding', 'awarded', 'in_progress', 'on_hold', 'completed', 'closed']).optional(),
  phase: z.enum(['planning', 'detailing', 'fabrication', 'erection', 'closeout']).optional(),
  contract_value: z.number().min(0).optional()
});

// ============ TASK SCHEMAS ============
export const TaskCreateSchema = z.object({
  project_id: z.string().min(1),
  name: z.string().min(3, 'name min 3 chars'),
  phase: z.enum(['detailing', 'fabrication', 'delivery', 'erection', 'closeout']),
  start_date: z.string().date(),
  end_date: z.string().date(),
  status: z.enum(['not_started', 'in_progress', 'completed', 'on_hold', 'cancelled', 'blocked']).default('not_started'),
  estimated_hours: z.number().min(0).optional(),
  progress_percent: z.number().min(0).max(100).default(0)
});

export const TaskUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(3).optional(),
  status: z.enum(['not_started', 'in_progress', 'completed', 'on_hold', 'cancelled', 'blocked']).optional(),
  progress_percent: z.number().min(0).max(100).optional(),
  actual_hours: z.number().min(0).optional()
});

// ============ RFI SCHEMAS ============
export const RFICreateSchema = z.object({
  project_id: z.string().min(1),
  rfi_number: z.number().int().positive(),
  subject: z.string().min(3, 'subject min 3 chars').max(200),
  rfi_type: z.enum(['connection_detail', 'member_size_length', 'embed_anchor', 'tolerance_fitup', 'coating_finish', 'erection_sequence', 'other']),
  category: z.enum(['structural', 'architectural', 'mep', 'coordination', 'clarification', 'other']),
  question: z.string().min(10, 'question min 10 chars'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  assigned_to: z.string().optional(),
  due_date: z.string().date().optional()
});

export const RFIUpdateSchema = z.object({
  id: z.string().min(1),
  response: z.string().min(5).optional(),
  status: z.enum(['draft', 'internal_review', 'submitted', 'under_review', 'answered', 'closed', 'reopened']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  response_owner: z.string().optional()
});

// ============ FINANCIAL SCHEMAS ============
export const FinancialUpdateSchema = z.object({
  project_id: z.string().min(1),
  cost_code_id: z.string().min(1),
  actual_amount: z.number().min(0).optional(),
  forecast_amount: z.number().min(0).optional(),
  committed_amount: z.number().min(0).optional()
});

export const ExpenseCreateSchema = z.object({
  project_id: z.string().min(1),
  cost_code_id: z.string().min(1),
  expense_date: z.string().date(),
  description: z.string().min(3),
  category: z.enum(['labor', 'material', 'equipment', 'subcontract', 'overhead', 'other']),
  amount: z.number().min(0),
  vendor: z.string().optional()
});

// ============ DELIVERY SCHEMAS ============
export const DeliveryCreateSchema = z.object({
  project_id: z.string().min(1),
  delivery_date: z.string().date(),
  description: z.string().min(5),
  tonnage: z.number().min(0),
  status: z.enum(['scheduled', 'en_route', 'delivered', 'held', 'cancelled']).default('scheduled')
});

// ============ WORK PACKAGE SCHEMAS ============
export const WorkPackageCreateSchema = z.object({
  project_id: z.string().min(1),
  name: z.string().min(3),
  description: z.string().optional(),
  start_date: z.string().date(),
  target_completion: z.string().date(),
  phase: z.enum(['detailing', 'fabrication', 'delivery', 'erection', 'closeout'])
});

// ============ DOCUMENT SCHEMAS ============
export const DocumentCreateSchema = z.object({
  project_id: z.string().min(1),
  title: z.string().min(3),
  file_url: z.string().url(),
  category: z.enum(['drawing', 'specification', 'rfi', 'submittal', 'contract', 'report', 'photo', 'correspondence', 'receipt', 'invoice', 'other']),
  folder_path: z.string().default('/')
});

// ============ HELPERS ============
export function validateInput(schema, data) {
  try {
    return { valid: true, data: schema.parse(data) };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        error: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')
      };
    }
    return { valid: false, error: 'Validation failed' };
  }
}

export default { validateInput };