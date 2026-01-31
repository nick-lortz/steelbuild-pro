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

    // Auto-link to tasks if drawing references found
    if (extraction.referenced_drawings?.length > 0) {
      const tasks = await base44.entities.Task.filter({
        project_id: currentDoc.project_id,
        status: { $in: ['not_started', 'in_progress'] }
      });

      // Simple matching - find tasks that reference similar drawing numbers
      const linkedTasks = tasks.filter(task =>
        extraction.referenced_drawings.some(dwg =>
          task.name?.includes(dwg) || task.description?.includes(dwg)
        )
      ).slice(0, 3);

      if (linkedTasks.length > 0) {
        updateData.task_id = linkedTasks[0].id;
        await base44.entities.Document.update(document_id, updateData);
      }
    }

    return Response.json({
      success: true,
      extraction,
      updates_applied: Object.keys(updateData)
    });

  } catch (error) {
    console.error('Auto-process error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});