import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query } = await req.json();

    const [projects, tasks, rfis, changeOrders, drawings] = await Promise.all([
      base44.entities.Project.list(),
      base44.entities.Task.list(),
      base44.entities.RFI.list(),
      base44.entities.ChangeOrder.list(),
      base44.entities.DrawingSet.list()
    ]);

    const prompt = `Answer this natural language query about steel construction projects.

USER QUERY: "${query}"

AVAILABLE DATA:
PROJECTS (${projects.length}):
${projects.map(p => `- ${p.project_number}: ${p.name} | Status: ${p.status} | Client: ${p.client || 'N/A'} | Value: $${(p.contract_value || 0).toLocaleString()}`).join('\n')}

TASKS (${tasks.length}):
${tasks.slice(0, 50).map(t => `- ${t.name} | Project: ${projects.find(p => p.id === t.project_id)?.project_number || 'Unknown'} | Phase: ${t.phase} | Status: ${t.status} | Progress: ${t.progress_percent || 0}%`).join('\n')}

RFIS (${rfis.length}):
${rfis.slice(0, 30).map(r => `- RFI-${String(r.rfi_number).padStart(3, '0')} | Status: ${r.status} | Priority: ${r.priority}`).join('\n')}

CHANGE ORDERS (${changeOrders.length}):
${changeOrders.slice(0, 30).map(c => `- CO-${String(c.co_number).padStart(3, '0')} | Status: ${c.status} | Impact: $${(c.cost_impact || 0).toLocaleString()}`).join('\n')}

Interpret the query and return relevant filtered/sorted results.

Return JSON:
{
  "interpretation": "string describing what you understood",
  "results": {
    "projects": [{"id": "string", "project_number": "string", "name": "string", "relevance_note": "string"}],
    "tasks": [{"id": "string", "name": "string", "project_number": "string", "relevance_note": "string"}],
    "rfis": [{"id": "string", "rfi_number": number, "subject": "string", "relevance_note": "string"}],
    "change_orders": [{"id": "string", "co_number": number, "title": "string", "relevance_note": "string"}]
  },
  "summary": "string answer to the query"
}`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          interpretation: { type: "string" },
          results: {
            type: "object",
            properties: {
              projects: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    project_number: { type: "string" },
                    name: { type: "string" },
                    relevance_note: { type: "string" }
                  }
                }
              },
              tasks: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    project_number: { type: "string" },
                    relevance_note: { type: "string" }
                  }
                }
              },
              rfis: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    rfi_number: { type: "number" },
                    subject: { type: "string" },
                    relevance_note: { type: "string" }
                  }
                }
              },
              change_orders: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    co_number: { type: "number" },
                    title: { type: "string" },
                    relevance_note: { type: "string" }
                  }
                }
              }
            }
          },
          summary: { type: "string" }
        }
      }
    });

    return Response.json(response);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});