import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const QA_RULES = {
  member_size: {
    prompt: "Check all member sizes (W-shapes, HSS, angles, plates) are called out with AISC standard designations. Flag any non-standard or ambiguous callouts.",
    severity: "P0"
  },
  missing_dimension: {
    prompt: "Identify any missing critical dimensions: member lengths, hole spacing, bolt patterns, weld lengths, plate dimensions.",
    severity: "P0"
  },
  annotation_error: {
    prompt: "Check for incomplete or conflicting annotations, missing detail references, unclear callouts.",
    severity: "P1"
  },
  connection_detail: {
    prompt: "Verify connection details show bolt sizes, quantities, edge distances per AISC standards. Check for missing shear tab dimensions.",
    severity: "P0"
  },
  weld_symbol: {
    prompt: "Validate weld symbols per AWS D1.1 standards. Check for missing weld sizes, lengths, or unclear symbols.",
    severity: "P0"
  },
  material_spec: {
    prompt: "Confirm material specifications are called out (ASTM A36, A992, A500, etc.). Flag missing or non-standard specs.",
    severity: "P1"
  },
  tolerance: {
    prompt: "Check if fabrication tolerances are specified where critical. Flag tight tolerances that may cause fit-up issues.",
    severity: "P1"
  }
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { revision_id } = await req.json();
    
    if (!revision_id) {
      return Response.json({ error: 'revision_id required' }, { status: 400 });
    }

    // Update status to in_progress
    await base44.asServiceRole.entities.DrawingRevision.update(revision_id, {
      qa_status: 'in_progress'
    });

    // Get revision
    const revisions = await base44.asServiceRole.entities.DrawingRevision.filter({ id: revision_id });
    const revision = revisions[0];
    
    if (!revision) {
      return Response.json({ error: 'Revision not found' }, { status: 404 });
    }

    const findings = [];
    let p0Count = 0;
    let p1Count = 0;

    // Run QA checks on each sheet
    for (const sheet of revision.sheets || []) {
      // Build comprehensive prompt
      const qaPrompt = `
You are a steel fabrication QA reviewer analyzing drawing sheet ${sheet.sheet_number}.
Review this sheet against AISC steel construction standards and flag issues.

Run these checks:
${Object.entries(QA_RULES).map(([key, rule]) => `- ${key}: ${rule.prompt}`).join('\n')}

For each issue found, provide:
1. Category (one of: ${Object.keys(QA_RULES).join(', ')})
2. Severity (P0 or P1)
3. Specific message describing the issue
4. Location on sheet (grid line, detail number, or general area)
5. Recommendation for fix

Return ONLY a JSON array of findings. If no issues, return empty array.
Example: [{"category": "member_size", "severity": "P0", "message": "Beam B3 shows 'W12' without depth callout", "location": "Grid A/1", "recommendation": "Specify complete section: W12x26"}]
`;

      try {
        // Call AI with drawing context
        const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: qaPrompt,
          add_context_from_internet: false,
          file_urls: [sheet.file_url],
          response_json_schema: {
            type: "object",
            properties: {
              findings: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    category: { type: "string" },
                    severity: { type: "string" },
                    message: { type: "string" },
                    location: { type: "string" },
                    recommendation: { type: "string" }
                  }
                }
              }
            }
          }
        });

        const sheetFindings = result.findings || [];
        
        for (const finding of sheetFindings) {
          findings.push({
            ...finding,
            sheet_number: sheet.sheet_number
          });
          
          if (finding.severity === 'P0') p0Count++;
          else if (finding.severity === 'P1') p1Count++;
        }
      } catch (error) {
        console.error(`QA error on sheet ${sheet.sheet_number}:`, error);
        findings.push({
          category: 'annotation_error',
          severity: 'P1',
          message: `QA review could not complete for this sheet: ${error.message}`,
          sheet_number: sheet.sheet_number,
          location: 'General',
          recommendation: 'Manual review required'
        });
        p1Count++;
      }
    }

    // Determine overall status
    const qaStatus = p0Count > 0 ? 'fail' : 'pass';

    // Update revision with results
    await base44.asServiceRole.entities.DrawingRevision.update(revision_id, {
      qa_status: qaStatus,
      qa_ran_at: new Date().toISOString(),
      qa_report_json: JSON.stringify({
        ran_at: new Date().toISOString(),
        sheets_reviewed: revision.sheets?.length || 0,
        findings,
        summary: {
          p0_count: p0Count,
          p1_count: p1Count,
          pass: qaStatus === 'pass'
        }
      }),
      qa_blockers: findings,
      p0_count: p0Count,
      p1_count: p1Count
    });

    return Response.json({
      success: true,
      qa_status: qaStatus,
      p0_count: p0Count,
      p1_count: p1Count,
      findings
    });

  } catch (error) {
    console.error('Drawing QA error:', error);
    
    // Update revision to reflect failure
    try {
      const { revision_id } = await req.json();
      if (revision_id) {
        await base44.asServiceRole.entities.DrawingRevision.update(revision_id, {
          qa_status: 'not_run',
          qa_report_json: JSON.stringify({
            error: error.message,
            failed_at: new Date().toISOString()
          })
        });
      }
    } catch {}
    
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});