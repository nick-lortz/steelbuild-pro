import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Lightbulb, Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function RFIWordingAssistant({ rfiType, locationArea, linkedDrawings = [] }) {
  const [originalQuestion, setOriginalQuestion] = useState('');
  const [improvedVersion, setImprovedVersion] = useState(null);
  const [copied, setCopied] = useState(false);

  const improveMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('improveRFIWording', {
        original_question: originalQuestion,
        rfi_type: rfiType,
        location_area: locationArea,
        linked_drawings: linkedDrawings
      });
      return res.data;
    },
    onSuccess: (data) => {
      setImprovedVersion(data);
      toast.success('Wording improved');
    },
    onError: (err) => toast.error(err.message)
  });

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Lightbulb size={16} className="text-amber-500" />
          AI Wording Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <label className="text-xs font-bold text-zinc-300 block mb-2">Your Question (Draft)</label>
          <Textarea
            placeholder="What do you want to ask? (rough draft is fine)"
            value={originalQuestion}
            onChange={(e) => setOriginalQuestion(e.target.value)}
            className="bg-zinc-800 border-zinc-700 h-20 text-sm"
          />
        </div>

        <Button
          onClick={() => improveMutation.mutate()}
          disabled={improveMutation.isPending || !originalQuestion}
          className="w-full bg-amber-600 hover:bg-amber-700"
        >
          {improveMutation.isPending ? (
            <>
              <Loader2 size={14} className="mr-2 animate-spin" />
              Improving...
            </>
          ) : (
            <>
              <Lightbulb size={14} className="mr-2" />
              Improve Wording
            </>
          )}
        </Button>

        {improvedVersion && (
          <div className="space-y-3">
            {/* Improved Question */}
            <div className="p-3 bg-green-900/30 border border-green-700 rounded">
              <div className="text-xs font-bold text-green-400 mb-2">✓ Improved Question (Ready to Send)</div>
              <p className="text-sm text-green-100 mb-2">{improvedVersion.improved_question}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(improvedVersion.improved_question)}
                className="text-xs"
              >
                <Copy size={12} className="mr-1" />
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>

            {/* Clarifications Added */}
            {improvedVersion.clarifications?.length > 0 && (
              <div className="p-3 bg-blue-900/30 border border-blue-700 rounded">
                <div className="text-xs font-bold text-blue-400 mb-2">📋 Clarifications Added</div>
                <div className="space-y-1 text-xs text-blue-200">
                  {improvedVersion.clarifications.map((c, idx) => (
                    <div key={idx}>• {c}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Details */}
            {improvedVersion.suggested_details?.length > 0 && (
              <div className="p-3 bg-purple-900/30 border border-purple-700 rounded">
                <div className="text-xs font-bold text-purple-400 mb-2">🔗 Suggested Attachments/References</div>
                <div className="space-y-1 text-xs text-purple-200">
                  {improvedVersion.suggested_details.map((d, idx) => (
                    <div key={idx}>• {d}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}