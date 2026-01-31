import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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

    // Extract metadata and text using AI
    const extraction = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze this construction document and extract ALL relevant information:

STRUCTURAL ELEMENTS (if applicable):
- Drawing/sheet number (e.g., S-101, A-201)
- Drawing title
- Revision number and date
- Referenced drawings
- Structural members (beams, columns, connections)
- Material specifications
- Dimensions and callouts

GENERAL METADATA:
- Document type (drawing, spec, RFI, submittal, report, invoice, contract)
- Project number/name (if visible)
- Date (issue date, revision date, or document date)
- Revision/version info
- Author/company
- Important notes or requirements

TEXT CONTENT:
- Extract ALL searchable text from the document
- Key requirements, specifications, or action items
- Important measurements, quantities, or cost information

CATEGORIZATION:
- Suggest best category: drawing, specification, rfi, submittal, contract, report, photo, correspondence, receipt, invoice, other
- Suggest relevant tags for search (5-10 keywords)

Return comprehensive data for search indexing and metadata population.`,
      file_urls: [file_url],
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
            items: { type: 'string' }
          },
          referenced_drawings: {
            type: 'array',
            items: { type: 'string' }
          },
          extracted_text: { type: 'string' },
          key_requirements: {
            type: 'array',
            items: { type: 'string' }
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
      description: extraction.extracted_text?.substring(0, 500) || null,
      revision: extraction.revision || null,
      category: extraction.suggested_category || category,
      tags: [
        ...(extraction.suggested_tags || []).slice(0, 10),
        ...(extraction.structural_elements || []).slice(0, 5)
      ].filter(Boolean),
    };

    // If drawing number extracted and not in title, update title
    if (extraction.drawing_number && !title.includes(extraction.drawing_number)) {
      updateData.title = `${extraction.drawing_number} - ${title}`;
    }

    // Store full extraction in notes for search
    const extractionNotes = `AI_EXTRACTED: ${JSON.stringify(extraction)}`;
    const docs = await base44.entities.Document.filter({ id: document_id });
    const currentDoc = docs[0];
    
    if (currentDoc?.notes) {
      updateData.notes = `${currentDoc.notes}\n\n${extractionNotes}`;
    } else {
      updateData.notes = extractionNotes;
    }

    await base44.entities.Document.update(document_id, updateData);

    // AI-powered entity linking
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

    await base44.entities.Document.update(document_id, updateData);

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

  // Fetch relevant entities
  const [tasks, workPackages, rfis] = await Promise.all([
    base44.entities.Task.filter({ project_id: projectId, status: { $in: ['not_started', 'in_progress'] } }),
    base44.entities.WorkPackage.filter({ project_id: projectId }),
    base44.entities.RFI.filter({ project_id: projectId, status: { $in: ['draft', 'submitted', 'under_review'] } })
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