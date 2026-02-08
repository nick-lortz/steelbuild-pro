import React, { useState } from 'react';
import { Upload, Loader2, Sparkles } from 'lucide-react';

export default function DocumentUploadZone({ onUpload, isLoading, multiple = true, autoProcessAI = false }) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) onUpload(files);
  };

  return (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
        dragActive
          ? 'border-amber-500 bg-amber-500/5'
          : 'border-zinc-700 hover:border-amber-500/50'
      }`}
    >
      <input
        type="file"
        id="doc-upload"
        onChange={(e) => onUpload(Array.from(e.target.files || []))}
        multiple={multiple}
        className="hidden"
      />
      <label htmlFor="doc-upload" className="cursor-pointer">
        {isLoading ? (
          <div className="flex flex-col items-center">
            <Loader2 size={32} className="mb-2 animate-spin text-amber-500" />
            <p className="text-zinc-400">Uploading...</p>
            {autoProcessAI && (
              <p className="text-xs text-blue-400 mt-1 flex items-center gap-1">
                <Sparkles size={12} />
                AI will auto-extract metadata
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <Upload size={32} className="mb-2 text-zinc-500" />
            <p className="text-zinc-300 font-medium">Click to upload or drag files here</p>
            <p className="text-xs text-zinc-500 mt-1">PDF, DOC, XLS, JPG, PNG (max 50MB)</p>
            {autoProcessAI && (
              <p className="text-xs text-blue-400 mt-2 flex items-center gap-1">
                <Sparkles size={12} />
                AI auto-extraction enabled
              </p>
            )}
          </div>
        )}
      </label>
    </div>
  );
}