import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sparkles, Loader2, FileText, Link as LinkIcon, BookOpen, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function AIDocumentAnalysis({ document, onUpdate }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [findingSimilar, setFindingSimilar] = useState(false);
  const [results, setResults] = useState(null);
  const [summary, setSummary] = useState(null);
  const [similarDocs, setSimilarDocs] = useState(null);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const { data } = await base44.functions.invoke('autoProcessDocument', {
        document_id: document.id,
        file_url: document.file_url,
        category: document.category,
        title: document.title
      });

      setResults(data.extraction);
      toast.success('Analysis complete');
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error('Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSummarize = async (summaryType = 'executive') => {
    setSummarizing(true);
    try {
      const { data } = await base44.functions.invoke('summarizeDocument', {
        document_id: document.id,
        file_url: document.file_url,
        summary_type: summaryType
      });

      setSummary(data.summary);
      toast.success('Summary generated');
    } catch (error) {
      toast.error('Summarization failed');
    } finally {
      setSummarizing(false);
    }
  };

  const handleFindSimilar = async () => {
    setFindingSimilar(true);
    try {
      const { data } = await base44.functions.invoke('findSimilarDocuments', {
        document_id: document.id,
        project_id: document.project_id,
        limit: 10
      });

      setSimilarDocs(data.similar_documents);
      toast.success(`Found ${data.count} similar documents`);
    } catch (error) {
      toast.error('Similarity search failed');
    } finally {
      setFindingSimilar(false);
    }
  };

  return (
    <Card className="bg-blue-500/10 border-blue-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-400">
          <Sparkles size={18} />
          AI Document Intelligence
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <Button
            size="sm"
            onClick={handleAnalyze}
            disabled={analyzing || !document.file_url}
            className="bg-blue-500 hover:bg-blue-600"
          >
            {analyzing ? (
              <>
                <Loader2 size={14} className="mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <FileText size={14} className="mr-2" />
                Extract Metadata
              </>
            )}
          </Button>

          <Button
            size="sm"
            onClick={() => handleSummarize('executive')}
            disabled={summarizing || !document.file_url}
            className="bg-purple-500 hover:bg-purple-600"
          >
            {summarizing ? (
              <>
                <Loader2 size={14} className="mr-2 animate-spin" />
                Summarizing...
              </>
            ) : (
              <>
                <BookOpen size={14} className="mr-2" />
                Summarize
              </>
            )}
          </Button>

          <Button
            size="sm"
            onClick={handleFindSimilar}
            disabled={findingSimilar}
            className="bg-green-500 hover:bg-green-600"
          >
            {findingSimilar ? (
              <>
                <Loader2 size={14} className="mr-2 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <LinkIcon size={14} className="mr-2" />
                Find Similar
              </>
            )}
          </Button>
        </div>

        {/* Results */}
        {(results || summary || similarDocs) && (
          <Tabs defaultValue="extraction" className="mt-4">
            <TabsList className="bg-zinc-900 border border-zinc-800 w-full">
              {results && <TabsTrigger value="extraction" className="flex-1 text-xs">Metadata</TabsTrigger>}
              {summary && <TabsTrigger value="summary" className="flex-1 text-xs">Summary</TabsTrigger>}
              {similarDocs && <TabsTrigger value="similar" className="flex-1 text-xs">Similar ({similarDocs.length})</TabsTrigger>}
            </TabsList>

            {results && (
              <TabsContent value="extraction" className="space-y-3 mt-4">
                {/* Summary */}
                {results.summary && (
                  <div className="p-3 bg-zinc-950 rounded border border-zinc-800">
                    <p className="text-xs font-bold text-blue-400 mb-2">SUMMARY</p>
                    <p className="text-sm text-zinc-300">{results.summary}</p>
                  </div>
                )}

                {/* Structural Elements */}
                {results.structural_elements?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-zinc-400 mb-2">STRUCTURAL ELEMENTS</p>
                    <div className="flex flex-wrap gap-1">
                      {results.structural_elements.slice(0, 10).map((el, idx) => (
                        <Badge key={idx} className="bg-blue-500/20 text-blue-300 text-[10px]">
                          {el}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Materials */}
                {results.materials?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-zinc-400 mb-2">MATERIALS</p>
                    <div className="flex flex-wrap gap-1">
                      {results.materials.map((mat, idx) => (
                        <Badge key={idx} className="bg-green-500/20 text-green-300 text-[10px]">
                          {mat}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Equipment */}
                {results.equipment?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-zinc-400 mb-2">EQUIPMENT</p>
                    <div className="flex flex-wrap gap-1">
                      {results.equipment.map((eq, idx) => (
                        <Badge key={idx} className="bg-purple-500/20 text-purple-300 text-[10px]">
                          {eq}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Items */}
                {results.action_items?.length > 0 && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded">
                    <p className="text-xs font-bold text-amber-400 mb-2 flex items-center gap-1">
                      <AlertCircle size={12} />
                      ACTION ITEMS
                    </p>
                    <ul className="space-y-1">
                      {results.action_items.map((item, idx) => (
                        <li key={idx} className="text-xs text-zinc-300">• {item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </TabsContent>
            )}

            {summary && (
              <TabsContent value="summary" className="space-y-3 mt-4">
                <div className="p-4 bg-zinc-950 rounded border border-zinc-800">
                  <p className="text-sm text-zinc-300 leading-relaxed mb-3">
                    {summary.summary_text}
                  </p>
                  
                  {summary.key_points?.length > 0 && (
                    <div className="border-t border-zinc-800 pt-3 mt-3">
                      <p className="text-xs font-bold text-zinc-400 mb-2">KEY POINTS</p>
                      <ul className="space-y-1">
                        {summary.key_points.map((point, idx) => (
                          <li key={idx} className="text-xs text-zinc-400">• {point}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {summary.risks_identified?.length > 0 && (
                    <div className="border-t border-zinc-800 pt-3 mt-3">
                      <p className="text-xs font-bold text-red-400 mb-2">RISKS</p>
                      <ul className="space-y-1">
                        {summary.risks_identified.map((risk, idx) => (
                          <li key={idx} className="text-xs text-red-300">• {risk}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSummarize('technical')}
                    disabled={summarizing}
                    className="flex-1 border-zinc-700 text-xs"
                  >
                    Technical Summary
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSummarize('action_items')}
                    disabled={summarizing}
                    className="flex-1 border-zinc-700 text-xs"
                  >
                    Action Items
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSummarize('full')}
                    disabled={summarizing}
                    className="flex-1 border-zinc-700 text-xs"
                  >
                    Full Summary
                  </Button>
                </div>
              </TabsContent>
            )}

            {similarDocs && (
              <TabsContent value="similar" className="space-y-2 mt-4">
                {similarDocs.map((sim, idx) => (
                  <div key={idx} className="p-3 bg-zinc-950 rounded border border-zinc-800 hover:border-zinc-700 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-white">{sim.document.title}</span>
                          <Badge className="bg-green-500/20 text-green-400 text-[10px]">
                            {sim.similarity_score}% match
                          </Badge>
                        </div>
                        <p className="text-xs text-zinc-500 capitalize">
                          {sim.document.category} • {sim.document.phase || 'No phase'}
                        </p>
                      </div>
                      {sim.document.file_url && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(sim.document.file_url, '_blank')}
                          className="text-zinc-400 hover:text-white"
                        >
                          View
                        </Button>
                      )}
                    </div>
                    
                    {sim.match_reasons?.length > 0 && (
                      <p className="text-xs text-zinc-600 italic">
                        {sim.match_reasons.join(' • ')}
                      </p>
                    )}

                    {sim.common_tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {sim.common_tags.map((tag, i) => (
                          <span key={i} className="text-[9px] px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </TabsContent>
            )}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}