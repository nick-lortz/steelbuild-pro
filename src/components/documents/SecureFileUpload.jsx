import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Upload, X, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { validateFile, uploadFileSecure, formatBytes, getA11yFileInputProps } from '@/components/shared/fileUpload';
import { handleKeyboardNav, announceToScreenReader } from '@/components/shared/accessibility';
import { Progress } from "@/components/ui/progress";

export default function SecureFileUpload({ 
  onUploadComplete, 
  category = 'documents',
  maxFiles = 10,
  label = 'Upload Files',
  required = false 
}) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    
    if (files.length + selectedFiles.length > maxFiles) {
      announceToScreenReader(`Maximum ${maxFiles} files allowed`, 'assertive');
      setErrors({ general: `Maximum ${maxFiles} files allowed` });
      return;
    }

    const validatedFiles = selectedFiles.map(file => {
      const validation = validateFile(file, category);
      return {
        file,
        id: Math.random().toString(36),
        validation,
        uploaded: false
      };
    });

    setFiles(prev => [...prev, ...validatedFiles]);
    setErrors({});
    
    // Announce to screen reader
    announceToScreenReader(`${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''} selected`);
  };

  const handleUpload = async () => {
    const pendingFiles = files.filter(f => !f.uploaded && f.validation.valid);
    
    if (pendingFiles.length === 0) {
      announceToScreenReader('No valid files to upload', 'assertive');
      return;
    }

    setUploading(true);
    const newErrors = {};
    const uploadedFiles = [];

    for (const item of pendingFiles) {
      try {
        setUploadProgress(prev => ({ ...prev, [item.id]: 0 }));
        
        const result = await uploadFileSecure(
          item.file,
          category,
          (progress) => setUploadProgress(prev => ({ ...prev, [item.id]: progress }))
        );
        
        uploadedFiles.push(result);
        
        setFiles(prev => prev.map(f => 
          f.id === item.id ? { ...f, uploaded: true, result } : f
        ));
        
        announceToScreenReader(`${item.file.name} uploaded successfully`);
      } catch (error) {
        newErrors[item.id] = error.message;
        announceToScreenReader(`Failed to upload ${item.file.name}`, 'assertive');
      }
    }

    setErrors(newErrors);
    setUploading(false);

    if (uploadedFiles.length > 0 && onUploadComplete) {
      onUploadComplete(uploadedFiles);
    }
  };

  const removeFile = (id) => {
    const file = files.find(f => f.id === id);
    setFiles(prev => prev.filter(f => f.id !== id));
    announceToScreenReader(`${file?.file?.name || 'File'} removed`);
  };

  const a11yProps = getA11yFileInputProps('secure-file-upload', label, required);

  return (
    <div className="space-y-4" role="region" aria-label="File upload">
      {/* Upload Button */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept={category === 'images' ? 'image/*' : category === 'drawings' ? '.pdf,.dwg,.dxf' : '*'}
          {...a11yProps}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => handleKeyboardNav(e, () => fileInputRef.current?.click())}
          className="w-full border-dashed border-2 h-24"
          disabled={uploading}
        >
          <div className="flex flex-col items-center gap-2">
            <Upload size={24} />
            <span>{label}</span>
            <span className="text-xs text-muted-foreground">
              Max {maxFiles} files • PDF, DOCX, XLSX, Images
            </span>
          </div>
        </Button>
      </div>

      {/* General Errors */}
      {errors.general && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2" role="alert">
          <AlertCircle size={16} className="text-red-400 mt-0.5" />
          <span className="text-sm text-red-300">{errors.general}</span>
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2" role="list" aria-label="Selected files">
          {files.map((item) => (
            <div
              key={item.id}
              className="p-3 bg-muted rounded-lg"
              role="listitem"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <FileText size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(item.file.size)}</p>
                    
                    {/* Validation Errors */}
                    {!item.validation.valid && (
                      <div className="mt-1 text-xs text-red-400" role="alert">
                        {item.validation.errors.join(', ')}
                      </div>
                    )}
                    
                    {/* Upload Progress */}
                    {uploading && uploadProgress[item.id] !== undefined && !item.uploaded && (
                      <div className="mt-2">
                        <Progress value={uploadProgress[item.id]} className="h-1" />
                      </div>
                    )}
                    
                    {/* Upload Error */}
                    {errors[item.id] && (
                      <div className="mt-1 text-xs text-red-400" role="alert">
                        {errors[item.id]}
                      </div>
                    )}
                    
                    {/* Upload Success */}
                    {item.uploaded && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-green-400">
                        <CheckCircle2 size={12} />
                        Uploaded
                      </div>
                    )}
                  </div>
                </div>
                
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(item.id)}
                  disabled={uploading}
                  className="flex-shrink-0"
                  aria-label={`Remove ${item.file.name}`}
                >
                  <X size={16} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Button */}
      {files.some(f => !f.uploaded && f.validation.valid) && (
        <Button
          onClick={handleUpload}
          disabled={uploading}
          className="w-full"
        >
          {uploading ? 'Uploading...' : `Upload ${files.filter(f => !f.uploaded && f.validation.valid).length} File(s)`}
        </Button>
      )}
    </div>
  );
}