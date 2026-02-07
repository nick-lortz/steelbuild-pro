import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Mail, Plus, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function ReportScheduler({ projectId = null }) {
  const [reportType, setReportType] = useState('dashboard');
  const [frequency, setFrequency] = useState('weekly');
  const [recipients, setRecipients] = useState(['']);
  const [sending, setSending] = useState(false);

  const addRecipient = () => {
    setRecipients([...recipients, '']);
  };

  const removeRecipient = (index) => {
    setRecipients(recipients.filter((_, i) => i !== index));
  };

  const updateRecipient = (index, value) => {
    const updated = [...recipients];
    updated[index] = value;
    setRecipients(updated);
  };

  const scheduleReport = async () => {
    const validRecipients = recipients.filter(r => r.trim() !== '');
    
    if (validRecipients.length === 0) {
      toast.error('Add at least one recipient');
      return;
    }

    setSending(true);
    try {
      await base44.functions.invoke('scheduleReportEmail', {
        report_type: reportType,
        recipients: validRecipients,
        frequency,
        project_id: projectId,
        include_pdf: true
      });

      toast.success(`Report sent to ${validRecipients.length} recipient(s)`);
      setRecipients(['']);
    } catch (error) {
      toast.error('Failed to schedule report: ' + (error?.message || 'Unknown error'));
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wide">
          <Calendar size={16} />
          Schedule Report Delivery
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-zinc-400">Report Type</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger className="bg-zinc-950 border-zinc-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dashboard">Portfolio Dashboard</SelectItem>
                <SelectItem value="work_package">Work Package Status</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-zinc-400">Frequency</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger className="bg-zinc-950 border-zinc-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-zinc-400">Recipients</Label>
          {recipients.map((recipient, index) => (
            <div key={index} className="flex gap-2">
              <Input
                type="email"
                value={recipient}
                onChange={(e) => updateRecipient(index, e.target.value)}
                placeholder="email@company.com"
                className="bg-zinc-950 border-zinc-800"
              />
              {recipients.length > 1 && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => removeRecipient(index)}
                  className="border-zinc-800"
                >
                  <X size={16} />
                </Button>
              )}
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={addRecipient}
            className="w-full border-zinc-800"
          >
            <Plus size={14} className="mr-2" />
            Add Recipient
          </Button>
        </div>

        <Button
          onClick={scheduleReport}
          disabled={sending}
          className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold"
        >
          <Mail size={16} className="mr-2" />
          {sending ? 'Sending...' : 'Send Report Now'}
        </Button>

        <p className="text-[10px] text-zinc-600 text-center">
          Report will be sent immediately. Future scheduling via automations.
        </p>
      </CardContent>
    </Card>
  );
}