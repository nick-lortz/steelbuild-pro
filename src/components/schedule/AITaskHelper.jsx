import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, Loader2, ArrowRight, Clock, Link2, FileText } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

export default function AITaskHelper({ 
  taskName, 
  projectType, 
  existingTasks, 
  onApplySuggestions 
}) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(null);

  const generateSuggestions = async () => {
    if (!taskName) return;
    
    setLoading(true);
    try {
      const taskList = existingTasks.map(t => ({
        name: t.name,
        phase: t.phase,
        duration_days: t.duration_days
      }));

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a construction project management expert specializing in structural steel and metal fabrication.

Project Type: ${projectType || 'Steel fabrication project'}
Current Task Name: ${taskName}
Existing Tasks in Project: ${JSON.stringify(taskList)}

Based on the task name and project context, provide:
1. A detailed task description (2-3 sentences)
2. Suggested WBS code (format: XX.XX.XX)
3. Estimated duration in days
4. List of predecessor task names (from existing tasks) that should be completed before this task
5. Potential risks or delays to watch for
6. Resource requirements (crew size, equipment needs)

Consider typical construction workflows, dependencies, and best practices for steel fabrication projects.`,
        response_json_schema: {
          type: "object",
          properties: {
            description: { type: "string" },
            wbs_code: { type: "string" },
            estimated_duration_days: { type: "number" },
            predecessor_tasks: { 
              type: "array", 
              items: { type: "string" } 
            },
            potential_delays: { 
              type: "array", 
              items: { type: "string" } 
            },
            resource_notes: { type: "string" }
          }
        }
      });

      setSuggestions(result);
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const applySuggestion = (field, value) => {
    onApplySuggestions({ [field]: value });
  };

  const applyAll = () => {
    if (!suggestions) return;
    
    const updates = {};
    if (suggestions.description) updates.description = suggestions.description;
    if (suggestions.wbs_code) updates.wbs_code = suggestions.wbs_code;
    if (suggestions.estimated_duration_days) updates.duration_days = suggestions.estimated_duration_days;
    
    // Find predecessor IDs from names
    if (suggestions.predecessor_tasks?.length > 0) {
      const predecessorIds = existingTasks
        .filter(t => suggestions.predecessor_tasks.includes(t.name))
        .map(t => t.id);
      if (predecessorIds.length > 0) {
        updates.predecessor_ids = predecessorIds;
      }
    }
    
    onApplySuggestions(updates);
  };

  if (!taskName) return null;

  return (
    <Card className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/20 p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-purple-400" />
          <h3 className="font-medium text-white">AI Task Assistant</h3>
        </div>
        <Button
          size="sm"
          onClick={generateSuggestions}
          disabled={loading}
          className="bg-purple-500 hover:bg-purple-600 text-white"
        >
          {loading ? (
            <>
              <Loader2 size={14} className="mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles size={14} className="mr-2" />
              Get Suggestions
            </>
          )}
        </Button>
      </div>

      {suggestions && (
        <div className="space-y-3">
          {/* Description */}
          {suggestions.description && (
            <div className="p-3 bg-zinc-900/50 rounded-lg">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-blue-400" />
                  <span className="text-xs font-medium text-zinc-400">Description</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => applySuggestion('description', suggestions.description)}
                  className="h-6 text-xs"
                >
                  Apply
                </Button>
              </div>
              <p className="text-sm text-zinc-300">{suggestions.description}</p>
            </div>
          )}

          {/* WBS & Duration */}
          <div className="grid grid-cols-2 gap-3">
            {suggestions.wbs_code && (
              <div className="p-3 bg-zinc-900/50 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-zinc-400">WBS Code</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => applySuggestion('wbs_code', suggestions.wbs_code)}
                    className="h-6 text-xs"
                  >
                    Apply
                  </Button>
                </div>
                <p className="text-sm font-mono text-amber-500">{suggestions.wbs_code}</p>
              </div>
            )}

            {suggestions.estimated_duration_days && (
              <div className="p-3 bg-zinc-900/50 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1">
                    <Clock size={12} className="text-blue-400" />
                    <span className="text-xs font-medium text-zinc-400">Duration</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => applySuggestion('duration_days', suggestions.estimated_duration_days)}
                    className="h-6 text-xs"
                  >
                    Apply
                  </Button>
                </div>
                <p className="text-sm text-zinc-300">{suggestions.estimated_duration_days} days</p>
              </div>
            )}
          </div>

          {/* Predecessors */}
          {suggestions.predecessor_tasks?.length > 0 && (
            <div className="p-3 bg-zinc-900/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Link2 size={14} className="text-green-400" />
                  <span className="text-xs font-medium text-zinc-400">Suggested Prerequisites</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const predecessorIds = existingTasks
                      .filter(t => suggestions.predecessor_tasks.includes(t.name))
                      .map(t => t.id);
                    applySuggestion('predecessor_ids', predecessorIds);
                  }}
                  className="h-6 text-xs"
                >
                  Apply
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {suggestions.predecessor_tasks.map((task, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs bg-green-500/10 text-green-400 border-green-500/20">
                    {task}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Potential Delays */}
          {suggestions.potential_delays?.length > 0 && (
            <div className="p-3 bg-zinc-900/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-amber-400">⚠️ Watch Out For:</span>
              </div>
              <ul className="space-y-1">
                {suggestions.potential_delays.map((delay, idx) => (
                  <li key={idx} className="text-xs text-zinc-400 flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">•</span>
                    {delay}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Resource Notes */}
          {suggestions.resource_notes && (
            <div className="p-3 bg-zinc-900/50 rounded-lg">
              <span className="text-xs font-medium text-zinc-400 block mb-1">Resource Requirements:</span>
              <p className="text-xs text-zinc-300">{suggestions.resource_notes}</p>
            </div>
          )}

          {/* Apply All */}
          <Button
            onClick={applyAll}
            className="w-full bg-purple-500 hover:bg-purple-600 text-white"
          >
            Apply All Suggestions
            <ArrowRight size={16} className="ml-2" />
          </Button>
        </div>
      )}
    </Card>
  );
}