import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Integration hook for syncing project data to external ERP systems.
 * 
 * Supports:
 * - Webhook-based push to external systems
 * - Transformation of Base44 data to ERP format
 * - Cost code, budget, and SOV sync
 * 
 * Configure external ERP webhook URL in EXTERNAL_ERP_WEBHOOK_URL secret.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    
    const { entity_type, project_id, sync_type } = payload;
    
    if (!project_id) {
      return Response.json({ error: 'project_id required' }, { status: 400 });
    }

    // Get ERP webhook URL from environment
    const erpWebhookUrl = Deno.env.get('EXTERNAL_ERP_WEBHOOK_URL');
    if (!erpWebhookUrl) {
      return Response.json({ 
        error: 'ERP integration not configured. Set EXTERNAL_ERP_WEBHOOK_URL secret.' 
      }, { status: 400 });
    }

    let exportData = {};

    // Sync SOV items
    if (sync_type === 'sov' || sync_type === 'all') {
      const sovItems = await base44.asServiceRole.entities.SOVItem.filter({ 
        project_id 
      });
      
      exportData.sov_items = sovItems.map(sov => ({
        code: sov.sov_code,
        description: sov.description,
        category: sov.sov_category,
        scheduled_value: sov.scheduled_value,
        billed_to_date: sov.billed_to_date,
        percent_complete: sov.percent_complete
      }));
    }

    // Sync budget and actuals
    if (sync_type === 'financials' || sync_type === 'all') {
      const budget = await base44.asServiceRole.entities.Budget.filter({ 
        project_id 
      });
      
      const financials = await base44.asServiceRole.entities.Financial.filter({ 
        project_id 
      });
      
      exportData.budget = budget[0] || {};
      exportData.actuals = financials.map(f => ({
        cost_code: f.cost_code,
        description: f.description,
        actual_cost: f.actual_cost,
        date: f.period_end_date
      }));
    }

    // Sync change orders
    if (sync_type === 'change_orders' || sync_type === 'all') {
      const changeOrders = await base44.asServiceRole.entities.ChangeOrder.filter({ 
        project_id,
        status: 'approved'
      });
      
      exportData.change_orders = changeOrders.map(co => ({
        co_number: co.co_number,
        title: co.title,
        cost_impact: co.cost_impact,
        approved_date: co.approved_date,
        sov_allocations: co.sov_allocations
      }));
    }

    // Get project details
    const projects = await base44.asServiceRole.entities.Project.filter({ 
      id: project_id 
    });
    const project = projects[0];

    // Prepare payload for external ERP
    const erpPayload = {
      source: 'Base44_SteelBuild',
      timestamp: new Date().toISOString(),
      project: {
        id: project_id,
        number: project?.project_number,
        name: project?.name,
        client: project?.client
      },
      data: exportData,
      sync_type
    };

    // Send to external ERP
    const erpResponse = await fetch(erpWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Source': 'Base44'
      },
      body: JSON.stringify(erpPayload)
    });

    if (!erpResponse.ok) {
      throw new Error(`ERP sync failed: ${erpResponse.status} ${erpResponse.statusText}`);
    }

    const erpResult = await erpResponse.json();

    return Response.json({ 
      success: true, 
      project_id,
      sync_type,
      records_synced: {
        sov_items: exportData.sov_items?.length || 0,
        actuals: exportData.actuals?.length || 0,
        change_orders: exportData.change_orders?.length || 0
      },
      erp_response: erpResult,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('ERP sync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});