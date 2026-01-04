import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar, Mail, DollarSign, Cloud, Webhook, Copy, Check } from 'lucide-react';
import ScreenContainer from '@/components/layout/ScreenContainer';
import PageHeader from '@/components/ui/PageHeader';
import { toast } from '@/components/ui/notifications';

export default function Integrations() {
  const [webhookUrl] = useState(`${window.location.origin}/api/webhookReceiver`);
  const [copied, setCopied] = useState(false);

  const syncCalendarMutation = useMutation({
    mutationFn: ({ action, task_id, meeting_id }) => 
      base44.functions.invoke('calendarSync', { action, task_id, meeting_id }),
    onSuccess: () => toast.success('Calendar synced'),
    onError: () => toast.error('Calendar sync failed')
  });

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Webhook URL copied');
  };

  const integrations = [
    {
      id: 'google-calendar',
      name: 'Google Calendar',
      icon: Calendar,
      status: 'connected',
      description: 'Sync tasks and meetings to Google Calendar',
      features: ['Auto-sync tasks', 'Meeting invites', 'Two-way sync']
    },
    {
      id: 'email',
      name: 'Email Integration',
      icon: Mail,
      status: 'available',
      description: 'Create RFIs and tasks from email',
      features: ['Email to RFI', 'Email to task', 'Notifications']
    },
    {
      id: 'quickbooks',
      name: 'QuickBooks',
      icon: DollarSign,
      status: 'available',
      description: 'Sync invoices and expenses',
      features: ['Invoice sync', 'Expense tracking', 'Job costing']
    },
    {
      id: 'weather',
      name: 'Weather Service',
      icon: Cloud,
      status: 'connected',
      description: 'Real-time weather forecasts and alerts',
      features: ['7-day forecast', 'Risk alerts', 'Task flagging']
    },
    {
      id: 'webhooks',
      name: 'Webhook API',
      icon: Webhook,
      status: 'connected',
      description: 'External system integration',
      features: ['Delivery notifications', 'RFI responses', 'Drawing approvals']
    }
  ];

  return (
    <ScreenContainer>
      <PageHeader 
        title="Integrations" 
        subtitle="Connect external systems and automate workflows"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {integrations.map(integration => {
          const Icon = integration.icon;
          return (
            <Card key={integration.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2">
                    <Icon size={18} />
                    {integration.name}
                  </span>
                  <Badge 
                    variant="outline" 
                    className={integration.status === 'connected' 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-muted text-muted-foreground'
                    }
                  >
                    {integration.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{integration.description}</p>
                <div className="space-y-1">
                  {integration.features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <Check size={12} className="text-green-500" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                {integration.status === 'available' && (
                  <Button variant="outline" className="w-full" disabled>
                    Setup Required
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Webhook Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Webhook Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Use this webhook URL to receive notifications from external systems:
            </p>
            <div className="flex gap-2">
              <Input 
                value={webhookUrl} 
                readOnly 
                className="font-mono text-xs"
              />
              <Button variant="outline" size="icon" onClick={copyWebhookUrl}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </Button>
            </div>
          </div>

          <div className="p-3 bg-secondary rounded-lg text-sm space-y-2">
            <p className="font-medium">Supported Events:</p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>• <code>delivery_notification</code> - External delivery tracking</li>
              <li>• <code>rfi_response</code> - RFI answers from GC systems</li>
              <li>• <code>invoice_approval</code> - Accounting system approvals</li>
              <li>• <code>drawing_approval</code> - Engineer approval notifications</li>
            </ul>
          </div>

          <div className="p-3 bg-amber-500/10 rounded-lg text-xs">
            <p className="text-amber-400 font-medium mb-1">Security:</p>
            <p className="text-muted-foreground">
              Set WEBHOOK_SECRET environment variable to enable signature verification
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Example Payloads */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Example Webhook Payloads</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs font-medium mb-2">Delivery Notification:</p>
            <pre className="p-3 bg-muted rounded text-[10px] overflow-x-auto">
{`{
  "event_type": "delivery_notification",
  "data": {
    "project_id": "proj_123",
    "date": "2026-01-15",
    "tonnage": 25.5,
    "pieces": 42,
    "tracking_number": "DEL-2024-001"
  }
}`}
            </pre>
          </div>
          <div>
            <p className="text-xs font-medium mb-2">RFI Response:</p>
            <pre className="p-3 bg-muted rounded text-[10px] overflow-x-auto">
{`{
  "event_type": "rfi_response",
  "data": {
    "rfi_number": 5,
    "response": "Approved as submitted. Proceed with fabrication."
  }
}`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </ScreenContainer>
  );
}