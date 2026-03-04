/**
 * SBPForm — compact form primitives for SteelBuild-Pro
 *
 * Exports:
 *   SBPInput        — text / number / date input
 *   SBPSelect       — native <select> wrapper
 *   SBPTextarea     — compact textarea
 *   SBPFileUpload   — drawings / document file picker
 *   SBPField        — label + input + error wrapper
 *   SBPFormRow      — horizontal field grouping (2-col grid)
 *
 * Usage:
 *   <SBPField label="RFI #" required error={errors.rfi_number}>
 *     <SBPInput
 *       value={form.rfi_number}
 *       onChange={e => setForm({ ...form, rfi_number: e.target.value })}
 *       placeholder="001"
 *     />
 *   </SBPField>
 *
 *   <SBPField label="Drawing Files">
 *     <SBPFileUpload
 *       accept=".pdf,.dwg,.dxf"
 *       multiple
 *       onFiles={files => setAttachments(files)}
 *     />
 *   </SBPField>
 */
import React, { useRef, useState } from 'react';
import { AlertCircle, Upload, X, FileText } from 'lucide-react';

// ── Shared token shortcuts ──────────────────────────────────────────────────
const BASE_INPUT = {
  background: '#0D1117',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 8,
  color: 'rgba(255,255,255,0.85)',
  fontSize: '0.78rem',
  padding: '5px 10px',
  width: '100%',
  outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  boxSizing: 'border-box',
};
const FOCUS_STYLE = { borderColor: 'rgba(255,90,31,0.5)', boxShadow: '0 0 0 3px rgba(255,90,31,0.1)' };
const ERROR_STYLE = { borderColor: 'rgba(255,77,77,0.5)', boxShadow: '0 0 0 3px rgba(255,77,77,0.08)' };

function useFocus(error) {
  const [focused, setFocused] = useState(false);
  const extraStyle = error ? ERROR_STYLE : focused ? FOCUS_STYLE : {};
  return { extraStyle, setFocused };
}

// ── SBPInput ────────────────────────────────────────────────────────────────
export function SBPInput({ error, className = '', style = {}, compact = false, ...props }) {
  const { extraStyle, setFocused } = useFocus(error);
  return (
    <input
      {...props}
      onFocus={e => { setFocused(true); props.onFocus?.(e); }}
      onBlur={e => { setFocused(false); props.onBlur?.(e); }}
      style={{ ...BASE_INPUT, height: compact ? 28 : 32, ...extraStyle, ...style }}
      className={className}
      aria-invalid={!!error}
    />
  );
}

// ── SBPSelect ───────────────────────────────────────────────────────────────
export function SBPSelect({ error, children, placeholder, compact = false, style = {}, ...props }) {
  const { extraStyle, setFocused } = useFocus(error);
  return (
    <select
      {...props}
      onFocus={e => { setFocused(true); props.onFocus?.(e); }}
      onBlur={e => { setFocused(false); props.onBlur?.(e); }}
      style={{
        ...BASE_INPUT, height: compact ? 28 : 32, cursor: 'pointer',
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='rgba(255,255,255,0.3)'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 10px center',
        paddingRight: 28,
        ...extraStyle, ...style,
      }}
      aria-invalid={!!error}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {children}
    </select>
  );
}

// ── SBPTextarea ─────────────────────────────────────────────────────────────
export function SBPTextarea({ error, rows = 3, style = {}, ...props }) {
  const { extraStyle, setFocused } = useFocus(error);
  return (
    <textarea
      rows={rows}
      {...props}
      onFocus={e => { setFocused(true); props.onFocus?.(e); }}
      onBlur={e => { setFocused(false); props.onBlur?.(e); }}
      style={{ ...BASE_INPUT, height: 'auto', padding: '6px 10px', resize: 'vertical', ...extraStyle, ...style }}
      aria-invalid={!!error}
    />
  );
}

// ── SBPFileUpload ───────────────────────────────────────────────────────────
export function SBPFileUpload({
  accept = '.pdf,.dwg,.dxf,.xlsx,.docx',
  multiple = false,
  onFiles,
  label = 'Drop drawings here or click to browse',
  hint,
  error,
  maxMB = 50,
}) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState([]);

  const handleFiles = (incoming) => {
    const valid = Array.from(incoming).filter(f => f.size <= maxMB * 1024 * 1024);
    const next = multiple ? [...files, ...valid] : valid.slice(0, 1);
    setFiles(next);
    onFiles?.(next);
  };

  const remove = (i) => {
    const next = files.filter((_, idx) => idx !== i);
    setFiles(next);
    onFiles?.(next);
  };

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="File upload area"
        onClick={() => inputRef.current?.click()}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        style={{
          border: `1.5px dashed ${error ? 'rgba(255,77,77,0.4)' : dragging ? 'rgba(255,90,31,0.6)' : 'rgba(255,255,255,0.12)'}`,
          borderRadius: 10,
          background: dragging ? 'rgba(255,90,31,0.05)' : 'rgba(255,255,255,0.02)',
          padding: '14px 16px',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          transition: 'all 0.15s',
          outline: 'none',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = 'rgba(255,90,31,0.5)'; }}
        onBlur={e => { e.currentTarget.style.borderColor = error ? 'rgba(255,77,77,0.4)' : 'rgba(255,255,255,0.12)'; }}
      >
        <Upload size={18} style={{ color: dragging ? '#FF8C42' : 'rgba(255,255,255,0.3)' }} />
        <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>{label}</span>
        {hint && <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.28)' }}>{hint}</span>}
        {!hint && (
          <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.25)' }}>
            {accept} · Max {maxMB}MB
          </span>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        style={{ display: 'none' }}
        onChange={e => handleFiles(e.target.files)}
      />

      {files.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {files.map((f, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px',
              borderRadius: 7, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <FileText size={12} style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
              <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {f.name}
              </span>
              <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
                {(f.size / 1024 / 1024).toFixed(1)} MB
              </span>
              <button
                onClick={e => { e.stopPropagation(); remove(i); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── SBPField (label + child + error) ────────────────────────────────────────
export function SBPField({ label, required = false, error, hint, children, className = '' }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label style={{
          fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.07em',
          textTransform: 'uppercase', color: error ? '#FF6B6B' : 'rgba(255,255,255,0.45)',
          display: 'flex', alignItems: 'center', gap: 3,
        }}>
          {label}
          {required && <span style={{ color: '#FF5A1F' }}>*</span>}
        </label>
      )}
      {children}
      {hint && !error && (
        <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.28)' }}>{hint}</span>
      )}
      {error && (
        <span style={{ fontSize: '0.65rem', color: '#FF6B6B', display: 'flex', alignItems: 'center', gap: 4 }}>
          <AlertCircle size={10} style={{ flexShrink: 0 }} />
          {error}
        </span>
      )}
    </div>
  );
}

// ── SBPFormRow (2-col grid for compact layout) ───────────────────────────────
export function SBPFormRow({ children, cols = 2 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '10px 12px' }}>
      {children}
    </div>
  );
}