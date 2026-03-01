import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const ENTITIES = [
  'Project', 'Task', 'RFI', 'ChangeOrder', 'Delivery', 'Financial',
  'Expense', 'WorkPackage', 'DrawingSet', 'DrawingRevision', 'DrawingSheet',
  'Resource', 'ResourceAllocation', 'LaborHours', 'DailyLog', 'Document',
  'Meeting', 'Submittal', 'SOVItem', 'ClientInvoice', 'Invoice', 'CostCode',
  'LaborBreakdown', 'LaborCategory', 'FabricationPackage', 'Fabrication',
  'ProductionNote', 'FieldInstall', 'PunchItem', 'ProjectRisk', 'Notification'
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const snapshot = {
      exported_at: new Date().toISOString(),
      exported_by: user.email,
      app_version: '1.0',
      entities: {}
    };

    for (const entityName of ENTITIES) {
      try {
        const records = await base44.asServiceRole.entities[entityName].list('-created_date', 10000);
        snapshot.entities[entityName] = records || [];
      } catch (e) {
        snapshot.entities[entityName] = [];
      }
    }

    return Response.json({ success: true, snapshot });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});