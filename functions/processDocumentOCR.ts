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
    
    // Use AI to extract text and metadata from document - comprehensive OCR
    const extractedData = await base44.integrations.Core.InvokeLLM({
      prompt: `Perform comprehensive OCR and metadata extraction on this construction document.

EXTRACT ALL TEXT:
- Every word, number, dimension, note, and callout
- Tables, lists, and specifications
- Headers, footers, and margin notes
- All readable text from scanned or image-based content

EXTRACT METADATA:
- Document type (drawing, spec, RFI, submittal, contract, report, invoice)
- Project number/name
- Drawing/sheet number
- Revision number and date
- Issue date or document date
- Company names, contacts
- Important reference numbers (PO, invoice #, contract #)

EXTRACT KEY DETAILS:
- Dimensions, quantities, measurements
- Material specifications
- Important notes or requirements
- Action items or review requirements
- Cost information (if applicable)
- Safety notes or warnings

KEYWORDS:
- Generate 10-15 searchable keywords covering all topics

Return comprehensive data for full-text search capability.`,
      file_urls: [document.file_url],
      response_json_schema: {
        type: 'object',
        properties: {
          document_type: { type: 'string' },
          project_number: { type: ['string', 'null'] },
          drawing_number: { type: ['string', 'null'] },
          revision: { type: ['string', 'null'] },
          date: { type: ['string', 'null'] },
          full_text: { type: 'string' },
          extracted_text: { type: 'string' },
          key_information: { type: 'array', items: { type: 'string' } },
          action_items: { type: 'array', items: { type: 'string' } },
          dimensions: { type: 'array', items: { type: 'string' } },
          materials: { type: 'array', items: { type: 'string' } },
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