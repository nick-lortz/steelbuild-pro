import React, { useRef, useState } from 'react';
import { Upload, X, FileText, Image, Table, File } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const ACCEPTED = '.pdf,.png,.jpg,.jpeg,.webp,.xlsx,.xls,.dwg,.csv';

function fileIcon(name) {
  const ext = name.split('.').pop()?.toLowerCase();
  if (['png','jpg','jpeg','webp'].includes(ext)) return <Image size={13} />;
  if (['xlsx','xls','csv'].includes(ext)) return <Table size={13} />;
  if (ext === 'pdf') return <FileText size={13} />;
  return <File size={13} />;
}

export default function FileUploadZone({ onFilesReady, disabled }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState([]);
  const [uploaded, setUploaded] = useState([]); // { name, url }

  async function processFiles(files) {
    const pending = Array.from(files);
    setUploading(pending.map(f => f.name));
    const results = [];
    for (const file of pending) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      results.push({ name: file.name, url: file_url });
    }
    setUploading([]);
    const next = [...uploaded, ...results];
    setUploaded(next);
    onFilesReady?.(next);
  }

  function remove(idx) {
    const next = uploaded.filter((_, i) => i !== idx);
    setUploaded(next);
    onFilesReady?.(next);
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); processFiles(e.dataTransfer.files); }}
        onClick={() => !disabled && inputRef.current?.click()}
        className="flex flex-col items-center justify-center gap-1.5 px-4 py-5 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-150"
        style={{
          borderColor: dragging ? 'rgba(255,90,31,0.50)' : 'rgba(255,255,255,0.10)',
          background: dragging ? 'rgba(255,90,31,0.05)' : 'rgba(255,255,255,0.02)',
        }}
      >
        <Upload size={18} style={{ color: dragging ? '#FF5A1F' : 'rgba(255,255,255,0.30)' }} />
        <p className="text-[0.72rem] text-[rgba(255,255,255,0.40)] text-center">
          Drop PDF, DWG, XLSX, or images · or <span style={{ color: '#FF5A1F' }}>browse</span>
        </p>
        <input ref={inputRef} type="file" multiple accept={ACCEPTED} className="hidden"
          onChange={e => { processFiles(e.target.files); e.target.value = ''; }}
        />
      </div>

      {/* Uploading indicator */}
      {uploading.length > 0 && (
        <div className="flex flex-col gap-1">
          {uploading.map((name, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.03)]">
              <div className="w-3 h-3 rounded-full border-2 border-[#FF5A1F] border-t-transparent animate-spin" />
              <span className="text-[0.7rem] text-[rgba(255,255,255,0.40)] truncate">{name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Uploaded files */}
      {uploaded.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {uploaded.map((f, i) => (
            <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.06)]">
              <span style={{ color: 'rgba(255,255,255,0.40)' }}>{fileIcon(f.name)}</span>
              <span className="text-[0.68rem] text-[rgba(255,255,255,0.65)] max-w-[120px] truncate">{f.name}</span>
              <button onClick={() => remove(i)} className="text-[rgba(255,255,255,0.25)] hover:text-[#FF4D4D] transition-colors" aria-label={`Remove ${f.name}`}>
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}