import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { drawing_set_id } = await req.json();

    if (!drawing_set_id) {
      return Response.json({ error: 'drawing_set_id required' }, { status: 400 });
    }

    // Get drawing set and sheets
    const [drawingSet] = await base44.asServiceRole.entities.DrawingSet.filter({ id: drawing_set_id });
    if (!drawingSet) {
      return Response.json({ error: 'Drawing set not found' }, { status: 404 });
    }

    const sheets = await base44.asServiceRole.entities.DrawingSheet.filter({ 
      drawing_set_id: drawing_set_id 
    });

    if (sheets.length === 0) {
      return Response.json({ error: 'No sheets to analyze' }, { status: 400 });
    }

    // Update status to in_progress
    await base44.asServiceRole.entities.DrawingSet.update(drawing_set_id, {
      ai_review_status: 'in_progress'
    });

    // Get previous revisions for comparison
    const allSets = await base44.asServiceRole.entities.DrawingSet.filter({
      project_id: drawingSet.project_id,
      set_number: drawingSet.set_number
    });
    const previousRevisions = allSets
      .filter(s => s.id !== drawing_set_id && s.current_revision < drawingSet.current_revision)
      .sort((a, b) => b.current_revision.localeCompare(a.current_revision));

    // Analyze up to 5 sheets
    const sheetsToAnalyze = sheets.slice(0, 5);
    const fileUrls = sheetsToAnalyze.map(s => s.file_url).filter(Boolean);

    if (fileUrls.length === 0) {
      await base44.asServiceRole.entities.DrawingSet.update(drawing_set_id, {
        ai_review_status: 'failed',
        ai_summary: 'No valid file URLs found'
      });
      return Response.json({ error: 'No valid files to analyze' }, { status: 400 });
    }

    // Build analysis prompt
    const prompt = `You are analyzing structural steel shop drawings.

DRAWING SET: ${drawingSet.set_name}
REVISION: ${drawingSet.current_revision}
DISCIPLINE: ${drawingSet.discipline}
${previousRevisions.length > 0 ? `PREVIOUS REVISION: ${previousRevisions[0].current_revision}` : ''}

Extract and analyze:
1. Key dimensions, member sizes, and material specifications
2. Connection details and bolt patterns
3. Revision dates and notes visible on drawings
4. Any clashes, inconsistencies, or issues
5. Changes from previous revision (if applicable)

QUALITY CHECKS - Identify these common issues:
- Missing dimensions (overall, detail, or critical measurements)
- Unclear or illegible annotations
- Incorrect or inconsistent material callouts (wrong grade, conflicting specs)
- Non-standard symbols or missing symbol legends
- Incomplete or missing connection details
- Missing or unclear weld symbols
- Scale inconsistencies or missing scale notations
- Missing detail references or callouts

Provide a concise, actionable summary focused on fabrication and erection requirements.`;

    const analysisSchema = {
      type: "object",
      properties: {
        key_info: {
          type: "object",
          properties: {
            member_sizes: { type: "array", items: { type: "string" } },
            materials: { type: "array", items: { type: "string" } },
            connections: { type: "array", items: { type: "string" } },
            dimensions: { type: "array", items: { type: "string" } }
          }
        },
        revision_info: {
          type: "object",
          properties: {
            revision_date: { type: "string" },
            revision_notes: { type: "array", items: { type: "string" } }
          }
        },
        quality_checks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              category: {
                type: "string",
                enum: [
                  "missing_dimensions",
                  "unclear_annotations",
                  "material_callout_error",
                  "non_standard_symbol",
                  "missing_detail",
                  "weld_symbol_issue",
                  "scale_issue",
                  "missing_reference"
                ]
              },
              description: { type: "string" },
              severity: {
                type: "string",
                enum: ["low", "medium", "high", "critical"]
              },
              location: { type: "string" },
              recommendation: { type: "string" }
            }
          }
        },
        issues: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { 
                type: "string",
                enum: ["clash", "inconsistency", "missing_info", "unclear_detail", "other"]
              },
              description: { type: "string" },
              severity: { 
                type: "string",
                enum: ["low", "medium", "high", "critical"]
              },
              location: { type: "string" }
            }
          }
        },
        changes_from_previous: {
          type: "array",
          items: {
            type: "object",
            properties: {
              category: { type: "string" },
              description: { type: "string" },
              impact: { type: "string" }
            }
          }
        },
        summary: { type: "string" },
        fabrication_notes: { type: "array", items: { type: "string" } },
        erection_notes: { type: "array", items: { type: "string" } }
      }
    };

    // Call AI
    const analysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      file_urls: fileUrls,
      response_json_schema: analysisSchema
    });

    // Build AI summary text
    const summaryParts = [
      `📊 **Drawing Set Analysis - ${drawingSet.set_name}**`,
      ``,
      analysis.summary || '',
      ``
    ];

    if (analysis.quality_checks && analysis.quality_checks.length > 0) {
      const criticalQC = analysis.quality_checks.filter(q => q.severity === 'critical' || q.severity === 'high');
      if (criticalQC.length > 0) {
        summaryParts.push(`🔍 **Quality Issues Detected (${criticalQC.length} critical/high)**`);
        criticalQC.slice(0, 3).forEach(qc => {
          const categoryLabel = qc.category.replace(/_/g, ' ').toUpperCase();
          summaryParts.push(`• [${qc.severity.toUpperCase()}] ${categoryLabel}: ${qc.description} ${qc.location ? `@ ${qc.location}` : ''}`);
        });
        if (criticalQC.length > 3) {
          summaryParts.push(`• +${criticalQC.length - 3} more quality issues`);
        }
        summaryParts.push('');
      }
    }

    if (analysis.issues && analysis.issues.length > 0) {
      summaryParts.push(`⚠️ **Issues Detected (${analysis.issues.length})**`);
      const criticalIssues = analysis.issues.filter(i => i.severity === 'critical' || i.severity === 'high');
      criticalIssues.slice(0, 3).forEach(issue => {
        summaryParts.push(`• [${issue.severity.toUpperCase()}] ${issue.description} ${issue.location ? `@ ${issue.location}` : ''}`);
      });
      if (analysis.issues.length > 3) {
        summaryParts.push(`• +${analysis.issues.length - 3} more issues`);
      }
      summaryParts.push('');
    }

    if (analysis.changes_from_previous && analysis.changes_from_previous.length > 0) {
      summaryParts.push(`📝 **Changes from Rev ${previousRevisions[0]?.current_revision || 'Previous'}**`);
      analysis.changes_from_previous.slice(0, 3).forEach(change => {
        summaryParts.push(`• ${change.category}: ${change.description}`);
      });
      summaryParts.push('');
    }

    if (analysis.key_info) {
      if (analysis.key_info.member_sizes?.length > 0) {
        summaryParts.push(`🔧 **Key Members**: ${analysis.key_info.member_sizes.slice(0, 5).join(', ')}`);
      }
      if (analysis.key_info.materials?.length > 0) {
        summaryParts.push(`📦 **Materials**: ${analysis.key_info.materials.slice(0, 3).join(', ')}`);
      }
    }

    const aiSummary = summaryParts.join('\n');

    // Store metadata on each sheet
    for (const sheet of sheetsToAnalyze) {
      await base44.asServiceRole.entities.DrawingSheet.update(sheet.id, {
        ai_reviewed: true,
        ai_findings: JSON.stringify({
          key_info: analysis.key_info,
          quality_checks: analysis.quality_checks?.filter(q => 
            q.location && q.location.includes(sheet.sheet_number)
          ) || [],
          issues: analysis.issues?.filter(i => 
            i.location && i.location.includes(sheet.sheet_number)
          ) || []
        })
      });
    }

    // Update drawing set
    await base44.asServiceRole.entities.DrawingSet.update(drawing_set_id, {
      ai_review_status: 'completed',
      ai_summary: aiSummary
    });

    return Response.json({ 
      success: true,
      analysis,
      summary: aiSummary,
      sheets_analyzed: sheetsToAnalyze.length
    });

  } catch (error) {
    console.error('Drawing analysis error:', error);
    
    // Try to update status to failed if we have the drawing_set_id
    try {
      const { drawing_set_id } = await req.json();
      if (drawing_set_id) {
        const base44 = createClientFromRequest(req);
        await base44.asServiceRole.entities.DrawingSet.update(drawing_set_id, {
          ai_review_status: 'failed',
          ai_summary: `Analysis failed: ${error.message}`
        });
      }
    } catch (updateError) {
      console.error('Failed to update error status:', updateError);
    }

    return Response.json({ 
      error: error.message,
      details: error.toString()
    }, { status: 500 });
  }
});