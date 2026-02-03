/**
 * Validation utilities for backend functions
 * Centralized Zod schemas for consistent input validation
 */

import { z } from 'npm:zod@3.24.2';

// Common schemas
export const ProjectIdSchema = z.object({
  project_id: z.string().min(1, 'project_id required')
});

export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(25)
});

export const RFICreateSchema = z.object({
  project_id: z.string().min(1),
  rfi_number: z.number().int().positive(),
  subject: z.string().min(3, 'subject min 3 chars'),
  rfi_type: z.enum(['connection_detail', 'member_size_length', 'embed_anchor', 'tolerance_fitup', 'coating_finish', 'erection_sequence', 'other']),
  category: z.enum(['structural', 'architectural', 'mep', 'coordination', 'clarification', 'other']),
  question: z.string().min(10, 'question min 10 chars'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  assigned_to: z.string().optional(),
  due_date: z.string().date().optional()
});

export const RFIUpdateSchema = z.object({
  id: z.string().min(1),
  response: z.string().min(5, 'response min 5 chars').optional(),
  status: z.enum(['draft', 'internal_review', 'submitted', 'under_review', 'answered', 'closed', 'reopened']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional()
});

export const TaskCreateSchema = z.object({
  project_id: z.string().min(1),
  name: z.string().min(3, 'name min 3 chars'),
  phase: z.enum(['detailing', 'fabrication', 'delivery', 'erection', 'closeout']),
  start_date: z.string().date(),
  end_date: z.string().date(),
  status: z.enum(['not_started', 'in_progress', 'completed', 'on_hold', 'cancelled', 'blocked']).default('not_started'),
  estimated_hours: z.number().min(0).optional()
});

export const FinancialUpdateSchema = z.object({
  project_id: z.string().min(1),
  cost_code_id: z.string().min(1),
  actual_amount: z.number().min(0).optional(),
  forecast_amount: z.number().min(0).optional()
});

// Validation wrapper
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

export default { validateInput, ProjectIdSchema, PaginationSchema, RFICreateSchema, RFIUpdateSchema, TaskCreateSchema, FinancialUpdateSchema };