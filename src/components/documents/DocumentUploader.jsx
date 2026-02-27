import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

const CATEGORIES = [
  { value: 'drawing', label: 'Drawing' },
  { value: 'specification', label: 'Specification' },
  { value: 'rfi', label: 'RFI' },
  { value: 'submittal', label: 'Submittal' },
  { value: 'contract', label: 'Contract' },
  { value: 'report', label: 'Report' },
  { value: 'correspondence', label: 'Correspondence' },
  { value: 'safety_form', label: 'Safety Form' },
  { value: 'photo', label: 'Photo' },
  { value: 'other', label: 'Other' },
];

export default function DocumentUploader({ projectId, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('other');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 50 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'File size exceeds 50MB limit' });
        return;
      }
      setFile(selectedFile);
      if (!title) setTitle(selectedFile.name.split('.')[0]);
      setMessage(null);
    }
  };

  const handleUpload = async () => {
    if (!file || !title || !category) {
      setMessage({ type: 'error', text: 'Please fill all required fields' });
      return;
    }

    setUploading(true);
    try {
      // Upload file
      const uploadRes = await base44.integrations.Core.UploadFile({ file });
      const fileUrl = uploadRes.file_url;

      // Create document record
      await base44.entities.Document.create({
        project_id: projectId,
        title,
        description,
        category,
        file_url: fileUrl,
        file_name: file.name,
        file_size: file.size,
        status: 'draft',
        workflow_stage: 'uploaded',
        version: 1,
      });

      setMessage({ type: 'success', text: 'Document uploaded successfully' });
      setFile(null);
      setTitle('');
      setDescription('');
      setCategory('other');
      
      setTimeout(() => onUploadSuccess?.(), 1500);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">Upload New Document</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Drop Area */}
        <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer"
             onDrop={(e) => { e.preventDefault(); handleFileSelect({ target: { files: e.dataTransfer.files } }); }}
             onDragOver={(e) => e.preventDefault()}>
          <input
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            id="file-input"
          />
          <label htmlFor="file-input" className="cursor-pointer">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-white font-medium mb-1">
              {file ? file.name : 'Drag & drop files or click to select'}
            </p>
            <p className="text-gray-400 text-sm">PDF, DWG, XLS, DOC, Images, up to 50MB</p>
          </label>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Document Title *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Structural Drawing S-101"
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Category *</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add context or notes about this document..."
              className="bg-gray-700 border-gray-600 text-white h-24"
            />
          </div>
        </div>

        {/* Status Message */}
        {message && (
          <div className={`p-4 rounded-lg flex gap-3 ${message.type === 'error' ? 'bg-red-900/30 border border-red-700' : 'bg-green-900/30 border border-green-700'}`}>
            {message.type === 'error' 
              ? <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              : <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
            }
            <p className={message.type === 'error' ? 'text-red-300' : 'text-green-300'}>{message.text}</p>
          </div>
        )}

        {/* Upload Button */}
        <Button 
          onClick={handleUpload}
          disabled={!file || !title || uploading}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Upload Document
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}