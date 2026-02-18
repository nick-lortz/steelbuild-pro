import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireProjectAccess } from './utils/requireProjectAccess.js';
import { requireRole } from './_lib/authz.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { drawing_set_id_1, drawing_set_id_2 } = await req.json();

    if (!drawing_set_id_1 || !drawing_set_id_2) {
      return Response.json({ error: 'Two drawing set IDs required' }, { status: 400 });
    }

    // Get both drawing sets and verify project access
    const [drawingSet1] = await base44.asServiceRole.entities.DrawingSet.filter({ id: drawing_set_id_1 });
    const [drawingSet2] = await base44.asServiceRole.entities.DrawingSet.filter({ id: drawing_set_id_2 });

    if (!drawingSet1 || !drawingSet2) {
      return Response.json({ error: 'One or both drawing sets not found' }, { status: 404 });
    }
    
    // Drawing comparisons require Detailer/PM/Admin
    requireRole(user, ['admin', 'pm', 'detailer']);
    
    // Both sets must be from same project
    if (drawingSet1.project_id !== drawingSet2.project_id) {
      return Response.json({ error: 'Drawing sets must be from same project' }, { status: 400 });
    }
    
    await requireProjectAccess(base44, user, drawingSet1.project_id);

    // Get sheets for both sets
    const sheets1 = await base44.asServiceRole.entities.DrawingSheet.filter({ 
      drawing_set_id: drawing_set_id_1 
    });
    const sheets2 = await base44.asServiceRole.entities.DrawingSheet.filter({ 
      drawing_set_id: drawing_set_id_2 
    });

    if (sheets1.length === 0 || sheets2.length === 0) {
      return Response.json({ error: 'Both drawing sets must have sheets' }, { status: 400 });
    }

    // Get up to 3 sheets from each for comparison
    const files1 = sheets1.slice(0, 3).map(s => s.file_url).filter(Boolean);
    const files2 = sheets2.slice(0, 3).map(s => s.file_url).filter(Boolean);
    const allFiles = [...files1, ...files2];

    if (allFiles.length === 0) {
      return Response.json({ error: 'No valid files to compare' }, { status: 400 });
    }

    // Build comparison prompt
    const prompt = `You are comparing two versions of structural steel shop drawings.

VERSION 1: ${drawingSet1.set_name} - Rev ${drawingSet1.current_revision}
STATUS: ${drawingSet1.status}
${drawingSet1.ifa_date ? `IFA Date: ${drawingSet1.ifa_date}` : ''}

VERSION 2: ${drawingSet2.set_name} - Rev ${drawingSet2.current_revision}
STATUS: ${drawingSet2.status}
${drawingSet2.ifa_date ? `IFA Date: ${drawingSet2.ifa_date}` : ''}

Compare these drawing versions and identify:

1. **Discrepancies**: Different dimensions, member sizes, connection details, or specifications
2. **Outdated Information**: Elements in one version that have been updated in the other
3. **Conflicting Details**: Contradictory information between versions (material grades, bolt sizes, weld types)
4. **Additions/Deletions**: New elements added or removed between versions
5. **Specification Mismatches**: Differences between spec sheets and actual drawings
6. **Critical Changes**: Changes that impact fabrication, material procurement, or erection

Provide a detailed comparison report with specific locations and recommendations.`;

    const comparisonSchema = {
      type: "object",
      properties: {
        summary: { type: "string" },
        overall_change_level: {
          type: "string",
          enum: ["minor", "moderate", "major", "critical"]
        },
        discrepancies: {
          type: "array",
          items: {
            type: "object",
            properties: {
              category: {
                type: "string",
                enum: [
                  "dimension",
                  "member_size",
                  "connection",
                  "material_spec",
                  "weld_detail",
                  "bolt_pattern",
                  "other"
                ]
              },
              description: { type: "string" },
              version_1_value: { type: "string" },
              version_2_value: { type: "string" },
              location: { type: "string" },
              impact: {
                type: "string",
                enum: ["low", "medium", "high", "critical"]
              }
            }
          }
        },
        outdated_info: {
          type: "array",
          items: {
            type: "object",
            properties: {
              element: { type: "string" },
              old_value: { type: "string" },
              new_value: { type: "string" },
              location: { type: "string" }
            }
          }
        },
        conflicts: {
          type: "array",
          items: {
            type: "object",
            properties: {
              conflict_type: { type: "string" },
              description: { type: "string" },
              version_1_states: { type: "string" },
              version_2_states: { type: "string" },
              resolution_needed: { type: "boolean" }
            }
          }
        },
        additions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              added_in: { type: "string", enum: ["version_1", "version_2"] },
              element: { type: "string" },
              description: { type: "string" },
              location: { type: "string" }
            }
          }
        },
        deletions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              removed_from: { type: "string", enum: ["version_1", "version_2"] },
              element: { type: "string" },
              description: { type: "string" },
              location: { type: "string" }
            }
          }
        },
        critical_changes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              change_description: { type: "string" },
              impact_area: {
                type: "string",
                enum: ["fabrication", "procurement", "erection", "schedule", "cost"]
              },
              recommendation: { type: "string" }
            }
          }
        },
        recommendations: {
          type: "array",
          items: { type: "string" }
        }
      }
    };

    // Call AI
    const comparison = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      file_urls: allFiles,
      response_json_schema: comparisonSchema
    });

    // Build comparison report
    const reportParts = [
      `📋 **Drawing Comparison Report**`,
      ``,
      `**Version 1**: ${drawingSet1.set_name} (Rev ${drawingSet1.current_revision})`,
      `**Version 2**: ${drawingSet2.set_name} (Rev ${drawingSet2.current_revision})`,
      `**Change Level**: ${comparison.overall_change_level?.toUpperCase() || 'MODERATE'}`,
      ``,
      comparison.summary || '',
      ``
    ];

    if (comparison.discrepancies && comparison.discrepancies.length > 0) {
      reportParts.push(`\n🔍 **Discrepancies Detected (${comparison.discrepancies.length})**`);
      comparison.discrepancies.slice(0, 5).forEach(disc => {
        reportParts.push(`• [${disc.impact?.toUpperCase()}] ${disc.category}: ${disc.description}`);
        reportParts.push(`  V1: ${disc.version_1_value} → V2: ${disc.version_2_value}`);
        if (disc.location) reportParts.push(`  @ ${disc.location}`);
      });
      if (comparison.discrepancies.length > 5) {
        reportParts.push(`• +${comparison.discrepancies.length - 5} more discrepancies`);
      }
      reportParts.push('');
    }

    if (comparison.conflicts && comparison.conflicts.length > 0) {
      reportParts.push(`\n⚠️ **Conflicts (${comparison.conflicts.length})**`);
      comparison.conflicts.slice(0, 3).forEach(conflict => {
        reportParts.push(`• ${conflict.conflict_type}: ${conflict.description}`);
        if (conflict.resolution_needed) {
          reportParts.push(`  ⚡ Resolution Required`);
        }
      });
      reportParts.push('');
    }

    if (comparison.critical_changes && comparison.critical_changes.length > 0) {
      reportParts.push(`\n🚨 **Critical Changes (${comparison.critical_changes.length})**`);
      comparison.critical_changes.forEach(change => {
        reportParts.push(`• [${change.impact_area.toUpperCase()}] ${change.change_description}`);
        if (change.recommendation) {
          reportParts.push(`  💡 ${change.recommendation}`);
        }
      });
      reportParts.push('');
    }

    if (comparison.recommendations && comparison.recommendations.length > 0) {
      reportParts.push(`\n✅ **Recommendations**`);
      comparison.recommendations.forEach(rec => {
        reportParts.push(`• ${rec}`);
      });
    }

    const comparisonReport = reportParts.join('\n');

    return Response.json({ 
      success: true,
      comparison,
      report: comparisonReport,
      sets_compared: {
        version_1: {
          id: drawingSet1.id,
          name: drawingSet1.set_name,
          revision: drawingSet1.current_revision
        },
        version_2: {
          id: drawingSet2.id,
          name: drawingSet2.set_name,
          revision: drawingSet2.current_revision
        }
      }
    });

  } catch (error) {
    console.error('Drawing comparison error:', error);
    return Response.json({ 
      error: error.message,
      details: error.toString()
    }, { status: 500 });
  }
});