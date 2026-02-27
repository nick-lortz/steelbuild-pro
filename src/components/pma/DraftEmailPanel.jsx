import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wand2, Copy, CheckCircle2, Send, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const TEMPLATES = [
  { key: 'rfi_followup', label: 'RFI Follow-Up / Escalation', description: 'Chase an overdue RFI response' },
  { key: 'co_approval', label: 'CO Approval Request', description: 'Request approval for a change order' },
  { key: 'schedule_delay', label: 'GC Delay Notification', description: 'Document a GC-caused delay and request recovery' },
  { key: 'submittal_push', label: 'Submittal Approval Push', description: 'Expedite a submittal review' },
  { key: 'delay_claim', label: 'Time Extension Request', description: 'Formal request for schedule extension' },
  { key: 'proceed_at_risk', label: 'Proceed-at-Risk Notice', description: 'Notify GC you are proceeding pending response' },
  { key: 'weekly_update', label: 'Weekly Project Update', description: 'Status summary to GC or owner' },
  { key: 'fab_hold', label: 'Fabrication Hold Notice', description: 'Notify shop to hold pending RFI/drawing clarification' },
  { key: 'safety_notice', label: 'Safety Incident Notice', description: 'Report a safety event or near-miss' },
  { key: 'custom', label: 'Custom Context', description: 'Describe what you need' },
];

export default function DraftEmailPanel({ activeProjectId, onSendToChat }) {
  const [template, setTemplate] = useState('');
  const [context, setContext] = useState('');
  const [draft, setDraft] = useState('');
  const [subject, setSubject] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');

  const { data: project } = useQuery({
    queryKey: ['project', activeProjectId],
    queryFn: async () => {
      const rows = await base44.entities.Project.filter({ id: activeProjectId });
      return rows[0];
    },
    enabled: !!activeProjectId
  });

  const generate = async () => {
    if (!template) { toast.error('Select a template first'); return; }
    setGenerating(true);
    try {
      const tpl = TEMPLATES.find(t => t.key === template);
      const { data } = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a senior structural steel project manager. Draft a professional, field-ready email for the following scenario.

Project: ${project?.name || 'N/A'} (${project?.project_number || ''})
Client/GC: ${project?.client || 'N/A'}

Template Type: ${tpl?.label}
Additional Context: ${context || 'None provided'}

Requirements:
- Write a complete email body (no salutation/sign-off needed unless natural)
- Steel industry terminology, direct and professional
- Include any specific numbers, dates, or references from context
- If it's a delay notice, quantify the impact
- If it's a CO follow-up, reference the dollar amount and approval timeline
- Max 200 words
- Ready to send with zero editing required

Also output a suggested subject line on the first line prefixed with "SUBJECT: "`,
        response_json_schema: {
          type: 'object',
          properties: {
            subject: { type: 'string' },
            body: { type: 'string' }
          }
        }
      });
      if (data?.subject) {
        setSubject(data.subject);
        setDraft(data.body || '');
      } else {
        // Fallback: parse from text
        const text = typeof data === 'string' ? data : JSON.stringify(data);
        const lines = text.split('\n');
        const subjectLine = lines.find(l => l.startsWith('SUBJECT:'));
        setSubject(subjectLine ? subjectLine.replace('SUBJECT:', '').trim() : '');
        setDraft(lines.filter(l => !l.startsWith('SUBJECT:')).join('\n').trim());
      }
    } catch {
      toast.error('Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const copyDraft = () => {
    navigator.clipboard.writeText(`Subject: ${subject}\n\n${draft}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard');
  };

  const sendEmail = async () => {
    if (!recipientEmail || !draft) { toast.error('Add recipient and draft first'); return; }
    setSendingEmail(true);
    try {
      await base44.integrations.Core.SendEmail({
        to: recipientEmail,
        subject: subject || 'Project Communication',
        body: draft
      });
      toast.success('Email sent');
    } catch {
      toast.error('Email send failed');
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div>
          <h3 className="text-sm font-bold text-white">Draft Email / Communication</h3>
          <p className="text-xs text-zinc-500 mt-0.5">AI-generated field-ready communications</p>
        </div>
        {draft && onSendToChat && (
          <Button size="sm" variant="outline"
            onClick={() => onSendToChat(`Review this draft communication and suggest improvements:\n\nSubject: ${subject}\n\n${draft}`)}
            className="border-zinc-700 text-xs">
            <Send size={12} className="mr-1.5" />Review with PMA
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {/* Template selector */}
          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2 block">Communication Type</label>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTemplate(t.key)}
                  className={cn(
                    'text-left p-3 rounded-lg border text-xs transition-all',
                    template === t.key
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
                  )}
                >
                  <div className="font-medium mb-0.5">{t.label}</div>
                  <div className="text-zinc-600 text-[10px]">{t.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Context */}
          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2 block">Context / Details</label>
            <Textarea
              value={context}
              onChange={e => setContext(e.target.value)}
              placeholder="Add specifics: RFI number, CO number, dollar amounts, dates, what's blocked, who's responsible..."
              className="bg-zinc-900 border-zinc-700 text-zinc-200 text-sm resize-none h-24 placeholder:text-zinc-600"
            />
          </div>

          <Button
            onClick={generate}
            disabled={generating || !template}
            className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold"
          >
            {generating
              ? <><Loader2 size={14} className="mr-2 animate-spin" />Generating...</>
              : <><Wand2 size={14} className="mr-2" />Generate Draft</>}
          </Button>

          {/* Draft output */}
          {draft && (
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2 block">Subject Line</label>
                <Input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="bg-zinc-900 border-zinc-700 text-zinc-200 text-sm"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] text-zinc-500 uppercase tracking-widest">Email Body</label>
                  <Button size="sm" variant="ghost" onClick={copyDraft} className="h-6 text-[10px] text-zinc-400 hover:text-white px-2">
                    {copied ? <><CheckCircle2 size={10} className="mr-1 text-green-400" />Copied</> : <><Copy size={10} className="mr-1" />Copy All</>}
                  </Button>
                </div>
                <Textarea
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  className="bg-zinc-900 border-zinc-700 text-zinc-200 text-sm resize-none h-48"
                />
              </div>

              {/* Send via email */}
              <div className="flex gap-2 items-center p-3 bg-zinc-900/50 rounded border border-zinc-800">
                <Mail size={14} className="text-zinc-500 flex-shrink-0" />
                <Input
                  value={recipientEmail}
                  onChange={e => setRecipientEmail(e.target.value)}
                  placeholder="recipient@email.com"
                  className="bg-transparent border-0 text-zinc-300 text-xs p-0 h-auto focus-visible:ring-0"
                />
                <Button size="sm" onClick={sendEmail} disabled={sendingEmail || !recipientEmail}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs flex-shrink-0">
                  {sendingEmail ? <Loader2 size={11} className="animate-spin" /> : 'Send'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}