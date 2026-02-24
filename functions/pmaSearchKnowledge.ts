import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * PMA Smart Knowledge Search
 * AI-powered semantic search across knowledge base
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query, category, discipline, limit = 10 } = await req.json();
    
    if (!query) {
      return Response.json({ error: 'query required' }, { status: 400 });
    }

    console.log(`[PMA] Smart search: "${query}"`);

    // Fetch all published articles
    const filter = { status: 'published' };
    if (category) filter.category = category;
    if (discipline) filter.discipline = discipline;

    const articles = await base44.entities.KnowledgeArticle.filter(filter);

    // AI-powered semantic search
    const searchPrompt = `You are a search engine for steel construction knowledge.

USER QUERY: "${query}"

ARTICLES DATABASE:
${articles.map((a, i) => `
[${i}] ${a.title}
Category: ${a.category} | Discipline: ${a.discipline}
Keywords: ${a.keywords?.join(', ') || 'N/A'}
Problem: ${a.problem_statement?.substring(0, 200) || 'N/A'}
Solution: ${a.solution?.substring(0, 200) || 'N/A'}
`).join('\n')}

TASK:
1. Analyze user intent and context
2. Rank articles by relevance (0-100 score)
3. Return top ${limit} most relevant articles with relevance scores
4. Include reasoning for why each article matches the query

Return ranked results with practical applicability to the user's question.`;

    const searchResults = await base44.integrations.Core.InvokeLLM({
      prompt: searchPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          results: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                article_index: { type: 'number' },
                relevance_score: { type: 'number' },
                reasoning: { type: 'string' }
              }
            }
          },
          suggested_filters: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      }
    });

    // Map results back to articles
    const rankedArticles = searchResults.results
      ?.map(r => ({
        ...articles[r.article_index],
        relevance_score: r.relevance_score,
        match_reasoning: r.reasoning
      }))
      .filter(a => a.id) // Ensure valid articles
      .slice(0, limit);

    // Update view counts
    for (const article of rankedArticles || []) {
      try {
        await base44.asServiceRole.entities.KnowledgeArticle.update(article.id, {
          times_referenced: (article.times_referenced || 0) + 1
        });
      } catch (err) {
        // Non-critical, continue
      }
    }

    return Response.json({
      success: true,
      query,
      results: rankedArticles || [],
      total_articles_searched: articles.length,
      suggested_filters: searchResults.suggested_filters || []
    });

  } catch (error) {
    console.error('[PMA] Smart search error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});