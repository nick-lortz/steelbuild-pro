import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { documentId } = await req.json();
    
    // Fetch document
    const documents = await base44.entities.Document.filter({ id: documentId });
    const document = documents[0];
    
    if (!document) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }
    
    if (!document.file_url) {
      return Response.json({ error: 'No file attached' }, { status: 400 });
    }
    
    console.log(`[processDocumentOCR] Processing document: ${document.title}`);
    
    // Use AI to extract text and metadata from document
    const extractedData = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze this construction document and extract:
1. Document type (drawing, spec, RFI, submittal, etc.)
2. Key information (project number, revision, date, scope)
3. Important details (dimensions, materials, notes, requirements)
4. Any action items or review requirements
5. Searchable keywords

Be thorough and extract ALL text content for search indexing.`,
      file_urls: [document.file_url],
      response_json_schema: {
        type: 'object',
        properties: {
          document_type: { type: 'string' },
          project_number: { type: 'string' },
          revision: { type: 'string' },
          date: { type: 'string' },
          extracted_text: { type: 'string' },
          key_information: { type: 'array', items: { type: 'string' } },
          action_items: { type: 'array', items: { type: 'string' } },
          keywords: { type: 'array', items: { type: 'string' } },
          metadata: { type: 'object' }
        }
      }
    });
    
    // Update document with OCR data
    const updateData = {
      tags: [
        ...(document.tags || []),
        ...(extractedData.keywords || [])
      ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 20), // Unique, max 20
      description: document.description || extractedData.extracted_text?.substring(0, 500),
      revision: document.revision || extractedData.revision,
    };
    
    // Store full OCR data in notes field for search
    const ocrNotes = `OCR_DATA: ${JSON.stringify(extractedData)}`;
    if (document.notes) {
      updateData.notes = `${document.notes}\n\n${ocrNotes}`;
    } else {
      updateData.notes = ocrNotes;
    }
    
    await base44.entities.Document.update(documentId, updateData);
    
    console.log(`[processDocumentOCR] Completed for document: ${document.title}`);
    
    return Response.json({ 
      success: true,
      extractedData,
      updatedFields: Object.keys(updateData)
    });
    
  } catch (error) {
    console.error('[processDocumentOCR] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});