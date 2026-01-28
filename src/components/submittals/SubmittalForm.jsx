import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import DocumentUploader from '@/components/documents/DocumentUploader';

export default function SubmittalForm({ projectId, rfis = [], sovItems = [], onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'shop_drawing',
    priority: 'medium',
    due_date: '',
    reviewer: '',
    linked_rfi_id: '',
    linked_drawing_set_ids: [],
    file_urls: [],
    hold_points: []
  });

  const [documents, setDocuments] = useState([]);

  const handleDocumentsAdded = (newDocs) => {
    setDocuments([...documents, ...newDocs]);
    setFormData(prev => ({
      ...prev,
      file_urls: [...(prev.file_urls || []), ...newDocs.map(d => d.file_url)]
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title) {
      alert('Title required');
      return;
    }
    onSubmit({
      ...formData,
      submitted_by: 'current_user@email.com',
      submitted_date: new Date().toISOString().split('T')[0]
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Title *</Label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g., Structural Details - Level 3"
          className="bg-zinc-800 border-zinc-700"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Detail what's being submitted..."
          rows={3}
          className="bg-zinc-800 border-zinc-700"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Type *</Label>
          <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="shop_drawing">Shop Drawing</SelectItem>
              <SelectItem value="material">Material Certificate</SelectItem>
              <SelectItem value="equipment">Equipment Data</SelectItem>
              <SelectItem value="certification">Certification</SelectItem>
              <SelectItem value="test_report">Test Report</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Priority</Label>
          <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Due Date</Label>
          <Input
            type="date"
            value={formData.due_date}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            className="bg-zinc-800 border-zinc-700"
          />
        </div>

        <div className="space-y-2">
          <Label>Reviewer Email</Label>
          <Input
            type="email"
            value={formData.reviewer}
            onChange={(e) => setFormData({ ...formData, reviewer: e.target.value })}
            placeholder="reviewer@email.com"
            className="bg-zinc-800 border-zinc-700"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Link to RFI (optional)</Label>
        <Select value={formData.linked_rfi_id} onValueChange={(v) => setFormData({ ...formData, linked_rfi_id: v })}>
          <SelectTrigger className="bg-zinc-800 border-zinc-700">
            <SelectValue placeholder="Select RFI" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>None</SelectItem>
            {rfis.map(rfi => (
              <SelectItem key={rfi.id} value={rfi.id}>
                RFI-{rfi.rfi_number}: {rfi.subject}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="bg-zinc-800/50 border-zinc-700">
        <CardContent className="p-4 space-y-3">
          <h4 className="text-sm font-medium">Upload Documents</h4>
          <DocumentUploader onDocumentsAdded={handleDocumentsAdded} />
          {documents.length > 0 && (
            <div className="text-xs text-green-400">
              {documents.length} document(s) ready to upload
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2 pt-4 border-t border-zinc-700">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-black">
          Create Submittal
        </Button>
      </div>
    </form>
  );
}