import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

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

// Inline the init logic so we can call it as service role without needing a forwarded user token
async function runInit(base44, project_id) {
  const existingCategories = await base44.asServiceRole.entities.LaborCategory.list();
  let categories = existingCategories;
  if (categories.length === 0) {
    categories = await Promise.all(
      LABOR_CATEGORIES.map(cat => base44.asServiceRole.entities.LaborCategory.create(cat))
    );
  }

  const existingBreakdowns = await base44.asServiceRole.entities.LaborBreakdown.filter({ project_id });
  const existingMap = new Map(existingBreakdowns.map(b => [b.labor_category_id, b]));

  let created = 0;
  let skipped = 0;
  for (const category of categories) {
    if (existingMap.has(category.id)) {
      skipped++;
    } else {
      await base44.asServiceRole.entities.LaborBreakdown.create({
        project_id,
        labor_category_id: category.id,
        shop_hours: 0,
        field_hours: 0,
        notes: '',
      });
      created++;
    }
  }
  return { created, skipped };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    // Create a throwaway test project
    const project = await base44.asServiceRole.entities.Project.create({
      name: "TEST - Labor Init Repair",
      project_number: `T-${Date.now()}`,
      status: "in_progress",
    });

    // First init — should create all 12
    await runInit(base44, project.id);
    let rows = await base44.asServiceRole.entities.LaborBreakdown.filter({ project_id: project.id });

    const countAfterFirst = rows.length;

    // Delete one row to simulate partial/missing state
    if (rows.length > 0) {
      await base44.asServiceRole.entities.LaborBreakdown.delete(rows[0].id);
    }

    // Second init — should repair the missing row
    const r2 = await runInit(base44, project.id);
    rows = await base44.asServiceRole.entities.LaborBreakdown.filter({ project_id: project.id });

    const finalCount = rows.length;
    const pass = finalCount === 12 && r2.created === 1;

    // Cleanup
    for (const row of rows) {
      await base44.asServiceRole.entities.LaborBreakdown.delete(row.id);
    }
    await base44.asServiceRole.entities.Project.delete(project.id);

    return Response.json({
      success: true,
      count_after_first_init: countAfterFirst,
      created_after_delete: r2.created,
      skipped_after_delete: r2.skipped,
      final_count: finalCount,
      pass,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});