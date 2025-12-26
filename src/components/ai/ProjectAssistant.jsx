import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { base44 } from '@/api/base44Client';
import { Sparkles, Send, Loader2, AlertTriangle, FileText, MessageSquareWarning, FileCheck, Calendar } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function ProjectAssistant({ 
  projects, 
  drawings, 
  rfis, 
  changeOrders, 
  tasks, 
  financials,
  expenses = [],
  selectedProject 
}) {
  const [question, setQuestion] = useState('');
  const [conversation, setConversation] = useState([]);
  const [loading, setLoading] = useState(false);
  const [analysisType, setAnalysisType] = useState(null);

  const getProjectContext = () => {
    const project = selectedProject ? projects.find(p => p.id === selectedProject) : null;
    const projectData = project ? {
      project: {
        name: project.name,
        number: project.project_number,
        status: project.status,
        start_date: project.start_date,
        target_completion: project.target_completion,
      }
    } : { projects: projects.map(p => ({ name: p.name, number: p.project_number, status: p.status })) };

    const filterByProject = (items) => selectedProject ? items.filter(i => i.project_id === selectedProject) : items;

    const projectDrawings = filterByProject(drawings);
    const projectRFIs = filterByProject(rfis);
    const projectCOs = filterByProject(changeOrders);
    const projectTasks = filterByProject(tasks);
    const projectFinancials = filterByProject(financials);
    const projectExpenses = filterByProject(expenses);

    // Calculate key metrics
    const overdueDrawings = projectDrawings.filter(d => 
      d.due_date && new Date(d.due_date) < new Date() && d.status !== 'FFF'
    );
    const blockedTasks = projectTasks.filter(t => 
      t.linked_drawing_set_ids && t.linked_drawing_set_ids.length > 0 &&
      ['fabrication', 'delivery', 'erection'].includes(t.phase) &&
      t.linked_drawing_set_ids.some(id => {
        const drawing = projectDrawings.find(d => d.id === id);
        return drawing && drawing.status !== 'FFF';
      })
    );
    const openRFIs = projectRFIs.filter(r => r.status !== 'closed' && r.status !== 'answered');
    const pendingCOs = projectCOs.filter(co => co.status === 'pending' || co.status === 'submitted');
    
    // Calculate financial metrics including expenses
    const totalBudget = projectFinancials.reduce((sum, f) => sum + (Number(f.budget_amount) || 0), 0);
    const actualFromFinancials = projectFinancials.reduce((sum, f) => sum + (Number(f.actual_amount) || 0), 0);
    
    // Add paid/approved expenses to actual costs
    const actualFromExpenses = projectExpenses
      .filter(e => e.payment_status === 'paid' || e.payment_status === 'approved')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    
    const totalActual = actualFromFinancials + actualFromExpenses;
    const budgetVariance = totalBudget - totalActual;

    return {
      ...projectData,
      metrics: {
        total_drawings: projectDrawings.length,
        overdue_drawings: overdueDrawings.length,
        drawings_pending_release: projectDrawings.filter(d => d.status !== 'FFF' && d.status !== 'As-Built').length,
        open_rfis: openRFIs.length,
        overdue_rfis: openRFIs.filter(r => r.due_date && new Date(r.due_date) < new Date()).length,
        pending_change_orders: pendingCOs.length,
        co_cost_impact: pendingCOs.reduce((sum, co) => sum + (co.cost_impact || 0), 0),
        total_tasks: projectTasks.length,
        blocked_tasks: blockedTasks.length,
        completed_tasks: projectTasks.filter(t => t.status === 'completed').length,
        budget: totalBudget,
        actual_cost: totalActual,
        budget_variance: budgetVariance,
        budget_utilization: totalBudget > 0 ? ((totalActual / totalBudget) * 100).toFixed(1) : 0,
      },
      critical_issues: {
        overdue_drawings: overdueDrawings.map(d => ({
          set_name: d.set_name,
          due_date: d.due_date,
          status: d.status,
        })),
        blocked_tasks: blockedTasks.map(t => ({
          name: t.name,
          phase: t.phase,
          start_date: t.start_date,
        })),
        high_priority_rfis: openRFIs.filter(r => r.priority === 'high' || r.priority === 'critical').map(r => ({
          number: r.rfi_number,
          subject: r.subject,
          priority: r.priority,
          due_date: r.due_date,
        })),
      },
    };
  };

  const quickAnalyses = [
    {
      id: 'drawing_status',
      label: 'Drawing Status Report',
      icon: FileText,
      prompt: 'Analyze the current drawing status. Identify any overdue drawings, tasks blocked by drawings, and provide recommendations for accelerating approvals.',
    },
    {
      id: 'rfi_analysis',
      label: 'RFI Analysis',
      icon: MessageSquareWarning,
      prompt: 'Analyze open RFIs. Identify any overdue items, high priority issues, and patterns in RFI submissions. Recommend actions to expedite closures.',
    },
    {
      id: 'schedule_risks',
      label: 'Schedule Risk Assessment',
      icon: Calendar,
      prompt: 'Assess schedule risks based on blocked tasks, drawing delays, and change order impacts. Provide data-driven recommendations to mitigate delays.',
    },
    {
      id: 'change_orders',
      label: 'Change Order Impact',
      icon: FileCheck,
      prompt: 'Analyze pending change orders, their cost and schedule impacts. Provide insights on budget exposure and schedule implications.',
    },
  ];

  const handleQuickAnalysis = async (analysis) => {
    setAnalysisType(analysis.id);
    await askAI(analysis.prompt);
  };

  const askAI = async (customQuestion = null) => {
    const userQuestion = customQuestion || question;
    if (!userQuestion.trim()) return;

    setLoading(true);
    setConversation(prev => [...prev, { role: 'user', content: userQuestion }]);
    if (!customQuestion) setQuestion('');

    try {
      const context = getProjectContext();
      
      const systemPrompt = `You are an AI Project Manager Assistant for a structural steel fabrication company. You provide data-driven insights based on ACTUAL project data.

CRITICAL RULES:
1. ONLY use the data provided in the context - never make assumptions or generalize
2. If data is missing or insufficient, explicitly state "I don't have enough data to analyze [X]"
3. Never exaggerate risks or issues - be factual and precise
4. Always cite specific numbers from the data when making statements
5. If asked about something not in the data, say "That information is not available in the current project data"
6. Focus on actionable insights with specific recommendations
7. Do not agree with assumptions - challenge them with data if incorrect

Context Data:
${JSON.stringify(context, null, 2)}

The user's question is about the ${selectedProject ? 'selected project' : 'all projects in the portfolio'}.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `${systemPrompt}\n\nUser Question: ${userQuestion}`,
      });

      setConversation(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      setConversation(prev => [...prev, { 
        role: 'assistant', 
        content: `Error: ${error.message || 'Failed to get AI response'}` 
      }]);
    } finally {
      setLoading(false);
      setAnalysisType(null);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    askAI();
  };

  return (
    <div className="space-y-4">
      {/* Quick Analysis Buttons */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {quickAnalyses.map(analysis => {
          const Icon = analysis.icon;
          return (
            <Button
              key={analysis.id}
              variant="outline"
              onClick={() => handleQuickAnalysis(analysis)}
              disabled={loading}
              className="h-auto py-3 px-4 flex flex-col items-start gap-2 border-zinc-700 hover:border-amber-500"
            >
              <Icon size={18} className="text-amber-500" />
              <span className="text-xs text-left">{analysis.label}</span>
            </Button>
          );
        })}
      </div>

      {/* Conversation */}
      {conversation.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Sparkles size={18} className="text-amber-500" />
              AI Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
            {conversation.map((msg, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-amber-500/10 border border-amber-500/20 ml-8'
                    : 'bg-zinc-800 mr-8'
                }`}
              >
                <div className="flex items-start gap-2 mb-2">
                  {msg.role === 'assistant' && (
                    <Sparkles size={14} className="text-amber-500 mt-1" />
                  )}
                  <p className="text-xs text-zinc-500 font-medium uppercase">
                    {msg.role === 'user' ? 'You' : 'AI Assistant'}
                  </p>
                </div>
                <ReactMarkdown className="text-sm text-zinc-100 prose prose-sm prose-invert max-w-none">
                  {msg.content}
                </ReactMarkdown>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-zinc-400">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">Analyzing data...</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Input */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask about drawings, RFIs, schedule risks, budget variance, or any project metrics..."
              rows={3}
              className="bg-zinc-800 border-zinc-700 text-white resize-none"
              disabled={loading}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-500">
                AI provides data-driven insights from actual project data
              </p>
              <Button
                type="submit"
                disabled={loading || !question.trim()}
                className="bg-amber-500 hover:bg-amber-600 text-black"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Send size={16} className="mr-2" />
                    Ask AI
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Data Disclaimer */}
      <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertTriangle size={14} className="text-amber-500 mt-0.5" />
          <div className="text-xs text-zinc-400">
            <p className="font-medium text-zinc-300 mb-1">AI Analysis Scope</p>
            <p>
              This AI assistant analyzes only the actual data in your system. It will not make assumptions,
              exaggerate risks, or provide generic advice. If specific data is unavailable, it will tell you.
              {selectedProject ? ' Currently analyzing the selected project.' : ' Currently analyzing all projects in your portfolio.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}