import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Receipt, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function InvoiceTracking({ financials, projects, costCodes, expenses = [] }) {
  const [selectedProject, setSelectedProject] = useState('all');
  const [expandedProjects, setExpandedProjects] = useState(new Set());

  const invoiceData = useMemo(() => {
    return financials.map(financial => {
      const project = projects.find(p => p.id === financial.project_id);
      const costCode = costCodes.find(c => c.id === financial.cost_code_id);
      
      const invoiced = expenses
        .filter(e => 
          e.project_id === financial.project_id && 
          e.cost_code_id === financial.cost_code_id &&
          e.invoice_number
        )
        .reduce((sum, e) => sum + (e.amount || 0), 0);
      
      const budget = financial.budget_amount || 0;
      const remaining = budget - invoiced;
      const percentInvoiced = budget > 0 ? (invoiced / budget) * 100 : 0;
      
      return {
        id: financial.id,
        projectId: financial.project_id,
        projectName: project?.name || 'Unknown',
        projectNumber: project?.project_number || '-',
        costCode: costCode?.code || '-',
        costCodeName: costCode?.name || 'Unknown',
        budget,
        invoiced,
        remaining,
        percentInvoiced,
        overInvoiced: invoiced > budget
      };
    }).filter(d => d.budget > 0);
  }, [financials, projects, costCodes, expenses]);

  const filteredData = selectedProject === 'all' 
    ? invoiceData 
    : invoiceData.filter(d => d.projectId === selectedProject);

  const projectSummaries = useMemo(() => {
    const summaries = {};
    filteredData.forEach(item => {
      if (!summaries[item.projectId]) {
        summaries[item.projectId] = {
          projectNumber: item.projectNumber,
          projectName: item.projectName,
          budget: 0,
          invoiced: 0,
          items: []
        };
      }
      summaries[item.projectId].budget += item.budget;
      summaries[item.projectId].invoiced += item.invoiced;
      summaries[item.projectId].items.push(item);
    });
    return Object.entries(summaries).map(([id, data]) => ({
      id,
      ...data,
      remaining: data.budget - data.invoiced,
      percentInvoiced: data.budget > 0 ? (data.invoiced / data.budget) * 100 : 0
    }));
  }, [filteredData]);

  const totals = useMemo(() => {
    const totalBudget = filteredData.reduce((sum, d) => sum + d.budget, 0);
    const totalInvoiced = filteredData.reduce((sum, d) => sum + d.invoiced, 0);
    const totalRemaining = totalBudget - totalInvoiced;
    const percentInvoiced = totalBudget > 0 ? (totalInvoiced / totalBudget) * 100 : 0;
    
    return { totalBudget, totalInvoiced, totalRemaining, percentInvoiced };
  }, [filteredData]);

  const toggleProject = (projectId) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <Receipt className="text-amber-500" size={20} />
            <CardTitle className="text-lg">Invoice Tracking</CardTitle>
          </div>
          <div className="flex items-center gap-4">
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-48 bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="Filter by project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.project_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-right">
              <p className="text-sm text-zinc-400">Total Invoiced</p>
              <p className="text-lg font-bold text-white">
                ${totals.totalInvoiced.toLocaleString()}
                <span className="text-sm text-zinc-400 font-normal ml-1">
                  / ${totals.totalBudget.toLocaleString()}
                </span>
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {projectSummaries.length === 0 ? (
          <div className="text-center py-8 text-zinc-500">
            <Receipt size={32} className="mx-auto mb-2 opacity-50" />
            <p>No invoice data available</p>
          </div>
        ) : (
          <div className="space-y-2">
            {projectSummaries.map(project => (
              <div key={project.id} className="border border-zinc-800 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleProject(project.id)}
                  className="w-full p-3 bg-zinc-800/50 hover:bg-zinc-800 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    {expandedProjects.has(project.id) ? (
                      <ChevronDown size={16} className="text-zinc-400" />
                    ) : (
                      <ChevronRight size={16} className="text-zinc-400" />
                    )}
                    <div className="text-left">
                      <p className="font-medium text-white">{project.projectNumber}</p>
                      <p className="text-xs text-zinc-500">{project.projectName}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {project.items.length} items
                    </Badge>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm font-medium text-white">
                        ${project.invoiced.toLocaleString()}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {project.percentInvoiced.toFixed(0)}% invoiced
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-zinc-400">Remaining</p>
                      <p className={`text-sm font-medium ${
                        project.remaining < 0 ? 'text-red-400' : 'text-green-400'
                      }`}>
                        ${Math.abs(project.remaining).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </button>
                
                {expandedProjects.has(project.id) && (
                  <div className="bg-zinc-900/50">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-zinc-800">
                          <th className="text-left p-2 text-zinc-400 font-medium">Cost Code</th>
                          <th className="text-right p-2 text-zinc-400 font-medium">Budget</th>
                          <th className="text-right p-2 text-zinc-400 font-medium">Invoiced</th>
                          <th className="text-right p-2 text-zinc-400 font-medium">Remaining</th>
                          <th className="text-right p-2 text-zinc-400 font-medium">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {project.items.map(item => (
                          <tr 
                            key={item.id} 
                            className={`border-b border-zinc-800/50 ${
                              item.overInvoiced ? 'bg-red-500/5' : ''
                            }`}
                          >
                            <td className="p-2">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-amber-500">{item.costCode}</span>
                                <span className="text-zinc-400">{item.costCodeName}</span>
                                {item.overInvoiced && (
                                  <AlertCircle size={14} className="text-red-400" />
                                )}
                              </div>
                            </td>
                            <td className="text-right p-2 text-zinc-300">
                              ${item.budget.toLocaleString()}
                            </td>
                            <td className="text-right p-2 font-medium">
                              ${item.invoiced.toLocaleString()}
                            </td>
                            <td className={`text-right p-2 font-medium ${
                              item.remaining < 0 ? 'text-red-400' : 'text-green-400'
                            }`}>
                              ${Math.abs(item.remaining).toLocaleString()}
                            </td>
                            <td className="text-right p-2 text-zinc-400">
                              {item.percentInvoiced.toFixed(0)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}