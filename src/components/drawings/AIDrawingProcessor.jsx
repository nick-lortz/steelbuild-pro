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

export default function AIDrawingProcessor({ drawingSet, sheets, onUpdate, revisions = [] }) {
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
      // Prepare revision history for AI analysis
      const revisionHistory = revisions.map(rev => ({
        revision_number: rev.revision_number,
        revision_date: rev.revision_date,
        description: rev.description,
        status: rev.status,
        submitted_by: rev.submitted_by
      })).sort((a, b) => new Date(a.revision_date) - new Date(b.revision_date));
      // Analyze drawing set with AI
      const prompt = `Analyze this structural steel drawing set and its complete revision history:

**Drawing Set Info:**
- Set Name: ${drawingSet.set_name}
- Set Number: ${drawingSet.set_number}
- Current Revision: ${drawingSet.current_revision || 'Not specified'}
- Status: ${drawingSet.status}
- Sheet Count: ${sheets.length}
- Sheet Numbers: ${sheets.map(s => s.sheet_number).join(', ')}

**Complete Revision History (chronological):**
${revisionHistory.length > 0 ? revisionHistory.map(rev => `
- Revision ${rev.revision_number} (${rev.revision_date})
  Status: ${rev.status}
  Description: ${rev.description || 'No description'}
  Submitted by: ${rev.submitted_by || 'Unknown'}
`).join('') : 'No revision history available'}

**Analysis Tasks:**

1. **Discipline Classification**: 
   - Identify the primary discipline (Structural, Architectural, MEP, Connections, Misc Metals, Stairs, Handrails)
   - Provide a confidence score (0-100) based on:
     * Sheet naming conventions (S-xxx for structural, A-xxx for architectural, etc.)
     * Drawing content and details visible
     * Typical elements shown (structural steel members, architectural elements, MEP systems, etc.)
   - If multiple disciplines are detected, list alternatives with their confidence scores
   
2. **Revision Gap Analysis**: 
   - Analyze the revision sequence for missing revisions (e.g., Rev 1, Rev 3 - missing Rev 2)
   - Consider both numeric sequences (0,1,2...) and letter sequences (A,B,C...)
   - Identify any suspicious gaps in revision dates
   
3. **Superseded Drawing Detection**:
   - Determine if this drawing has been superseded by checking:
     * Are there newer revisions with "superseded" status?
     * Is the current revision marked as superseded?
     * Are there revision descriptions indicating replacement?
     * Is there a pattern suggesting this drawing set is outdated?
   - Provide specific evidence from the revision history

4. **Key Information Extraction**: Extract drawing number, current revision, date, and title from title blocks

**Response Format (JSON):**
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
  "revision_analysis": {
    "missing_revisions": ["array of missing revision identifiers"],
    "gap_details": [
      {
        "gap": "string (e.g., 'Rev 2 to Rev 4')",
        "missing": "string (e.g., 'Rev 3')",
        "date_gap_days": number (days between revisions if suspicious),
        "severity": "string (minor, moderate, critical)"
      }
    ],
    "total_revisions": number,
    "revision_frequency_days": number (average days between revisions)
  },
  "is_superseded": boolean,
  "superseded_details": {
    "superseded_by_revision": "string or null (which revision superseded this)",
    "superseded_date": "string or null (when was it superseded)",
    "evidence": ["array of specific evidence from revision history"],
    "confidence": number (0-100, confidence that this is superseded)
  },
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
            revision_analysis: {
              type: "object",
              properties: {
                missing_revisions: { 
                  type: "array",
                  items: { type: "string" }
                },
                gap_details: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      gap: { type: "string" },
                      missing: { type: "string" },
                      date_gap_days: { type: "number" },
                      severity: { type: "string" }
                    }
                  }
                },
                total_revisions: { type: "number" },
                revision_frequency_days: { type: "number" }
              }
            },
            is_superseded: { type: "boolean" },
            superseded_details: {
              type: "object",
              properties: {
                superseded_by_revision: { type: "string" },
                superseded_date: { type: "string" },
                evidence: {
                  type: "array",
                  items: { type: "string" }
                },
                confidence: { type: "number" }
              }
            },
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
          {results.is_superseded && results.superseded_details && (
            <Alert className="bg-red-500/10 border-red-500/20">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-400">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <strong className="text-red-300">⚠️ Superseded Drawing</strong>
                    <Badge variant="outline" className="bg-red-500/20 text-red-300 border-red-500/30">
                      {results.superseded_details.confidence}% confident
                    </Badge>
                  </div>
                  
                  {results.superseded_details.superseded_by_revision && (
                    <p className="text-sm">
                      <strong>Superseded by:</strong> {results.superseded_details.superseded_by_revision}
                      {results.superseded_details.superseded_date && (
                        <span> on {results.superseded_details.superseded_date}</span>
                      )}
                    </p>
                  )}

                  {results.superseded_details.evidence?.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium mb-1">Evidence:</p>
                      <ul className="text-xs space-y-1 ml-4">
                        {results.superseded_details.evidence.map((item, idx) => (
                          <li key={idx} className="list-disc">{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Revision Analysis */}
          {results.revision_analysis && (
            <Card className="bg-zinc-800/50 border-zinc-700">
              <CardContent className="p-4">
                <p className="text-xs text-zinc-500 mb-3">Revision History Analysis</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Total Revisions:</span>
                    <span className="text-white font-medium">{results.revision_analysis.total_revisions || 0}</span>
                  </div>
                  {results.revision_analysis.revision_frequency_days > 0 && (
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Avg. Revision Frequency:</span>
                      <span className="text-white font-medium">{Math.round(results.revision_analysis.revision_frequency_days)} days</span>
                    </div>
                  )}
                </div>

                {/* Missing Revisions with Details */}
                {results.revision_analysis.gap_details?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-zinc-700 space-y-2">
                    <p className="text-xs text-amber-400 font-medium flex items-center gap-1">
                      <AlertTriangle size={14} />
                      Revision Gaps Detected
                    </p>
                    {results.revision_analysis.gap_details.map((gap, idx) => (
                      <Alert key={idx} className={`
                        ${gap.severity === 'critical' ? 'bg-red-500/10 border-red-500/20' : ''}
                        ${gap.severity === 'moderate' ? 'bg-amber-500/10 border-amber-500/20' : ''}
                        ${gap.severity === 'minor' ? 'bg-blue-500/10 border-blue-500/20' : ''}
                      `}>
                        <AlertDescription className={`
                          ${gap.severity === 'critical' ? 'text-red-400' : ''}
                          ${gap.severity === 'moderate' ? 'text-amber-400' : ''}
                          ${gap.severity === 'minor' ? 'text-blue-400' : ''}
                        `}>
                          <div className="flex items-start justify-between">
                            <div>
                              <strong>{gap.gap}:</strong> Missing {gap.missing}
                              {gap.date_gap_days > 0 && (
                                <span className="block text-xs mt-1">
                                  {gap.date_gap_days} days between revisions
                                </span>
                              )}
                            </div>
                            <Badge variant="outline" className={`
                              ${gap.severity === 'critical' ? 'bg-red-500/20 text-red-400 border-red-500/30' : ''}
                              ${gap.severity === 'moderate' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : ''}
                              ${gap.severity === 'minor' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : ''}
                            `}>
                              {gap.severity}
                            </Badge>
                          </div>
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
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