import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
"@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function InvoiceTracking({ financials, projects, costCodes, expenses = [], clientInvoices = [] }) {
  const [selectedProject, setSelectedProject] = useState('all');
  const [expandedProjects, setExpandedProjects] = useState(new Set());

  const invoiceData = useMemo(() => {
    return financials.map((financial) => {
      const project = projects.find((p) => p.id === financial.project_id);
      const costCode = costCodes.find((c) => c.id === financial.cost_code_id);

      // Calculate amount invoiced to client from line items
      let invoiced = 0;
      clientInvoices.forEach((inv) => {
        if (inv.project_id === financial.project_id && Array.isArray(inv.line_items)) {
          const lineItem = inv.line_items.find((li) => li && li.cost_code_id === financial.cost_code_id);
          if (lineItem && typeof lineItem.billed_this_month === 'number') {
            invoiced += lineItem.billed_this_month;
          }
        }
      });

      // Calculate costs incurred (paid/approved expenses)
      const incurred = expenses.
      filter((e) =>
      e.project_id === financial.project_id &&
      e.cost_code_id === financial.cost_code_id && (
      e.payment_status === 'paid' || e.payment_status === 'approved')
      ).
      reduce((sum, e) => sum + (e.amount || 0), 0);

      const budget = financial.budget_amount || 0;
      const remainingToBill = budget - invoiced;
      const percentInvoiced = budget > 0 ? invoiced / budget * 100 : 0;
      const margin = invoiced - incurred;

      return {
        id: financial.id,
        projectId: financial.project_id,
        projectName: project?.name || 'Unknown',
        projectNumber: project?.project_number || '-',
        costCode: costCode?.code || '-',
        costCodeName: costCode?.name || 'Unknown',
        budget,
        invoiced,
        incurred,
        remainingToBill,
        percentInvoiced,
        margin,
        overInvoiced: invoiced > budget,
        negativeMargin: margin < 0
      };
    }).filter((d) => d.budget > 0);
  }, [financials, projects, costCodes, expenses, clientInvoices]);

  const filteredData = selectedProject === 'all' ?
  invoiceData :
  invoiceData.filter((d) => d.projectId === selectedProject);

  const projectSummaries = useMemo(() => {
    const summaries = {};
    filteredData.forEach((item) => {
      if (!summaries[item.projectId]) {
        summaries[item.projectId] = {
          projectNumber: item.projectNumber,
          projectName: item.projectName,
          budget: 0,
          invoiced: 0,
          incurred: 0,
          items: []
        };
      }
      summaries[item.projectId].budget += item.budget;
      summaries[item.projectId].invoiced += item.invoiced;
      summaries[item.projectId].incurred += item.incurred;
      summaries[item.projectId].items.push(item);
    });
    return Object.entries(summaries).map(([id, data]) => ({
      id,
      ...data,
      remainingToBill: data.budget - data.invoiced,
      margin: data.invoiced - data.incurred,
      percentInvoiced: data.budget > 0 ? data.invoiced / data.budget * 100 : 0
    }));
  }, [filteredData]);

  const totals = useMemo(() => {
    const totalBudget = filteredData.reduce((sum, d) => sum + d.budget, 0);
    const totalInvoiced = filteredData.reduce((sum, d) => sum + d.invoiced, 0);
    const totalIncurred = filteredData.reduce((sum, d) => sum + d.incurred, 0);
    const totalRemainingToBill = totalBudget - totalInvoiced;
    const totalMargin = totalInvoiced - totalIncurred;
    const percentInvoiced = totalBudget > 0 ? totalInvoiced / totalBudget * 100 : 0;

    return { totalBudget, totalInvoiced, totalIncurred, totalRemainingToBill, totalMargin, percentInvoiced };
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
            <CardTitle className="text-slate-50 text-lg font-semibold tracking-tight">Invoice Tracking</CardTitle>
          </div>
          <div className="text-slate-50 flex items-center gap-4">
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-48 bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="Filter by project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((p) =>
                <SelectItem key={p.id} value={p.id}>
                    {p.project_number}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-3 gap-4 text-right">
              <div>
                <p className="text-xs text-zinc-400">Invoiced</p>
                <p className="text-sm font-bold text-white">
                  ${totals.totalInvoiced.toLocaleString()}
                </p>
                <p className="text-xs text-zinc-500">
                  {totals.percentInvoiced.toFixed(0)}% of budget
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-400">Incurred</p>
                <p className="text-sm font-bold text-amber-500">
                  ${totals.totalIncurred.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-400">Margin</p>
                <p className={`text-sm font-bold ${totals.totalMargin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  ${Math.abs(totals.totalMargin).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {projectSummaries.length === 0 ?
        <div className="text-center py-8 text-zinc-500">
            <Receipt size={32} className="mx-auto mb-2 opacity-50" />
            <p>No invoice data available</p>
          </div> :

        <div className="space-y-2">
            {projectSummaries.map((project) =>
          <div key={project.id} className="border border-zinc-800 rounded-lg overflow-hidden">
                <button
              onClick={() => toggleProject(project.id)}
              className="w-full p-3 bg-zinc-800/50 hover:bg-zinc-800 transition-colors flex items-center justify-between">

                  <div className="flex items-center gap-3">
                    {expandedProjects.has(project.id) ?
                <ChevronDown size={16} className="text-zinc-400" /> :

                <ChevronRight size={16} className="text-zinc-400" />
                }
                    <div className="text-left">
                      <p className="font-medium text-white">{project.projectNumber}</p>
                      <p className="text-xs text-zinc-500">{project.projectName}</p>
                    </div>
                    <Badge variant="outline" className="text-slate-50 px-2.5 py-0.5 text-xs font-semibold rounded-md inline-flex items-center border transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                      {project.items.length} items
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-zinc-400">Invoiced</p>
                      <p className="text-sm font-medium text-white">
                        ${project.invoiced.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-zinc-400">Incurred</p>
                      <p className="text-sm font-medium text-amber-500">
                        ${project.incurred.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-zinc-400">Margin</p>
                      <p className={`text-sm font-medium ${
                  project.margin >= 0 ? 'text-green-400' : 'text-red-400'}`
                  }>
                        ${Math.abs(project.margin).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-zinc-400">To Bill</p>
                      <p className="text-sm font-medium text-zinc-300">
                        ${project.remainingToBill.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </button>
                
                {expandedProjects.has(project.id) &&
            <div className="bg-zinc-900/50">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-zinc-800">
                          <th className="text-left p-2 text-zinc-400 font-medium">Cost Code</th>
                          <th className="text-right p-2 text-zinc-400 font-medium">Budget</th>
                          <th className="text-right p-2 text-zinc-400 font-medium">Invoiced</th>
                          <th className="text-right p-2 text-zinc-400 font-medium">Incurred</th>
                          <th className="text-right p-2 text-zinc-400 font-medium">Margin</th>
                          <th className="text-right p-2 text-zinc-400 font-medium">To Bill</th>
                          <th className="text-right p-2 text-zinc-400 font-medium">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {project.items.map((item) =>
                  <tr
                    key={item.id}
                    className={`border-b border-zinc-800/50 ${
                    item.negativeMargin ? 'bg-red-500/5' : ''}`
                    }>

                            <td className="p-2">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-amber-500">{item.costCode}</span>
                                <span className="text-zinc-400">{item.costCodeName}</span>
                                {item.negativeMargin &&
                        <AlertCircle size={14} className="text-red-400" />
                        }
                              </div>
                            </td>
                            <td className="text-right p-2 text-zinc-300">
                              ${item.budget.toLocaleString()}
                            </td>
                            <td className="text-right p-2 font-medium text-white">
                              ${item.invoiced.toLocaleString()}
                            </td>
                            <td className="text-right p-2 text-amber-500">
                              ${item.incurred.toLocaleString()}
                            </td>
                            <td className={`text-right p-2 font-medium ${
                    item.margin >= 0 ? 'text-green-400' : 'text-red-400'}`
                    }>
                              ${Math.abs(item.margin).toLocaleString()}
                            </td>
                            <td className="text-right p-2 text-zinc-300">
                              ${item.remainingToBill.toLocaleString()}
                            </td>
                            <td className="text-right p-2 text-zinc-400">
                              {item.percentInvoiced.toFixed(0)}%
                            </td>
                          </tr>
                  )}
                      </tbody>
                    </table>
                  </div>
            }
              </div>
          )}
          </div>
        }
      </CardContent>
    </Card>);

}