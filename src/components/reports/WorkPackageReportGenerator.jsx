import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Download, Mail, Calendar } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function WorkPackageReportGenerator({ workPackageId, projectId }) {
  const [reportType, setReportType] = useState('status');
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  const generatePDF = async () => {
    if (!workPackageId) {
      toast.error('No work package selected');
      return;
    }

    setGeneratingPDF(true);
    try {
      const response = await base44.functions.invoke('generateWorkPackagePDF', {
        work_package_id: workPackageId
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `WorkPackage_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      toast.success('PDF report generated');
    } catch (error) {
      toast.error('Failed to generate PDF: ' + (error?.message || 'Unknown error'));
    } finally {
      setGeneratingPDF(false);
    }
  };

  const sendReport = async () => {
    if (!emailRecipient || !emailRecipient.includes('@')) {
      toast.error('Valid email required');
      return;
    }

    setSendingEmail(true);
    try {
      await base44.functions.invoke('scheduleReportEmail', {
        report_type: 'work_package',
        recipients: [emailRecipient],
        frequency: 'once',
        project_id: projectId,
        include_pdf: true
      });

      toast.success(`Report sent to ${emailRecipient}`);
      setEmailRecipient('');
    } catch (error) {
      toast.error('Failed to send: ' + (error?.message || 'Unknown error'));
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wide">
          <FileText size={16} />
          Generate Report
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs text-zinc-400">Report Type</Label>
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="bg-zinc-950 border-zinc-800">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="status">Status Report</SelectItem>
              <SelectItem value="budget">Budget Variance</SelectItem>
              <SelectItem value="progress">Progress Over Time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={generatePDF}
          disabled={generatingPDF || !workPackageId}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold"
        >
          <Download size={16} className="mr-2" />
          {generatingPDF ? 'Generating...' : 'Download PDF'}
        </Button>

        <div className="border-t border-zinc-800 pt-4 space-y-3">
          <Label className="text-xs text-zinc-400">Email Report</Label>
          <div className="flex gap-2">
            <Input
              type="email"
              value={emailRecipient}
              onChange={(e) => setEmailRecipient(e.target.value)}
              placeholder="recipient@company.com"
              className="bg-zinc-950 border-zinc-800"
            />
            <Button
              onClick={sendReport}
              disabled={sendingEmail || !emailRecipient}
              className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap"
            >
              <Mail size={16} className="mr-2" />
              {sendingEmail ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}