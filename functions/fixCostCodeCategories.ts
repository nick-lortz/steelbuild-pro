import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Mapping of common cost codes to their proper categories
const CATEGORY_MAPPINGS = {
  // Labor codes
  '01': 'labor', 'detailing': 'labor',
  '06': 'labor', 'shop labor': 'labor', 'fabrication': 'labor',
  '07': 'labor', 'field labor': 'labor', 'structural': 'labor', 'erection': 'labor',
  '08': 'labor', 'misc labor': 'labor',
  '11': 'labor', 'deck install': 'labor', 'install': 'labor',
  '15': 'labor', 'pm': 'labor', 'admin': 'labor', 'management': 'labor',
  
  // Material codes
  '02': 'material', 'ab': 'material', 'embeds': 'material', 'anchor': 'material',
  '03': 'material', 'joists': 'material', 'joist': 'material',
  '04': 'material', 'deck': 'material', 'decking': 'material',
  '05': 'material', 'material': 'material', 'steel': 'material', 'raw material': 'material',
  '12': 'material', 'coatings': 'material', 'coating': 'material', 'paint': 'material',
  
  // Equipment codes
  '09': 'equipment', 'equipment': 'equipment', 'crane': 'equipment', 'lift': 'equipment',
  
  // Subcontract codes
  '10': 'subcontract', 'shipping': 'subcontract', 'freight': 'subcontract', 'delivery': 'subcontract',
  
  // Other codes
  '13': 'other', 'misc': 'other', 'miscellaneous': 'other',
  '14': 'other', 'change order': 'other', 'co': 'other'
};

function inferCategory(code, name) {
  const searchStr = `${code} ${name}`.toLowerCase();
  
  // Check direct code matches first
  if (CATEGORY_MAPPINGS[code.toLowerCase()]) {
    return CATEGORY_MAPPINGS[code.toLowerCase()];
  }
  
  // Check name keywords
  for (const [keyword, category] of Object.entries(CATEGORY_MAPPINGS)) {
    if (searchStr.includes(keyword)) {
      return category;
    }
  }
  
  // Default fallback
  return 'other';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    // Get all cost codes
    const costCodes = await base44.entities.CostCode.list();
    
    const updates = [];
    const corrections = [];

    for (const cc of costCodes) {
      const inferredCategory = inferCategory(cc.code, cc.name);
      
      // Only update if category is 'other' or doesn't match inference
      if (cc.category === 'other' || cc.category !== inferredCategory) {
        updates.push({
          id: cc.id,
          code: cc.code,
          name: cc.name,
          oldCategory: cc.category,
          newCategory: inferredCategory
        });
        
        await base44.entities.CostCode.update(cc.id, {
          category: inferredCategory
        });
        
        corrections.push({
          code: cc.code,
          name: cc.name,
          from: cc.category,
          to: inferredCategory
        });
      }
    }

    return Response.json({
      success: true,
      message: `Fixed ${corrections.length} cost code categories`,
      totalCodes: costCodes.length,
      corrected: corrections.length,
      corrections
    });
  } catch (error) {
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});