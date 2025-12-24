import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, CheckCircle, AlertTriangle, FileText, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function AIDrawingProcessor({ drawingSet, sheets, onUpdate }) {
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackType, setFeedbackType] = useState(null);
  const [correctDiscipline, setCorrectDiscipline] = useState('');
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const processDrawingSet = async () => {
    setProcessing(true);
    setResults(null);

    try {
      // Analyze drawing set with AI
      const prompt = `Analyze this structural steel drawing set and provide:

1. **Discipline Classification**: 
   - Identify the primary discipline (Structural, Architectural, MEP, Connections, Misc Metals, Stairs, Handrails)
   - Provide a confidence score (0-100) based on:
     * Sheet naming conventions (S-xxx for structural, A-xxx for architectural, etc.)
     * Drawing content and details visible
     * Typical elements shown (structural steel members, architectural elements, MEP systems, etc.)
   - If multiple disciplines are detected, list alternatives with their confidence scores
   
2. **Missing Revisions**: Identify any gaps in revision sequence
3. **Superseded Drawings**: Flag if this appears to be superseded by newer versions
4. **Key Information**: Extract drawing number, current revision, date, and title from title blocks

Drawing Set Info:
- Set Name: ${drawingSet.set_name}
- Set Number: ${drawingSet.set_number}
- Current Revision: ${drawingSet.current_revision || 'Not specified'}
- Status: ${drawingSet.status}
- Sheet Count: ${sheets.length}
- Sheet Numbers: ${sheets.map(s => s.sheet_number).join(', ')}

Provide response in JSON format with fields:
{
  "discipline": "string (primary discipline)",
  "confidence": number (0-100, your confidence in the primary classification),
  "alternative_disciplines": [
    {
      "discipline": "string",
      "confidence": number (0-100)
    }
  ],
  "classification_reasoning": "string (explain why you chose this discipline)",
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
            alternative_disciplines: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  discipline: { type: "string" },
                  confidence: { type: "number" }
                }
              }
            },
            classification_reasoning: { type: "string" },
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

      // Auto-update discipline if confidence is high (>= 75%)
      if (response.confidence >= 75 && response.discipline) {
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
            ai_summary: `AI classified as ${response.discipline} (${response.confidence}% confidence). ${response.classification_reasoning}`
          });
        }
      } else if (response.confidence < 75) {
        // Just mark as reviewed without auto-updating
        await onUpdate({
          ai_review_status: 'completed',
          ai_summary: `AI suggested ${response.discipline} with ${response.confidence}% confidence (below auto-assignment threshold). ${response.classification_reasoning}`
        });
      }

    } catch (error) {
      setResults({ error: error.message });
    } finally {
      setProcessing(false);
    }
  };

  const submitFeedback = async () => {
    setSubmittingFeedback(true);
    try {
      const feedbackData = {
        drawing_set_id: drawingSet.id,
        drawing_set_name: drawingSet.set_name,
        ai_suggested_discipline: results.discipline,
        ai_confidence: results.confidence,
        ai_reasoning: results.classification_reasoning,
        feedback_type: feedbackType, // 'correct' or 'incorrect'
        correct_discipline: feedbackType === 'incorrect' ? correctDiscipline : results.discipline,
        user_notes: feedbackNotes,
        timestamp: new Date().toISOString()
      };

      // Store feedback for future training
      // This can be used to improve the AI model over time
      console.log('AI Classification Feedback:', feedbackData);

      // If user corrected the discipline, update the drawing set
      if (feedbackType === 'incorrect' && correctDiscipline) {
        await onUpdate({
          discipline: correctDiscipline,
          ai_summary: `User corrected AI classification from ${results.discipline} to ${correctDiscipline}. ${feedbackNotes || ''}`
        });
      }

      setShowFeedback(false);
      setFeedbackType(null);
      setCorrectDiscipline('');
      setFeedbackNotes('');
      
      alert('Thank you for your feedback! This helps improve our AI classification accuracy.');
    } catch (error) {
      alert('Failed to submit feedback: ' + error.message);
    } finally {
      setSubmittingFeedback(false);
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
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <p className="text-xs text-zinc-500 mb-1">Discipline Classification</p>
                  <p className="text-lg font-semibold text-white">{results.discipline}</p>
                  {results.classification_reasoning && (
                    <p className="text-xs text-zinc-400 mt-1 italic">{results.classification_reasoning}</p>
                  )}
                </div>
                <Badge 
                  variant="outline" 
                  className={
                    results.confidence >= 80 
                      ? 'bg-green-500/20 text-green-400 border-green-500/30'
                      : results.confidence >= 60
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      : 'bg-red-500/20 text-red-400 border-red-500/30'
                  }
                >
                  {results.confidence}% confidence
                </Badge>
              </div>

              {/* Alternative Disciplines */}
              {results.alternative_disciplines?.length > 0 && (
                <div className="pt-3 border-t border-zinc-700">
                  <p className="text-xs text-zinc-500 mb-2">Alternative Classifications:</p>
                  <div className="flex flex-wrap gap-2">
                    {results.alternative_disciplines.map((alt, idx) => (
                      <Badge key={idx} variant="outline" className="bg-zinc-700/50 text-zinc-300 border-zinc-600">
                        {alt.discipline} ({alt.confidence}%)
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* User Feedback */}
              {!showFeedback ? (
                <div className="pt-3 border-t border-zinc-700 mt-3">
                  <p className="text-xs text-zinc-500 mb-2">Was this classification correct?</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setFeedbackType('correct');
                        setShowFeedback(true);
                      }}
                      className="flex-1 border-zinc-600 hover:bg-green-500/10 hover:border-green-500/30"
                    >
                      <ThumbsUp size={14} className="mr-1" />
                      Correct
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setFeedbackType('incorrect');
                        setShowFeedback(true);
                      }}
                      className="flex-1 border-zinc-600 hover:bg-red-500/10 hover:border-red-500/30"
                    >
                      <ThumbsDown size={14} className="mr-1" />
                      Incorrect
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="pt-3 border-t border-zinc-700 mt-3 space-y-3">
                  {feedbackType === 'incorrect' && (
                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block">Correct Discipline:</label>
                      <Select value={correctDiscipline} onValueChange={setCorrectDiscipline}>
                        <SelectTrigger className="bg-zinc-900 border-zinc-700">
                          <SelectValue placeholder="Select correct discipline" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-700">
                          <SelectItem value="structural">Structural</SelectItem>
                          <SelectItem value="connections">Connections</SelectItem>
                          <SelectItem value="misc_metals">Misc Metals</SelectItem>
                          <SelectItem value="stairs">Stairs</SelectItem>
                          <SelectItem value="handrails">Handrails</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Additional Notes (Optional):</label>
                    <Textarea
                      value={feedbackNotes}
                      onChange={(e) => setFeedbackNotes(e.target.value)}
                      placeholder="Provide additional context..."
                      className="bg-zinc-900 border-zinc-700 text-sm h-20"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={submitFeedback}
                      disabled={submittingFeedback || (feedbackType === 'incorrect' && !correctDiscipline)}
                      className="flex-1 bg-amber-500 hover:bg-amber-600 text-black"
                    >
                      {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowFeedback(false);
                        setFeedbackType(null);
                        setCorrectDiscipline('');
                        setFeedbackNotes('');
                      }}
                      className="border-zinc-600"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
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