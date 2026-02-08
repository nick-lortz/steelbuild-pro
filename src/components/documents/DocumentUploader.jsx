import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { apiClient } from '@/api/client';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, X, File, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/notifications';

export default function DocumentUploader({ onDocumentsAdded, maxFiles = 5, acceptedTypes = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.png' }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (e) => {
    const newFiles = Array.from(e.target.files || []);
    if (files.length + newFiles.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }
    setFiles([...files, ...newFiles]);
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('Select files to upload');
      return;
    }

    setUploading(true);
    try {
      const uploadedDocs = [];
      for (const file of files) {
        const { file_url } = await apiClient.integrations.Core.UploadFile({ file });
        uploadedDocs.push({
          file_url,
          file_name: file.name,
          file_type: file.type,
          uploaded_date: new Date().toISOString()
        });
      }
      onDocumentsAdded(uploadedDocs);
      setFiles([]);
      toast.success(`${uploadedDocs.length} file(s) uploaded`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="border-2 border-dashed border-zinc-700 rounded-lg p-4">
            <label className="flex flex-col items-center gap-2 cursor-pointer">
              <Upload size={20} className="text-zinc-500" />
              <span className="text-xs text-zinc-400">Click to upload or drag files</span>
              <input
                type="file"
                multiple
                onChange={handleFileSelect}
                accept={acceptedTypes}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between bg-zinc-800 p-2 rounded text-xs">
                  <div className="flex items-center gap-2">
                    <File size={14} className="text-zinc-500" />
                    <span className="text-white truncate flex-1">{file.name}</span>
                  </div>
                  <button
                    onClick={() => removeFile(idx)}
                    className="text-zinc-500 hover:text-white"
                    disabled={uploading}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={files.length === 0 || uploading}
            className="w-full bg-amber-500 hover:bg-amber-600 text-black"
            size="sm"
          >
            {uploading ? (
              <>
                <Loader2 size={14} className="mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              'Upload Files'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}