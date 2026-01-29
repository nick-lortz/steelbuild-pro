import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const STANDARD_COST_CODES = [
  { code: '01', name: 'Detailing', category: 'labor' },
  { code: '02', name: 'AB/Embeds', category: 'material' },
  { code: '03', name: 'Joists', category: 'material' },
  { code: '04', name: 'Deck', category: 'material' },
  { code: '05', name: 'Material', category: 'material' },
  { code: '06', name: 'Shop Labor & Fabrication', category: 'labor' },
  { code: '07', name: 'Field Labor - Structural', category: 'labor' },
  { code: '08', name: 'Field Labor - Misc.', category: 'labor' },
  { code: '09', name: 'Equipment', category: 'equipment' },
  { code: '10', name: 'Shipping', category: 'subcontract' },
  { code: '11', name: 'Deck Install', category: 'labor' },
  { code: '12', name: 'Special Coatings', category: 'material' },
  { code: '13', name: 'Misc.', category: 'other' },
  { code: '14', name: 'Change Orders', category: 'other' },
  { code: '15', name: 'PM/Admin', category: 'labor' }
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if cost codes already exist
    const existing = await base44.entities.CostCode.list();
    const existingCodes = new Set(existing.map(c => c.code));

    // Filter to only import codes that don't exist
    const toCreate = STANDARD_COST_CODES.filter(cc => !existingCodes.has(cc.code));

    if (toCreate.length === 0) {
      return Response.json({
        success: true,
        message: 'All standard cost codes already exist',
        created: 0,
        total: STANDARD_COST_CODES.length
      });
    }

    // Bulk create
    const created = await base44.entities.CostCode.bulkCreate(toCreate);

    return Response.json({
      success: true,
      message: `Initialized standard cost codes`,
      created: created.length,
      total: STANDARD_COST_CODES.length,
      codes: created.map(c => ({ code: c.code, name: c.name }))
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});