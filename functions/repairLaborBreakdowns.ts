import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { project_id } = await req.json();

    if (!project_id) {
      return Response.json({ error: 'project_id required' }, { status: 400 });
    }

    // Fetch all breakdowns for this project
    const breakdowns = await base44.asServiceRole.entities.LaborBreakdown.filter({ project_id });

    if (breakdowns.length === 0) {
      return Response.json({ 
        message: 'No breakdowns found',
        duplicates_found: 0,
        duplicates_merged: 0
      });
    }

    // Group by labor_category_id
    const grouped = {};
    for (const breakdown of breakdowns) {
      const catId = breakdown.labor_category_id;
      if (!grouped[catId]) {
        grouped[catId] = [];
      }
      grouped[catId].push(breakdown);
    }

    // Identify duplicates
    const duplicateCategories = Object.entries(grouped).filter(([_, items]) => items.length > 1);

    if (duplicateCategories.length === 0) {
      return Response.json({ 
        message: 'No duplicates found',
        duplicates_found: 0,
        duplicates_merged: 0
      });
    }

    const mergeResults = [];

    // Merge duplicates
    for (const [categoryId, dupes] of duplicateCategories) {
      // Sort by updated_date desc, then by total hours desc
      dupes.sort((a, b) => {
        const totalA = (Number(a.shop_hours) || 0) + (Number(a.field_hours) || 0);
        const totalB = (Number(b.shop_hours) || 0) + (Number(b.field_hours) || 0);
        
        if (a.updated_date && b.updated_date) {
          return new Date(b.updated_date) - new Date(a.updated_date);
        }
        return totalB - totalA;
      });

      // Primary record is first (most recent/highest hours)
      const primary = dupes[0];
      const others = dupes.slice(1);

      // Calculate merged totals
      const mergedShop = dupes.reduce((sum, d) => sum + (Number(d.shop_hours) || 0), 0);
      const mergedField = dupes.reduce((sum, d) => sum + (Number(d.field_hours) || 0), 0);

      // Merge notes
      const allNotes = dupes
        .map(d => d.notes)
        .filter(n => n && n.trim())
        .join(' | ');

      // Update primary with merged data
      await base44.asServiceRole.entities.LaborBreakdown.update(primary.id, {
        shop_hours: mergedShop,
        field_hours: mergedField,
        notes: allNotes || null
      });

      // Delete duplicates
      for (const dupe of others) {
        await base44.asServiceRole.entities.LaborBreakdown.delete(dupe.id);
      }

      mergeResults.push({
        category_id: categoryId,
        duplicates_removed: others.length,
        merged_shop_hours: mergedShop,
        merged_field_hours: mergedField,
        kept_record_id: primary.id
      });
    }

    return Response.json({
      message: 'Duplicates merged successfully',
      duplicates_found: duplicateCategories.length,
      duplicates_merged: mergeResults.reduce((sum, r) => sum + r.duplicates_removed, 0),
      details: mergeResults
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});