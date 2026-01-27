import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from '@/api/base44Client';
import { Sparkles, AlertTriangle, TrendingUp, FileText, Loader2, Copy, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/notifications';

export default function ScheduleAIAssistant({ tasks, workPackages, project, resources }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [conflicts, setConflicts] = useState(null);
  const [suggestions, setSuggestions] = useState(null);
  const [summary, setSummary] = useState(null);
  const [expandedSection, setExpandedSection] = useState('conflicts');
  const [generatingSummary, setGeneratingSummary] = useState(false);

  const analyzeSchedule = async () => {
    setAnalyzing(true);
    setConflicts(null);
    setSuggestions(null);

    try {
      const today = new Date().toISOString().split('T')[0];
      const overdueTasks = tasks.filter(t => t.end_date && t.end_date < today && t.status !== 'completed');
      const missingDates = tasks.filter(t => !t.start_date || !t.end_date);
      const unassignedTasks = tasks.filter(t => !t.assigned_resources || t.assigned_resources.length === 0);
      const blockedTasks = tasks.filter(t => t.status === 'blocked');

      const scheduleData = {
        project_name: project.name,
        project_number: project.project_number,
        target_completion: project.target_completion,
        current_phase: project.phase,
        total_tasks: tasks.length,
        completed_tasks: tasks.filter(t => t.status === 'completed').length,
        overdue_count: overdueTasks.length,
        missing_dates_count: missingDates.length,
        unassigned_count: unassignedTasks.length,
        blocked_count: blockedTasks.length,
        overdue_tasks: overdueTasks.map(t => ({
          name: t.name,
          end_date: t.end_date,
          status: t.status,
          phase: t.phase
        })),
        tasks_with_dependencies: tasks.filter(t => t.predecessor_ids && t.predecessor_ids.length > 0).map(t => ({
          name: t.name,
          start_date: t.start_date,
          end_date: t.end_date,
          predecessor_count: t.predecessor_ids?.length || 0,
          status: t.status
        })),
        resource_availability: resources.filter(r => r.status === 'available').length
      };

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a construction scheduling expert analyzing a structural steel project schedule.

PROJECT: ${scheduleData.project_name} (${scheduleData.project_number})
Target Completion: ${scheduleData.target_completion || 'Not set'}
Current Phase: ${scheduleData.current_phase}

SCHEDULE DATA:
- Total Tasks: ${scheduleData.total_tasks}
- Completed: ${scheduleData.completed_tasks}
- Overdue: ${scheduleData.overdue_count}
- Missing Dates: ${scheduleData.missing_dates_count}
- Unassigned: ${scheduleData.unassigned_count}
- Blocked: ${scheduleData.blocked_count}
- Available Resources: ${scheduleData.resource_availability}

OVERDUE TASKS:
${JSON.stringify(scheduleData.overdue_tasks, null, 2)}

TASKS WITH DEPENDENCIES:
${JSON.stringify(scheduleData.tasks_with_dependencies, null, 2)}

Analyze this schedule and identify:
1. Critical conflicts (dependency violations, resource conflicts, phase sequencing issues)
2. Risk factors (late tasks cascading, resource bottlenecks, missing critical path data)
3. Optimization opportunities (resequencing, resource reallocation, parallel execution)

Focus on constructible, field-practical insights for a structural steel PM.`,
        response_json_schema: {
          type: 'object',
          properties: {
            conflicts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  severity: { type: 'string', enum: ['critical', 'high', 'medium'] },
                  title: { type: 'string' },
                  description: { type: 'string' },
                  affected_tasks: { type: 'array', items: { type: 'string' } },
                  impact: { type: 'string' }
                }
              }
            },
            optimization_suggestions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  category: { type: 'string', enum: ['sequencing', 'resources', 'dependencies', 'data_quality'] },
                  title: { type: 'string' },
                  action: { type: 'string' },
                  expected_benefit: { type: 'string' }
                }
              }
            }
          }
        }
      });

      setConflicts(response.conflicts || []);
      setSuggestions(response.optimization_suggestions || []);
    } catch (error) {
      toast.error('Failed to analyze schedule: ' + error.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const generateSummary = async () => {
    setGeneratingSummary(true);
    setSummary(null);

    try {
      const completedCount = tasks.filter(t => t.status === 'completed').length;
      const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;
      const overdueCount = tasks.filter(t => {
        const today = new Date().toISOString().split('T')[0];
        return t.end_date && t.end_date < today && t.status !== 'completed';
      }).length;

      const upcomingTasks = tasks.filter(t => {
        if (!t.end_date || t.status === 'completed') return false;
        const target = new Date(t.end_date + 'T00:00:00');
        const today = new Date();
        const daysOut = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
        return daysOut > 0 && daysOut <= 7;
      });

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a concise schedule status update for project stakeholders.

PROJECT: ${project.name} (${project.project_number})
Phase: ${project.phase}
Target Completion: ${project.target_completion || 'TBD'}

SCHEDULE STATUS:
- Total Tasks: ${tasks.length}
- Completed: ${completedCount} (${Math.round((completedCount / tasks.length) * 100)}%)
- In Progress: ${inProgressCount}
- Overdue: ${overdueCount}
- Due This Week: ${upcomingTasks.length}

UPCOMING TASKS (Next 7 Days):
${upcomingTasks.map(t => `- ${t.name} (Due: ${t.end_date}, Status: ${t.status})`).join('\n')}

IDENTIFIED CONFLICTS:
${conflicts ? conflicts.map(c => `- ${c.title}: ${c.description}`).join('\n') : 'Analysis not run'}

Write a professional 2-3 paragraph summary for the GC/owner covering:
1. Current progress and status
2. Critical items due this week
3. Any schedule concerns or conflicts
4. Next steps

Keep it direct, field-practical, and action-oriented. Use construction industry language.`
      });

      setSummary(response);
    } catch (error) {
      toast.error('Failed to generate summary: ' + error.message);
    } finally {
      setGeneratingSummary(false);
    }
  };

  const copySummary = () => {
    if (summary) {
      navigator.clipboard.writeText(summary);
      toast.success('Summary copied to clipboard');
    }
  };

  const severityConfig = {
    critical: { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: '🔴' },
    high: { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: '🟠' },
    medium: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: '🔵' }
  };

  const categoryConfig = {
    sequencing: { color: 'text-purple-400', icon: '🔄' },
    resources: { color: 'text-blue-400', icon: '👥' },
    dependencies: { color: 'text-amber-400', icon: '🔗' },
    data_quality: { color: 'text-zinc-400', icon: '📊' }
  };

  return (
    <Card className="bg-card border-border">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-amber-500" />
            <h3 className="text-sm font-bold uppercase tracking-wider">AI Schedule Assistant</h3>
          </div>
          <Button
            size="sm"
            onClick={analyzeSchedule}
            disabled={analyzing || tasks.length === 0}
            className="bg-amber-500 hover:bg-amber-600 text-black"
          >
            {analyzing ? (
              <>
                <Loader2 size={14} className="mr-1 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles size={14} className="mr-1" />
                Analyze Schedule
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Conflicts Section */}
      {conflicts && conflicts.length > 0 && (
        <div className="border-b border-border">
          <button
            onClick={() => setExpandedSection(expandedSection === 'conflicts' ? null : 'conflicts')}
            className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-red-400" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Conflicts & Risks ({conflicts.length})
              </span>
            </div>
            <ChevronRight 
              size={14} 
              className={cn(
                'transition-transform',
                expandedSection === 'conflicts' && 'rotate-90'
              )}
            />
          </button>

          {expandedSection === 'conflicts' && (
            <div className="px-4 pb-4 space-y-3">
              {conflicts.map((conflict, idx) => {
                const config = severityConfig[conflict.severity] || severityConfig.medium;
                return (
                  <div key={idx} className="p-3 bg-muted/30 rounded-lg border border-border">
                    <div className="flex items-start gap-2 mb-2">
                      <span className="text-sm">{config.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold">{conflict.title}</p>
                          <Badge className={cn('text-[10px]', config.color)}>
                            {conflict.severity}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{conflict.description}</p>
                        {conflict.impact && (
                          <p className="text-xs text-foreground">
                            <span className="font-semibold">Impact:</span> {conflict.impact}
                          </p>
                        )}
                        {conflict.affected_tasks && conflict.affected_tasks.length > 0 && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            Affects: {conflict.affected_tasks.join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Suggestions Section */}
      {suggestions && suggestions.length > 0 && (
        <div className="border-b border-border">
          <button
            onClick={() => setExpandedSection(expandedSection === 'suggestions' ? null : 'suggestions')}
            className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-green-400" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Optimization Suggestions ({suggestions.length})
              </span>
            </div>
            <ChevronRight 
              size={14} 
              className={cn(
                'transition-transform',
                expandedSection === 'suggestions' && 'rotate-90'
              )}
            />
          </button>

          {expandedSection === 'suggestions' && (
            <div className="px-4 pb-4 space-y-3">
              {suggestions.map((suggestion, idx) => {
                const config = categoryConfig[suggestion.category] || categoryConfig.data_quality;
                return (
                  <div key={idx} className="p-3 bg-muted/30 rounded-lg border border-border">
                    <div className="flex items-start gap-2">
                      <span className="text-sm">{config.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold">{suggestion.title}</p>
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {suggestion.category.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{suggestion.action}</p>
                        {suggestion.expected_benefit && (
                          <p className="text-xs text-green-400">
                            <span className="font-semibold">Expected Benefit:</span> {suggestion.expected_benefit}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Generate Summary Section */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-muted-foreground" />
            <span className="text-xs font-bold uppercase tracking-wider">Stakeholder Summary</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={generateSummary}
            disabled={generatingSummary || !conflicts}
          >
            {generatingSummary ? (
              <>
                <Loader2 size={14} className="mr-1 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate'
            )}
          </Button>
        </div>

        {summary && (
          <div className="space-y-3">
            <div className="relative">
              <Textarea
                value={summary}
                readOnly
                rows={8}
                className="bg-muted/30 border-border text-sm resize-none"
              />
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2 h-7 w-7 p-0"
                onClick={copySummary}
              >
                <Copy size={14} />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Ready to send to GC/owner. Edit as needed before sending.
            </p>
          </div>
        )}
      </div>

      {!conflicts && !analyzing && (
        <div className="p-8 text-center">
          <Sparkles size={32} className="mx-auto mb-3 text-muted-foreground" />
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            Click "Analyze Schedule" to identify conflicts and get AI recommendations
          </p>
        </div>
      )}
    </Card>
  );
}