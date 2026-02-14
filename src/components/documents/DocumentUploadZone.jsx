import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Loader2, File } from 'lucide-react';
import { toast } from '@/components/ui/notifications';

export default function DocumentUploadZone({ projectId, open, onClose, onUploadComplete }) {
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'other',
    phase: '',
    folder_path: '/',
    file_url: '',
    file_name: '',
    file_size: 0
  });

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({
        ...prev,
        file_url,
        file_name: file.name,
        file_size: file.size,
        title: prev.title || file.name.replace(/\.[^/.]+$/, '')
      }));
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await base44.entities.Document.create({
        project_id: projectId,
        ...formData,
        status: 'issued',
        workflow_stage: 'uploaded'
      });
      
      toast.success('Document uploaded');
      onUploadComplete();
      setFormData({
        title: '',
        description: '',
        category: 'other',
        phase: '',
        folder_path: '/',
        file_url: '',
        file_name: '',
        file_size: 0
      });
    } catch (error) {
      toast.error('Failed to save document');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl bg-zinc-900 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Upload */}
          <div className="border-2 border-dashed border-zinc-700 rounded-lg p-6 text-center hover:border-amber-500 transition-colors">
            <input
              type="file"
              id="doc-upload"
              onChange={handleFileSelect}
              className="hidden"
              required={!formData.file_url}
            />
            <label htmlFor="doc-upload" className="cursor-pointer">
              {uploading ? (
                <div className="flex flex-col items-center">
                  <Loader2 size={32} className="mb-2 animate-spin text-amber-500" />
                  <p className="text-zinc-400">Uploading...</p>
                </div>
              ) : formData.file_url ? (
                <div className="flex flex-col items-center">
                  <File size={32} className="mb-2 text-green-500" />
                  <p className="text-green-400 text-sm">{formData.file_name}</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {(formData.file_size / 1024).toFixed(2)} KB
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <Upload size={32} className="mb-2 text-zinc-500" />
                  <p className="text-zinc-400">Click to upload</p>
                  <p className="text-xs text-zinc-500 mt-1">PDF, images, or office docs</p>
                </div>
              )}
            </label>
          </div>

          <div className="space-y-2">
            <Label>Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Document title"
              required
              className="bg-zinc-800 border-zinc-700"
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="bg-zinc-800 border-zinc-700"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="drawing">Drawing</SelectItem>
                  <SelectItem value="specification">Specification</SelectItem>
                  <SelectItem value="rfi">RFI</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="report">Report</SelectItem>
                  <SelectItem value="photo">Photo</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Phase</Label>
              <Select value={formData.phase} onValueChange={(v) => setFormData({ ...formData, phase: v })}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>None</SelectItem>
                  <SelectItem value="detailing">Detailing</SelectItem>
                  <SelectItem value="fabrication">Fabrication</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                  <SelectItem value="erection">Erection</SelectItem>
                  <SelectItem value="closeout">Closeout</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Folder Path</Label>
            <Input
              value={formData.folder_path}
              onChange={(e) => setFormData({ ...formData, folder_path: e.target.value })}
              placeholder="/Drawings/Structural"
              className="bg-zinc-800 border-zinc-700 font-mono text-xs"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-zinc-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={uploading || !formData.file_url}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              Save Document
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}