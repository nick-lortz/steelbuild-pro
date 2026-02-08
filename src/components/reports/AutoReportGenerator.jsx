import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Mail, Calendar } from 'lucide-react';
import { apiClient } from '@/api/client';
import { toast } from '@/components/ui/notifications';

export default function AutoReportGenerator({ projectId }) {
  const [reportType, setReportType] = useState('weekly');
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState(null);

  const generateReport = async () => {
    setGenerating(true);
    try {
      const response = await apiClient.functions.invoke('generateExecutiveSummary', {
        project_id: projectId,
        report_type: reportType
      });

      setReport(response.data.summary);
      toast.success('Report generated');
    } catch (error) {
      toast.error('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (!report) return;

    const text = `
${report.project.name} - ${reportType.toUpperCase()} EXECUTIVE SUMMARY
Project: ${report.project.number}
Client: ${report.project.client}
Period: ${report.period.start_date} to ${report.period.end_date}

FINANCIAL STATUS:
• Contract Value: $${(report.financial.contract_value / 1000).toFixed(0)}k
• Budget: $${(report.financial.total_budget / 1000).toFixed(0)}k
• Actual Cost: $${(report.financial.actual_cost / 1000).toFixed(0)}k
• Variance: ${report.financial.variance_percent}% (${report.financial.status})
• Period Spend: $${(report.financial.period_spend / 1000).toFixed(0)}k

SCHEDULE STATUS:
• Completion: ${report.schedule.completion_percent}%
• Completed Tasks: ${report.schedule.completed_tasks} / ${report.schedule.total_tasks}
• Status: ${report.schedule.on_track}

QUALITY METRICS:
• Open RFIs: ${report.quality.open_rfis}
• New RFIs This Period: ${report.quality.new_rfis_this_period}
• Pending Change Orders: ${report.quality.pending_change_orders}
• Safety Incidents: ${report.quality.safety_incidents}

DRAWING STATUS:
• Released Sets: ${report.drawings.released} / ${report.drawings.total_sets} (${report.drawings.release_rate}%)

KEY ITEMS:
${report.key_items.map(item => `• ${item}`).join('\n')}

RISKS & CONCERNS:
${report.risks.length > 0 ? report.risks.map(risk => `• ${risk}`).join('\n') : '• None identified'}
`;

    navigator.clipboard.writeText(text);
    toast.success('Report copied to clipboard');
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText size={20} />
          Auto-Generated Reports
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="w-48 bg-zinc-950 border-zinc-800 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="weekly">Weekly Summary</SelectItem>
              <SelectItem value="monthly">Monthly Summary</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            onClick={generateReport}
            disabled={generating || !projectId}
            className="bg-amber-500 hover:bg-amber-600 text-black"
          >
            {generating ? 'Generating...' : 'Generate Report'}
          </Button>

          {report && (
            <Button 
              onClick={copyToClipboard}
              variant="outline"
              className="gap-2"
            >
              <Download size={16} />
              Copy to Clipboard
            </Button>
          )}
        </div>

        {report && (
          <div className="space-y-4 mt-4">
            <div className="bg-zinc-950 p-4 rounded border border-zinc-800">
              <h3 className="font-bold text-lg mb-2">{report.project.name}</h3>
              <p className="text-sm text-zinc-400 mb-4">
                {report.project.number} • {report.project.client}
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-zinc-500 uppercase mb-1">Financial</p>
                  <p className="text-2xl font-bold text-amber-500">{report.financial.variance_percent}%</p>
                  <p className="text-xs text-zinc-400">{report.financial.status}</p>
                </div>

                <div>
                  <p className="text-xs text-zinc-500 uppercase mb-1">Schedule</p>
                  <p className="text-2xl font-bold text-blue-500">{report.schedule.completion_percent}%</p>
                  <p className="text-xs text-zinc-400">{report.schedule.on_track}</p>
                </div>

                <div>
                  <p className="text-xs text-zinc-500 uppercase mb-1">Open RFIs</p>
                  <p className="text-2xl font-bold text-red-500">{report.quality.open_rfis}</p>
                  <p className="text-xs text-zinc-400">{report.quality.new_rfis_this_period} new</p>
                </div>

                <div>
                  <p className="text-xs text-zinc-500 uppercase mb-1">Drawings</p>
                  <p className="text-2xl font-bold text-green-500">{report.drawings.release_rate}%</p>
                  <p className="text-xs text-zinc-400">{report.drawings.released}/{report.drawings.total_sets} released</p>
                </div>
              </div>

              {report.key_items.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-zinc-500 uppercase mb-2">Key Items</p>
                  <ul className="space-y-1">
                    {report.key_items.map((item, idx) => (
                      <li key={idx} className="text-sm text-zinc-300">• {item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {report.risks.length > 0 && (
                <div className="mt-4 p-3 bg-red-950/20 border border-red-500/30 rounded">
                  <p className="text-xs text-red-400 uppercase font-bold mb-2">Risks</p>
                  <ul className="space-y-1">
                    {report.risks.map((risk, idx) => (
                      <li key={idx} className="text-sm text-red-300">• {risk}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}