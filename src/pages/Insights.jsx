import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ProjectAssistant from '@/components/ai/ProjectAssistant';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  FileText, 
  Target,
  DollarSign,
  BarChart3,
  Loader2,
  Sparkles,
  Clock
} from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { Badge } from "@/components/ui/badge";

export default function Insights() {
  const [selectedProject, setSelectedProject] = useState('all');
  const [analysisType, setAnalysisType] = useState(null);
  const [insights, setInsights] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
  });

  const { data: costCodes = [] } = useQuery({
    queryKey: ['costCodes'],
    queryFn: () => base44.entities.CostCode.list('code'),
  });

  const { data: financials = [] } = useQuery({
    queryKey: ['financials'],
    queryFn: () => base44.entities.Financial.list(),
  });

  const { data: rfis = [] } = useQuery({
    queryKey: ['rfis'],
    queryFn: () => base44.entities.RFI.list(),
  });

  const { data: changeOrders = [] } = useQuery({
    queryKey: ['changeOrders'],
    queryFn: () => base44.entities.ChangeOrder.list(),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list(),
  });

  const { data: drawingSets = [] } = useQuery({
    queryKey: ['drawings'],
    queryFn: () => base44.entities.DrawingSet.list(),
  });

  const getProjectData = (projectId) => {
    if (projectId === 'all') {
      return {
        projects,
        financials,
        rfis,
        changeOrders,
        drawings,
        costCodes
      };
    }
    return {
      project: projects.find(p => p.id === projectId),
      financials: financials.filter(f => f.project_id === projectId),
      rfis: rfis.filter(r => r.project_id === projectId),
      changeOrders: changeOrders.filter(co => co.project_id === projectId),
      drawings: drawings.filter(d => d.project_id === projectId),
      costCodes
    };
  };

  const analyzeExpenseAnomalies = async () => {
    setIsAnalyzing(true);
    setAnalysisType('anomalies');
    
    try {
      const data = getProjectData(selectedProject);
      
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a financial analyst for structural steel construction projects. Analyze this project financial data and identify expense anomalies, unusual patterns, and areas of concern.

Project Data:
${JSON.stringify(data, null, 2)}

Identify:
1. Cost codes with significant budget overruns (>10%)
2. Unusual spending patterns compared to typical steel construction projects
3. Cost codes with zero actual costs but committed amounts
4. Projects with negative variance
5. Any red flags or concerning trends

Provide actionable insights and specific recommendations.`,
        response_json_schema: {
          type: "object",
          properties: {
            anomalies: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
                  category: { type: "string" },
                  description: { type: "string" },
                  affected_items: { type: "array", items: { type: "string" } },
                  impact: { type: "string" },
                  recommendation: { type: "string" }
                }
              }
            },
            summary: { type: "string" },
            overall_health: { type: "string", enum: ["good", "fair", "concerning", "critical"] }
          }
        }
      });
      
      setInsights(response);
    } catch (error) {
      console.error('Analysis error:', error);
      setInsights({ error: 'Failed to analyze data' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateFinancialSummary = async () => {
    setIsAnalyzing(true);
    setAnalysisType('financial');
    
    try {
      const data = getProjectData(selectedProject);
      
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a financial analyst. Generate a comprehensive financial summary report for this structural steel construction data.

Data:
${JSON.stringify(data, null, 2)}

Provide:
1. Overall financial health and key metrics
2. Budget performance by category (labor, material, equipment, subcontract)
3. Top performing and underperforming cost codes
4. Change order impact on project financials
5. Cash flow and commitment analysis
6. Executive summary with key takeaways`,
        response_json_schema: {
          type: "object",
          properties: {
            executive_summary: { type: "string" },
            total_budget: { type: "number" },
            total_actual: { type: "number" },
            total_committed: { type: "number" },
            variance_amount: { type: "number" },
            variance_percent: { type: "number" },
            category_breakdown: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  budget: { type: "number" },
                  actual: { type: "number" },
                  variance: { type: "number" },
                  performance: { type: "string" }
                }
              }
            },
            top_performers: { type: "array", items: { type: "string" } },
            concerns: { type: "array", items: { type: "string" } },
            recommendations: { type: "array", items: { type: "string" } }
          }
        }
      });
      
      setInsights(response);
    } catch (error) {
      console.error('Analysis error:', error);
      setInsights({ error: 'Failed to generate report' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const predictiveForecast = async () => {
    setIsAnalyzing(true);
    setAnalysisType('forecast');
    
    try {
      const data = getProjectData(selectedProject);
      
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a predictive analytics expert in construction. Analyze this project data and forecast future costs, timeline impacts, and potential risks.

Data:
${JSON.stringify(data, null, 2)}

Provide:
1. Estimated cost at completion for each active project
2. Predicted timeline delays based on current RFIs and change orders
3. Risk assessment for budget overruns
4. Forecast of upcoming expenses based on committed amounts
5. Recommendations for proactive cost control`,
        response_json_schema: {
          type: "object",
          properties: {
            cost_forecast: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  project_name: { type: "string" },
                  original_budget: { type: "number" },
                  current_actual: { type: "number" },
                  estimated_completion_cost: { type: "number" },
                  confidence_level: { type: "string" },
                  variance_projection: { type: "number" }
                }
              }
            },
            timeline_risks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  risk: { type: "string" },
                  probability: { type: "string" },
                  impact_days: { type: "number" },
                  mitigation: { type: "string" }
                }
              }
            },
            recommendations: { type: "array", items: { type: "string" } },
            overall_outlook: { type: "string" }
          }
        }
      });
      
      setInsights(response);
    } catch (error) {
      console.error('Analysis error:', error);
      setInsights({ error: 'Failed to generate forecast' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateProjectInsights = async () => {
    setIsAnalyzing(true);
    setAnalysisType('insights');
    
    try {
      const data = getProjectData(selectedProject);
      
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a construction project management consultant specializing in structural steel. Analyze this comprehensive project data and provide strategic insights.

Data:
${JSON.stringify(data, null, 2)}

Analyze:
1. Project health indicators (schedule, budget, quality)
2. RFI patterns and their impact on project velocity
3. Change order trends and root causes
4. Drawing approval bottlenecks
5. Resource allocation efficiency
6. Cross-project patterns and lessons learned

Provide actionable strategic recommendations.`,
        response_json_schema: {
          type: "object",
          properties: {
            health_score: { type: "number", description: "0-100 scale" },
            key_metrics: {
              type: "object",
              properties: {
                schedule_performance: { type: "string" },
                budget_performance: { type: "string" },
                quality_indicators: { type: "string" },
                team_efficiency: { type: "string" }
              }
            },
            patterns: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  pattern: { type: "string" },
                  frequency: { type: "string" },
                  impact: { type: "string" },
                  root_cause: { type: "string" }
                }
              }
            },
            bottlenecks: { type: "array", items: { type: "string" } },
            opportunities: { type: "array", items: { type: "string" } },
            strategic_recommendations: { type: "array", items: { type: "string" } }
          }
        }
      });
      
      setInsights(response);
    } catch (error) {
      console.error('Analysis error:', error);
      setInsights({ error: 'Failed to generate insights' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analysisCards = [
    {
      id: 'anomalies',
      title: 'Expense Anomaly Detection',
      description: 'AI identifies unusual spending patterns, budget overruns, and financial red flags',
      icon: AlertTriangle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10 border-red-500/20',
      action: analyzeExpenseAnomalies
    },
    {
      id: 'financial',
      title: 'Financial Summary Report',
      description: 'Comprehensive financial analysis with category breakdowns and performance metrics',
      icon: FileText,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10 border-blue-500/20',
      action: generateFinancialSummary
    },
    {
      id: 'forecast',
      title: 'Predictive Cost Forecasting',
      description: 'AI-powered predictions for cost at completion, timeline delays, and risk assessment',
      icon: TrendingUp,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10 border-green-500/20',
      action: predictiveForecast
    },
    {
      id: 'insights',
      title: 'Strategic Project Insights',
      description: 'Deep analysis of patterns, bottlenecks, and opportunities across projects',
      icon: Brain,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10 border-purple-500/20',
      action: generateProjectInsights
    }
  ];

  return (
    <div>
      <PageHeader
        title="AI-Powered Insights"
        subtitle="Data-driven analysis and predictive intelligence"
      />

      {/* Project Selector */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Sparkles className="text-amber-500" size={20} />
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-full sm:w-96 bg-zinc-900 border-zinc-800 text-white">
              <SelectValue placeholder="Select project scope" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects (Portfolio Analysis)</SelectItem>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.project_number} - {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Analysis Type Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {analysisCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card 
              key={card.id}
              className={`border cursor-pointer transition-all hover:scale-105 ${
                analysisType === card.id 
                  ? card.bgColor 
                  : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
              }`}
              onClick={card.action}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg bg-zinc-800/50 ${card.color}`}>
                    <Icon size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2">{card.title}</h3>
                    <p className="text-sm text-zinc-400 mb-4">{card.description}</p>
                    <Button 
                      size="sm"
                      className="bg-amber-500 hover:bg-amber-600 text-black"
                      disabled={isAnalyzing}
                    >
                      {isAnalyzing && analysisType === card.id ? (
                        <>
                          <Loader2 size={14} className="mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        'Run Analysis'
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Results */}
      {isAnalyzing && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-12 text-center">
            <Loader2 size={48} className="mx-auto mb-4 animate-spin text-amber-500" />
            <p className="text-zinc-400">AI is analyzing your data...</p>
            <p className="text-sm text-zinc-500 mt-2">This may take 10-30 seconds</p>
          </CardContent>
        </Card>
      )}

      {!isAnalyzing && insights && !insights.error && (
        <div className="space-y-6">
          {analysisType === 'anomalies' && <AnomalyResults insights={insights} />}
          {analysisType === 'financial' && <FinancialResults insights={insights} />}
          {analysisType === 'forecast' && <ForecastResults insights={insights} />}
          {analysisType === 'insights' && <InsightsResults insights={insights} />}
        </div>
      )}

      {insights?.error && (
        <Card className="bg-red-500/5 border-red-500/20">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="mx-auto mb-2 text-red-500" size={32} />
            <p className="text-red-400">{insights.error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AnomalyResults({ insights }) {
  const severityColors = {
    critical: "bg-red-500/20 text-red-400 border-red-500/30",
    high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    low: "bg-blue-500/20 text-blue-400 border-blue-500/30"
  };

  const healthColors = {
    good: "bg-green-500/20 text-green-400 border-green-500/30",
    fair: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    concerning: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    critical: "bg-red-500/20 text-red-400 border-red-500/30"
  };

  return (
    <div className="space-y-6">
      {/* Overall Health */}
      <Card className={`border ${healthColors[insights.overall_health]}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target size={20} />
            Overall Financial Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className={`${healthColors[insights.overall_health]} border text-lg px-4 py-1`}>
              {insights.overall_health?.toUpperCase()}
            </Badge>
            <p className="text-zinc-300">{insights.summary}</p>
          </div>
        </CardContent>
      </Card>

      {/* Anomalies */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle>Detected Anomalies ({insights.anomalies?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {insights.anomalies?.map((anomaly, idx) => (
              <div key={idx} className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`${severityColors[anomaly.severity]} border`}>
                      {anomaly.severity?.toUpperCase()}
                    </Badge>
                    <span className="font-medium text-white">{anomaly.category}</span>
                  </div>
                  <AlertTriangle className={`${severityColors[anomaly.severity].split(' ')[1]}`} size={20} />
                </div>
                <p className="text-zinc-300 mb-2">{anomaly.description}</p>
                {anomaly.affected_items?.length > 0 && (
                  <div className="mb-2">
                    <span className="text-sm text-zinc-500">Affected: </span>
                    <span className="text-sm text-zinc-400">{anomaly.affected_items.join(', ')}</span>
                  </div>
                )}
                <div className="mb-2">
                  <span className="text-sm text-zinc-500">Impact: </span>
                  <span className="text-sm text-zinc-300">{anomaly.impact}</span>
                </div>
                <div className="mt-3 p-3 bg-amber-500/10 rounded border border-amber-500/20">
                  <p className="text-sm text-amber-400">
                    <strong>Recommendation:</strong> {anomaly.recommendation}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FinancialResults({ insights }) {
  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText size={20} />
            Executive Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-zinc-200 leading-relaxed">{insights.executive_summary}</p>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <p className="text-zinc-400 text-sm">Total Budget</p>
            <p className="text-2xl font-bold text-white">${insights.total_budget?.toLocaleString() || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <p className="text-zinc-400 text-sm">Total Actual</p>
            <p className="text-2xl font-bold text-white">${insights.total_actual?.toLocaleString() || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <p className="text-zinc-400 text-sm">Committed</p>
            <p className="text-2xl font-bold text-white">${insights.total_committed?.toLocaleString() || 0}</p>
          </CardContent>
        </Card>
        <Card className={`border ${insights.variance_amount >= 0 ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
          <CardContent className="p-4">
            <p className="text-zinc-400 text-sm">Variance</p>
            <p className={`text-2xl font-bold ${insights.variance_amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {insights.variance_amount >= 0 ? '+' : ''}${insights.variance_amount?.toLocaleString() || 0}
            </p>
            <p className={`text-sm ${insights.variance_amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {insights.variance_percent?.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 size={20} />
            Performance by Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {insights.category_breakdown?.map((cat, idx) => (
              <div key={idx} className="p-4 bg-zinc-800/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-white capitalize">{cat.category}</span>
                  <Badge variant="outline" className={
                    cat.performance === 'good' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                    cat.performance === 'fair' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                    'bg-red-500/20 text-red-400 border-red-500/30'
                  }>
                    {cat.performance}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-zinc-500">Budget: </span>
                    <span className="text-zinc-300">${cat.budget?.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500">Actual: </span>
                    <span className="text-zinc-300">${cat.actual?.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500">Variance: </span>
                    <span className={cat.variance >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {cat.variance >= 0 ? '+' : ''}${cat.variance?.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Insights Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {insights.top_performers?.length > 0 && (
          <Card className="bg-green-500/5 border-green-500/20">
            <CardHeader>
              <CardTitle className="text-base text-green-400">Top Performers</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {insights.top_performers.map((item, idx) => (
                  <li key={idx} className="text-sm text-zinc-300 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
        
        {insights.concerns?.length > 0 && (
          <Card className="bg-red-500/5 border-red-500/20">
            <CardHeader>
              <CardTitle className="text-base text-red-400">Concerns</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {insights.concerns.map((item, idx) => (
                  <li key={idx} className="text-sm text-zinc-300 flex items-center gap-2">
                    <AlertTriangle size={14} className="text-red-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
        
        {insights.recommendations?.length > 0 && (
          <Card className="bg-amber-500/5 border-amber-500/20">
            <CardHeader>
              <CardTitle className="text-base text-amber-400">Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {insights.recommendations.map((item, idx) => (
                  <li key={idx} className="text-sm text-zinc-300 flex items-center gap-2">
                    <Target size={14} className="text-amber-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function ForecastResults({ insights }) {
  return (
    <div className="space-y-6">
      {/* Overall Outlook */}
      <Card className="bg-gradient-to-br from-green-500/10 to-blue-500/10 border-green-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp size={20} />
            Overall Outlook
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-zinc-200 leading-relaxed">{insights.overall_outlook}</p>
        </CardContent>
      </Card>

      {/* Cost Forecast */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign size={20} />
            Cost Completion Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {insights.cost_forecast?.map((forecast, idx) => (
              <div key={idx} className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-white">{forecast.project_name}</h4>
                  <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                    {forecast.confidence_level} confidence
                  </Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-zinc-500">Original Budget</p>
                    <p className="text-zinc-200 font-medium">${forecast.original_budget?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Current Actual</p>
                    <p className="text-zinc-200 font-medium">${forecast.current_actual?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Est. at Completion</p>
                    <p className="text-amber-400 font-medium">${forecast.estimated_completion_cost?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Variance Projection</p>
                    <p className={`font-medium ${forecast.variance_projection >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {forecast.variance_projection >= 0 ? '+' : ''}${forecast.variance_projection?.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Timeline Risks */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock size={20} />
            Timeline Risk Assessment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {insights.timeline_risks?.map((risk, idx) => (
              <div key={idx} className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-medium text-white mb-1">{risk.risk}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-zinc-500">
                        Probability: <span className="text-amber-400">{risk.probability}</span>
                      </span>
                      <span className="text-zinc-500">
                        Impact: <span className="text-red-400">+{risk.impact_days} days</span>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-blue-500/10 rounded border border-blue-500/20">
                  <p className="text-sm text-blue-400">
                    <strong>Mitigation:</strong> {risk.mitigation}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {insights.recommendations?.length > 0 && (
        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardHeader>
            <CardTitle className="text-amber-400">Proactive Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {insights.recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-3 text-zinc-300">
                  <Target size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InsightsResults({ insights }) {
  const getHealthColor = (score) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <div className="space-y-6">
      {/* Health Score */}
      <Card className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain size={20} />
            Project Health Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className={`text-6xl font-bold ${getHealthColor(insights.health_score)}`}>
              {insights.health_score}/100
            </div>
            <div className="flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-zinc-500">Schedule</p>
                  <p className="text-zinc-200">{insights.key_metrics?.schedule_performance}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500">Budget</p>
                  <p className="text-zinc-200">{insights.key_metrics?.budget_performance}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500">Quality</p>
                  <p className="text-zinc-200">{insights.key_metrics?.quality_indicators}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500">Efficiency</p>
                  <p className="text-zinc-200">{insights.key_metrics?.team_efficiency}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Patterns */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle>Identified Patterns</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {insights.patterns?.map((pattern, idx) => (
              <div key={idx} className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                <div className="mb-2">
                  <span className="font-medium text-white">{pattern.pattern}</span>
                  <Badge variant="outline" className="ml-2 bg-purple-500/20 text-purple-400 border-purple-500/30">
                    {pattern.frequency}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-zinc-500">Impact: </span>
                    <span className="text-zinc-300">{pattern.impact}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500">Root Cause: </span>
                    <span className="text-zinc-300">{pattern.root_cause}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {insights.bottlenecks?.length > 0 && (
          <Card className="bg-red-500/5 border-red-500/20">
            <CardHeader>
              <CardTitle className="text-base text-red-400 flex items-center gap-2">
                <AlertTriangle size={16} />
                Bottlenecks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {insights.bottlenecks.map((item, idx) => (
                  <li key={idx} className="text-sm text-zinc-300">• {item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
        
        {insights.opportunities?.length > 0 && (
          <Card className="bg-green-500/5 border-green-500/20">
            <CardHeader>
              <CardTitle className="text-base text-green-400 flex items-center gap-2">
                <TrendingUp size={16} />
                Opportunities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {insights.opportunities.map((item, idx) => (
                  <li key={idx} className="text-sm text-zinc-300">• {item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
        
        {insights.strategic_recommendations?.length > 0 && (
          <Card className="bg-blue-500/5 border-blue-500/20">
            <CardHeader>
              <CardTitle className="text-base text-blue-400 flex items-center gap-2">
                <Target size={16} />
                Strategic Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {insights.strategic_recommendations.map((item, idx) => (
                  <li key={idx} className="text-sm text-zinc-300">• {item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}