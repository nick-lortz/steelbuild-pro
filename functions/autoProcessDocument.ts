import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireProjectAccess } from './utils/requireProjectAccess.js';
import { callLLMSafe } from './_lib/aiPolicy.js';
import { redactPII } from './_lib/redact.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { document_id, file_url, category, title } = await req.json();

    if (!document_id || !file_url) {
      return Response.json({ error: 'document_id and file_url required' }, { status: 400 });
    }
    
    // Get document and verify project access
    const docs = await base44.asServiceRole.entities.Document.filter({ id: document_id });
    const currentDoc = docs[0];
    
    if (!currentDoc) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }
    
    await requireProjectAccess(base44, user, currentDoc.project_id, 'edit');

    // Extract metadata and text using AI (PII-safe)
    const extraction = await callLLMSafe(base44, {
      prompt: `Analyze this construction document for a structural steel project. Extract ALL relevant information (NO PII, NO worker names):

STRUCTURAL ELEMENTS (if applicable):
- Drawing/sheet number (e.g., S-101, A-201, DS-001)
- Drawing title and description
- Revision number and date
- Referenced drawings or details
- Structural members: beams (W-shapes, HSS), columns, braces, joists, deck, connections
- Material specifications: ASTM grades (A992, A36, A572), steel types, coating specs
- Weld specifications: E70XX, SMAW, FCAW, inspection requirements
- Bolt specifications: A325, A490, sizes, pretension requirements
- Anchor/embed details: embedment depth, anchor bolt types, grout requirements
- Dimensions, grid lines, elevations, tolerances

EQUIPMENT & MATERIALS:
- Equipment mentioned: cranes (capacity, boom length), lifts, welding machines, tools
- Material quantities: tonnage, linear footage, square footage, piece counts
- Consumables: welding wire, bolts, shims, grout, paint
- Subcontractor scopes: detailing, galvanizing, inspection, fireproofing

SPECIFICATIONS & REQUIREMENTS:
- Spec section references (e.g., 05 12 00 Structural Steel)
- Code requirements: IBC, AISC, AWS D1.1, OSHA
- QA/QC requirements and inspection hold points
- Load ratings, deflection limits, safety factors
- Installation tolerances and acceptance criteria

SCHEDULE & LOGISTICS:
- Milestone dates: shop release, delivery windows, erection sequences
- Lead times for materials or fabrication
- Delivery requirements: staging areas, crane picks, access constraints
- Weather/seasonal constraints

COST & COMMERCIAL:
- Cost code references
- Budget line items or SOV references
- Change order impacts
- Vendor/subcontractor pricing

RFI/ISSUE TRACKING:
- Open questions or unresolved conflicts
- Design clarifications needed
- Missing information or dimension gaps

TAGS & CATEGORIZATION:
- Suggest 8-12 specific tags for robust search: structural elements, phases, locations, spec sections, action items
- Examples: W18x35, Grid_A1-A5, Level_2, erection_sequence, crane_pick, hold_point, AWS_D1.1, galv_required

Return comprehensive, field-ready metadata for project control and search.`,
      file_urls: [file_url],
      payload: null,
      project_id: currentDoc.project_id,
      response_json_schema: {
        type: 'object',
        properties: {
          document_type: { type: 'string' },
          suggested_category: { type: 'string' },
          drawing_number: { type: ['string', 'null'] },
          title: { type: ['string', 'null'] },
          revision: { type: ['string', 'null'] },
          date: { type: ['string', 'null'] },
          project_info: { type: ['string', 'null'] },
          structural_elements: {
            type: 'array',
            items: { type: 'string' },
            description: 'Member types, connections, details'
          },
          materials: {
            type: 'array',
            items: { type: 'string' },
            description: 'ASTM specs, steel grades, coating types'
          },
          equipment: {
            type: 'array',
            items: { type: 'string' },
            description: 'Cranes, tools, machinery mentioned'
          },
          specifications: {
            type: 'array',
            items: { type: 'string' },
            description: 'Spec sections, code references'
          },
          referenced_drawings: {
            type: 'array',
            items: { type: 'string' }
          },
          extracted_text: { type: 'string' },
          summary: { 
            type: 'string',
            description: '2-3 sentence executive summary of document content and purpose'
          },
          key_requirements: {
            type: 'array',
            items: { type: 'string' }
          },
          action_items: {
            type: 'array',
            items: { type: 'string' },
            description: 'Required actions, approvals, or follow-ups'
          },
          schedule_impacts: {
            type: 'array',
            items: { type: 'string' },
            description: 'Dates, milestones, lead times mentioned'
          },
          cost_impacts: {
            type: 'array',
            items: { type: 'string' },
            description: 'Cost items, pricing, budget references'
          },
          suggested_tags: {
            type: 'array',
            items: { type: 'string' }
          },
          metadata: { type: 'object' }
        }
      }
    });

    // Update document with extracted data
    const updateData = {
      description: extraction.summary || extraction.extracted_text?.substring(0, 500) || null,
      revision: extraction.revision || null,
      category: extraction.suggested_category || category,
      tags: [
        ...(extraction.suggested_tags || []),
        ...(extraction.structural_elements || []).slice(0, 5),
        ...(extraction.materials || []).slice(0, 3),
        ...(extraction.equipment || []).slice(0, 3),
        ...(extraction.specifications || []).slice(0, 3)
      ].filter(Boolean).slice(0, 15),
    };

    // If drawing number extracted and not in title, update title
    if (extraction.drawing_number && !title.includes(extraction.drawing_number)) {
      updateData.title = `${extraction.drawing_number} - ${title}`;
    }

    // Store full extraction and summary
    const extractionData = {
      summary: extraction.summary,
      structural_elements: extraction.structural_elements || [],
      materials: extraction.materials || [],
      equipment: extraction.equipment || [],
      specifications: extraction.specifications || [],
      action_items: extraction.action_items || [],
      schedule_impacts: extraction.schedule_impacts || [],
      cost_impacts: extraction.cost_impacts || [],
      full_extraction: extraction
    };
    
    const extractionNotes = `AI_EXTRACTED: ${JSON.stringify(extractionData)}`;
    
    if (currentDoc?.notes) {
      updateData.notes = `${currentDoc.notes}\n\n${extractionNotes}`;
    } else {
      updateData.notes = extractionNotes;
    }

    await base44.asServiceRole.entities.Document.update(document_id, updateData);

    // AI-powered entity linking (capped for performance)
    const linkedEntities = await findLinkedEntities(base44, currentDoc.project_id, extraction);

    // Store suggestions in document for user review
    const suggestions = {
      tasks: linkedEntities.tasks,
      work_packages: linkedEntities.workPackages,
      rfis: linkedEntities.rfis,
      confidence: linkedEntities.confidence
    };

    // Auto-link high-confidence matches
    if (linkedEntities.confidence >= 0.8) {
      if (linkedEntities.tasks.length > 0) {
        updateData.task_id = linkedEntities.tasks[0].id;
      }
      if (linkedEntities.workPackages.length > 0) {
        updateData.work_package_id = linkedEntities.workPackages[0].id;
      }
    }

    // Store all suggestions in notes for UI display
    const suggestionsNote = `\n\nAI_SUGGESTIONS: ${JSON.stringify(suggestions)}`;
    updateData.notes = (updateData.notes || '') + suggestionsNote;

    await base44.asServiceRole.entities.Document.update(document_id, updateData);

    return Response.json({
      success: true,
      extraction,
      linked_entities: linkedEntities,
      auto_linked: linkedEntities.confidence >= 0.8,
      updates_applied: Object.keys(updateData)
    });
  } catch (error) {
    console.error('Auto-process error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function findLinkedEntities(base44, projectId, extraction) {
  const results = {
    tasks: [],
    workPackages: [],
    rfis: [],
    confidence: 0
  };

  if (!projectId) return results;

  // Fetch relevant entities (capped for performance)
  const MAX_ITEMS = 500;
  const [tasks, workPackages, rfis] = await Promise.all([
    base44.asServiceRole.entities.Task.filter({ project_id: projectId, status: { $in: ['not_started', 'in_progress'] } }, null, MAX_ITEMS),
    base44.asServiceRole.entities.WorkPackage.filter({ project_id: projectId }, null, MAX_ITEMS),
    base44.asServiceRole.entities.RFI.filter({ project_id: projectId, status: { $in: ['draft', 'submitted', 'under_review'] } }, null, MAX_ITEMS)
  ]);

  const keywords = [
    extraction.drawing_number,
    ...(extraction.referenced_drawings || []),
    ...(extraction.structural_elements || []),
    ...(extraction.suggested_tags || [])
  ].filter(Boolean);

  // Match tasks
  const matchedTasks = tasks.filter(task => {
    const taskText = `${task.name} ${task.description || ''}`.toLowerCase();
    return keywords.some(kw => taskText.includes(kw.toLowerCase()));
  }).map(task => ({
    id: task.id,
    name: task.name,
    match_score: calculateMatchScore(task, keywords)
  })).sort((a, b) => b.match_score - a.match_score).slice(0, 3);

  // Match work packages
  const matchedWPs = workPackages.filter(wp => {
    const wpText = `${wp.title} ${wp.description || ''}`.toLowerCase();
    return keywords.some(kw => wpText.includes(kw.toLowerCase()));
  }).map(wp => ({
    id: wp.id,
    title: wp.title,
    match_score: calculateMatchScore(wp, keywords)
  })).sort((a, b) => b.match_score - a.match_score).slice(0, 3);

  // Match RFIs
  const matchedRFIs = rfis.filter(rfi => {
    const rfiText = `${rfi.subject} ${rfi.question || ''}`.toLowerCase();
    return keywords.some(kw => rfiText.includes(kw.toLowerCase()));
  }).map(rfi => ({
    id: rfi.id,
    subject: rfi.subject,
    rfi_number: rfi.rfi_number,
    match_score: calculateMatchScore(rfi, keywords)
  })).sort((a, b) => b.match_score - a.match_score).slice(0, 3);

  results.tasks = matchedTasks;
  results.workPackages = matchedWPs;
  results.rfis = matchedRFIs;

  // Calculate overall confidence
  const totalMatches = matchedTasks.length + matchedWPs.length + matchedRFIs.length;
  const avgScore = totalMatches > 0
    ? ([...matchedTasks, ...matchedWPs, ...matchedRFIs].reduce((sum, m) => sum + m.match_score, 0) / totalMatches)
    : 0;
  
  results.confidence = Math.min(avgScore / 100, 1);

  return results;
}

function calculateMatchScore(entity, keywords) {
  const text = JSON.stringify(entity).toLowerCase();
  let score = 0;
  
  keywords.forEach(kw => {
    const kwLower = kw.toLowerCase();
    if (text.includes(kwLower)) {
      score += 30;
      // Bonus for exact field matches
      if (entity.name?.toLowerCase().includes(kwLower) || 
          entity.title?.toLowerCase().includes(kwLower) ||
          entity.subject?.toLowerCase().includes(kwLower)) {
        score += 20;
      }
    }
  });
  
  return Math.min(score, 100);
}

  } catch (error) {
    console.error('Auto-process error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});