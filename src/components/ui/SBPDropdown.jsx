/**
 * SBPDropdown — grouped "More" dropdown with search, keyboard nav, ARIA roles
 *
 * Props:
 *   trigger:  ReactNode — the button that opens the menu
 *   groups:   Array<{ name, items: Array<{ label, icon?, onClick, disabled? }> }>
 *   align?:   'left' | 'right'  (default 'right')
 *   width?:   number (px, default 240)
 *   searchable?: boolean (default true when >6 items)
 *
 * Usage:
 *   <SBPDropdown
 *     trigger={<SBPButton variant="secondary" size="sm" icon={<ChevronDown size={12} />}>More</SBPButton>}
 *     groups={[
 *       { name: 'Actions', items: [
 *           { label: 'Export PDF',     icon: <FileDown size={13} />, onClick: exportPDF },
 *           { label: 'Bulk Edit',      icon: <Edit size={13} />,     onClick: openBulkEdit },
 *       ]},
 *       { name: 'Danger Zone', items: [
 *           { label: 'Delete All',     icon: <Trash2 size={13} />,   onClick: deleteAll, danger: true },
 *       ]},
 *     ]}
 *   />
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';

export default function SBPDropdown({
  trigger,
  groups = [],
  align = 'right',
  width = 240,
  searchable,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const containerRef = useRef(null);
  const searchRef = useRef(null);
  const itemRefs = useRef([]);

  const allItems = groups.flatMap(g => g.items);
  const showSearch = searchable ?? allItems.length > 6;

  // Flatten filtered items for keyboard nav
  const filteredGroups = groups.map(g => ({
    ...g,
    items: g.items.filter(item =>
      !query || item.label.toLowerCase().includes(query.toLowerCase())
    ),
  })).filter(g => g.items.length > 0);

  const flatFiltered = filteredGroups.flatMap(g => g.items);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setFocusedIdx(-1);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) close();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, close]);

  useEffect(() => {
    if (open && showSearch) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open, showSearch]);

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === 'Escape') { close(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIdx(i => Math.min(i + 1, flatFiltered.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIdx(i => Math.max(i - 1, showSearch ? -1 : 0));
    }
    if (e.key === 'Enter' && focusedIdx >= 0) {
      const item = flatFiltered[focusedIdx];
      if (item && !item.disabled) { item.onClick?.(); close(); }
    }
    if (e.key === 'Tab') { close(); }
  };

  useEffect(() => {
    if (focusedIdx >= 0) itemRefs.current[focusedIdx]?.focus();
    else if (focusedIdx === -1 && open && showSearch) searchRef.current?.focus();
  }, [focusedIdx, open, showSearch]);

  let flatIdx = -1;

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', display: 'inline-block' }}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger */}
      <div
        onClick={() => { setOpen(o => !o); setFocusedIdx(-1); }}
        aria-haspopup="true"
        aria-expanded={open}
      >
        {trigger}
      </div>

      {/* Menu */}
      {open && (
        <div
          role="menu"
          aria-label="More options"
          style={{
            position: 'absolute',
            [align === 'right' ? 'right' : 'left']: 0,
            top: 'calc(100% + 4px)',
            width,
            zIndex: 200,
            background: '#14181E',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: 12,
            boxShadow: '0 12px 32px rgba(0,0,0,0.65)',
            overflow: 'hidden',
          }}
        >
          {/* Search */}
          {showSearch && (
            <div style={{ padding: '8px 8px 4px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={11} style={{ position: 'absolute', left: 8, color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={e => { setQuery(e.target.value); setFocusedIdx(-1); }}
                  placeholder="Search…"
                  aria-label="Search menu items"
                  style={{
                    width: '100%', border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 7, background: 'rgba(255,255,255,0.04)',
                    color: 'rgba(255,255,255,0.8)', fontSize: '0.72rem',
                    padding: '4px 24px 4px 26px', outline: 'none',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(255,90,31,0.4)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    style={{ position: 'absolute', right: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 0 }}
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Groups */}
          <div style={{ maxHeight: 320, overflowY: 'auto', padding: '4px' }}>
            {filteredGroups.length === 0 && (
              <div style={{ padding: '14px 12px', textAlign: 'center', fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)' }}>
                No results for "{query}"
              </div>
            )}
            {filteredGroups.map((group, gi) => (
              <div key={gi}>
                {group.name && filteredGroups.length > 1 && (
                  <div style={{
                    padding: '6px 10px 3px',
                    fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.12em',
                    textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)',
                  }}>
                    {group.name}
                  </div>
                )}
                {group.items.map((item) => {
                  flatIdx++;
                  const currentIdx = flatIdx;
                  return (
                    <button
                      key={item.label}
                      ref={el => { itemRefs.current[currentIdx] = el; }}
                      role="menuitem"
                      disabled={item.disabled}
                      onClick={() => { if (!item.disabled) { item.onClick?.(); close(); } }}
                      tabIndex={-1}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        width: '100%', padding: '6px 10px',
                        borderRadius: 8, border: 'none', cursor: item.disabled ? 'not-allowed' : 'pointer',
                        background: focusedIdx === currentIdx ? 'rgba(255,255,255,0.06)' : 'transparent',
                        color: item.danger ? '#FF4D4D' : item.disabled ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.75)',
                        fontSize: '0.72rem', fontWeight: 500,
                        textAlign: 'left', transition: 'background 0.1s',
                        outline: 'none',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; setFocusedIdx(currentIdx); }}
                      onMouseLeave={e => { e.currentTarget.style.background = focusedIdx === currentIdx ? 'rgba(255,255,255,0.06)' : 'transparent'; }}
                    >
                      {item.icon && <span style={{ flexShrink: 0, color: item.danger ? '#FF4D4D' : 'rgba(255,255,255,0.4)' }}>{item.icon}</span>}
                      <span>{item.label}</span>
                    </button>
                  );
                })}
                {gi < filteredGroups.length - 1 && (
                  <div style={{ margin: '4px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}