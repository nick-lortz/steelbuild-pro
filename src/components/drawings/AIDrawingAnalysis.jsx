import React, { useState } from 'react';
import { apiClient } from '@/api/client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Loader2, AlertTriangle, CheckCircle, Info } from 'lucide-react';

export default function AIDrawingAnalysis({ drawing, drawingUrl }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const analyzeDrawing = async () => {
    setAnalyzing(true);
    try {
      const currentDate = new Date().toISOString().split('T')[0];
      
      const response = await apiClient.integrations.Core.InvokeLLM({
        prompt: `You are a structural steel engineering expert. Analyze this construction drawing and provide detailed insights.

**IMPORTANT: Current date is ${currentDate}. Use this date to validate all date references in the drawing.**

Drawing Information:
- Set Name: ${drawing.set_name}
- Revision: ${drawing.current_revision}
- Status: ${drawing.status}
- Discipline: ${drawing.discipline}

When analyzing dates:
- Compare drawing dates against the current date (${currentDate})
- Only flag dates that are AFTER ${currentDate} as potential errors
- Dates before ${currentDate} are valid

Analyze the drawing file and provide:
1. Quality check findings
2. Potential issues or concerns
3. Compliance with standards
4. Recommendations for fabrication
5. Coordination issues`,
        file_urls: drawingUrl ? [drawingUrl] : [],
        response_json_schema: {
          type: "object",
          properties: {
            overall_quality: {
              type: "string",
              enum: ["excellent", "good", "fair", "poor"]
            },
            completeness_score: {
              type: "number",
              description: "0-100 score"
            },
            critical_issues: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
                  issue: { type: "string" },
                  location: { type: "string" },
                  recommendation: { type: "string" }
                }
              }
            },
            compliance_check: {
              type: "object",
              properties: {
                aisc_standards: { type: "boolean" },
                aws_welding: { type: "boolean" },
                osha_safety: { type: "boolean" },
                notes: { type: "string" }
              }
            },
            fabrication_notes: {
              type: "array",
              items: { type: "string" }
            },
            coordination_concerns: {
              type: "array",
              items: { type: "string" }
            },
            estimated_complexity: {
              type: "string",
              enum: ["simple", "moderate", "complex", "highly_complex"]
            }
          }
        }
      });
      
      setAnalysis(response);
    } catch (error) {
      console.error('Analysis error:', error);
      setAnalysis({ error: 'Failed to analyze drawing' });
    } finally {
      setAnalyzing(false);
    }
  };

  if (!analysis) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain size={18} className="text-purple-500" />
            AI Drawing Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            onClick={analyzeDrawing}
            disabled={analyzing}
            className="bg-purple-500 hover:bg-purple-600"
          >
            {analyzing ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Brain size={16} className="mr-2" />
                Analyze Drawing
              </>
            )}
          </Button>
          <p className="text-xs text-zinc-500 mt-2">
            AI will review drawing quality, compliance, and fabrication concerns
          </p>
        </CardContent>
      </Card>
    );
  }

  if (analysis.error) {
    return (
      <Card className="bg-red-500/5 border-red-500/20">
        <CardContent className="p-6 text-center">
          <AlertTriangle className="mx-auto mb-2 text-red-500" size={32} />
          <p className="text-red-400">{analysis.error}</p>
        </CardContent>
      </Card>
    );
  }

  const qualityColors = {
    excellent: "bg-green-500/20 text-green-400 border-green-500/30",
    good: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    fair: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    poor: "bg-red-500/20 text-red-400 border-red-500/30"
  };

  const severityColors = {
    critical: "bg-red-500/20 text-red-400 border-red-500/30",
    high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    low: "bg-blue-500/20 text-blue-400 border-blue-500/30"
  };

  return (
    <div className="space-y-4">
      {/* Overall Quality */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Brain size={18} className="text-purple-500" />
              Analysis Results
            </span>
            <Badge variant="outline" className={`${qualityColors[analysis.overall_quality]} border`}>
              {analysis.overall_quality?.toUpperCase()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-2">
            <span className="text-zinc-400">Completeness Score</span>
            <span className="text-2xl font-bold text-white">{analysis.completeness_score}/100</span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-amber-500 h-full transition-all"
              style={{ width: `${analysis.completeness_score}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Critical Issues */}
      {analysis.critical_issues?.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-500" />
              Issues Found ({analysis.critical_issues.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysis.critical_issues.map((issue, idx) => (
                <div key={idx} className="p-3 bg-zinc-800/50 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="outline" className={`${severityColors[issue.severity]} border`}>
                      {issue.severity?.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-zinc-500">{issue.location}</span>
                  </div>
                  <p className="text-white font-medium mb-1">{issue.issue}</p>
                  <p className="text-sm text-amber-400">
                    <strong>Recommendation:</strong> {issue.recommendation}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Compliance Check */}
      {analysis.compliance_check && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle size={18} className="text-green-500" />
              Standards Compliance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">AISC Standards</span>
                {analysis.compliance_check.aisc_standards ? (
                  <CheckCircle size={16} className="text-green-500" />
                ) : (
                  <AlertTriangle size={16} className="text-red-500" />
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">AWS Welding Standards</span>
                {analysis.compliance_check.aws_welding ? (
                  <CheckCircle size={16} className="text-green-500" />
                ) : (
                  <AlertTriangle size={16} className="text-red-500" />
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">OSHA Safety</span>
                {analysis.compliance_check.osha_safety ? (
                  <CheckCircle size={16} className="text-green-500" />
                ) : (
                  <AlertTriangle size={16} className="text-red-500" />
                )}
              </div>
              {analysis.compliance_check.notes && (
                <p className="text-sm text-zinc-400 mt-3 pt-3 border-t border-zinc-800">
                  {analysis.compliance_check.notes}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fabrication Notes */}
      {analysis.fabrication_notes?.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info size={18} className="text-blue-500" />
              Fabrication Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.fabrication_notes.map((note, idx) => (
                <li key={idx} className="flex items-start gap-2 text-zinc-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                  <span className="text-sm">{note}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Complexity Badge */}
      {analysis.estimated_complexity && (
        <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
          <span className="text-zinc-400">Estimated Complexity</span>
          <Badge variant="outline" className="bg-purple-500/20 text-purple-400 border-purple-500/30 capitalize">
            {analysis.estimated_complexity.replace('_', ' ')}
          </Badge>
        </div>
      )}
    </div>
  );
}