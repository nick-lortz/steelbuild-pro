import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, TrendingUp, Shield, Clock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function ROIDashboard() {
  const { activeProjectId } = useActiveProject();
  const [view, setView] = useState('project');
  
  const { data: projectROI, isLoading: projectLoading } = useQuery({
    queryKey: ['projectROI', activeProjectId],
    queryFn: async () => {
      if (!activeProjectId) return null;
      const res = await base44.functions.invoke('getProjectROI', { project_id: activeProjectId });
      return res.data?.data;
    },
    enabled: !!activeProjectId && view === 'project'
  });
  
  const { data: portfolioROI, isLoading: portfolioLoading } = useQuery({
    queryKey: ['portfolioROI'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getPortfolioROI', {});
      return res.data?.data;
    },
    enabled: view === 'portfolio'
  });
  
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value || 0);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ROI Dashboard</h1>
          <p className="text-muted-foreground">Cost savings from execution gating and blocker resolution</p>
        </div>
      </div>
      
      <Tabs value={view} onValueChange={setView}>
        <TabsList>
          <TabsTrigger value="project">Project View</TabsTrigger>
          <TabsTrigger value="portfolio">Portfolio View</TabsTrigger>
        </TabsList>
        
        <TabsContent value="project" className="space-y-6">
          {!activeProjectId ? (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">Select a project to view ROI metrics</p>
              </CardContent>
            </Card>
          ) : projectLoading ? (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">Loading ROI data...</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Estimated Savings</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(projectROI?.total_estimated_savings)}</div>
                    <p className="text-xs text-muted-foreground">
                      {projectROI?.total_hours_saved || 0} hours saved
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Shipment Blocks</CardTitle>
                    <Shield className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{projectROI?.number_of_shipment_blocks_prevented || 0}</div>
                    <p className="text-xs text-muted-foreground">Prevented</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Install Holds</CardTitle>
                    <Shield className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{projectROI?.number_of_install_blocks_prevented || 0}</div>
                    <p className="text-xs text-muted-foreground">Prevented</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Gate Overrides</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{projectROI?.number_of_gate_overrides || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      Avg {projectROI?.average_days_to_resolution || 0}d to resolve
                    </p>
                  </CardContent>
                </Card>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Blocker Types (Last 30 Days)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {projectROI?.top_blocker_types?.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={projectROI.top_blocker_types}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="type" angle={-45} textAnchor="end" height={100} />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="count" fill="#FF6B2C" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">No blocker data available</p>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Last 30 Days Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium">Savings This Month</p>
                        <p className="text-2xl font-bold">{formatCurrency(projectROI?.last_30_days?.savings)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Events Tracked</p>
                        <p className="text-2xl font-bold">{projectROI?.last_30_days?.events_count || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
        
        <TabsContent value="portfolio" className="space-y-6">
          {portfolioLoading ? (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">Loading portfolio ROI...</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Savings</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(portfolioROI?.total_savings_all_projects)}</div>
                    <p className="text-xs text-muted-foreground">
                      Avg {formatCurrency(portfolioROI?.avg_savings_per_project)} per project
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Fab Holds Prevented</CardTitle>
                    <Shield className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{portfolioROI?.number_of_fab_holds_prevented || 0}</div>
                    <p className="text-xs text-muted-foreground">Across all projects</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Install Holds Prevented</CardTitle>
                    <Shield className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{portfolioROI?.number_of_install_holds_prevented || 0}</div>
                    <p className="text-xs text-muted-foreground">Across all projects</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Projects Evaluated</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{portfolioROI?.projects_evaluated || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      {portfolioROI?.total_events || 0} total events
                    </p>
                  </CardContent>
                </Card>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Risk Categories</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {portfolioROI?.top_3_risk_categories?.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={portfolioROI.top_3_risk_categories}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="type" angle={-45} textAnchor="end" height={100} />
                          <YAxis />
                          <Tooltip formatter={(value) => formatCurrency(value)} />
                          <Legend />
                          <Bar dataKey="total_savings" fill="#FF6B2C" name="Total Savings" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">No risk category data</p>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Savings Trend (30 Days)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {portfolioROI?.trend_last_30_days?.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={portfolioROI.trend_last_30_days}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" hide />
                          <YAxis />
                          <Tooltip formatter={(value) => formatCurrency(value)} />
                          <Legend />
                          <Line type="monotone" dataKey="savings" stroke="#FF6B2C" name="Daily Savings" />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">No trend data available</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}