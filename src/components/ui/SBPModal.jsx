/**
 * SBPModal — focus-trapped confirmation & form modals
 *
 * Exports:
 *   SBPModal         — base modal shell with focus trap + Escape close
 *   SBPConfirmModal  — standardized confirm/destructive prompt
 *
 * Usage — confirm:
 *   <SBPConfirmModal
 *     open={showDelete}
 *     onOpenChange={setShowDelete}
 *     title="Delete Drawing Set?"
 *     description="DS-007 and all revisions will be permanently removed. This cannot be undone."
 *     confirmLabel="Delete"
 *     confirmVariant="danger"
 *     onConfirm={() => { deleteDrawingSet(id); setShowDelete(false); }}
 *   />
 *
 * Usage — form modal:
 *   <SBPModal open={showForm} onOpenChange={setShowForm} title="New RFI" size="lg">
 *     <RFIFormContent ... />
 *   </SBPModal>
 */
import React, { useEffect, useRef } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import SBPButton from './SBPButton';

const SIZE_WIDTH = { sm: 400, md: 520, lg: 700, xl: 900, full: '95vw' };

export function SBPModal({ open, onOpenChange, title, size = 'md', children, hideClose = false }) {
  const modalRef = useRef(null);
  const previousFocus = useRef(null);

  useEffect(() => {
    if (open) {
      previousFocus.current = document.activeElement;
      setTimeout(() => {
        const first = modalRef.current?.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        first?.focus();
      }, 50);
    } else {
      previousFocus.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape') onOpenChange?.(false);
      if (e.key === 'Tab') {
        const focusable = modalRef.current?.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable?.length) return;
        const first = focusable[0];
        const last  = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onOpenChange]);

  if (!open) return null;

  const width = SIZE_WIDTH[size] || SIZE_WIDTH.md;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
        padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onOpenChange?.(false); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sbp-modal-title"
    >
      <div
        ref={modalRef}
        style={{
          width, maxWidth: '100%', maxHeight: '90vh',
          display: 'flex', flexDirection: 'column',
          background: '#14181E', borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.09)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.75)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)',
          flexShrink: 0,
        }}>
          <h2 id="sbp-modal-title" style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
            {title}
          </h2>
          {!hideClose && (
            <button
              onClick={() => onOpenChange?.(false)}
              aria-label="Close"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,0.35)', borderRadius: 6, padding: 4,
                display: 'flex', alignItems: 'center', transition: 'color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export function SBPConfirmModal({
  open,
  onOpenChange,
  title = 'Are you sure?',
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'primary',
  onConfirm,
  loading = false,
  destructive = false,
}) {
  return (
    <SBPModal open={open} onOpenChange={onOpenChange} title={title} size="sm" hideClose>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {destructive && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px',
            background: 'rgba(255,77,77,0.08)', borderRadius: 10, border: '1px solid rgba(255,77,77,0.2)',
          }}>
            <AlertTriangle size={16} style={{ color: '#FF4D4D', flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
              {description}
            </span>
          </div>
        )}
        {!destructive && description && (
          <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
            {description}
          </p>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <SBPButton variant="ghost" size="sm" onClick={() => onOpenChange?.(false)}>
            {cancelLabel}
          </SBPButton>
          <SBPButton
            variant={destructive ? 'danger' : confirmVariant}
            size="sm"
            loading={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </SBPButton>
        </div>
      </div>
    </SBPModal>
  );
}

export default SBPModal;