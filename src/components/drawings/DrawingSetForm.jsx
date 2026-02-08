import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from '@/api/base44Client';
import { apiClient } from '@/api/client';
import { Upload, X, FileText, Loader2 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

export default function DrawingSetForm({ projects, projectId, drawingSet, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState({
    project_id: drawingSet?.project_id || projectId || '',
    set_name: drawingSet?.set_name || '',
    set_number: drawingSet?.set_number || '',
    current_revision: drawingSet?.current_revision || 'Rev 0',
    status: drawingSet?.status || 'IFA',
    discipline: drawingSet?.discipline || 'structural',
    ifa_date: drawingSet?.ifa_date || '',
    bfa_date: drawingSet?.bfa_date || '',
    bfs_date: drawingSet?.bfs_date || '',
    released_for_fab_date: drawingSet?.released_for_fab_date || '',
    due_date: drawingSet?.due_date || '',
    reviewer: drawingSet?.reviewer || '',
    notes: drawingSet?.notes || '',
  });

  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState([]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFilesDrop = async (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer?.files || e.target?.files || []);
    const pdfFiles = droppedFiles.filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
    
    if (pdfFiles.length !== droppedFiles.length) {
      alert('Only PDF files are allowed');
    }
    
    setFiles(prev => [...prev, ...pdfFiles]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const setData = {
      ...formData,
      sheet_count: files.length,
      ai_review_status: files.length > 0 ? 'pending' : 'completed',
    };

    // Just pass the data up - let parent handle creation
    onSubmit(setData);
  };

  const queueAIReview = async (setId, fileUrl, fileName) => {
    // Run AI review asynchronously (doesn't block)
    try {
      const prompt = `Review this construction drawing and provide a brief summary of:
1. Drawing type and purpose
2. Key dimensions or specifications
3. Any notable callouts or details
4. Potential issues or areas needing clarification

Keep the summary concise (2-3 sentences).`;

      const response = await apiClient.integrations.Core.InvokeLLM({
        prompt,
        file_urls: [fileUrl],
      });

      // Update the sheet with AI findings
      const sheets = await apiClient.entities.DrawingSheet.filter({ 
        drawing_set_id: setId,
        file_name: fileName 
      });

      if (sheets.length > 0) {
        await apiClient.entities.DrawingSheet.update(sheets[0].id, {
          ai_reviewed: true,
          ai_findings: response,
        });
      }
    } catch (error) {
      console.error('AI review failed for', fileName, error);
      // Don't fail the whole operation
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        {!projectId && (
          <div className="space-y-2">
            <Label>Project *</Label>
            <Select value={formData.project_id} onValueChange={(v) => handleChange('project_id', v)}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects?.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.project_number} - {p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Set Number</Label>
            <Input
              value={formData.set_number}
              onChange={(e) => handleChange('set_number', e.target.value)}
              placeholder="e.g., S-100"
              className="bg-zinc-800 border-zinc-700 font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label>Revision</Label>
            <Input
              value={formData.current_revision}
              onChange={(e) => handleChange('current_revision', e.target.value)}
              placeholder="e.g., Rev 0"
              className="bg-zinc-800 border-zinc-700 font-mono"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Set Name *</Label>
          <Input
            value={formData.set_name}
            onChange={(e) => handleChange('set_name', e.target.value)}
            placeholder="e.g., Structural Steel - Level 1"
            required
            className="bg-zinc-800 border-zinc-700"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IFA">IFA - Issued for Approval</SelectItem>
                <SelectItem value="BFA">BFA - Back from Approval</SelectItem>
                <SelectItem value="BFS">BFS - Back from Shop</SelectItem>
                <SelectItem value="FFF">FFF - Fit for Fabrication</SelectItem>
                <SelectItem value="As-Built">As-Built</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Discipline</Label>
            <Select value={formData.discipline} onValueChange={(v) => handleChange('discipline', v)}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="structural">Structural</SelectItem>
                <SelectItem value="misc_metals">Misc Metals</SelectItem>
                <SelectItem value="stairs">Stairs</SelectItem>
                <SelectItem value="handrails">Handrails</SelectItem>
                <SelectItem value="connections">Connections</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Milestones */}
      <div className="border-t border-zinc-800 pt-4">
        <h4 className="text-sm font-medium text-zinc-400 mb-3">Milestone Dates</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>IFA Date</Label>
            <Input
              type="date"
              value={formData.ifa_date}
              onChange={(e) => handleChange('ifa_date', e.target.value)}
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
          <div className="space-y-2">
            <Label>BFA Date</Label>
            <Input
              type="date"
              value={formData.bfa_date}
              onChange={(e) => handleChange('bfa_date', e.target.value)}
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
          <div className="space-y-2">
            <Label>BFS Date</Label>
            <Input
              type="date"
              value={formData.bfs_date}
              onChange={(e) => handleChange('bfs_date', e.target.value)}
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
          <div className="space-y-2">
            <Label>Released for Fab</Label>
            <Input
              type="date"
              value={formData.released_for_fab_date}
              onChange={(e) => handleChange('released_for_fab_date', e.target.value)}
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
        </div>
      </div>

      {/* Due Date & Reviewer */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Due Date</Label>
          <Input
            type="date"
            value={formData.due_date}
            onChange={(e) => handleChange('due_date', e.target.value)}
            className="bg-zinc-800 border-zinc-700"
          />
        </div>
        <div className="space-y-2">
          <Label>Reviewer</Label>
          <Input
            value={formData.reviewer}
            onChange={(e) => handleChange('reviewer', e.target.value)}
            placeholder="Assigned reviewer"
            className="bg-zinc-800 border-zinc-700"
          />
        </div>
      </div>

      {/* File Upload (only for new sets) */}
      {!drawingSet && (
        <div className="border-t border-zinc-800 pt-4">
          <Label className="mb-2 block">Upload Drawing Sheets (PDF)</Label>
          <div
            onDrop={handleFilesDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-zinc-700 rounded-lg p-6 text-center hover:border-amber-500/50 transition-colors cursor-pointer"
          >
            <input
              type="file"
              multiple
              accept=".pdf"
              onChange={handleFilesDrop}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload size={32} className="mx-auto text-zinc-500 mb-2" />
              <p className="text-sm text-zinc-400">
                Drag & drop PDF files here, or click to browse
              </p>
              <p className="text-xs text-zinc-600 mt-1">
                Multiple files supported
              </p>
            </label>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-zinc-800 rounded">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-amber-500" />
                    <span className="text-sm">{file.name}</span>
                    <span className="text-xs text-zinc-500">
                      ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                    {uploadProgress[index] && (
                      <Badge variant="outline" className={
                        uploadProgress[index].status === 'done' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                        uploadProgress[index].status === 'error' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      }>
                        {uploadProgress[index].status === 'uploading' && <Loader2 size={10} className="animate-spin mr-1" />}
                        {uploadProgress[index].status}
                      </Badge>
                    )}
                  </div>
                  {!uploading && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile(index)}
                      className="h-6 w-6"
                    >
                      <X size={14} />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          rows={3}
          className="bg-zinc-800 border-zinc-700"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
        <Button type="button" variant="outline" onClick={onCancel} className="border-zinc-700" disabled={uploading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || uploading} className="bg-amber-500 hover:bg-amber-600 text-black">
          {uploading ? (
            <>
              <Loader2 size={16} className="animate-spin mr-2" />
              Uploading...
            </>
          ) : isLoading ? (
            'Saving...'
          ) : drawingSet ? (
            'Update Set'
          ) : (
            'Create Set'
          )}
        </Button>
      </div>
    </form>
  );
}