import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query, projectId } = await req.json();
    
    if (!query) {
      return Response.json({ error: 'Query required' }, { status: 400 });
    }
    
    console.log(`[searchDocumentsAI] Query: "${query}" for project: ${projectId || 'all'}`);
    
    // Fetch all documents (with optional project filter)
    const documents = projectId 
      ? await base44.entities.Document.filter({ project_id: projectId, is_current: true })
      : await base44.entities.Document.filter({ is_current: true });
    
    if (documents.length === 0) {
      return Response.json({ results: [] });
    }
    
    // Prepare document summaries for AI
    const docSummaries = documents.map(doc => ({
      id: doc.id,
      title: doc.title,
      category: doc.category,
      description: doc.description,
      tags: doc.tags || [],
      revision: doc.revision,
      phase: doc.phase,
      status: doc.status,
      file_name: doc.file_name,
      // Extract OCR data if available
      ocr_data: doc.notes?.includes('OCR_DATA:') 
        ? JSON.parse(doc.notes.split('OCR_DATA:')[1].split('\n')[0] || '{}')
        : null
    }));
    
    // Use AI to find relevant documents
    const searchResults = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a construction document search assistant.

User query: "${query}"

Available documents:
${JSON.stringify(docSummaries, null, 2)}

Find and rank the most relevant documents for this query. Consider:
- Title and description matches
- Category relevance
- Tag and keyword matches
- OCR extracted text
- Context and intent

Return the top matching document IDs ranked by relevance with scores.`,
      response_json_schema: {
        type: 'object',
        properties: {
          results: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                document_id: { type: 'string' },
                relevance_score: { type: 'number' },
                reason: { type: 'string' }
              }
            }
          },
          interpretation: { type: 'string' }
        }
      }
    });
    
    // Get full document details for results
    const rankedResults = searchResults.results.map(result => {
      const doc = documents.find(d => d.id === result.document_id);
      return {
        ...doc,
        relevance_score: result.relevance_score,
        match_reason: result.reason
      };
    });
    
    console.log(`[searchDocumentsAI] Found ${rankedResults.length} relevant documents`);
    
    return Response.json({
      query,
      interpretation: searchResults.interpretation,
      results: rankedResults,
      total: rankedResults.length
    });
    
  } catch (error) {
    console.error('[searchDocumentsAI] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});