import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Book, Search, Sparkles, TrendingUp, ChevronRight, Loader2, Star, Download, FileText, Brain, Target, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

export default function KnowledgeBase() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [disciplineFilter, setDisciplineFilter] = useState('all');
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [extracting, setExtracting] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: articles = [] } = useQuery({
    queryKey: ['knowledge-articles', categoryFilter, disciplineFilter],
    queryFn: async () => {
      const filter = { status: 'published' };
      if (categoryFilter !== 'all') filter.category = categoryFilter;
      if (disciplineFilter !== 'all') filter.discipline = disciplineFilter;
      return await base44.entities.KnowledgeArticle.filter(filter);
    },
    staleTime: 5 * 60 * 1000
  });

  const rateMutation = useMutation({
    mutationFn: ({ id, rating }) => 
      base44.entities.KnowledgeArticle.update(id, {
        helpfulness_score: rating,
        times_referenced: (selectedArticle?.times_referenced || 0) + 1
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-articles'] });
      toast.success('Rating saved');
    }
  });

  const handleSmartSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    try {
      const { data } = await base44.functions.invoke('pmaSearchKnowledge', {
        query: searchQuery,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        discipline: disciplineFilter !== 'all' ? disciplineFilter : undefined,
        limit: 10
      });
      setSearchResults(data.results || []);
      toast.success(`Found ${data.results?.length || 0} relevant articles`);
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleExtractKnowledge = async () => {
    setExtracting(true);
    try {
      const { data } = await base44.functions.invoke('pmaExtractKnowledge', {
        source_type: 'all',
        auto_publish: false
      });
      toast.success(`Extracted ${data.extracted} new articles for review`);
      queryClient.invalidateQueries({ queryKey: ['knowledge-articles'] });
    } catch (error) {
      toast.error('Extraction failed');
    } finally {
      setExtracting(false);
    }
  };

  const displayArticles = searchResults || articles;
  
  const stats = {
    total: articles.length,
    byCategory: articles.reduce((acc, a) => {
      acc[a.category] = (acc[a.category] || 0) + 1;
      return acc;
    }, {}),
    mostViewed: articles.sort((a, b) => (b.times_referenced || 0) - (a.times_referenced || 0)).slice(0, 5)
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-gradient-to-r from-blue-500/5 to-purple-500/5">
        <div className="max-w-[1600px] mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Book className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white uppercase tracking-wide">Knowledge Base</h1>
                <p className="text-xs text-zinc-400 font-mono mt-1">
                  {stats.total} ARTICLES • AI-POWERED SEARCH
                </p>
              </div>
            </div>
            {currentUser?.role === 'admin' && (
              <Button
                onClick={handleExtractKnowledge}
                disabled={extracting}
                className="bg-amber-500 hover:bg-amber-600 text-black">
                {extracting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Auto-Extract Knowledge
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="border-b border-zinc-800 bg-zinc-950">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="grid grid-cols-4 gap-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Total Articles</div>
                <div className="text-2xl font-bold font-mono text-white">{stats.total}</div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">RFI Solutions</div>
                <div className="text-2xl font-bold font-mono text-blue-500">
                  {stats.byCategory['rfi_resolution'] || 0}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Field Techniques</div>
                <div className="text-2xl font-bold font-mono text-green-500">
                  {stats.byCategory['field_workaround'] || 0}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Best Practices</div>
                <div className="text-2xl font-bold font-mono text-purple-500">
                  {stats.byCategory['company_standard'] || 0}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        {/* Smart Search */}
        <Card className="bg-zinc-900 border-zinc-800 mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Brain className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-bold text-white">AI-Powered Search</h3>
            </div>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSmartSearch();
                  }}
                  placeholder="Ask anything... 'how to resolve shear tab conflicts' or 'connection detail best practices'"
                  className="pl-10 bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <Button
                onClick={handleSmartSearch}
                disabled={searching || !searchQuery.trim()}
                className="bg-blue-500 hover:bg-blue-600 text-white">
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              </Button>
            </div>

            <div className="flex gap-3 mt-3">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-48 bg-zinc-800 border-zinc-700 text-white text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="rfi_resolution">RFI Resolution</SelectItem>
                  <SelectItem value="fabrication_issue">Fabrication Issue</SelectItem>
                  <SelectItem value="erection_technique">Erection Technique</SelectItem>
                  <SelectItem value="schedule_recovery">Schedule Recovery</SelectItem>
                  <SelectItem value="cost_mitigation">Cost Mitigation</SelectItem>
                  <SelectItem value="field_workaround">Field Workaround</SelectItem>
                  <SelectItem value="lessons_learned">Lessons Learned</SelectItem>
                </SelectContent>
              </Select>

              <Select value={disciplineFilter} onValueChange={setDisciplineFilter}>
                <SelectTrigger className="w-48 bg-zinc-800 border-zinc-700 text-white text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="all">All Disciplines</SelectItem>
                  <SelectItem value="fabrication">Fabrication</SelectItem>
                  <SelectItem value="erection">Erection</SelectItem>
                  <SelectItem value="detailing">Detailing</SelectItem>
                  <SelectItem value="coordination">Coordination</SelectItem>
                  <SelectItem value="project_management">Project Management</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {displayArticles.map((article) => (
            <Card 
              key={article.id}
              className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 cursor-pointer group transition-all"
              onClick={() => setSelectedArticle(article)}>
              <CardHeader className="border-b border-zinc-800">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <CardTitle className="text-base font-semibold text-white mb-2 group-hover:text-amber-400 transition-colors">
                      {article.title}
                    </CardTitle>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="bg-zinc-800 border-zinc-700 text-[10px] capitalize">
                        {article.category?.replace(/_/g, ' ')}
                      </Badge>
                      <Badge variant="outline" className="bg-zinc-800 border-zinc-700 text-[10px] capitalize">
                        {article.discipline}
                      </Badge>
                      {article.ai_generated && (
                        <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-[10px]">
                          AI-Extracted
                        </Badge>
                      )}
                    </div>
                  </div>
                  {article.relevance_score && (
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-400">{article.relevance_score}%</div>
                      <div className="text-[10px] text-zinc-500">MATCH</div>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {article.problem_statement && (
                  <div className="mb-3">
                    <p className="text-xs text-zinc-500 uppercase mb-1">Problem</p>
                    <p className="text-sm text-zinc-300 line-clamp-2">{article.problem_statement}</p>
                  </div>
                )}
                
                {article.solution && (
                  <div className="mb-3">
                    <p className="text-xs text-zinc-500 uppercase mb-1">Solution</p>
                    <p className="text-sm text-zinc-300 line-clamp-2">{article.solution}</p>
                  </div>
                )}

                {article.match_reasoning && (
                  <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded text-xs text-blue-400 mb-3">
                    <strong>Why relevant:</strong> {article.match_reasoning}
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
                  <div className="flex gap-3 text-xs text-zinc-500">
                    {article.cost_impact && article.cost_impact !== 0 && (
                      <span className={article.cost_impact < 0 ? 'text-green-400' : 'text-red-400'}>
                        {article.cost_impact < 0 ? 'Saved' : 'Cost'}: ${Math.abs(article.cost_impact).toLocaleString()}
                      </span>
                    )}
                    {article.schedule_impact_days !== undefined && article.schedule_impact_days !== 0 && (
                      <span className={article.schedule_impact_days < 0 ? 'text-green-400' : 'text-amber-400'}>
                        {article.schedule_impact_days < 0 ? 'Saved' : 'Delay'}: {Math.abs(article.schedule_impact_days)} days
                      </span>
                    )}
                    {article.times_referenced > 0 && (
                      <span className="text-zinc-500">
                        {article.times_referenced} views
                      </span>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-amber-500 transition-colors" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {displayArticles.length === 0 && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-12 text-center">
              <Book className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-400 mb-4">No articles found</p>
              {currentUser?.role === 'admin' && (
                <Button
                  onClick={handleExtractKnowledge}
                  disabled={extracting}
                  className="bg-amber-500 hover:bg-amber-600 text-black">
                  {extracting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Extract from Closed Projects
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Article Detail Dialog */}
      <Dialog open={!!selectedArticle} onOpenChange={() => setSelectedArticle(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl text-white">{selectedArticle?.title}</DialogTitle>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="outline" className="bg-zinc-800 border-zinc-700 capitalize text-xs">
                {selectedArticle?.category?.replace(/_/g, ' ')}
              </Badge>
              <Badge variant="outline" className="bg-zinc-800 border-zinc-700 capitalize text-xs">
                {selectedArticle?.discipline}
              </Badge>
              {selectedArticle?.complexity && (
                <Badge className={cn(
                  'text-xs',
                  selectedArticle.complexity === 'complex' ? 'bg-red-500/20 text-red-400' :
                  selectedArticle.complexity === 'moderate' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-green-500/20 text-green-400'
                )}>
                  {selectedArticle.complexity}
                </Badge>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-6 mt-6">
            {/* Impact Metrics */}
            {(selectedArticle?.cost_impact || selectedArticle?.schedule_impact_days) && (
              <div className="grid grid-cols-2 gap-4">
                {selectedArticle.cost_impact && (
                  <div className="p-4 bg-zinc-800/50 rounded-lg">
                    <div className="text-xs text-zinc-500 uppercase mb-1">Cost Impact</div>
                    <div className={cn(
                      'text-2xl font-bold font-mono',
                      selectedArticle.cost_impact < 0 ? 'text-green-400' : 'text-red-400'
                    )}>
                      {selectedArticle.cost_impact < 0 ? '-' : '+'}${Math.abs(selectedArticle.cost_impact).toLocaleString()}
                    </div>
                  </div>
                )}
                {selectedArticle.schedule_impact_days !== undefined && (
                  <div className="p-4 bg-zinc-800/50 rounded-lg">
                    <div className="text-xs text-zinc-500 uppercase mb-1">Schedule Impact</div>
                    <div className={cn(
                      'text-2xl font-bold font-mono',
                      selectedArticle.schedule_impact_days <= 0 ? 'text-green-400' : 'text-amber-400'
                    )}>
                      {selectedArticle.schedule_impact_days < 0 ? '' : '+'}{selectedArticle.schedule_impact_days} days
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Content */}
            <div className="prose prose-sm prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  h1: ({children}) => <h1 className="text-xl font-bold text-white mb-3">{children}</h1>,
                  h2: ({children}) => <h2 className="text-lg font-bold text-white mt-6 mb-2">{children}</h2>,
                  h3: ({children}) => <h3 className="text-base font-semibold text-white mt-4 mb-2">{children}</h3>,
                  p: ({children}) => <p className="text-zinc-300 mb-3">{children}</p>,
                  ul: ({children}) => <ul className="list-disc ml-5 text-zinc-300 mb-3">{children}</ul>,
                  li: ({children}) => <li className="mb-1">{children}</li>,
                  strong: ({children}) => <strong className="text-amber-400 font-semibold">{children}</strong>
                }}>
                {selectedArticle?.content}
              </ReactMarkdown>
            </div>

            {/* Keywords */}
            {selectedArticle?.keywords && selectedArticle.keywords.length > 0 && (
              <div>
                <p className="text-xs text-zinc-500 uppercase mb-2">Keywords</p>
                <div className="flex flex-wrap gap-2">
                  {selectedArticle.keywords.map((kw, idx) => (
                    <span key={idx} className="px-2 py-1 bg-zinc-800 text-zinc-400 rounded text-xs">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Applicable Scenarios */}
            {selectedArticle?.applicable_scenarios && selectedArticle.applicable_scenarios.length > 0 && (
              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-xs text-blue-400 uppercase mb-2 font-bold">When to Use This</p>
                <ul className="space-y-1 text-sm text-blue-300">
                  {selectedArticle.applicable_scenarios.map((scenario, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{scenario}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Rating */}
            <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
              <span className="text-sm text-zinc-400">Was this helpful?</span>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => rateMutation.mutate({ id: selectedArticle.id, rating })}
                    className="text-zinc-600 hover:text-amber-500 transition-colors">
                    <Star className={cn(
                      'w-5 h-5',
                      rating <= (selectedArticle?.helpfulness_score || 0) && 'fill-amber-500 text-amber-500'
                    )} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}