/**
 * ComponentSnippets.jsx — SteelBuild-Pro UI Component Reference
 * Copy any snippet directly into your page/component.
 * All classes reference the Industrial Dark token system (globals.css + designTokens.js).
 *
 * Token key:
 *   Surface:  #0B0D10 (frame) / #14181E (panel) / #1A1F27 (panel-alt)
 *   Accent:   #FF5A1F → hover #FF7A2F
 *   Focus:    ring-[#FF5A1F] offset-[#0B0D10]
 *   Disabled: opacity-30 + pointer-events-none
 */

import React from 'react';
import { Button }   from '@/components/ui/button';
import { Card }     from '@/components/ui/card';
import { Input }    from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge }    from '@/components/ui/badge';
import { cn }       from '@/lib/utils';

// ─────────────────────────────────────────────────────────────
// 1. PRIMARY BUTTON
// Token: accent (#FF5A1F), radius 10px, glow shadow, focus ring
// a11y: focus-visible ring 2px #FF5A1F, offset on frame-bg, aria-disabled
// ─────────────────────────────────────────────────────────────
export function SBPButtonPrimary({ children, disabled, onClick }) {
  return (
    <Button onClick={onClick} disabled={disabled}
      className="bg-gradient-to-r from-[#FF5A1F] to-[#FF7A2F] text-white text-[0.7rem] font-bold tracking-[0.10em] uppercase px-5 py-2 rounded-[10px] shadow-[0_0_0_1px_rgba(255,90,31,0.25),0_8px_22px_rgba(255,90,31,0.18)] hover:-translate-y-px hover:shadow-[0_12px_28px_rgba(255,90,31,0.30)] focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0D10] active:scale-[0.98] transition-all duration-150 disabled:opacity-30 disabled:pointer-events-none border-none"
    >{children}</Button>
  );
}

// ─────────────────────────────────────────────────────────────
// 2. SECONDARY BUTTON
// Token: panel-alt bg, pill radius, border rgba(255,255,255,0.06)
// ─────────────────────────────────────────────────────────────
export function SBPButtonSecondary({ children, disabled, onClick }) {
  return (
    <Button variant="outline" onClick={onClick} disabled={disabled}
      className="bg-[#1A1F27] text-[rgba(255,255,255,0.70)] text-[0.7rem] font-semibold border border-[rgba(255,255,255,0.06)] rounded-full px-4 py-[7px] hover:bg-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] hover:text-[rgba(255,255,255,0.92)] focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0D10] transition-all duration-150 disabled:opacity-30 disabled:pointer-events-none"
    >{children}</Button>
  );
}

// ─────────────────────────────────────────────────────────────
// 3. GHOST BUTTON
// Token: transparent bg, muted text, no border
// ─────────────────────────────────────────────────────────────
export function SBPButtonGhost({ children, disabled, onClick }) {
  return (
    <Button variant="ghost" onClick={onClick} disabled={disabled}
      className="bg-transparent text-[rgba(255,255,255,0.50)] text-[0.7rem] rounded-lg px-3 py-1.5 hover:bg-[rgba(255,255,255,0.05)] hover:text-[rgba(255,255,255,0.88)] focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0D10] transition-all duration-150 disabled:opacity-25 disabled:pointer-events-none"
    >{children}</Button>
  );
}

// ─────────────────────────────────────────────────────────────
// 4. CARD
// Token: panel-bg (#14181E), radius 16px, border rgba(255,255,255,0.06), e2 shadow
// a11y: use role="region" + aria-label on dashboard cards
// ─────────────────────────────────────────────────────────────
export function SBPCard({ children, accent, className }) {
  return (
    <Card className={cn(
      'bg-[#14181E] border rounded-2xl p-4 transition-shadow duration-200',
      accent
        ? 'border-[rgba(255,90,31,0.18)] shadow-[0_0_12px_rgba(255,90,31,0.08)]'
        : 'border-[rgba(255,255,255,0.06)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04),0_8px_24px_rgba(0,0,0,0.45)] hover:shadow-[0_16px_40px_rgba(0,0,0,0.60)]',
      className
    )}>{children}</Card>
  );
}

// ─────────────────────────────────────────────────────────────
// 5. INPUT / TEXTFIELD
// Token: panel-bg, border rgba(255,255,255,0.08), focus: accent border + glow
// a11y: always pair with <label htmlFor>, aria-invalid + aria-describedby for errors
// ─────────────────────────────────────────────────────────────
export function SBPInput({ id, label, error, disabled, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={id} className="text-[0.6rem] font-bold tracking-[0.10em] uppercase text-[rgba(255,255,255,0.35)]">{label}</label>}
      <Input id={id} disabled={disabled} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined}
        className="bg-[#14181E] border border-[rgba(255,255,255,0.08)] rounded-[10px] text-[rgba(255,255,255,0.92)] text-[0.8125rem] placeholder:text-[rgba(255,255,255,0.25)] h-9 px-3 focus:outline-none focus:border-[rgba(255,90,31,0.50)] focus:shadow-[0_0_0_3px_rgba(255,90,31,0.18)] focus-visible:ring-0 transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
        {...props}
      />
      {error && <span id={`${id}-err`} className="text-[0.6rem] text-[#FF4D4D] mt-0.5">{error}</span>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 6. SELECT
// Token: same as input + chevron color muted
// a11y: keyboard navigable via shadcn radix — focus ring inherited
// ─────────────────────────────────────────────────────────────
export function SBPSelect({ id, label, placeholder, options = [], value, onChange }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={id} className="text-[0.6rem] font-bold tracking-[0.10em] uppercase text-[rgba(255,255,255,0.35)]">{label}</label>}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id}
          className="bg-[#14181E] border border-[rgba(255,255,255,0.08)] rounded-[10px] text-[rgba(255,255,255,0.92)] text-[0.8125rem] h-9 px-3 focus:ring-2 focus:ring-[#FF5A1F] focus:ring-offset-2 focus:ring-offset-[#0B0D10] focus:border-[rgba(255,90,31,0.50)] data-[placeholder]:text-[rgba(255,255,255,0.25)] transition-all duration-150"
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="bg-[#14181E] border border-[rgba(255,255,255,0.08)] rounded-xl shadow-[0_16px_40px_rgba(0,0,0,0.60)]">
          {options.map(o => (
            <SelectItem key={o.value} value={o.value}
              className="text-[rgba(255,255,255,0.75)] text-[0.8125rem] focus:bg-[rgba(255,90,31,0.10)] focus:text-[rgba(255,255,255,0.92)]"
            >{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 7. TABLE ROW (dense — 28px height target)
// Token: header caption style, row hover rgba(255,255,255,0.025), 0.03 border
// a11y: use <th scope="col">, keyboard focus on interactive cells
// ─────────────────────────────────────────────────────────────
export function SBPTableRow({ cells, onClick, selected }) {
  return (
    <tr onClick={onClick}
      className={cn(
        'border-b border-[rgba(255,255,255,0.03)] h-7 transition-colors duration-[120ms] cursor-pointer',
        selected ? 'bg-[rgba(255,90,31,0.08)]' : 'hover:bg-[rgba(255,255,255,0.025)]'
      )}
    >
      {cells.map((cell, i) => (
        <td key={i} className="px-[10px] py-[5px] text-[0.72rem] text-[rgba(255,255,255,0.75)] whitespace-nowrap">{cell}</td>
      ))}
    </tr>
  );
}

export function SBPTableHeader({ columns }) {
  return (
    <thead>
      <tr className="border-b border-[rgba(255,255,255,0.06)]">
        {columns.map((col, i) => (
          <th key={i} scope="col"
            className="text-[0.6rem] font-bold tracking-[0.10em] uppercase text-[rgba(255,255,255,0.30)] px-[10px] py-[5px] bg-[rgba(255,255,255,0.02)] text-left whitespace-nowrap"
          >{col}</th>
        ))}
      </tr>
    </thead>
  );
}

// ─────────────────────────────────────────────────────────────
// 8. MODAL / DIALOG
// Token: panel-bg, radius 16px, overlay rgba(11,13,16,0.85), e4 shadow
// a11y: DialogTitle required (screen reader), focus trapped by radix
// ─────────────────────────────────────────────────────────────
export function SBPModal({ open, onClose, title, children }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="bg-[#14181E] border border-[rgba(255,255,255,0.08)] rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.70)] p-6 max-w-2xl w-full focus-visible:outline-none"
        style={{ backdropFilter: 'blur(12px)' }}
      >
        <DialogHeader>
          <DialogTitle className="text-[1.125rem] font-bold text-[rgba(255,255,255,0.92)] tracking-[-0.01em]">{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────
// 9. SIDEBAR NAV ITEM
// Token: active = accent gradient bg + orange text + subtle glow border
// a11y: aria-current="page" on active item, role="menuitem" in sidebar
// ─────────────────────────────────────────────────────────────
export function SBPSidebarItem({ label, icon: Icon, active, onClick }) {
  return (
    <button onClick={onClick} aria-current={active ? 'page' : undefined}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[0.75rem] font-medium transition-all duration-150 focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0D10]',
        active
          ? 'bg-gradient-to-r from-[rgba(255,90,31,0.18)] to-[rgba(255,122,47,0.08)] text-[#FF8C42] border border-[rgba(255,90,31,0.18)] shadow-[0_0_12px_rgba(255,90,31,0.10)]'
          : 'text-[rgba(255,255,255,0.50)] border border-transparent hover:bg-[rgba(255,255,255,0.05)] hover:text-[rgba(255,255,255,0.88)]'
      )}
    >
      {Icon && <Icon size={14} />}
      {label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// 10. TOP NAV BAR
// Token: frame-bg 0.97 alpha, 48px height, border-b rgba(255,255,255,0.06)
// a11y: role="banner", skip-link to #main-content
// ─────────────────────────────────────────────────────────────
export function SBPTopNav({ left, center, right }) {
  return (
    <nav role="banner"
      className="sticky top-0 z-50 flex items-center justify-between gap-3 px-4 border-b border-[rgba(255,255,255,0.06)]"
      style={{ height: 48, background: 'rgba(13,17,23,0.97)', backdropFilter: 'blur(12px)' }}
    >
      <div className="flex items-center gap-2">{left}</div>
      <div className="flex items-center gap-2">{center}</div>
      <div className="flex items-center gap-2">{right}</div>
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────
// 11. DASHBOARD METRIC CARD (KPI)
// Token: panel-bg, metric value 2rem/800, caption label, status color variants
// a11y: role="region" aria-label="metric name", value in <data> tag
// ─────────────────────────────────────────────────────────────
export function SBPMetricCard({ label, value, delta, deltaType = 'neutral', sublabel }) {
  const deltaColor = { positive: '#4DD6A4', negative: '#FF4D4D', neutral: 'rgba(255,255,255,0.35)' }[deltaType];
  return (
    <div role="region" aria-label={label}
      className="bg-[#14181E] border border-[rgba(255,255,255,0.06)] rounded-2xl p-4 flex flex-col gap-1 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04),0_8px_24px_rgba(0,0,0,0.45)]"
    >
      <span className="text-[0.6rem] font-bold tracking-[0.10em] uppercase text-[rgba(255,255,255,0.35)]">{label}</span>
      <data className="text-[2rem] font-bold tracking-[-0.02em] leading-none text-[rgba(255,255,255,0.92)]" value={value}>{value}</data>
      {(delta || sublabel) && (
        <div className="flex items-center gap-2 mt-0.5">
          {delta && <span className="text-[0.7rem] font-semibold" style={{ color: deltaColor }}>{delta}</span>}
          {sublabel && <span className="text-[0.65rem] text-[rgba(255,255,255,0.35)]">{sublabel}</span>}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 12. LIST ITEM (RFIs, Change Orders, Drawings)
// Token: panel-alt hover, accent-sub active bg, badge inline
// a11y: role="listitem", keyboard focus via tabIndex=0 + onKeyDown Enter/Space
// ─────────────────────────────────────────────────────────────
export function SBPListItem({ title, subtitle, badge, badgeType = 'muted', meta, active, onClick }) {
  const badgeClasses = {
    accent:  'bg-[rgba(255,90,31,0.12)] text-[#FF8C42] border border-[rgba(255,90,31,0.25)]',
    success: 'bg-[rgba(77,214,164,0.12)] text-[#4DD6A4] border border-[rgba(77,214,164,0.20)]',
    warning: 'bg-[rgba(255,177,90,0.12)] text-[#FFB15A] border border-[rgba(255,177,90,0.20)]',
    danger:  'bg-[rgba(255,77,77,0.12)] text-[#FF4D4D] border border-[rgba(255,77,77,0.20)]',
    info:    'bg-[rgba(77,163,255,0.12)] text-[#4DA3FF] border border-[rgba(77,163,255,0.20)]',
    muted:   'bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.50)] border border-[rgba(255,255,255,0.06)]',
  }[badgeType];

  return (
    <div role="listitem" tabIndex={0} onClick={onClick}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onClick?.()}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-xl border transition-all duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0D10]',
        active
          ? 'bg-[rgba(255,90,31,0.08)] border-[rgba(255,90,31,0.15)]'
          : 'border-transparent hover:bg-[rgba(255,255,255,0.03)] hover:border-[rgba(255,255,255,0.04)]'
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[0.8125rem] font-medium text-[rgba(255,255,255,0.88)] truncate">{title}</span>
          {badge && <span className={cn('inline-flex items-center px-2 py-[1px] rounded-full text-[0.6rem] font-bold tracking-[0.08em] uppercase', badgeClasses)}>{badge}</span>}
        </div>
        {subtitle && <p className="text-[0.72rem] text-[rgba(255,255,255,0.40)] truncate mt-0.5">{subtitle}</p>}
      </div>
      {meta && <span className="text-[0.65rem] text-[rgba(255,255,255,0.35)] shrink-0">{meta}</span>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 13. STATUS BADGE (standalone — for RFI/CO/Drawing status chips)
// ─────────────────────────────────────────────────────────────
export function SBPStatusBadge({ status }) {
  const map = {
    open:        { label: 'Open',        cls: 'bg-[rgba(77,163,255,0.12)] text-[#4DA3FF] border-[rgba(77,163,255,0.20)]' },
    answered:    { label: 'Answered',    cls: 'bg-[rgba(77,214,164,0.12)] text-[#4DD6A4] border-[rgba(77,214,164,0.20)]' },
    submitted:   { label: 'Submitted',   cls: 'bg-[rgba(77,163,255,0.12)] text-[#4DA3FF] border-[rgba(77,163,255,0.20)]' },
    approved:    { label: 'Approved',    cls: 'bg-[rgba(77,214,164,0.12)] text-[#4DD6A4] border-[rgba(77,214,164,0.20)]' },
    rejected:    { label: 'Rejected',    cls: 'bg-[rgba(255,77,77,0.12)] text-[#FF4D4D] border-[rgba(255,77,77,0.20)]' },
    draft:       { label: 'Draft',       cls: 'bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.50)] border-[rgba(255,255,255,0.06)]' },
    critical:    { label: 'Critical',    cls: 'bg-[rgba(255,77,77,0.12)] text-[#FF4D4D] border-[rgba(255,77,77,0.20)]' },
    in_progress: { label: 'In Progress', cls: 'bg-[rgba(77,163,255,0.12)] text-[#4DA3FF] border-[rgba(77,163,255,0.20)]' },
    on_hold:     { label: 'On Hold',     cls: 'bg-[rgba(255,177,90,0.12)] text-[#FFB15A] border-[rgba(255,177,90,0.20)]' },
    FFF:         { label: 'FFF',         cls: 'bg-[rgba(77,214,164,0.12)] text-[#4DD6A4] border-[rgba(77,214,164,0.20)]' },
    IFA:         { label: 'IFA',         cls: 'bg-[rgba(77,163,255,0.12)] text-[#4DA3FF] border-[rgba(77,163,255,0.20)]' },
    BFA:         { label: 'BFA',         cls: 'bg-[rgba(255,177,90,0.12)] text-[#FFB15A] border-[rgba(255,177,90,0.20)]' },
  };
  const s = map[status] || { label: status, cls: 'bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.50)] border-[rgba(255,255,255,0.06)]' };
  return (
    <span className={cn('inline-flex items-center px-2 py-[1px] rounded-full text-[0.6rem] font-bold tracking-[0.08em] uppercase border', s.cls)}>
      {s.label.replace(/_/g, ' ')}
    </span>
  );
}