import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { document_id, project_id, limit = 10 } = await req.json();

  if (!document_id) {
    return Response.json({ error: 'document_id required' }, { status: 400 });
  }

  // Get source document
  const sourceDocs = await base44.entities.Document.filter({ id: document_id });
  const sourceDoc = sourceDocs[0];

  if (!sourceDoc) {
    return Response.json({ error: 'Document not found' }, { status: 404 });
  }

  const targetProjectId = project_id || sourceDoc.project_id;

  // Get all documents from same project
  const allDocs = await base44.entities.Document.filter({ 
    project_id: targetProjectId,
    id: { $ne: document_id },
    is_current: { $ne: false }
  }, '-created_date', 500);

  // Extract AI data from source
  const sourceAI = extractAIData(sourceDoc);
  const sourceTags = sourceDoc.tags || [];
  const sourceCategory = sourceDoc.category;

  // Calculate similarity scores
  const scored = allDocs.map(doc => {
    const docAI = extractAIData(doc);
    const docTags = doc.tags || [];
    
    let score = 0;

    // Category match (20 points)
    if (doc.category === sourceCategory) {
      score += 20;
    }

    // Tag overlap (30 points max)
    const commonTags = sourceTags.filter(t => docTags.includes(t));
    score += Math.min(30, commonTags.length * 10);

    // Phase match (10 points)
    if (doc.phase && doc.phase === sourceDoc.phase) {
      score += 10;
    }

    // Structural elements overlap (20 points)
    const sourceElements = sourceAI.structural_elements || [];
    const docElements = docAI.structural_elements || [];
    const commonElements = sourceElements.filter(e => 
      docElements.some(de => de.toLowerCase().includes(e.toLowerCase()) || e.toLowerCase().includes(de.toLowerCase()))
    );
    score += Math.min(20, commonElements.length * 5);

    // Material overlap (10 points)
    const sourceMaterials = sourceAI.materials || [];
    const docMaterials = docAI.materials || [];
    const commonMaterials = sourceMaterials.filter(m => 
      docMaterials.some(dm => dm.toLowerCase().includes(m.toLowerCase()))
    );
    score += Math.min(10, commonMaterials.length * 3);

    // Equipment overlap (5 points)
    const sourceEquipment = sourceAI.equipment || [];
    const docEquipment = docAI.equipment || [];
    const commonEquipment = sourceEquipment.filter(e => 
      docEquipment.some(de => de.toLowerCase().includes(e.toLowerCase()))
    );
    score += Math.min(5, commonEquipment.length * 2);

    // Spec section overlap (5 points)
    const sourceSpecs = sourceAI.specifications || [];
    const docSpecs = docAI.specifications || [];
    const commonSpecs = sourceSpecs.filter(s => 
      docSpecs.some(ds => ds.toLowerCase().includes(s.toLowerCase()))
    );
    score += Math.min(5, commonSpecs.length * 2);

    // Text similarity bonus for titles
    const titleSimilarity = calculateTextSimilarity(
      sourceDoc.title?.toLowerCase() || '',
      doc.title?.toLowerCase() || ''
    );
    score += titleSimilarity * 10;

    return {
      document: {
        id: doc.id,
        title: doc.title,
        category: doc.category,
        phase: doc.phase,
        created_date: doc.created_date,
        file_url: doc.file_url
      },
      similarity_score: Math.round(score),
      match_reasons: [
        commonTags.length > 0 && `${commonTags.length} shared tags`,
        commonElements.length > 0 && `${commonElements.length} shared structural elements`,
        commonMaterials.length > 0 && `${commonMaterials.length} shared materials`,
        doc.category === sourceCategory && 'Same category',
        doc.phase === sourceDoc.phase && 'Same phase'
      ].filter(Boolean),
      common_tags: commonTags,
      common_elements: commonElements
    };
  })
  .filter(s => s.similarity_score > 15)
  .sort((a, b) => b.similarity_score - a.similarity_score)
  .slice(0, limit);

  return Response.json({
    success: true,
    source_document: {
      id: sourceDoc.id,
      title: sourceDoc.title,
      category: sourceDoc.category
    },
    similar_documents: scored,
    count: scored.length
  });
});

function extractAIData(doc) {
  try {
    if (!doc.notes) return {};
    
    const aiMatch = doc.notes.match(/AI_EXTRACTED:\s*({.*?})\n/s);
    if (!aiMatch) return {};
    
    const data = JSON.parse(aiMatch[1]);
    return data.full_extraction || data;
  } catch {
    return {};
  }
}

function calculateTextSimilarity(str1, str2) {
  const words1 = str1.split(/\s+/).filter(Boolean);
  const words2 = str2.split(/\s+/).filter(Boolean);
  
  if (words1.length === 0 || words2.length === 0) return 0;
  
  const common = words1.filter(w => w.length > 3 && words2.includes(w));
  return common.length / Math.max(words1.length, words2.length);
}