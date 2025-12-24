import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, CheckCircle, AlertTriangle, FileText } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AIDrawingProcessor({ drawingSet, sheets, onUpdate }) {
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState(null);

  const processDrawingSet = async () => {
    setProcessing(true);
    setResults(null);

    try {
      // Analyze drawing set with AI
      const prompt = `Analyze this structural steel drawing set and provide:
1. **Discipline Classification**: Identify the primary discipline (Structural, Architectural, MEP, Connections, Misc Metals, etc.)
2. **Missing Revisions**: Identify any gaps in revision sequence
3. **Superseded Drawings**: Flag if this appears to be superseded by newer versions
4. **Key Information**: Extract drawing number, current revision, date, and title

Drawing Set Info:
- Set Name: ${drawingSet.set_name}
- Set Number: ${drawingSet.set_number}
- Current Revision: ${drawingSet.current_revision || 'Not specified'}
- Status: ${drawingSet.status}
- Sheet Count: ${sheets.length}
- Sheet Numbers: ${sheets.map(s => s.sheet_number).join(', ')}

Provide response in JSON format with fields:
{
  "discipline": "string (Structural/Architectural/MEP/etc)",
  "confidence": number (0-100),
  "missing_revisions": ["array of missing revision identifiers"],
  "is_superseded": boolean,
  "superseded_reason": "string or null",
  "extracted_info": {
    "drawing_number": "string",
    "revision": "string",
    "date": "string (YYYY-MM-DD)",
    "title": "string"
  },
  "recommendations": ["array of actionable recommendations"]
}`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            discipline: { type: "string" },
            confidence: { type: "number" },
            missing_revisions: { 
              type: "array",
              items: { type: "string" }
            },
            is_superseded: { type: "boolean" },
            superseded_reason: { type: "string" },
            extracted_info: {
              type: "object",
              properties: {
                drawing_number: { type: "string" },
                revision: { type: "string" },
                date: { type: "string" },
                title: { type: "string" }
              }
            },
            recommendations: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      setResults(response);

      // Auto-update discipline if confidence is high
      if (response.confidence > 70 && response.discipline) {
        const disciplineMap = {
          'Structural': 'structural',
          'Architectural': 'other',
          'MEP': 'other',
          'Connections': 'connections',
          'Misc Metals': 'misc_metals',
          'Stairs': 'stairs',
          'Handrails': 'handrails'
        };
        
        const mappedDiscipline = disciplineMap[response.discipline] || 'other';
        
        if (mappedDiscipline !== drawingSet.discipline) {
          await onUpdate({
            discipline: mappedDiscipline,
            ai_review_status: 'completed',
            ai_summary: `AI classified as ${response.discipline} (${response.confidence}% confidence). ${response.recommendations.join(' ')}`
          });
        }
      }

    } catch (error) {
      setResults({ error: error.message });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
          <Sparkles size={16} className="text-amber-500" />
          AI Drawing Analysis
        </h4>
        <Button
          size="sm"
          onClick={processDrawingSet}
          disabled={processing}
          className="bg-amber-500 hover:bg-amber-600 text-black"
        >
          {processing ? (
            <>
              <Loader2 size={14} className="mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles size={14} className="mr-2" />
              Analyze with AI
            </>
          )}
        </Button>
      </div>

      {results && !results.error && (
        <div className="space-y-3">
          {/* Discipline Classification */}
          <Card className="bg-zinc-800/50 border-zinc-700">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Discipline Classification</p>
                  <p className="text-lg font-semibold text-white">{results.discipline}</p>
                </div>
                <Badge 
                  variant="outline" 
                  className={
                    results.confidence > 80 
                      ? 'bg-green-500/20 text-green-400 border-green-500/30'
                      : results.confidence > 60
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      : 'bg-red-500/20 text-red-400 border-red-500/30'
                  }
                >
                  {results.confidence}% confidence
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Superseded Warning */}
          {results.is_superseded && (
            <Alert className="bg-red-500/10 border-red-500/20">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-400">
                <strong>Superseded Drawing:</strong> {results.superseded_reason}
              </AlertDescription>
            </Alert>
          )}

          {/* Missing Revisions */}
          {results.missing_revisions?.length > 0 && (
            <Alert className="bg-amber-500/10 border-amber-500/20">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <AlertDescription className="text-amber-400">
                <strong>Missing Revisions:</strong> {results.missing_revisions.join(', ')}
              </AlertDescription>
            </Alert>
          )}

          {/* Extracted Info */}
          <Card className="bg-zinc-800/50 border-zinc-700">
            <CardContent className="p-4">
              <p className="text-xs text-zinc-500 mb-2 flex items-center gap-1">
                <FileText size={14} />
                Extracted Information
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-zinc-500">Drawing #:</span>
                  <span className="ml-2 text-white">{results.extracted_info.drawing_number || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-zinc-500">Revision:</span>
                  <span className="ml-2 text-white">{results.extracted_info.revision || 'N/A'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-zinc-500">Title:</span>
                  <span className="ml-2 text-white">{results.extracted_info.title || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-zinc-500">Date:</span>
                  <span className="ml-2 text-white">{results.extracted_info.date || 'N/A'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          {results.recommendations?.length > 0 && (
            <Card className="bg-blue-500/5 border-blue-500/20">
              <CardContent className="p-4">
                <p className="text-xs text-blue-400 mb-2 flex items-center gap-1">
                  <CheckCircle size={14} />
                  Recommendations
                </p>
                <ul className="space-y-1 text-sm text-zinc-300">
                  {results.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {results?.error && (
        <Alert className="bg-red-500/10 border-red-500/20">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-400">
            Failed to analyze drawing: {results.error}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}