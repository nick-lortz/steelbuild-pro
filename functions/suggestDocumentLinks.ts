import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { drawing_set_id } = await req.json();

    if (!drawing_set_id) {
      return Response.json({ error: 'drawing_set_id required' }, { status: 400 });
    }

    // Get drawing set
    const [drawingSet] = await base44.asServiceRole.entities.DrawingSet.filter({ id: drawing_set_id });
    if (!drawingSet) {
      return Response.json({ error: 'Drawing set not found' }, { status: 404 });
    }

    // Get all potentially related items
    const [documents, rfis, meetings, otherSets] = await Promise.all([
      base44.asServiceRole.entities.Document.filter({ project_id: drawingSet.project_id }),
      base44.asServiceRole.entities.RFI.filter({ project_id: drawingSet.project_id }),
      base44.asServiceRole.entities.Meeting.filter({ project_id: drawingSet.project_id }),
      base44.asServiceRole.entities.DrawingSet.filter({ project_id: drawingSet.project_id })
    ]);

    // Filter out already linked items
    const linkedDrawingSetIds = drawingSet.linked_drawing_set_ids || [];
    const linkedRFIIds = drawingSet.linked_rfi_ids || [];
    
    const unlinkedDocuments = documents.filter(d => 
      !d.work_package_id && // Not already linked to work package
      d.category !== 'drawing' // Not a drawing itself
    );
    const unlinkedRFIs = rfis.filter(r => !linkedRFIIds.includes(r.id));
    const unlinkedMeetings = meetings.slice(0, 10); // Recent meetings
    const relatedSets = otherSets.filter(s => 
      s.id !== drawing_set_id && 
      !linkedDrawingSetIds.includes(s.id)
    );

    // Build analysis prompt
    const prompt = `You are analyzing relationships between a structural steel drawing set and other project documents.

TARGET DRAWING SET:
- Name: ${drawingSet.set_name}
- Revision: ${drawingSet.current_revision}
- Discipline: ${drawingSet.discipline}
- Status: ${drawingSet.status}
- Phase: Detailing
- Set Number: ${drawingSet.set_number || 'N/A'}
- Notes: ${drawingSet.notes || 'None'}

AVAILABLE DOCUMENTS (${unlinkedDocuments.length}):
${unlinkedDocuments.slice(0, 15).map(d => `- [${d.category}] ${d.title} (${d.phase || 'general'})`).join('\n')}

AVAILABLE RFIs (${unlinkedRFIs.length}):
${unlinkedRFIs.slice(0, 15).map(r => `- RFI-${r.rfi_number}: ${r.subject} (${r.rfi_type}, ${r.status})`).join('\n')}

AVAILABLE MEETINGS (${unlinkedMeetings.length}):
${unlinkedMeetings.slice(0, 10).map(m => `- ${m.title}`).join('\n')}

OTHER DRAWING SETS (${relatedSets.length}):
${relatedSets.slice(0, 10).map(s => `- ${s.set_name} (Rev ${s.current_revision}, ${s.discipline})`).join('\n')}

Analyze and suggest which items should be linked to this drawing set based on:
1. Discipline match (structural, misc metals, connections, etc.)
2. Phase alignment (same project phase)
3. Content relevance (keywords, references to drawing numbers, member marks)
4. Timing (documents/RFIs from similar timeframe)
5. Explicit references (mentions of this drawing set by name/number)

Provide confidence scores and reasoning for each suggestion.`;

    const linkageSchema = {
      type: "object",
      properties: {
        suggested_documents: {
          type: "array",
          items: {
            type: "object",
            properties: {
              document_title: { type: "string" },
              document_category: { type: "string" },
              confidence: {
                type: "string",
                enum: ["high", "medium", "low"]
              },
              reason: { type: "string" }
            }
          }
        },
        suggested_rfis: {
          type: "array",
          items: {
            type: "object",
            properties: {
              rfi_number: { type: "number" },
              rfi_subject: { type: "string" },
              confidence: {
                type: "string",
                enum: ["high", "medium", "low"]
              },
              reason: { type: "string" }
            }
          }
        },
        suggested_meetings: {
          type: "array",
          items: {
            type: "object",
            properties: {
              meeting_title: { type: "string" },
              confidence: {
                type: "string",
                enum: ["high", "medium", "low"]
              },
              reason: { type: "string" }
            }
          }
        },
        suggested_drawing_sets: {
          type: "array",
          items: {
            type: "object",
            properties: {
              set_name: { type: "string" },
              relationship_type: {
                type: "string",
                enum: ["same_phase", "cross_discipline", "dependency", "related_area"]
              },
              confidence: {
                type: "string",
                enum: ["high", "medium", "low"]
              },
              reason: { type: "string" }
            }
          }
        }
      }
    };

    // Call AI
    const suggestions = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: linkageSchema
    });

    // Match suggestions back to actual entity IDs
    const matchedSuggestions = {
      documents: [],
      rfis: [],
      meetings: [],
      drawing_sets: []
    };

    // Match documents
    if (suggestions.suggested_documents) {
      suggestions.suggested_documents.forEach(sugg => {
        const match = unlinkedDocuments.find(d => 
          d.title.toLowerCase().includes(sugg.document_title.toLowerCase()) ||
          sugg.document_title.toLowerCase().includes(d.title.toLowerCase())
        );
        if (match) {
          matchedSuggestions.documents.push({
            id: match.id,
            title: match.title,
            category: match.category,
            confidence: sugg.confidence,
            reason: sugg.reason
          });
        }
      });
    }

    // Match RFIs
    if (suggestions.suggested_rfis) {
      suggestions.suggested_rfis.forEach(sugg => {
        const match = unlinkedRFIs.find(r => r.rfi_number === sugg.rfi_number);
        if (match) {
          matchedSuggestions.rfis.push({
            id: match.id,
            rfi_number: match.rfi_number,
            subject: match.subject,
            confidence: sugg.confidence,
            reason: sugg.reason
          });
        }
      });
    }

    // Match meetings
    if (suggestions.suggested_meetings) {
      suggestions.suggested_meetings.forEach(sugg => {
        const match = unlinkedMeetings.find(m => 
          m.title.toLowerCase().includes(sugg.meeting_title.toLowerCase()) ||
          sugg.meeting_title.toLowerCase().includes(m.title.toLowerCase())
        );
        if (match) {
          matchedSuggestions.meetings.push({
            id: match.id,
            title: match.title,
            confidence: sugg.confidence,
            reason: sugg.reason
          });
        }
      });
    }

    // Match drawing sets
    if (suggestions.suggested_drawing_sets) {
      suggestions.suggested_drawing_sets.forEach(sugg => {
        const match = relatedSets.find(s => 
          s.set_name.toLowerCase().includes(sugg.set_name.toLowerCase()) ||
          sugg.set_name.toLowerCase().includes(s.set_name.toLowerCase())
        );
        if (match) {
          matchedSuggestions.drawing_sets.push({
            id: match.id,
            set_name: match.set_name,
            revision: match.current_revision,
            discipline: match.discipline,
            relationship_type: sugg.relationship_type,
            confidence: sugg.confidence,
            reason: sugg.reason
          });
        }
      });
    }

    return Response.json({ 
      success: true,
      suggestions: matchedSuggestions,
      summary: {
        documents: matchedSuggestions.documents.length,
        rfis: matchedSuggestions.rfis.length,
        meetings: matchedSuggestions.meetings.length,
        drawing_sets: matchedSuggestions.drawing_sets.length
      }
    });

  } catch (error) {
    console.error('Document linkage error:', error);
    return Response.json({ 
      error: error.message,
      details: error.toString()
    }, { status: 500 });
  }
});