import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { base44 } from '@/api/base44Client';
import { Search, Sparkles, File, Eye, Loader2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import StatusBadge from '@/components/ui/StatusBadge';

export default function AISearchPanel({ projectId, onDocumentClick }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    
    try {
      const response = await base44.functions.invoke('searchDocumentsAI', {
        query: query.trim(),
        projectId: projectId || null
      });
      
      setResults(response.data);
    } catch (err) {
      console.error('AI search failed:', err);
      setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g., 'foundation RFIs from detailing phase', 'approved connection drawings', 'contracts with payment terms'"
          className="bg-zinc-800 border-zinc-700 text-white flex-1 text-sm"
        />
        <Button 
          type="submit" 
          disabled={loading || !query.trim()}
          className="bg-amber-500 hover:bg-amber-600 text-black"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="mr-2 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search size={16} className="mr-2" />
              Search
            </>
          )}
        </Button>
      </form>

      {error && (
        <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400">
          <AlertCircle size={16} />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {results && (
        <div className="space-y-3">
          {results.interpretation && (
            <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
              <p className="text-sm text-blue-300">
                <strong>Understanding:</strong> {results.interpretation}
              </p>
            </div>
          )}

          <div className="text-sm text-zinc-400">
            Found {results.total} {results.total === 1 ? 'document' : 'documents'}
          </div>

          {results.results.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">
              <File size={32} className="mx-auto mb-2 opacity-50" />
              <p>No documents match your search</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {results.results.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => onDocumentClick?.(doc)}
                  className="w-full p-3 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg border border-zinc-700 transition-colors text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <File size={14} className="text-amber-500 flex-shrink-0" />
                        <span className="font-medium text-white truncate">{doc.title}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {doc.category}
                        </Badge>
                        {doc.revision && (
                          <Badge variant="outline" className="text-[10px]">
                            Rev {doc.revision}
                          </Badge>
                        )}
                        <StatusBadge status={doc.status} className="text-[10px]" />
                      </div>

                      {doc.match_reason && (
                        <p className="text-xs text-zinc-400 mb-2">
                          <strong>Match:</strong> {doc.match_reason}
                        </p>
                      )}

                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <span>Score: {(doc.relevance_score * 100).toFixed(0)}%</span>
                        <span>•</span>
                        <span>{format(new Date(doc.created_date), 'MMM d, yyyy')}</span>
                      </div>
                    </div>

                    {doc.file_url && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(doc.file_url, '_blank');
                        }}
                        className="h-8 w-8 text-zinc-400 hover:text-white flex-shrink-0"
                      >
                        <Eye size={14} />
                      </Button>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}