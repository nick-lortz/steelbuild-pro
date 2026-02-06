import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const LABOR_CATEGORIES = [
  { name: 'Embeds/Anchor Bolts (If Applicable)', sequence_order: 1, is_specialty: false },
  { name: 'Columns (If Applicable)', sequence_order: 2, is_specialty: false },
  { name: 'Beams (If Applicable)', sequence_order: 3, is_specialty: false },
  { name: 'Joists (If Applicable)', sequence_order: 4, is_specialty: false },
  { name: 'Bridging (If Applicable)', sequence_order: 5, is_specialty: false },
  { name: 'Ledger (If Applicable)', sequence_order: 6, is_specialty: false },
  { name: 'Deck-Support Embeds/Plates (If Applicable)', sequence_order: 7, is_specialty: false },
  { name: 'Roof Frames/Mechanical Frames (If Applicable)', sequence_order: 8, is_specialty: false },
  { name: 'Lintels (If Applicable)', sequence_order: 9, is_specialty: false },
  { name: 'Moment Frame Bracing (If Applicable)', sequence_order: 10, is_specialty: false },
  { name: 'Stairs and Rail (If Applicable)', sequence_order: 11, is_specialty: false },
  { name: 'Site Steel (If Applicable)', sequence_order: 12, is_specialty: false },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { project_id } = await req.json();

    if (!project_id) {
      return Response.json({ error: 'project_id is required' }, { status: 400 });
    }

    // Get or seed labor categories
    const existingCategories = await base44.asServiceRole.entities.LaborCategory.list();
    
    let categories = [];
    if (existingCategories.length === 0) {
      // Seed categories
      const createdCategories = await Promise.all(
        LABOR_CATEGORIES.map(cat => base44.asServiceRole.entities.LaborCategory.create(cat))
      );
      categories = createdCategories;
    } else {
      categories = existingCategories;
    }

    // Fetch existing breakdowns
    const existingBreakdowns = await base44.asServiceRole.entities.LaborBreakdown.filter({ project_id });
    
    // Build map of existing categories
    const existingMap = new Map();
    for (const breakdown of existingBreakdowns) {
      existingMap.set(breakdown.labor_category_id, breakdown);
    }

    // Find or create for each category
    const results = [];
    for (const category of categories) {
      if (existingMap.has(category.id)) {
        // Already exists, skip
        results.push({
          action: 'skipped',
          category_id: category.id,
          category_name: category.name,
          breakdown_id: existingMap.get(category.id).id
        });
      } else {
        // Create new
        const breakdown = await base44.asServiceRole.entities.LaborBreakdown.create({
          project_id,
          labor_category_id: category.id,
          shop_hours: 0,
          field_hours: 0,
          notes: ''
        });
        results.push({
          action: 'created',
          category_id: category.id,
          category_name: category.name,
          breakdown_id: breakdown.id
        });
      }
    }

    const created = results.filter(r => r.action === 'created').length;
    const skipped = results.filter(r => r.action === 'skipped').length;

    return Response.json({
      success: true,
      message: `Created ${created}, skipped ${skipped} existing`,
      created,
      skipped,
      details: results
    });

  } catch (error) {
    console.error('Error initializing labor breakdown:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});