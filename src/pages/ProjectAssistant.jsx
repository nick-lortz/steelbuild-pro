import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Brain, Sparkles, AlertTriangle, Activity, TrendingUp, BarChart3,
  Wrench, Package, Truck, Zap, Target, Shield, Send, Loader2,
  Bell, RefreshCw, PanelLeftOpen, PanelLeftClose, Calendar, FileText,
  ChevronDown, Building, TrendingDown, MessageSquare, GitBranch, MessageSquareWarning,
  FileCheck, Mail
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import ChatMessage from '@/components/pma/ChatMessage';
import ConversationSidebar from '@/components/pma/ConversationSidebar';
import AlertsFeed from '@/components/pma/AlertsFeed';
import DailyBrief from '@/components/pma/DailyBrief';
import AutoResolvePanel from '@/components/pma/AutoResolvePanel';
import ScheduleDelayPredictor from '@/components/pma/ScheduleDelayPredictor';
import CommunicationAnalysis from '@/components/pma/CommunicationAnalysis';
import WhatIfScenario from '@/components/pma/WhatIfScenario';
import RFIIntelligence from '@/components/pma/RFIIntelligence';
import COIntelligence from '@/components/pma/COIntelligence';
import MarginPulse from '@/components/pma/MarginPulse';
import DraftEmailPanel from '@/components/pma/DraftEmailPanel';

const QUICK_QUERIES = [
  { label: 'Daily Pulse',         query: "Give me today's project pulse — critical issues, forecasts, and what needs action now.", icon: Activity },
  { label: 'Risk Forecast',       query: 'What are the top 5 risks with likelihood and impact?', icon: AlertTriangle },
  { label: 'Schedule Forecast',   query: 'Will we finish on time? What\'s the forecast completion date?', icon: TrendingUp },
  { label: 'Budget Forecast',     query: 'What\'s the budget forecast at completion?', icon: BarChart3 },
  { label: 'Fab Blockers',        query: 'What is currently blocking fabrication?', icon: Wrench },
  { label: 'Erection Readiness',  query: 'Which work packages are ready for erection?', icon: Package },
  { label: 'RFI Critical Path',   query: 'Which RFIs are affecting the critical path or blocking install?', icon: AlertTriangle },
  { label: 'Delivery Conflicts',  query: 'Are there any delivery sequence conflicts in the next 2 weeks?', icon: Truck },
  { label: 'Margin at Risk',      query: 'Calculate margin at risk with exposure breakdown.', icon: Target },
  { label: 'Auto-Resolve',        query: 'What can you auto-resolve for me today?', icon: Zap },
  { label: 'Escalation Queue',    query: 'What needs escalation this week?', icon: AlertTriangle },
  { label: 'Recovery Plan',       query: 'Generate schedule recovery options with cost-benefit analysis.', icon: TrendingUp },
  { label: 'CO Status',           query: 'Summarize all pending change orders, their values, and approval strategy.', icon: FileCheck },
  { label: 'Weekly Summary',      query: 'Generate a weekly executive summary for this project including schedule, budget, RFI, and CO status.', icon: FileText },
];

export default function ProjectAssistant() {
  const { activeProjectId, setActiveProjectId } = useActiveProject();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef(null);

  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [runningAnalysis, setRunningAnalysis] = useState(false);
  const [forecast, setForecast] = useState(null);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects-list'],
    queryFn: () => base44.entities.Project.filter({ status: 'in_progress' }, '-updated_date'),
    staleTime: 5 * 60 * 1000
  });

  const { data: project } = useQuery({
    queryKey: ['project', activeProjectId],
    queryFn: async () => {
      const rows = await base44.entities.Project.filter({ id: activeProjectId });
      return rows[0];
    },
    enabled: !!activeProjectId
  });

  const { data: riskData } = useQuery({
    queryKey: ['pma-risk-data', activeProjectId],
    queryFn: async () => {
      const [alerts, gates, rfis] = await Promise.all([
        base44.entities.Alert.filter({ project_id: activeProjectId, status: 'active' }),
        base44.entities.ExecutionGate.filter({ project_id: activeProjectId }),
        base44.entities.RFI.filter({ project_id: activeProjectId })
      ]);
      const criticalRisks = alerts.filter(a => a.severity === 'critical').length;
      const highRisks = alerts.filter(a => a.severity === 'high').length;
      const blockedGates = gates.filter(g => g.gate_status === 'blocked').length;
      const agingRFIs = rfis.filter(r => {
        if (['closed', 'answered'].includes(r.status)) return false;
        return Math.floor((new Date() - new Date(r.created_date)) / 86400000) >= 14;
      }).length;
      return { criticalRisks, highRisks, blockedGates, agingRFIs, totalAlerts: alerts.length };
    },
    enabled: !!activeProjectId,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  // Init conversation on project change
  useEffect(() => {
    if (!activeProjectId) return;
    startNewConversation();
  }, [activeProjectId]);

  // Subscribe to conversation updates
  useEffect(() => {
    if (!conversationId) return;
    const unsub = base44.agents.subscribeToConversation(conversationId, (data) => {
      setMessages(data.messages || []);
      setIsLoading(false);
    });
    return unsub;
  }, [conversationId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startNewConversation = async () => {
    const conv = await base44.agents.createConversation({
      agent_name: 'project_manager_assistant',
      metadata: {
        name: `PMA – ${new Date().toLocaleDateString()}`,
        project_id: activeProjectId
      }
    });
    setConversationId(conv.id);
    setMessages(conv.messages || []);
  };

  const loadConversation = async (conv) => {
    const full = await base44.agents.getConversation(conv.id);
    setConversationId(full.id);
    setMessages(full.messages || []);
  };

  const sendMessage = async (text) => {
    if (!conversationId || !text.trim()) return;
    setIsLoading(true);
    setInputValue('');
    const conv = await base44.agents.getConversation(conversationId);
    await base44.agents.addMessage(conv, { role: 'user', content: text });
  };

  const runPredictiveAnalytics = async () => {
    setRunningAnalysis(true);
    try {
      const { data } = await base44.functions.invoke('pmaPredictiveAnalytics', {
        project_id: activeProjectId, forecast_type: 'all'
      });
      setForecast(data);
      toast.success('Forecast updated');
    } catch {
      toast.error('Analytics failed');
    } finally {
      setRunningAnalysis(false);
    }
  };

  const runMonitor = async () => {
    const { data } = await base44.functions.invoke('pmaAutonomousMonitor', {
      project_id: activeProjectId
    });
    queryClient.invalidateQueries({ queryKey: ['pma-risk-data', activeProjectId] });
    return data;
  };

  if (!activeProjectId) {
    return (
      <div className="p-6 max-w-lg mx-auto mt-16">
        <Card className="border-amber-500/20 bg-zinc-900">
          <CardContent className="p-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-600/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
              <Brain className="w-8 h-8 text-amber-500/60" />
            </div>
            <h2 className="text-lg font-semibold mb-1 text-white">Select a Project</h2>
            <p className="text-zinc-500 text-sm mb-6">Choose a project to activate the PMA Command Center</p>
            <Select onValueChange={setActiveProjectId}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                <SelectValue placeholder="Select project..." />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.project_number} — {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-black overflow-hidden">
      {/* Top bar */}
      <div className="flex-shrink-0 border-b border-zinc-800 bg-gradient-to-r from-amber-500/5 to-orange-500/5">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Brain className="w-6 h-6 text-black" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-wide">Autonomous Project Command</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <Select value={activeProjectId} onValueChange={(v) => { setActiveProjectId(v); }}>
                    <SelectTrigger className="h-6 text-[10px] font-mono bg-transparent border-zinc-700 text-zinc-400 hover:text-amber-400 hover:border-amber-500/40 transition-colors px-2 w-auto max-w-xs">
                      <Building className="w-3 h-3 mr-1 flex-shrink-0" />
                      <SelectValue placeholder="Select project..." />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700">
                      {projects.map(p => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">
                          {p.project_number} — {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-[10px] text-zinc-600 font-mono">PREDICTIVE INTELLIGENCE ACTIVE</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">
                <Activity className="w-2.5 h-2.5 mr-1 animate-pulse" />
                MONITORING
              </Badge>
              <Button size="sm" onClick={runPredictiveAnalytics} disabled={runningAnalysis}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
                {runningAnalysis ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <TrendingUp className="w-3.5 h-3.5 mr-1.5" />}
                Forecast
              </Button>
            </div>
          </div>

          {/* KPI Strip */}
          {riskData && (
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Critical', value: riskData.criticalRisks, color: riskData.criticalRisks > 0 ? 'text-red-500' : 'text-green-500' },
                { label: 'High', value: riskData.highRisks, color: riskData.highRisks > 0 ? 'text-orange-400' : 'text-green-500' },
                { label: 'Blocked Gates', value: riskData.blockedGates, color: riskData.blockedGates > 0 ? 'text-amber-400' : 'text-green-500' },
                { label: 'Aging RFIs', value: riskData.agingRFIs, color: riskData.agingRFIs > 0 ? 'text-yellow-400' : 'text-green-500' },
              ].map(kpi => (
                <div key={kpi.label} className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-2 text-center">
                  <div className="text-[10px] text-zinc-600 uppercase tracking-widest">{kpi.label}</div>
                  <div className={cn('text-xl font-bold font-mono', kpi.color)}>{kpi.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main body */}
      <div className="flex flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 overflow-hidden">
          {/* Tab bar */}
          <div className="flex-shrink-0 px-4 pt-3 border-b border-zinc-800 flex items-center gap-3">
            <TabsList className="bg-zinc-900 border border-zinc-800 h-8">
              <TabsTrigger value="chat" className="text-xs h-7 px-3">
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />AI Chat
              </TabsTrigger>
              <TabsTrigger value="alerts" className="text-xs h-7 px-3">
                <Bell className="w-3.5 h-3.5 mr-1.5" />
                Alerts
                {riskData?.totalAlerts > 0 && (
                  <span className="ml-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5">
                    {riskData.totalAlerts}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="forecasts" className="text-xs h-7 px-3">
                <TrendingUp className="w-3.5 h-3.5 mr-1.5" />Forecasts
              </TabsTrigger>
              <TabsTrigger value="brief" className="text-xs h-7 px-3">
                <Calendar className="w-3.5 h-3.5 mr-1.5" />Daily Brief
              </TabsTrigger>
              <TabsTrigger value="autoresolve" className="text-xs h-7 px-3">
                <Zap className="w-3.5 h-3.5 mr-1.5" />Auto-Resolve
              </TabsTrigger>
              <TabsTrigger value="delay" className="text-xs h-7 px-3">
                <TrendingDown className="w-3.5 h-3.5 mr-1.5" />Delay Risk
              </TabsTrigger>
              <TabsTrigger value="comms" className="text-xs h-7 px-3">
                <MessageSquare className="w-3.5 h-3.5 mr-1.5" />Comms Analysis
              </TabsTrigger>
              <TabsTrigger value="whatif" className="text-xs h-7 px-3">
                <GitBranch className="w-3.5 h-3.5 mr-1.5" />What-If
              </TabsTrigger>
              <TabsTrigger value="rfi" className="text-xs h-7 px-3">
                <MessageSquareWarning className="w-3.5 h-3.5 mr-1.5" />RFI Intel
              </TabsTrigger>
              <TabsTrigger value="co" className="text-xs h-7 px-3">
                <FileCheck className="w-3.5 h-3.5 mr-1.5" />CO Intel
              </TabsTrigger>
              <TabsTrigger value="email" className="text-xs h-7 px-3">
                <Mail className="w-3.5 h-3.5 mr-1.5" />Draft Email
              </TabsTrigger>
            </TabsList>

            {activeTab === 'chat' && (
              <button
                onClick={() => setSidebarOpen(v => !v)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors ml-auto"
                title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
              >
                {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
              </button>
            )}
          </div>

          {/* Chat Tab */}
          <TabsContent value="chat" className="flex-1 overflow-hidden m-0 flex">
            {/* Sidebar */}
            {sidebarOpen && (
              <ConversationSidebar
                activeProjectId={activeProjectId}
                conversationId={conversationId}
                onSelect={loadConversation}
                onNew={startNewConversation}
              />
            )}

            {/* Chat area */}
            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Quick commands */}
              <div className="flex-shrink-0 p-3 border-b border-zinc-800 overflow-x-auto">
                <div className="flex gap-2 min-w-max">
                  {QUICK_QUERIES.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={idx}
                        onClick={() => sendMessage(item.query)}
                        disabled={isLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-700 hover:border-amber-500/50 hover:bg-amber-500/5 rounded-full text-xs text-zinc-300 hover:text-amber-400 transition-all whitespace-nowrap disabled:opacity-40"
                      >
                        <Icon className="w-3 h-3" />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center py-16">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-600/10 border border-amber-500/20 flex items-center justify-center mb-4">
                      <Brain className="w-8 h-8 text-amber-500/50" />
                    </div>
                    <p className="text-zinc-400 text-sm font-medium mb-1">PMA Ready</p>
                    <p className="text-zinc-600 text-xs max-w-sm">
                      Ask about risks, forecasts, blockers, or request auto-resolution. Use a quick command above to get started.
                    </p>
                  </div>
                )}

                {messages.map((msg, idx) => (
                  <ChatMessage key={idx} message={msg} />
                ))}

                {isLoading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                      <Loader2 className="w-4 h-4 text-black animate-spin" />
                    </div>
                    <div className="bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3">
                      <div className="flex items-center gap-2 text-zinc-400 text-sm">
                        <span>Analyzing project data</span>
                        <span className="flex gap-0.5">
                          <span className="w-1 h-1 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1 h-1 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1 h-1 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="flex-shrink-0 border-t border-zinc-800 p-3">
                <form
                  onSubmit={e => { e.preventDefault(); sendMessage(inputValue); }}
                  className="flex gap-2"
                >
                  <Input
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    placeholder="Ask about risks, schedule, budget, blockers..."
                    disabled={isLoading}
                    className="flex-1 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-amber-500/50"
                  />
                  <Button
                    type="submit"
                    disabled={isLoading || !inputValue.trim()}
                    className="bg-amber-500 hover:bg-amber-600 text-black px-4"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </form>
              </div>
            </div>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="flex-1 overflow-hidden m-0">
            <AlertsFeed activeProjectId={activeProjectId} onRunMonitor={runMonitor} />
          </TabsContent>

          {/* Daily Brief Tab */}
          <TabsContent value="brief" className="flex-1 overflow-hidden m-0">
            <DailyBrief
              activeProjectId={activeProjectId}
              onSendToChat={(text) => {
                setActiveTab('chat');
                setTimeout(() => sendMessage(text), 100);
              }}
            />
          </TabsContent>

          {/* Auto-Resolve Tab */}
          <TabsContent value="autoresolve" className="flex-1 overflow-hidden m-0">
            <AutoResolvePanel activeProjectId={activeProjectId} />
          </TabsContent>

          {/* Delay Risk Tab */}
          <TabsContent value="delay" className="flex-1 overflow-hidden m-0">
            <ScheduleDelayPredictor
              activeProjectId={activeProjectId}
              onSendToChat={(text) => { setActiveTab('chat'); setTimeout(() => sendMessage(text), 100); }}
            />
          </TabsContent>

          {/* Comms Analysis Tab */}
          <TabsContent value="comms" className="flex-1 overflow-hidden m-0">
            <CommunicationAnalysis
              activeProjectId={activeProjectId}
              onSendToChat={(text) => { setActiveTab('chat'); setTimeout(() => sendMessage(text), 100); }}
            />
          </TabsContent>

          {/* What-If Tab */}
          <TabsContent value="whatif" className="flex-1 overflow-hidden m-0">
            <WhatIfScenario
              activeProjectId={activeProjectId}
              onSendToChat={(text) => { setActiveTab('chat'); setTimeout(() => sendMessage(text), 100); }}
            />
          </TabsContent>

          {/* RFI Intelligence Tab */}
          <TabsContent value="rfi" className="flex-1 overflow-hidden m-0">
            <RFIIntelligence
              activeProjectId={activeProjectId}
              onSendToChat={(text) => { setActiveTab('chat'); setTimeout(() => sendMessage(text), 100); }}
            />
          </TabsContent>

          {/* CO Intelligence Tab */}
          <TabsContent value="co" className="flex-1 overflow-hidden m-0">
            <COIntelligence
              activeProjectId={activeProjectId}
              onSendToChat={(text) => { setActiveTab('chat'); setTimeout(() => sendMessage(text), 100); }}
            />
          </TabsContent>

          {/* Draft Email Tab */}
          <TabsContent value="email" className="flex-1 overflow-hidden m-0">
            <DraftEmailPanel
              activeProjectId={activeProjectId}
              onSendToChat={(text) => { setActiveTab('chat'); setTimeout(() => sendMessage(text), 100); }}
            />
          </TabsContent>

          {/* Forecasts Tab */}
          <TabsContent value="forecasts" className="flex-1 overflow-y-auto m-0 p-4">
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-base font-bold text-white">Predictive Analytics</h2>
                <Button onClick={runPredictiveAnalytics} disabled={runningAnalysis}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
                  {runningAnalysis ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
                  Run Forecast
                </Button>
              </div>

              {forecast ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { key: 'fabrication', label: 'Fabrication', icon: Wrench, color: 'text-purple-400', dateKey: 'forecast_completion', varKey: 'variance_days', varUnit: 'days' },
                    { key: 'erection', label: 'Erection', icon: Package, color: 'text-blue-400', dateKey: 'forecast_completion', varKey: 'variance_days', varUnit: 'days' },
                    { key: 'budget', label: 'Budget', icon: BarChart3, color: 'text-green-400', dateKey: 'forecast_at_completion', varKey: 'variance_pct', varUnit: '%', isCurrency: true },
                    { key: 'risk_exposure', label: 'Risk Exposure', icon: Shield, color: 'text-red-400', dateKey: 'total_at_risk', varKey: null, isCurrency: true },
                  ].map(({ key, label, icon: Icon, color, dateKey, varKey, varUnit, isCurrency }) => {
                    const d = forecast[key];
                    if (!d) return null;
                    const mainVal = isCurrency ? `$${(d[dateKey] || 0).toLocaleString()}` : d[dateKey];
                    const varVal = varKey ? d[varKey] : null;
                    return (
                      <Card key={key} className="bg-zinc-900 border-zinc-800">
                        <CardHeader className="pb-2 pt-4 px-4">
                          <CardTitle className="text-sm text-white flex items-center gap-2">
                            <Icon className={cn('w-4 h-4', color)} />{label} Forecast
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-4 space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-zinc-500">Forecast</span>
                            <span className="text-base font-bold text-white">{mainVal}</span>
                          </div>
                          {varVal !== null && varVal !== undefined && (
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-zinc-500">Variance</span>
                              <Badge className={cn(
                                'text-xs',
                                Math.abs(varVal) <= 5 ? 'bg-green-500/20 text-green-400' :
                                Math.abs(varVal) <= 10 ? 'bg-amber-500/20 text-amber-400' :
                                'bg-red-500/20 text-red-400'
                              )}>
                                {varVal > 0 ? '+' : ''}{varVal}{varUnit}
                              </Badge>
                            </div>
                          )}
                          {d.confidence_pct && (
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-zinc-500">Confidence</span>
                              <span className="text-xs font-mono text-blue-400">{d.confidence_pct}%</span>
                            </div>
                          )}
                          {d.recommendation && (
                            <div className="pt-2 border-t border-zinc-800">
                              <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">Recommendation</p>
                              <p className="text-xs text-zinc-300">{d.recommendation}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}

                  {forecast.ai_insights && (
                    <Card className="bg-zinc-900 border-zinc-800 md:col-span-2">
                      <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-sm text-white flex items-center gap-2">
                          <Brain className="w-4 h-4 text-amber-500" />Strategic Insights
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        <ReactMarkdown className="prose prose-sm prose-invert max-w-none text-zinc-300">
                          {forecast.ai_insights}
                        </ReactMarkdown>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardContent className="p-16 text-center">
                    <TrendingUp className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                    <p className="text-zinc-400 text-sm mb-4">No forecast data yet</p>
                    <Button onClick={runPredictiveAnalytics} disabled={runningAnalysis}
                      className="bg-blue-600 hover:bg-blue-700 text-white">
                      {runningAnalysis ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <TrendingUp className="w-4 h-4 mr-2" />}
                      Generate Forecast
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}