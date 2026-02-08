import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, AlertCircle, CheckCircle2, Clock, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from '@/components/ui/notifications';

export default function AIAnalysisPanel({ drawingSet, onAnalysisComplete }) {
  const [analyzing, setAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const response = await base44.functions.invoke('analyzeDrawingSet', {
        drawing_set_id: drawingSet.id
      });

      if (response.data.success) {
        toast.success('AI analysis completed');
        onAnalysisComplete?.();
      } else {
        toast.error(response.data.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Failed to analyze drawing set');
    } finally {
      setAnalyzing(false);
    }
  };

  const getStatusIcon = () => {
    switch (drawingSet.ai_review_status) {
      case 'completed':
        return <CheckCircle2 size={16} className="text-green-400" />;
      case 'in_progress':
        return <Clock size={16} className="text-amber-400 animate-pulse" />;
      case 'failed':
        return <AlertCircle size={16} className="text-red-400" />;
      default:
        return <Sparkles size={16} className="text-zinc-400" />;
    }
  };

  const getStatusText = () => {
    switch (drawingSet.ai_review_status) {
      case 'completed':
        return 'Analysis Complete';
      case 'in_progress':
        return 'Analyzing...';
      case 'failed':
        return 'Analysis Failed';
      default:
        return 'Not Analyzed';
    }
  };

  return (
    <Card className="bg-zinc-900/50 border-zinc-800 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <h3 className="text-sm font-medium text-white">AI Analysis</h3>
          <Badge 
            variant="outline" 
            className={`text-xs ${
              drawingSet.ai_review_status === 'completed' 
                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                : drawingSet.ai_review_status === 'failed'
                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
            }`}
          >
            {getStatusText()}
          </Badge>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleAnalyze}
          disabled={analyzing || drawingSet.ai_review_status === 'in_progress'}
          className="border-amber-500/20 text-amber-500 hover:bg-amber-500/10"
        >
          {analyzing || drawingSet.ai_review_status === 'in_progress' ? (
            <>
              <RefreshCw size={14} className="animate-spin mr-2" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles size={14} className="mr-2" />
              {drawingSet.ai_review_status === 'completed' ? 'Re-analyze' : 'Analyze'}
            </>
          )}
        </Button>
      </div>

      {drawingSet.ai_summary && (
        <div className="prose prose-sm prose-invert max-w-none">
          <div className="text-sm text-zinc-300 whitespace-pre-line">
            {drawingSet.ai_summary}
          </div>
        </div>
      )}

      {!drawingSet.ai_summary && drawingSet.ai_review_status === 'pending' && (
        <div className="text-sm text-zinc-500 italic">
          Click "Analyze" to extract key information, detect clashes, and generate a summary.
        </div>
      )}
    </Card>
  );
}