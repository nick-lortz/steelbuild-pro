import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Check if model exists
    const existing = await base44.asServiceRole.entities.FloatConsumptionModel?.filter({}) || [];
    
    if (existing.length > 0) {
      return Response.json({
        message: 'Float consumption model already exists',
        count: existing.length
      });
    }

    // Create default model
    await base44.asServiceRole.entities.FloatConsumptionModel.create({
      model_name: 'Default Float Consumption Model',
      cost_per_float_day: 500,
      critical_path_multiplier: 2.0,
      crew_idle_cost_per_day: 2720,
      is_active: true
    });

    return Response.json({
      success: true,
      message: 'Default float consumption model created'
    });

  } catch (error) {
    console.error('Seed error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});