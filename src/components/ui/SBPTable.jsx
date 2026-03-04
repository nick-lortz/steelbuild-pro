/**
 * SBPTable — production-grade dense table with inline row actions
 *
 * Props:
 *   columns: Array<{ key, header, render?, align?, wrap?, sortable?, className?, cellClassName? }>
 *   rows:    Array<object>  (each row needs an `id` for keying if possible)
 *   onRowClick?: (row) => void
 *   rowActions?: (row) => Array<{ label, onClick, variant? }>
 *   density?: 'compact' | 'normal'    — row height 28px vs 36px
 *   selectable?: boolean
 *   selectedIds?: Set<string>
 *   onSelect?: (id) => void
 *   sortKey?: string
 *   sortDir?: 'asc' | 'desc'
 *   onSort?: (key) => void
 *   emptyMessage?: string
 *   loading?: boolean
 *
 * Usage:
 *   <SBPTable
 *     columns={[
 *       { key: 'rfi_number', header: '#', sortable: true },
 *       { key: 'subject',    header: 'Subject', wrap: true },
 *       { key: 'status',     header: 'Status', render: (r) => <StatusPill status={r.status} /> },
 *     ]}
 *     rows={rfis}
 *     density="compact"
 *     onRowClick={(r) => openRFI(r.id)}
 *     rowActions={(r) => [
 *       { label: 'Edit',   onClick: () => editRFI(r),   variant: 'ghost'  },
 *       { label: 'Delete', onClick: () => deleteRFI(r), variant: 'danger' },
 *     ]}
 *   />
 */
import React, { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, MoreHorizontal } from 'lucide-react';

const ROW_PX = { compact: '5px 10px', normal: '8px 12px' };
const TH_PX  = { compact: '5px 10px', normal: '7px 12px' };

function SortIcon({ col, sortKey, sortDir }) {
  if (!col.sortable) return null;
  if (sortKey !== col.key) return <ChevronsUpDown size={10} style={{ color: 'rgba(255,255,255,0.2)', marginLeft: 3, flexShrink: 0 }} />;
  return sortDir === 'asc'
    ? <ChevronUp   size={10} style={{ color: '#FF8C42', marginLeft: 3, flexShrink: 0 }} />
    : <ChevronDown size={10} style={{ color: '#FF8C42', marginLeft: 3, flexShrink: 0 }} />;
}

function RowActionMenu({ actions }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const variantColor = { ghost: 'rgba(255,255,255,0.7)', accent: '#FF8C42', danger: '#FF4D4D' };

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }} onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 22, height: 22, borderRadius: 5,
          background: open ? 'rgba(255,255,255,0.08)' : 'transparent',
          border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)',
          transition: 'all 0.12s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; } }}
      >
        <MoreHorizontal size={13} />
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute', right: 0, top: '100%', marginTop: 3, zIndex: 100,
            background: '#14181E', border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: 10, padding: '4px', minWidth: 120,
            boxShadow: '0 8px 24px rgba(0,0,0,0.55)',
          }}
        >
          {actions.map((a, i) => (
            <button
              key={i}
              role="menuitem"
              onClick={() => { a.onClick(); setOpen(false); }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '5px 10px', borderRadius: 7, border: 'none',
                background: 'transparent', cursor: 'pointer',
                fontSize: '0.7rem', fontWeight: 600,
                color: variantColor[a.variant || 'ghost'],
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SBPTable({
  columns,
  rows = [],
  onRowClick,
  rowActions,
  density = 'compact',
  selectable = false,
  selectedIds = new Set(),
  onSelect,
  sortKey,
  sortDir = 'asc',
  onSort,
  emptyMessage = 'No records found',
  loading = false,
}) {
  const cellPad = ROW_PX[density] || ROW_PX.compact;
  const headPad = TH_PX[density]  || TH_PX.compact;
  const allSelected = rows.length > 0 && rows.every(r => selectedIds.has(r.id));

  return (
    <div className="overflow-x-auto" style={{ fontSize: '0.72rem' }}>
      <table className="w-full border-collapse">
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
            {selectable && (
              <th style={{ padding: headPad, width: 32 }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => rows.forEach(r => onSelect?.(r.id))}
                  style={{ accentColor: '#FF5A1F' }}
                  aria-label="Select all"
                />
              </th>
            )}
            {columns.map((col, i) => (
              <th
                key={i}
                className={col.className || ''}
                onClick={col.sortable && onSort ? () => onSort(col.key) : undefined}
                style={{
                  padding: headPad,
                  fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase',
                  color: sortKey === col.key ? '#FF8C42' : 'rgba(255,255,255,0.28)',
                  fontSize: '0.6rem',
                  textAlign: col.align || 'left',
                  whiteSpace: 'nowrap',
                  cursor: col.sortable ? 'pointer' : 'default',
                  userSelect: 'none',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                  {col.header}
                  <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
                </span>
              </th>
            ))}
            {rowActions && <th style={{ padding: headPad, width: 36 }} />}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)}
                style={{ padding: '20px 12px', textAlign: 'center', color: 'rgba(255,255,255,0.25)' }}>
                Loading…
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)}
                style={{ padding: '28px 12px', textAlign: 'center', color: 'rgba(255,255,255,0.22)', fontSize: '0.75rem' }}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, ri) => {
              const isSelected = selectedIds.has(row.id);
              return (
                <tr
                  key={row.id || ri}
                  tabIndex={onRowClick ? 0 : undefined}
                  onClick={() => onRowClick?.(row)}
                  onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter') onRowClick(row); } : undefined}
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.035)',
                    cursor: onRowClick ? 'pointer' : 'default',
                    background: isSelected ? 'rgba(255,90,31,0.06)' : 'transparent',
                    transition: 'background 0.1s',
                    outline: 'none',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                  onFocus={e => { e.currentTarget.style.background = 'rgba(255,90,31,0.04)'; }}
                  onBlur={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                >
                  {selectable && (
                    <td style={{ padding: cellPad, width: 32 }} onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onSelect?.(row.id)}
                        style={{ accentColor: '#FF5A1F' }}
                      />
                    </td>
                  )}
                  {columns.map((col, ci) => (
                    <td
                      key={ci}
                      className={col.cellClassName || ''}
                      style={{
                        padding: cellPad,
                        color: 'rgba(255,255,255,0.75)',
                        textAlign: col.align || 'left',
                        whiteSpace: col.wrap ? 'normal' : 'nowrap',
                        maxWidth: col.maxWidth || undefined,
                        overflow: col.maxWidth ? 'hidden' : undefined,
                        textOverflow: col.maxWidth ? 'ellipsis' : undefined,
                      }}
                    >
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                  {rowActions && (
                    <td style={{ padding: cellPad, width: 36, textAlign: 'right' }}>
                      <RowActionMenu actions={rowActions(row)} />
                    </td>
                  )}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}