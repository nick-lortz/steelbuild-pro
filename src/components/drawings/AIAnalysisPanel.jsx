import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, AlertCircle, CheckCircle2, Clock, RefreshCw, AlertTriangle, FileText } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from '@/components/ui/notifications';
import { useQuery } from '@tanstack/react-query';

export default function AIAnalysisPanel({ drawingSet, onAnalysisComplete }) {
  const [analyzing, setAnalyzing] = useState(false);

  const { data: sheets } = useQuery({
    queryKey: ['drawing-sheets', drawingSet.id],
    queryFn: async () => {
      return await base44.entities.DrawingSheet.filter({ 
        drawing_set_id: drawingSet.id 
      });
    },
    enabled: !!drawingSet.id
  });

  const parseFindings = () => {
    if (!sheets) return { qualityChecks: [], issueCount: 0 };
    
    const allQualityChecks = [];
    let totalIssues = 0;

    sheets.forEach(sheet => {
      if (sheet.ai_findings) {
        try {
          const findings = JSON.parse(sheet.ai_findings);
          if (findings.quality_checks) {
            findings.quality_checks.forEach(qc => {
              allQualityChecks.push({
                ...qc,
                sheet: sheet.sheet_number
              });
            });
          }
          if (findings.issues) {
            totalIssues += findings.issues.length;
          }
        } catch (e) {
          console.error('Failed to parse findings:', e);
        }
      }
    });

    return { qualityChecks: allQualityChecks, issueCount: totalIssues };
  };

  const { qualityChecks, issueCount } = parseFindings();

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'missing_dimensions':
      case 'missing_detail':
        return <FileText size={14} className="text-amber-400" />;
      case 'material_callout_error':
      case 'unclear_annotations':
        return <AlertTriangle size={14} className="text-red-400" />;
      default:
        return <AlertCircle size={14} className="text-zinc-400" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'high':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'medium':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

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
        <div className="space-y-4">
          <div className="prose prose-sm prose-invert max-w-none">
            <div className="text-sm text-zinc-300 whitespace-pre-line">
              {drawingSet.ai_summary}
            </div>
          </div>

          {qualityChecks.length > 0 && (
            <div className="border-t border-zinc-800 pt-4">
              <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-500" />
                Quality Checks ({qualityChecks.length})
              </h4>
              <div className="space-y-2">
                {qualityChecks.map((qc, idx) => (
                  <Card key={idx} className="bg-zinc-800/30 border-zinc-700 p-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {getCategoryIcon(qc.category)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-zinc-300">
                            {qc.category.replace(/_/g, ' ').toUpperCase()}
                          </span>
                          <Badge variant="outline" className={`text-[10px] ${getSeverityColor(qc.severity)}`}>
                            {qc.severity}
                          </Badge>
                          {qc.sheet && (
                            <Badge variant="outline" className="text-[10px] bg-zinc-700/30 text-zinc-400 border-zinc-600">
                              {qc.sheet}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400 mb-1">{qc.description}</p>
                        {qc.location && (
                          <p className="text-[10px] text-zinc-500">Location: {qc.location}</p>
                        )}
                        {qc.recommendation && (
                          <div className="mt-2 p-2 bg-amber-500/5 border border-amber-500/10 rounded text-[10px] text-amber-400">
                            💡 {qc.recommendation}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!drawingSet.ai_summary && drawingSet.ai_review_status === 'pending' && (
        <div className="text-sm text-zinc-500 italic">
          Click "Analyze" to extract key information, run quality checks, detect clashes, and generate a summary.
        </div>
      )}
    </Card>
  );
}