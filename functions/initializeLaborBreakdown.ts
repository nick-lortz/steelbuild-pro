import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const LABOR_CATEGORIES = [
  { name: 'Embeds/Anchor Bolts', sequence_order: 1, is_specialty: false },
  { name: 'Columns', sequence_order: 2, is_specialty: false },
  { name: 'Beams', sequence_order: 3, is_specialty: false },
  { name: 'Joists', sequence_order: 4, is_specialty: false },
  { name: 'Bridging', sequence_order: 5, is_specialty: false },
  { name: 'Ledger', sequence_order: 6, is_specialty: false },
  { name: 'Deck-Support Embeds/Plates', sequence_order: 7, is_specialty: false },
  { name: 'Roof Frames/Mechanical Frames', sequence_order: 8, is_specialty: false },
  { name: 'Lintels', sequence_order: 9, is_specialty: false },
  { name: 'Moment Frame Bracing', sequence_order: 10, is_specialty: false },
  { name: 'Stairs and Rail', sequence_order: 11, is_specialty: false },
  { name: 'Site Steel', sequence_order: 12, is_specialty: false },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
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

    // Check if breakdowns already exist for this project
    const existingBreakdowns = await base44.asServiceRole.entities.LaborBreakdown.filter({ project_id });
    
    if (existingBreakdowns.length > 0) {
      return Response.json({ 
        message: 'Labor breakdowns already exist for this project',
        breakdowns: existingBreakdowns 
      });
    }

    // Create labor breakdown rows for each category
    const breakdowns = await Promise.all(
      categories.map(category => 
        base44.asServiceRole.entities.LaborBreakdown.create({
          project_id,
          labor_category_id: category.id,
          shop_hours: 0,
          field_hours: 0,
          notes: ''
        })
      )
    );

    return Response.json({
      success: true,
      message: `Created ${breakdowns.length} labor breakdown rows`,
      breakdowns
    });

  } catch (error) {
    console.error('Error initializing labor breakdown:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});