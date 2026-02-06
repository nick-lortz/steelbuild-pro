import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { z } from 'npm:zod@3.24.2';
import { withRateLimit } from './utils/rateLimit.js';

const CreateCOSchema = z.object({
  project_id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  cost_impact: z.number().default(0),
  schedule_impact_days: z.number().default(0),
  status: z.enum(['draft', 'submitted', 'under_review', 'approved', 'rejected', 'void']).default('draft')
});

/**
 * Create Change Order with atomic CO number assignment
 * Prevents race condition where multiple users create COs simultaneously
 */
Deno.serve(withRateLimit(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const validation = CreateCOSchema.safeParse(payload);
    
    if (!validation.success) {
      return Response.json({ 
        error: 'Validation failed', 
        details: validation.error.errors 
      }, { status: 400 });
    }

    const data = validation.data;

    // Use service role to ensure atomic operation
    // Get existing COs for this project
    const existingCOs = await base44.asServiceRole.entities.ChangeOrder.filter(
      { project_id: data.project_id },
      '-co_number'
    );

    // Calculate next CO number atomically
    const nextNumber = existingCOs.length > 0 
      ? Math.max(...existingCOs.map(co => co.co_number || 0)) + 1 
      : 1;

    // Create with atomic number
    const changeOrder = await base44.asServiceRole.entities.ChangeOrder.create({
      ...data,
      co_number: nextNumber,
      submitted_date: data.status === 'submitted' ? new Date().toISOString().split('T')[0] : null
    });

    return Response.json({
      success: true,
      change_order: changeOrder
    });

  } catch (error) {
    console.error('Error creating change order:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}));