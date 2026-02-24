import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, Sparkles, AlertTriangle, CheckCircle, XCircle, TrendingUp, Package, Truck, Wrench, Zap, BarChart3, Activity, Brain, Target, Shield } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const QUICK_QUERIES = [
  { label: 'Daily Pulse', query: 'Give me today\'s project pulse with critical issues and forecasts', icon: Activity },
  { label: 'Risk Forecast', query: 'What are the top 5 risks with likelihood and impact?', icon: AlertTriangle },
  { label: 'Schedule Forecast', query: 'Will we finish on time? What\'s the forecast completion?', icon: TrendingUp },
  { label: 'Budget Forecast', query: 'What\'s the budget forecast at completion?', icon: BarChart3 },
  { label: 'Fabrication Blockers', query: 'What is currently blocking fabrication?', icon: Wrench },
  { label: 'Erection Readiness', query: 'Which work packages are ready for erection?', icon: Package },
  { label: 'RFI Critical Path', query: 'Which RFIs are affecting the critical path?', icon: AlertTriangle },
  { label: 'Auto-Resolution', query: 'What can you auto-resolve for me today?', icon: Zap },
  { label: 'Margin at Risk', query: 'Calculate margin at risk with exposure breakdown', icon: Target },
  { label: 'Delivery Conflicts', query: 'Are there any delivery sequence conflicts?', icon: Truck },
  { label: 'Escalation Queue', query: 'What needs escalation this week?', icon: AlertTriangle },
  { label: 'Recovery Plan', query: 'Generate schedule recovery options with cost-benefit analysis', icon: TrendingUp }
];

export default function ProjectAssistant() {
  const { activeProjectId } = useActiveProject();
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const { data: project } = useQuery({
    queryKey: ['project', activeProjectId],
    queryFn: async () => {
      const projects = await base44.entities.Project.filter({ id: activeProjectId });
      return projects[0];
    },
    enabled: !!activeProjectId
  });

  useEffect(() => {
    if (!activeProjectId) return;

    const initConversation = async () => {
      const conv = await base44.agents.createConversation({
        agent_name: 'project_manager_assistant',
        metadata: {
          name: `PMA - ${project?.name || 'Project'}`,
          project_id: activeProjectId
        }
      });
      setConversationId(conv.id);
      setMessages(conv.messages || []);
    };

    initConversation();
  }, [activeProjectId, project]);

  useEffect(() => {
    if (!conversationId) return;

    const unsubscribe = base44.agents.subscribeToConversation(conversationId, (data) => {
      setMessages(data.messages);
      setIsLoading(false);
    });

    return unsubscribe;
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    if (!conversationId || !text.trim()) return;

    setIsLoading(true);
    setInputValue('');

    const conversation = await base44.agents.getConversation(conversationId);
    await base44.agents.addMessage(conversation, {
      role: 'user',
      content: text
    });
  };

  const handleQuickQuery = (query) => {
    sendMessage(query);
  };

  if (!activeProjectId) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Card className="border-amber-500/20">
          <CardContent className="p-12 text-center">
            <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Active Project</h2>
            <p className="text-muted-foreground">Select a project to activate the Project Manager Assistant</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('chat');
  const [runningAnalysis, setRunningAnalysis] = useState(false);
  const [forecast, setForecast] = useState(null);
  const [autoResolving, setAutoResolving] = useState(false);

  // Real-time monitoring data
  const { data: riskData } = useQuery({
    queryKey: ['pma-risk-data', activeProjectId],
    queryFn: async () => {
      const [alerts, gates, rfis] = await Promise.all([
        base44.entities.ExecutionRiskAlert.filter({ project_id: activeProjectId, resolved: false }),
        base44.entities.ExecutionGate.filter({ project_id: activeProjectId }),
        base44.entities.RFI.filter({ project_id: activeProjectId })
      ]);
      
      const criticalRisks = alerts.filter(a => a.severity === 'critical').length;
      const blockedGates = gates.filter(g => g.gate_status === 'blocked').length;
      const agingRFIs = rfis.filter(r => {
        if (['closed', 'answered'].includes(r.status)) return false;
        const days = Math.floor((new Date() - new Date(r.created_date)) / (1000 * 60 * 60 * 24));
        return days >= 14;
      }).length;

      return { criticalRisks, blockedGates, agingRFIs, totalRisks: alerts.length };
    },
    enabled: !!activeProjectId,
    refetchInterval: 30000
  });

  const runPredictiveAnalytics = async () => {
    setRunningAnalysis(true);
    try {
      const { data } = await base44.functions.invoke('pmaPredictiveAnalytics', {
        project_id: activeProjectId,
        forecast_type: 'all'
      });
      setForecast(data);
      toast.success('Forecast updated');
    } catch (error) {
      toast.error('Analytics failed');
    } finally {
      setRunningAnalysis(false);
    }
  };

  const runAutoResolve = async () => {
    setAutoResolving(true);
    try {
      const { data } = await base44.functions.invoke('pmaAutoResolve', {
        project_id: activeProjectId,
        issue_type: 'gate_blocked',
        auto_execute: true
      });
      toast.success(`PMA auto-resolved ${data.resolutions?.length || 0} items`);
      queryClient.invalidateQueries();
    } catch (error) {
      toast.error('Auto-resolution failed');
    } finally {
      setAutoResolving(false);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Command Header */}
      <div className="border-b border-zinc-800 bg-gradient-to-r from-amber-500/5 to-orange-500/5">
        <div className="max-w-[1800px] mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                <Brain className="w-7 h-7 text-black" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white uppercase tracking-wide flex items-center gap-2">
                  Autonomous Project Command
                </h1>
                <p className="text-xs text-zinc-400 font-mono mt-1">
                  {project?.name} • PREDICTIVE INTELLIGENCE ACTIVE
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 px-3 py-1">
                <Activity className="w-3 h-3 mr-1.5 animate-pulse" />
                MONITORING
              </Badge>
              <Button
                size="sm"
                onClick={runPredictiveAnalytics}
                disabled={runningAnalysis}
                className="bg-blue-500 hover:bg-blue-600 text-white">
                {runningAnalysis ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <TrendingUp className="w-4 h-4 mr-2" />}
                Run Forecast
              </Button>
              <Button
                size="sm"
                onClick={runAutoResolve}
                disabled={autoResolving}
                className="bg-amber-500 hover:bg-amber-600 text-black">
                {autoResolving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                Auto-Resolve
              </Button>
            </div>
          </div>

          {/* Risk Dashboard */}
          {riskData && (
            <div className="grid grid-cols-4 gap-4">
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardContent className="p-4">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Critical Risks</div>
                  <div className={cn(
                    "text-3xl font-bold font-mono",
                    riskData.criticalRisks > 0 ? "text-red-500" : "text-green-500"
                  )}>
                    {riskData.criticalRisks}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardContent className="p-4">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Blocked Gates</div>
                  <div className={cn(
                    "text-3xl font-bold font-mono",
                    riskData.blockedGates > 0 ? "text-orange-500" : "text-green-500"
                  )}>
                    {riskData.blockedGates}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardContent className="p-4">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Aging RFIs</div>
                  <div className={cn(
                    "text-3xl font-bold font-mono",
                    riskData.agingRFIs > 0 ? "text-amber-500" : "text-green-500"
                  )}>
                    {riskData.agingRFIs}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardContent className="p-4">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Total Risks</div>
                  <div className="text-3xl font-bold font-mono text-white">
                    {riskData.totalRisks}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-zinc-900 border border-zinc-800 mb-6">
            <TabsTrigger value="chat" className="text-xs">
              <Sparkles className="w-4 h-4 mr-2" />
              AI Chat
            </TabsTrigger>
            <TabsTrigger value="forecasts" className="text-xs">
              <TrendingUp className="w-4 h-4 mr-2" />
              Predictive Forecasts
            </TabsTrigger>
            <TabsTrigger value="autonomous" className="text-xs">
              <Zap className="w-4 h-4 mr-2" />
              Autonomous Actions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="space-y-6">
            {/* Quick Queries */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-zinc-400">Quick Commands</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {QUICK_QUERIES.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <Button
                        key={idx}
                        variant="outline"
                        className="justify-start text-left h-auto py-3 border-zinc-700 hover:border-amber-500/50 hover:bg-amber-500/5"
                        onClick={() => handleQuickQuery(item.query)}
                        disabled={isLoading}>
                        <Icon className="w-4 h-4 mr-2 text-amber-500" />
                        <span className="text-xs">{item.label}</span>
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Chat Interface */}
            <Card className="bg-zinc-900 border-zinc-800 h-[600px] flex flex-col">
              <CardHeader className="border-b border-zinc-800">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Brain className="w-5 h-5 text-amber-500" />
                  Intelligent Conversation
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 && (
                  <div className="text-center text-zinc-500 py-12">
                    <Brain className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="text-sm mb-2">PMA Autonomous System Ready</p>
                    <p className="text-xs text-zinc-600">Ask about risks, forecasts, blockers, or request auto-resolution</p>
                  </div>
                )}
                
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'flex gap-3',
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    )}>
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-4 h-4 text-black" />
                      </div>
                    )}
                    <div
                      className={cn(
                        'max-w-[80%] rounded-xl px-4 py-3',
                        msg.role === 'user'
                          ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-black'
                          : 'bg-zinc-800 border border-zinc-700 text-white'
                      )}>
                      {msg.role === 'user' ? (
                        <p className="text-sm font-medium">{msg.content}</p>
                      ) : (
                        <ReactMarkdown
                          className="prose prose-sm max-w-none prose-invert"
                          components={{
                            p: ({ children }) => <p className="mb-2 last:mb-0 text-zinc-200">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc ml-4 mb-2 text-zinc-200">{children}</ul>,
                            li: ({ children }) => <li className="mb-1">{children}</li>,
                            strong: ({ children }) => <strong className="font-bold text-amber-400">{children}</strong>,
                            code: ({ children }) => <code className="bg-zinc-900 px-1 py-0.5 rounded text-amber-400 text-xs">{children}</code>
                          }}>
                          {msg.content}
                        </ReactMarkdown>
                      )}
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 text-black animate-spin" />
                    </div>
                    <div className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3">
                      <p className="text-zinc-400 text-sm">Processing with predictive models...</p>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </CardContent>
              <div className="border-t border-zinc-800 p-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendMessage(inputValue);
                  }}
                  className="flex gap-2">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Ask about risks, forecasts, auto-resolution opportunities..."
                    disabled={isLoading}
                    className="flex-1 bg-zinc-800 border-zinc-700 text-white"
                  />
                  <Button 
                    type="submit" 
                    disabled={isLoading || !inputValue.trim()}
                    className="bg-amber-500 hover:bg-amber-600 text-black">
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </form>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="forecasts" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Predictive Analytics</h2>
              <Button
                onClick={runPredictiveAnalytics}
                disabled={runningAnalysis}
                className="bg-blue-500 hover:bg-blue-600 text-white">
                {runningAnalysis ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <TrendingUp className="w-4 h-4 mr-2" />}
                Generate Forecast
              </Button>
            </div>

            {forecast ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Fabrication Forecast */}
                {forecast.fabrication && (
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="border-b border-zinc-800">
                      <CardTitle className="text-white flex items-center gap-2">
                        <Wrench className="w-5 h-5 text-purple-500" />
                        Fabrication Forecast
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-400">Forecast Completion</span>
                        <span className="font-bold text-lg text-white">{forecast.fabrication.forecast_completion}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-400">Variance</span>
                        <Badge className={cn(
                          forecast.fabrication.variance_days <= 0 ? 'bg-green-500/20 text-green-400' :
                          forecast.fabrication.variance_days <= 7 ? 'bg-amber-500/20 text-amber-400' :
                          'bg-red-500/20 text-red-400'
                        )}>
                          {forecast.fabrication.variance_days > 0 ? '+' : ''}{forecast.fabrication.variance_days} days
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-400">Confidence</span>
                        <span className="font-mono text-sm text-blue-400">{forecast.fabrication.confidence_pct}%</span>
                      </div>
                      <div className="pt-3 border-t border-zinc-800">
                        <p className="text-xs text-zinc-500 mb-2">RECOMMENDATION</p>
                        <p className="text-sm text-white">{forecast.fabrication.recommendation}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Budget Forecast */}
                {forecast.budget && (
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="border-b border-zinc-800">
                      <CardTitle className="text-white flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-green-500" />
                        Budget Forecast
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-400">Forecast at Completion</span>
                        <span className="font-bold text-lg text-white">
                          ${(forecast.budget.forecast_at_completion || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-400">Variance</span>
                        <Badge className={cn(
                          Math.abs(forecast.budget.variance_pct) <= 5 ? 'bg-green-500/20 text-green-400' :
                          Math.abs(forecast.budget.variance_pct) <= 10 ? 'bg-amber-500/20 text-amber-400' :
                          'bg-red-500/20 text-red-400'
                        )}>
                          {forecast.budget.variance_pct > 0 ? '+' : ''}{forecast.budget.variance_pct}%
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-400">Confidence</span>
                        <span className="font-mono text-sm text-blue-400">{forecast.budget.confidence_pct}%</span>
                      </div>
                      <div className="pt-3 border-t border-zinc-800">
                        <p className="text-xs text-zinc-500 mb-2">RECOMMENDATION</p>
                        <p className="text-sm text-white">{forecast.budget.recommendation}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Erection Forecast */}
                {forecast.erection && (
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="border-b border-zinc-800">
                      <CardTitle className="text-white flex items-center gap-2">
                        <Package className="w-5 h-5 text-blue-500" />
                        Erection Forecast
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-400">Forecast Completion</span>
                        <span className="font-bold text-lg text-white">{forecast.erection.forecast_completion}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-400">Variance</span>
                        <Badge className={cn(
                          forecast.erection.variance_days <= 0 ? 'bg-green-500/20 text-green-400' :
                          forecast.erection.variance_days <= 5 ? 'bg-amber-500/20 text-amber-400' :
                          'bg-red-500/20 text-red-400'
                        )}>
                          {forecast.erection.variance_days > 0 ? '+' : ''}{forecast.erection.variance_days} days
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-400">Confidence</span>
                        <span className="font-mono text-sm text-blue-400">{forecast.erection.confidence_pct}%</span>
                      </div>
                      <div className="pt-3 border-t border-zinc-800">
                        <p className="text-xs text-zinc-500 mb-2">RECOMMENDATION</p>
                        <p className="text-sm text-white">{forecast.erection.recommendation}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Risk Exposure */}
                {forecast.risk_exposure && (
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="border-b border-zinc-800">
                      <CardTitle className="text-white flex items-center gap-2">
                        <Shield className="w-5 h-5 text-red-500" />
                        Risk Exposure
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-400">Total At-Risk</span>
                        <span className="font-bold text-xl text-red-400">
                          ${(forecast.risk_exposure.total_at_risk || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-500">RFI Exposure</span>
                          <span className="text-white">${(forecast.risk_exposure.rfi_exposure || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-500">CO Exposure</span>
                          <span className="text-white">${(forecast.risk_exposure.co_exposure || 0).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="pt-3 border-t border-zinc-800">
                        <p className="text-xs text-zinc-500 mb-2">RECOMMENDATION</p>
                        <p className="text-sm text-white">{forecast.risk_exposure.recommendation}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* AI Insights */}
                {forecast.ai_insights && (
                  <Card className="bg-zinc-900 border-zinc-800 md:col-span-2">
                    <CardHeader className="border-b border-zinc-800">
                      <CardTitle className="text-white flex items-center gap-2">
                        <Brain className="w-5 h-5 text-amber-500" />
                        Strategic Insights
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="prose prose-sm prose-invert max-w-none">
                        <ReactMarkdown>{forecast.ai_insights}</ReactMarkdown>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-12 text-center">
                  <TrendingUp className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                  <p className="text-zinc-400 mb-4">No forecast data yet</p>
                  <Button
                    onClick={runPredictiveAnalytics}
                    disabled={runningAnalysis}
                    className="bg-blue-500 hover:bg-blue-600 text-white">
                    {runningAnalysis ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <TrendingUp className="w-4 h-4 mr-2" />}
                    Generate Forecast
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="autonomous" className="space-y-6">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="border-b border-zinc-800">
                <CardTitle className="text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  Autonomous Execution
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <p className="text-sm text-zinc-400">
                  PMA can automatically resolve common blockers, send reminders, and execute low-risk actions to keep the project moving.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                    <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Auto-Execute Actions
                    </h4>
                    <ul className="text-xs text-zinc-400 space-y-1">
                      <li>• Send RFI follow-up reminders (7+ days)</li>
                      <li>• Clear resolved gate blockers</li>
                      <li>• Create escalation tasks (21+ days)</li>
                      <li>• Generate daily risk summaries</li>
                      <li>• Log coordination issues</li>
                      <li>• Send approval reminders</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                    <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      Requires Approval
                    </h4>
                    <ul className="text-xs text-zinc-400 space-y-1">
                      <li>• Escalate RFIs to owner (14+ days)</li>
                      <li>• Recommend schedule acceleration</li>
                      <li>• Propose work sequence changes</li>
                      <li>• Suggest budget reallocation</li>
                      <li>• Initiate change order requests</li>
                      <li>• Request time extensions</li>
                    </ul>
                  </div>
                </div>

                <div className="pt-4">
                  <Button
                    onClick={runAutoResolve}
                    disabled={autoResolving}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-black font-bold">
                    {autoResolving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Running Auto-Resolution...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Run Auto-Resolution Now
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}