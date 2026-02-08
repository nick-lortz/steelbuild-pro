import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronLeft, AlertCircle } from 'lucide-react';

export default function InteractiveDrillDown({ 
  projects = [], 
  financials = [], 
  rfis = [],
  changeOrders = []
}) {
  const [drillLevel, setDrillLevel] = useState(0); // 0=portfolio, 1=project, 2=details
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState('budget');

  const portfolioView = () => (
    <div className="space-y-3">
      {projects.slice(0, 5).map(proj => {
        const projFinancials = financials.filter(f => f.project_id === proj.id);
        const budget = projFinancials.reduce((sum, f) => sum + (f.current_budget || 0), 0);
        const actual = projFinancials.reduce((sum, f) => sum + (f.actual_amount || 0), 0);
        const variance = budget > 0 ? ((actual - budget) / budget) * 100 : 0;
        
        const projRFIs = rfis.filter(r => r.project_id === proj.id).length;
        const projCOs = changeOrders.filter(c => c.project_id === proj.id).length;

        return (
          <div 
            key={proj.id}
            className="p-3 bg-zinc-800/50 border border-zinc-700 rounded cursor-pointer hover:bg-zinc-800 hover:border-zinc-600 transition-all"
            onClick={() => {
              setSelectedProject(proj);
              setDrillLevel(1);
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-semibold text-white text-sm">{proj.project_number}</p>
                <p className="text-xs text-zinc-400 mt-1">{proj.name}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className={`text-sm font-bold ${variance > 5 ? 'text-red-400' : 'text-green-400'}`}>
                    {variance > 0 ? '+' : ''}{variance.toFixed(1)}%
                  </p>
                  <p className="text-xs text-zinc-500">${(budget/1000).toFixed(0)}K</p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {projRFIs} RFI • {projCOs} CO
                </Badge>
                <ChevronRight size={16} className="text-zinc-500" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const projectView = () => {
    if (!selectedProject) return null;

    const projFinancials = financials.filter(f => f.project_id === selectedProject.id);
    const costCodes = [...new Set(projFinancials.map(f => f.cost_code_id))];
    
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-semibold text-white">{selectedProject.project_number}</p>
            <p className="text-sm text-zinc-400">{selectedProject.name}</p>
          </div>
          <Button 
            size="sm" 
            variant="ghost"
            onClick={() => {
              setDrillLevel(0);
              setSelectedProject(null);
            }}
          >
            <ChevronLeft size={16} />
            Back
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {['budget', 'schedule', 'rfi', 'co'].map(metric => (
            <Button 
              key={metric}
              size="sm"
              onClick={() => setSelectedMetric(metric)}
              className={`text-xs ${selectedMetric === metric ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-300'}`}
            >
              {metric.toUpperCase()}
            </Button>
          ))}
        </div>

        {selectedMetric === 'budget' && (
          <div className="space-y-2">
            {costCodes.slice(0, 6).map(ccId => {
              const ccFinancials = projFinancials.filter(f => f.cost_code_id === ccId);
              const ccBudget = ccFinancials.reduce((sum, f) => sum + (f.current_budget || 0), 0);
              const ccActual = ccFinancials.reduce((sum, f) => sum + (f.actual_amount || 0), 0);
              const ccVariance = ccBudget > 0 ? ((ccActual - ccBudget) / ccBudget) * 100 : 0;

              return (
                <div 
                  key={ccId}
                  className="p-2 bg-zinc-800/50 border border-zinc-700 rounded cursor-pointer hover:bg-zinc-800"
                  onClick={() => setDrillLevel(2)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-white">{ccId}</span>
                    <Badge className={ccVariance > 0 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}>
                      {ccVariance > 0 ? '+' : ''}{ccVariance.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="mt-1 text-xs text-zinc-400">
                    ${(ccBudget/1000).toFixed(0)}K budget • ${(ccActual/1000).toFixed(0)}K actual
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {selectedMetric === 'rfi' && (
          <div className="space-y-2">
            {rfis.filter(r => r.project_id === selectedProject.id).slice(0, 5).map(rfi => (
              <div key={rfi.id} className="p-2 bg-zinc-800/50 border border-zinc-700 rounded">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-white">RFI #{rfi.rfi_number}</span>
                  <Badge variant="outline" className="text-[10px]">{rfi.status}</Badge>
                </div>
                <p className="text-xs text-zinc-400 mt-1 line-clamp-1">{rfi.subject}</p>
              </div>
            ))}
          </div>
        )}

        {selectedMetric === 'co' && (
          <div className="space-y-2">
            {changeOrders.filter(c => c.project_id === selectedProject.id).slice(0, 5).map(co => (
              <div key={co.id} className="p-2 bg-zinc-800/50 border border-zinc-700 rounded">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-white">CO #{co.co_number}</span>
                  <Badge className={co.status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'} variant="outline">
                    {co.status}
                  </Badge>
                </div>
                <p className="text-xs text-zinc-400 mt-1">${(co.cost_impact/1000).toFixed(0)}K impact</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertCircle size={16} />
          Interactive Drill-Down Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        {drillLevel === 0 ? portfolioView() : projectView()}
      </CardContent>
    </Card>
  );
}