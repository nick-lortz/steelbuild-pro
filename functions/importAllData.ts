import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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

    const body = await req.json();
    const { snapshot, mode } = body; // mode: 'merge' | 'replace'

    if (!snapshot || !snapshot.entities) {
      return Response.json({ error: 'Invalid snapshot format' }, { status: 400 });
    }

    const results = {};
    const IMPORT_ORDER = [
      'CostCode', 'LaborCategory', 'Resource', 'Project',
      'WorkPackage', 'Task', 'RFI', 'ChangeOrder', 'Delivery',
      'Financial', 'Expense', 'DrawingSet', 'DrawingRevision', 'DrawingSheet',
      'LaborHours', 'LaborBreakdown', 'DailyLog', 'Document',
      'Meeting', 'Submittal', 'SOVItem', 'ClientInvoice', 'Invoice',
      'FabricationPackage', 'Fabrication', 'ProductionNote', 'ResourceAllocation',
      'FieldInstall', 'PunchItem', 'ProjectRisk', 'Notification'
    ];

    for (const entityName of IMPORT_ORDER) {
      const records = snapshot.entities[entityName];
      if (!records || records.length === 0) {
        results[entityName] = { imported: 0, skipped: 0 };
        continue;
      }

      let imported = 0;
      let skipped = 0;

      for (const record of records) {
        try {
          // Strip built-in read-only fields, keep id for reference integrity
          const { created_date, updated_date, ...data } = record;
          
          if (mode === 'replace') {
            // Try update first, create if not found
            try {
              await base44.asServiceRole.entities[entityName].update(record.id, data);
              imported++;
            } catch {
              await base44.asServiceRole.entities[entityName].create(data);
              imported++;
            }
          } else {
            // merge: only create if doesn't exist
            try {
              await base44.asServiceRole.entities[entityName].update(record.id, data);
              skipped++;
            } catch {
              await base44.asServiceRole.entities[entityName].create(data);
              imported++;
            }
          }
        } catch (e) {
          skipped++;
        }
      }

      results[entityName] = { imported, skipped };
    }

    const totalImported = Object.values(results).reduce((sum, r) => sum + r.imported, 0);
    const totalSkipped = Object.values(results).reduce((sum, r) => sum + r.skipped, 0);

    return Response.json({ success: true, results, totalImported, totalSkipped });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});