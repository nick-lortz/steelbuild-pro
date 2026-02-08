import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link2, FileText, MessageSquareWarning, Users, File, Loader2, Check, X, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from '@/components/ui/notifications';

export default function SmartLinkagePanel({ drawingSet, onLinksUpdated }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [accepting, setAccepting] = useState({});

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const response = await base44.functions.invoke('suggestDocumentLinks', {
        drawing_set_id: drawingSet.id
      });

      if (response.data.success) {
        setSuggestions(response.data.suggestions);
        toast.success(`Found ${Object.values(response.data.summary).reduce((a, b) => a + b, 0)} suggested links`);
      } else {
        toast.error(response.data.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('Linkage analysis error:', error);
      toast.error('Failed to analyze document links');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAcceptLink = async (type, itemId) => {
    setAccepting({ ...accepting, [itemId]: true });
    try {
      const updates = {};
      
      if (type === 'rfi') {
        const existing = drawingSet.linked_rfi_ids || [];
        updates.linked_rfi_ids = [...existing, itemId];
      } else if (type === 'drawing_set') {
        const existing = drawingSet.linked_drawing_set_ids || [];
        updates.linked_drawing_set_ids = [...existing, itemId];
      }

      await base44.entities.DrawingSet.update(drawingSet.id, updates);
      
      // Remove from suggestions
      setSuggestions(prev => ({
        ...prev,
        [type === 'rfi' ? 'rfis' : 'drawing_sets']: prev[type === 'rfi' ? 'rfis' : 'drawing_sets'].filter(s => s.id !== itemId)
      }));

      toast.success('Link added');
      onLinksUpdated?.();
    } catch (error) {
      console.error('Accept link error:', error);
      toast.error('Failed to add link');
    } finally {
      setAccepting({ ...accepting, [itemId]: false });
    }
  };

  const handleRejectLink = (type, itemId) => {
    setSuggestions(prev => ({
      ...prev,
      [type]: prev[type].filter(s => s.id !== itemId)
    }));
  };

  const getConfidenceColor = (confidence) => {
    switch (confidence) {
      case 'high':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'medium':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'rfis':
        return <MessageSquareWarning size={14} className="text-amber-500" />;
      case 'drawing_sets':
        return <FileText size={14} className="text-blue-400" />;
      case 'documents':
        return <File size={14} className="text-zinc-400" />;
      case 'meetings':
        return <Users size={14} className="text-purple-400" />;
      default:
        return <Link2 size={14} />;
    }
  };

  const renderSuggestionCard = (suggestion, type) => (
    <Card key={suggestion.id} className="bg-zinc-800/30 border-zinc-700 p-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          {getTypeIcon(type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-white truncate">
              {suggestion.title || suggestion.subject || suggestion.set_name}
            </span>
            <Badge variant="outline" className={`text-[10px] ${getConfidenceColor(suggestion.confidence)}`}>
              {suggestion.confidence}
            </Badge>
          </div>
          {suggestion.rfi_number && (
            <p className="text-[10px] text-zinc-500 mb-1">RFI-{suggestion.rfi_number}</p>
          )}
          {suggestion.discipline && (
            <Badge variant="outline" className="text-[10px] bg-zinc-700/30 text-zinc-400 border-zinc-600 mb-1">
              {suggestion.discipline}
            </Badge>
          )}
          {suggestion.relationship_type && (
            <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/20 mb-1">
              {suggestion.relationship_type.replace(/_/g, ' ')}
            </Badge>
          )}
          <p className="text-xs text-zinc-400 mt-1">{suggestion.reason}</p>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleAcceptLink(type === 'drawing_sets' ? 'drawing_set' : type.slice(0, -1), suggestion.id)}
            disabled={accepting[suggestion.id]}
            className="h-7 w-7 p-0 text-green-400 hover:bg-green-500/10"
          >
            {accepting[suggestion.id] ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleRejectLink(type, suggestion.id)}
            className="h-7 w-7 p-0 text-red-400 hover:bg-red-500/10"
          >
            <X size={12} />
          </Button>
        </div>
      </div>
    </Card>
  );

  return (
    <Card className="bg-zinc-900/50 border-zinc-800 p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 size={16} className="text-amber-500" />
            <h3 className="text-sm font-medium text-white">Smart Document Linkage</h3>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleAnalyze}
            disabled={analyzing}
            className="border-amber-500/20 text-amber-500 hover:bg-amber-500/10"
          >
            {analyzing ? (
              <>
                <Loader2 size={14} className="animate-spin mr-2" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles size={14} className="mr-2" />
                Find Links
              </>
            )}
          </Button>
        </div>

        {!suggestions && !analyzing && (
          <div className="text-sm text-zinc-500 italic">
            AI will suggest related RFIs, documents, meetings, and cross-discipline drawings.
          </div>
        )}

        {suggestions && (
          <div className="space-y-4">
            {suggestions.rfis?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-zinc-400 mb-2 flex items-center gap-2">
                  <MessageSquareWarning size={12} />
                  Related RFIs ({suggestions.rfis.length})
                </h4>
                <div className="space-y-2">
                  {suggestions.rfis.map(s => renderSuggestionCard(s, 'rfis'))}
                </div>
              </div>
            )}

            {suggestions.drawing_sets?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-zinc-400 mb-2 flex items-center gap-2">
                  <FileText size={12} />
                  Related Drawing Sets ({suggestions.drawing_sets.length})
                </h4>
                <div className="space-y-2">
                  {suggestions.drawing_sets.map(s => renderSuggestionCard(s, 'drawing_sets'))}
                </div>
              </div>
            )}

            {suggestions.documents?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-zinc-400 mb-2 flex items-center gap-2">
                  <File size={12} />
                  Related Documents ({suggestions.documents.length})
                </h4>
                <div className="space-y-2">
                  {suggestions.documents.map(s => renderSuggestionCard(s, 'documents'))}
                </div>
              </div>
            )}

            {suggestions.meetings?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-zinc-400 mb-2 flex items-center gap-2">
                  <Users size={12} />
                  Related Meetings ({suggestions.meetings.length})
                </h4>
                <div className="space-y-2">
                  {suggestions.meetings.map(s => renderSuggestionCard(s, 'meetings'))}
                </div>
              </div>
            )}

            {!suggestions.rfis?.length && !suggestions.drawing_sets?.length && 
             !suggestions.documents?.length && !suggestions.meetings?.length && (
              <div className="text-sm text-zinc-500 text-center py-4">
                No suggested links found
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}