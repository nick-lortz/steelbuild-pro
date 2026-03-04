/**
 * CompactPageShell — shared shell for dense SBP pages.
 * Provides a slim sticky filter bar + scrollable content area.
 */
import React from 'react';

export function CompactHeader({ left, right, className = '' }) {
  return (
    <div
      className={`flex items-center justify-between gap-3 px-4 py-2 border-b sticky top-0 z-20 flex-wrap gap-y-2 ${className}`}
      style={{
        borderColor: 'rgba(255,255,255,0.06)',
        background: 'rgba(13,17,23,0.97)',
        backdropFilter: 'blur(12px)',
        minHeight: 44,
      }}
    >
      <div className="flex items-center gap-2 flex-wrap">{left}</div>
      <div className="flex items-center gap-2 flex-wrap">{right}</div>
    </div>
  );
}

export function CompactFilterBar({ children }) {
  return (
    <div
      className="flex items-center gap-2 px-4 py-1.5 border-b flex-wrap"
      style={{
        borderColor: 'rgba(255,255,255,0.04)',
        background: 'rgba(255,255,255,0.015)',
        minHeight: 38,
      }}
    >
      {children}
    </div>
  );
}

export function CompactKPIStrip({ items }) {
  return (
    <div
      className="flex items-center gap-0 border-b overflow-x-auto"
      style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}
    >
      {items.map((item, i) => (
        <div
          key={i}
          className="flex flex-col items-center justify-center px-5 py-2 flex-shrink-0"
          style={{ borderRight: i < items.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', minWidth: 100 }}
        >
          <span style={{ fontSize: '1rem', fontWeight: 700, color: item.color || 'rgba(255,255,255,0.88)', lineHeight: 1.2 }}>
            {item.value}
          </span>
          <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Compact table row — 28px height target */
export function DenseTable({ columns, rows, onRowClick, emptyMessage = 'No records' }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ fontSize: '0.72rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {columns.map((col, i) => (
              <th
                key={i}
                className={col.className || ''}
                style={{
                  padding: '5px 10px',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.3)',
                  fontSize: '0.6rem',
                  textAlign: col.align || 'left',
                  whiteSpace: 'nowrap',
                  background: 'rgba(255,255,255,0.02)',
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ padding: '24px 12px', textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '0.75rem' }}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, ri) => (
              <tr
                key={ri}
                onClick={() => onRowClick?.(row)}
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                  cursor: onRowClick ? 'pointer' : 'default',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                {columns.map((col, ci) => (
                  <td
                    key={ci}
                    className={col.cellClassName || ''}
                    style={{ padding: '5px 10px', color: 'rgba(255,255,255,0.75)', textAlign: col.align || 'left', whiteSpace: col.wrap ? 'normal' : 'nowrap' }}
                  >
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function StatusPill({ status, colorMap = {} }) {
  const defaults = {
    active: 'rgba(77,214,164,0.15)',
    open: 'rgba(77,163,255,0.15)',
    critical: 'rgba(255,77,77,0.15)',
    high: 'rgba(255,77,77,0.12)',
    medium: 'rgba(255,177,90,0.12)',
    low: 'rgba(255,255,255,0.06)',
    answered: 'rgba(77,214,164,0.12)',
    closed: 'rgba(255,255,255,0.06)',
    submitted: 'rgba(77,163,255,0.12)',
    draft: 'rgba(255,255,255,0.05)',
    approved: 'rgba(77,214,164,0.15)',
    rejected: 'rgba(255,77,77,0.15)',
    pending: 'rgba(255,177,90,0.12)',
    IFA: 'rgba(77,163,255,0.12)',
    BFA: 'rgba(255,177,90,0.12)',
    BFS: 'rgba(255,177,90,0.1)',
    FFF: 'rgba(77,214,164,0.15)',
    in_progress: 'rgba(77,163,255,0.12)',
    on_hold: 'rgba(255,177,90,0.12)',
    completed: 'rgba(77,214,164,0.15)',
    bidding: 'rgba(255,177,90,0.1)',
    awarded: 'rgba(77,214,164,0.1)',
  };
  const bg = colorMap[status] || defaults[status] || 'rgba(255,255,255,0.06)';
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '1px 7px',
      borderRadius: 999,
      background: bg,
      fontSize: '0.6rem',
      fontWeight: 700,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.75)',
      whiteSpace: 'nowrap',
    }}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
}

export function InlineAction({ label, onClick, variant = 'ghost', ariaLabel }) {
  const styles = {
    ghost: { color: 'rgba(255,255,255,0.35)', background: 'transparent' },
    accent: { color: '#FF8C42', background: 'rgba(255,90,31,0.1)' },
    danger: { color: '#FF4D4D', background: 'rgba(255,77,77,0.08)' },
  };
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick?.(); }}
      aria-label={ariaLabel || label}
      style={{
        fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
        padding: '2px 7px', borderRadius: 5, border: 'none', cursor: 'pointer',
        transition: 'all 0.15s',
        ...styles[variant],
      }}
      onMouseEnter={e => { e.currentTarget.style.opacity = '0.8'; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
    >
      {label}
    </button>
  );
}

export default function CompactPageShell({ children }) {
  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', background: 'transparent' }}>
      {children}
    </div>
  );
}