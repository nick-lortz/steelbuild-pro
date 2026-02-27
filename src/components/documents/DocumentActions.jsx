import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Share2, Mail, Copy, CheckCircle } from 'lucide-react';

export default function DocumentActions({ document, onClose }) {
  const [activeTab, setActiveTab] = useState('share');
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleCopyLink = () => {
    const link = document.file_url;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendEmail = async () => {
    if (!email) {
      alert('Please enter an email address');
      return;
    }

    setSending(true);
    try {
      const emailBody = `
        I'm sharing the document: ${document.title}
        
        File: ${document.file_name}
        Category: ${document.category}
        
        ${message ? 'Message: ' + message : ''}
        
        Download: ${document.file_url}
      `;

      await base44.integrations.Core.SendEmail({
        to: email,
        subject: `Shared Document: ${document.title}`,
        body: emailBody,
      });

      alert('Email sent successfully');
      setEmail('');
      setMessage('');
      onClose?.();
    } catch (error) {
      alert('Failed to send email: ' + error.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-gray-800 border-gray-700 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share Document
          </DialogTitle>
          <DialogDescription className="text-gray-400">{document.title}</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-gray-700 border-b border-gray-600">
            <TabsTrigger value="share">Copy Link</TabsTrigger>
            <TabsTrigger value="email">Send Email</TabsTrigger>
          </TabsList>

          {/* Copy Link Tab */}
          <TabsContent value="share" className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Document Link</label>
              <div className="flex gap-2">
                <Input
                  value={document.file_url}
                  readOnly
                  className="bg-gray-700 border-gray-600 text-gray-300 text-sm"
                />
                <Button
                  onClick={handleCopyLink}
                  className={copied ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}
                  size="sm"
                >
                  {copied ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-400">
                {copied ? '✓ Link copied to clipboard' : 'Click to copy the document link'}
              </p>
            </div>

            <div className="bg-gray-700/50 border border-gray-600 rounded p-3">
              <p className="text-xs text-gray-300">
                <strong>File:</strong> {document.file_name}
              </p>
              <p className="text-xs text-gray-300 mt-1">
                <strong>Status:</strong> {document.status || 'draft'}
              </p>
            </div>
          </TabsContent>

          {/* Email Tab */}
          <TabsContent value="email" className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Recipient Email *</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Message (Optional)</label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a message with the document..."
                className="bg-gray-700 border-gray-600 text-white h-20"
              />
            </div>

            <Button
              onClick={handleSendEmail}
              disabled={!email || sending}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Mail className="w-4 h-4 mr-2" />
              {sending ? 'Sending...' : 'Send Email'}
            </Button>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t border-gray-600">
          <Button variant="outline" onClick={onClose} className="border-gray-600 text-gray-300">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}