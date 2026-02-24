import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * PMA Knowledge Extraction Engine
 * Auto-extracts learnings from closed projects, resolved RFIs, successful mitigations
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const { 
      project_id, 
      source_type = 'all',  // 'all', 'rfis', 'change_orders', 'field_issues', 'projects'
      auto_publish = false 
    } = await req.json();

    console.log(`[PMA] Extracting knowledge: ${source_type} ${project_id ? `for project ${project_id}` : 'across all projects'}`);

    const extractedArticles = [];

    // === EXTRACT FROM RESOLVED RFIs ===
    if (source_type === 'all' || source_type === 'rfis') {
      const rfiFilter = { status: 'closed' };
      if (project_id) rfiFilter.project_id = project_id;

      const closedRFIs = await base44.entities.RFI.filter(rfiFilter);
      
      console.log(`[PMA] Analyzing ${closedRFIs.length} closed RFIs`);

      // Process high-value RFIs (cost/schedule impact or complex resolution)
      const valuableRFIs = closedRFIs.filter(rfi => 
        (rfi.estimated_cost_impact && rfi.estimated_cost_impact > 5000) ||
        rfi.schedule_impact_days > 3 ||
        rfi.priority === 'critical' ||
        rfi.rfi_type !== 'other'
      );

      for (const rfi of valuableRFIs.slice(0, 10)) { // Process up to 10
        try {
          const project = await base44.entities.Project.filter({ id: rfi.project_id }).then(d => d[0]);
          
          const knowledgePrompt = `Extract reusable knowledge from this resolved RFI for a steel fabrication knowledge base.

RFI: ${rfi.subject}
Type: ${rfi.rfi_type}
Question: ${rfi.question}
Response: ${rfi.response}
Cost Impact: $${rfi.estimated_cost_impact || 0}
Schedule Impact: ${rfi.schedule_impact_days || 0} days
Resolution Days: ${rfi.response_days_actual || 'N/A'}
Project: ${project?.name}

Extract:
1. PROBLEM STATEMENT: What issue was encountered (generic enough for reuse)
2. SOLUTION: How it was resolved (specific techniques/approaches)
3. OUTCOME: Results, cost/schedule impact
4. KEYWORDS: 10-15 searchable terms
5. APPLICABLE SCENARIOS: When this knowledge applies
6. LESSONS LEARNED: Key takeaways for future projects

Focus on transferable knowledge, not project-specific details. Use steel industry terminology.`;

          const extracted = await base44.integrations.Core.InvokeLLM({
            prompt: knowledgePrompt,
            response_json_schema: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                problem_statement: { type: 'string' },
                solution: { type: 'string' },
                outcome: { type: 'string' },
                keywords: { type: 'array', items: { type: 'string' } },
                applicable_scenarios: { type: 'array', items: { type: 'string' } },
                lessons_learned: { type: 'string' },
                tags: { type: 'array', items: { type: 'string' } }
              }
            }
          });

          const article = {
            title: extracted.title || `RFI Resolution: ${rfi.rfi_type}`,
            category: 'rfi_resolution',
            discipline: 'coordination',
            content: `# ${extracted.title}\n\n## Problem\n${extracted.problem_statement}\n\n## Solution\n${extracted.solution}\n\n## Outcome\n${extracted.outcome}\n\n## Lessons Learned\n${extracted.lessons_learned}`,
            problem_statement: extracted.problem_statement,
            solution: extracted.solution,
            outcome: extracted.outcome,
            cost_impact: -(rfi.estimated_cost_impact || 0), // Negative = savings
            schedule_impact_days: rfi.schedule_impact_days || 0,
            source_project_id: rfi.project_id,
            source_entity_type: 'RFI',
            source_entity_id: rfi.id,
            keywords: extracted.keywords || [],
            tags: extracted.tags || [],
            applicable_scenarios: extracted.applicable_scenarios || [],
            ai_generated: true,
            status: auto_publish ? 'published' : 'draft',
            complexity: rfi.priority === 'critical' ? 'complex' : 'moderate'
          };

          extractedArticles.push(article);
        } catch (err) {
          console.error(`[PMA] Failed to extract from RFI ${rfi.id}:`, err);
        }
      }
    }

    // === EXTRACT FROM FIELD ISSUES ===
    if (source_type === 'all' || source_type === 'field_issues') {
      const issueFilter = { status: 'resolved' };
      if (project_id) issueFilter.project_id = project_id;

      const resolvedIssues = await base44.entities.FieldIssue.filter(issueFilter);
      
      console.log(`[PMA] Analyzing ${resolvedIssues.length} resolved field issues`);

      for (const issue of resolvedIssues.slice(0, 5)) {
        try {
          const knowledgePrompt = `Extract field technique knowledge from this resolved issue.

Issue: ${issue.title}
Category: ${issue.category}
Description: ${issue.description}
Resolution: ${issue.resolution}
Impact: ${issue.impact}

Extract practical field knowledge focusing on techniques, workarounds, and preventive measures.`;

          const extracted = await base44.integrations.Core.InvokeLLM({
            prompt: knowledgePrompt,
            response_json_schema: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                problem_statement: { type: 'string' },
                solution: { type: 'string' },
                outcome: { type: 'string' },
                keywords: { type: 'array', items: { type: 'string' } },
                tags: { type: 'array', items: { type: 'string' } }
              }
            }
          });

          extractedArticles.push({
            title: extracted.title || `Field Solution: ${issue.title}`,
            category: 'field_workaround',
            discipline: 'erection',
            content: `# ${extracted.title}\n\n## Problem\n${extracted.problem_statement}\n\n## Solution\n${extracted.solution}\n\n## Outcome\n${extracted.outcome}`,
            problem_statement: extracted.problem_statement,
            solution: extracted.solution,
            outcome: extracted.outcome,
            source_project_id: issue.project_id,
            source_entity_type: 'FieldIssue',
            source_entity_id: issue.id,
            keywords: extracted.keywords || [],
            tags: extracted.tags || [],
            ai_generated: true,
            status: auto_publish ? 'published' : 'draft'
          });
        } catch (err) {
          console.error(`[PMA] Failed to extract from field issue:`, err);
        }
      }
    }

    // === EXTRACT FROM CLOSED PROJECTS ===
    if (source_type === 'all' || source_type === 'projects') {
      const projectFilter = { status: { $in: ['completed', 'closed'] } };
      if (project_id) projectFilter.id = project_id;

      const closedProjects = await base44.entities.Project.filter(projectFilter);
      
      console.log(`[PMA] Analyzing ${closedProjects.length} closed projects`);

      for (const proj of closedProjects.slice(0, 3)) {
        try {
          // Gather project data
          const [rfis, changeOrders, workPackages] = await Promise.all([
            base44.entities.RFI.filter({ project_id: proj.id }),
            base44.entities.ChangeOrder.filter({ project_id: proj.id }),
            base44.entities.WorkPackage.filter({ project_id: proj.id })
          ]);

          const summaryPrompt = `Extract high-level project lessons learned.

PROJECT: ${proj.name} (${proj.project_number})
CONTRACT VALUE: $${(proj.contract_value || 0).toLocaleString()}
DURATION: ${proj.start_date} to ${proj.actual_completion}
RFIs: ${rfis.length}
CHANGE ORDERS: ${changeOrders.length}
WORK PACKAGES: ${workPackages.length}

Extract:
1. Key success factors
2. Major challenges and how they were overcome
3. Process improvements identified
4. Best practices to replicate
5. Pitfalls to avoid

Focus on actionable, transferable knowledge for future projects.`;

          const extracted = await base44.integrations.Core.InvokeLLM({
            prompt: summaryPrompt,
            response_json_schema: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                success_factors: { type: 'array', items: { type: 'string' } },
                challenges: { type: 'array', items: { type: 'string' } },
                best_practices: { type: 'array', items: { type: 'string' } },
                pitfalls: { type: 'array', items: { type: 'string' } },
                keywords: { type: 'array', items: { type: 'string' } }
              }
            }
          });

          const content = `# ${extracted.title}

## Success Factors
${extracted.success_factors?.map(f => `- ${f}`).join('\n') || 'N/A'}

## Challenges Overcome
${extracted.challenges?.map(c => `- ${c}`).join('\n') || 'N/A'}

## Best Practices
${extracted.best_practices?.map(p => `- ${p}`).join('\n') || 'N/A'}

## Pitfalls to Avoid
${extracted.pitfalls?.map(p => `- ${p}`).join('\n') || 'N/A'}`;

          extractedArticles.push({
            title: extracted.title || `Project Lessons: ${proj.name}`,
            category: 'lessons_learned',
            discipline: 'project_management',
            content,
            source_project_id: proj.id,
            source_entity_type: 'Manual',
            keywords: extracted.keywords || [],
            ai_generated: true,
            status: auto_publish ? 'published' : 'draft'
          });
        } catch (err) {
          console.error(`[PMA] Failed to extract from project:`, err);
        }
      }
    }

    // === SAVE ARTICLES ===
    
    const savedArticles = [];
    for (const article of extractedArticles) {
      try {
        const saved = await base44.asServiceRole.entities.KnowledgeArticle.create(article);
        savedArticles.push(saved);
        console.log(`[PMA] Created knowledge article: ${article.title}`);
      } catch (err) {
        console.error(`[PMA] Failed to save article:`, err);
      }
    }

    return Response.json({
      success: true,
      extracted: savedArticles.length,
      articles: savedArticles
    });

  } catch (error) {
    console.error('[PMA] Knowledge extraction error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});