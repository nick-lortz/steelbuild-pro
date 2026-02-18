import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { drawing_set_id, project_id } = await req.json();

  if (!drawing_set_id || !project_id) {
    return Response.json({ error: 'drawing_set_id and project_id required' }, { status: 400 });
  }

  // Fetch all sheets in this set
  const sheets = await base44.entities.DrawingSheet.filter({ drawing_set_id });
  
  if (sheets.length === 0) {
    return Response.json({ error: 'No sheets found for this set' }, { status: 404 });
  }

  // Fetch all sheets in the project for cross-referencing
  const allProjectSheets = await base44.entities.DrawingSheet.filter({ project_id });
  
  // Analyze each sheet
  const analysisPrompt = `You are a structural steel detailing expert reviewing shop drawings and construction documents.

ANALYZE THESE DRAWINGS FOR:

1. DIMENSION CONFLICTS
   - Compare elevations, member sizes, embedment depths across sheets
   - Flag mismatches (e.g., Pit depth S101 = -5'-0" vs A2.1 = -4'-0")
   - Check plate thickness consistency
   - Verify anchor spacing matches between structural and architectural

2. ERECTION RISKS
   - Anchor types into unsuitable substrates (e.g., SB-2 into CMU face shell)
   - Tight tolerances that won't work in field
   - Access issues for bolting or welding
   - Sequencing conflicts
   - Temporary bracing requirements
   - Clearance issues

3. MISSING INFORMATION
   - Bolt grades not specified
   - Weld sizes missing
   - Embedment depths unclear
   - Connection details incomplete
   - Material specs missing

4. CONNECTION IMPROVEMENTS
   - Bolt count reduction opportunities
   - Weld optimization
   - Standard plate usage
   - Field-friendly alternatives
   - Inspection access improvements

5. DESIGN INTENT CHANGES
   - Load path changes from contract docs
   - Member size changes
   - Connection type changes
   - Scope additions/deletions
   - Anchor system changes

For each finding, provide:
- Conflict type
- Sheet references
- Location (grid line, detail number)
- Risk level (low/medium/high/critical)
- Fabrication impact (true/false)
- Erection impact (true/false)
- Design intent change (true/false)
- Confidence score (0-100)
- Recommended action

Return comprehensive analysis as structured JSON.`;

  const fileUrls = sheets.map(s => s.file_url).filter(Boolean);
  
  if (fileUrls.length === 0) {
    return Response.json({ error: 'No file URLs found in sheets' }, { status: 400 });
  }

  // Run AI analysis
  const analysisResult = await base44.integrations.Core.InvokeLLM({
    prompt: analysisPrompt,
    file_urls: fileUrls,
    response_json_schema: {
      type: "object",
      properties: {
        conflicts: {
          type: "array",
          items: {
            type: "object",
            properties: {
              conflict_type: { type: "string" },
              sheet_1_number: { type: "string" },
              sheet_2_number: { type: "string" },
              description: { type: "string" },
              location_reference: { type: "string" },
              sheet_1_value: { type: "string" },
              sheet_2_value: { type: "string" },
              risk_level: { type: "string" },
              fabrication_impact: { type: "boolean" },
              erection_impact: { type: "boolean" },
              design_intent_change: { type: "boolean" },
              confidence_score: { type: "number" }
            }
          }
        },
        erection_issues: {
          type: "array",
          items: {
            type: "object",
            properties: {
              issue_type: { type: "string" },
              sheet_number: { type: "string" },
              description: { type: "string" },
              location_reference: { type: "string" },
              related_connection: { type: "string" },
              install_risk: { type: "string" },
              field_delay_risk: { type: "string" },
              confidence_score: { type: "number" }
            }
          }
        },
        rfi_suggestions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              trigger_source: { type: "string" },
              proposed_question: { type: "string" },
              referenced_sheet_numbers: { type: "array", items: { type: "string" } },
              location_reference: { type: "string" },
              fabrication_hold: { type: "boolean" },
              schedule_risk: { type: "string" },
              confidence_score: { type: "number" }
            }
          }
        },
        connection_improvements: {
          type: "array",
          items: {
            type: "object",
            properties: {
              sheet_number: { type: "string" },
              original_detail_reference: { type: "string" },
              suggested_improvement: { type: "string" },
              improvement_category: { type: "string" },
              impact: { type: "string" },
              estimated_savings: { type: "number" },
              applicability_tags: { type: "array", items: { type: "string" } },
              confidence_score: { type: "number" }
            }
          }
        },
        design_intent_flags: {
          type: "array",
          items: {
            type: "object",
            properties: {
              change_category: { type: "string" },
              sheet_number: { type: "string" },
              description: { type: "string" },
              location_reference: { type: "string" },
              original_intent: { type: "string" },
              new_intent: { type: "string" },
              requires_PM_approval: { type: "boolean" },
              requires_engineer_review: { type: "boolean" },
              fabrication_impact: { type: "boolean" },
              cost_impact_estimate: { type: "number" },
              confidence_score: { type: "number" }
            }
          }
        }
      }
    }
  });

  // Map sheet numbers to IDs
  const getSheetId = (sheetNumber) => {
    const sheet = allProjectSheets.find(s => 
      s.sheet_number?.toLowerCase() === sheetNumber?.toLowerCase()
    );
    return sheet?.id;
  };

  // Create DrawingConflict records
  const conflicts = await Promise.all(
    (analysisResult.conflicts || []).map(async (c) => {
      const sheet1Id = getSheetId(c.sheet_1_number);
      const sheet2Id = getSheetId(c.sheet_2_number);
      
      if (!sheet1Id || !sheet2Id) return null;

      const requiresPM = c.fabrication_impact || c.erection_impact || c.design_intent_change;
      const requiresEOR = ['load_path', 'embedment', 'anchor_system'].some(cat => 
        c.conflict_type?.toLowerCase().includes(cat)
      );

      return await base44.asServiceRole.entities.DrawingConflict.create({
        project_id,
        sheet_1_id: sheet1Id,
        sheet_2_id: sheet2Id,
        conflict_type: c.conflict_type || 'dimension',
        description: c.description,
        location_reference: c.location_reference,
        sheet_1_value: c.sheet_1_value,
        sheet_2_value: c.sheet_2_value,
        risk_level: c.risk_level || 'medium',
        fabrication_impact: c.fabrication_impact || false,
        erection_impact: c.erection_impact || false,
        design_intent_change: c.design_intent_change || false,
        requires_PM_review: requiresPM,
        requires_EOR_review: requiresEOR,
        confidence_score: c.confidence_score || 0,
        detected_at: new Date().toISOString()
      });
    })
  );

  // Create ErectionIssue records
  const erectionIssues = await Promise.all(
    (analysisResult.erection_issues || []).map(async (e) => {
      const sheetId = getSheetId(e.sheet_number);
      if (!sheetId) return null;

      return await base44.asServiceRole.entities.ErectionIssue.create({
        project_id,
        sheet_id: sheetId,
        issue_type: e.issue_type || 'installability',
        description: e.description,
        related_connection: e.related_connection,
        location_reference: e.location_reference,
        install_risk: e.install_risk || 'medium',
        field_delay_risk: e.field_delay_risk || 'medium',
        inspection_risk: e.inspection_risk || 'low',
        confidence_score: e.confidence_score || 0,
        detected_at: new Date().toISOString()
      });
    })
  );

  // Create RFISuggestion records
  const rfiSuggestions = await Promise.all(
    (analysisResult.rfi_suggestions || []).map(async (r) => {
      const referencedSheets = r.referenced_sheet_numbers?.map(getSheetId).filter(Boolean) || [];

      return await base44.asServiceRole.entities.RFISuggestion.create({
        project_id,
        trigger_source: r.trigger_source || 'missing_dimension',
        proposed_question: r.proposed_question,
        referenced_sheets: referencedSheets,
        location_reference: r.location_reference,
        fabrication_hold: r.fabrication_hold || false,
        schedule_risk: r.schedule_risk || 'medium',
        confidence_score: r.confidence_score || 0
      });
    })
  );

  // Create ConnectionImprovement records
  const connectionImprovements = await Promise.all(
    (analysisResult.connection_improvements || []).map(async (ci) => {
      const sheetId = getSheetId(ci.sheet_number);
      if (!sheetId) return null;

      return await base44.asServiceRole.entities.ConnectionImprovement.create({
        project_id,
        sheet_id: sheetId,
        original_detail_reference: ci.original_detail_reference,
        suggested_improvement: ci.suggested_improvement,
        improvement_category: ci.improvement_category || 'cost_reduction',
        impact: ci.impact || 'cost',
        estimated_savings: ci.estimated_savings || 0,
        applicability_tags: ci.applicability_tags || [],
        confidence_score: ci.confidence_score || 0
      });
    })
  );

  // Create DesignIntentFlag records
  const designFlags = await Promise.all(
    (analysisResult.design_intent_flags || []).map(async (df) => {
      const sheetId = getSheetId(df.sheet_number);
      if (!sheetId) return null;

      const requiresEngineer = ['load_path', 'embedment', 'anchor_system'].includes(df.change_category);

      return await base44.asServiceRole.entities.DesignIntentFlag.create({
        project_id,
        sheet_id: sheetId,
        change_category: df.change_category || 'scope_add',
        description: df.description,
        location_reference: df.location_reference,
        original_intent: df.original_intent,
        new_intent: df.new_intent,
        requires_PM_approval: df.requires_PM_approval || true,
        requires_engineer_review: df.requires_engineer_review || requiresEngineer,
        fabrication_impact: df.fabrication_impact || false,
        cost_impact_estimate: df.cost_impact_estimate || 0,
        confidence_score: df.confidence_score || 0,
        status: requiresEngineer ? 'engineer_review' : 'pm_review'
      });
    })
  );

  return Response.json({
    success: true,
    analysis_complete: true,
    counts: {
      conflicts: conflicts.filter(Boolean).length,
      erection_issues: erectionIssues.filter(Boolean).length,
      rfi_suggestions: rfiSuggestions.filter(Boolean).length,
      connection_improvements: connectionImprovements.filter(Boolean).length,
      design_flags: designFlags.filter(Boolean).length
    }
  });
});