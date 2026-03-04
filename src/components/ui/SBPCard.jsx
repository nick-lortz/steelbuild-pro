/**
 * SBPCard — SteelBuild-Pro card & panel primitives
 *
 * Exports: SBPCard, SBPCardHeader, SBPCardBody, SBPCardFooter
 *          SBPStatCard (KPI tile)
 *
 * Usage:
 *   <SBPCard>
 *     <SBPCardHeader title="Open RFIs" badge={12} actions={<IconButton ... />} />
 *     <SBPCardBody density="compact">...</SBPCardBody>
 *     <SBPCardFooter><SBPButton variant="ghost" size="xs">View All</SBPButton></SBPCardFooter>
 *   </SBPCard>
 *
 *   <SBPStatCard label="Contract Value" value="$2.4M" delta="+$180k" deltaPositive trend="up" />
 */
import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export function SBPCard({ children, className = '', onClick, hoverable = false, ...props }) {
  const base = [
    'rounded-[14px] border overflow-hidden',
    'transition-all duration-150',
    hoverable || onClick
      ? 'cursor-pointer hover:border-[rgba(255,255,255,0.12)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)]'
      : '',
    className,
  ].join(' ');

  return (
    <div
      className={base}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(e); } : undefined}
      style={{ background: '#14181E', borderColor: 'rgba(255,255,255,0.07)' }}
      {...props}
    >
      {children}
    </div>
  );
}

export function SBPCardHeader({ title, subtitle, badge, icon, actions, className = '' }) {
  return (
    <div
      className={`flex items-center justify-between gap-3 px-4 py-3 border-b ${className}`}
      style={{ borderColor: 'rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center gap-2 min-w-0">
        {icon && <span className="flex-shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }}>{icon}</span>}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="font-semibold truncate"
              style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)', letterSpacing: '0.01em' }}
            >
              {title}
            </span>
            {badge != null && (
              <span
                className="flex-shrink-0 inline-flex items-center justify-center rounded-full px-1.5"
                style={{
                  fontSize: '0.6rem', fontWeight: 700, minWidth: 18, height: 16,
                  background: 'rgba(255,90,31,0.15)', color: '#FF8C42',
                  border: '1px solid rgba(255,90,31,0.2)',
                }}
              >
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>{subtitle}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-1 flex-shrink-0">{actions}</div>}
    </div>
  );
}

const DENSITY_PADDING = { compact: 'px-4 py-2', normal: 'px-4 py-3', loose: 'px-5 py-4' };

export function SBPCardBody({ children, density = 'compact', className = '', ...props }) {
  return (
    <div className={`${DENSITY_PADDING[density] || DENSITY_PADDING.compact} ${className}`} {...props}>
      {children}
    </div>
  );
}

export function SBPCardFooter({ children, className = '' }) {
  return (
    <div
      className={`px-4 py-2 border-t flex items-center justify-between gap-2 ${className}`}
      style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}
    >
      {children}
    </div>
  );
}

const DELTA_COLOR = {
  up: '#4DD6A4',
  down: '#FF4D4D',
  flat: 'rgba(255,255,255,0.35)',
};

export function SBPStatCard({ label, value, delta, deltaPositive, trend = 'flat', color, className = '' }) {
  const Icon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const dc = deltaPositive ? DELTA_COLOR.up : delta ? DELTA_COLOR.down : DELTA_COLOR.flat;

  return (
    <SBPCard className={`min-w-[110px] ${className}`}>
      <SBPCardBody density="compact">
        <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.32)', marginBottom: 4 }}>
          {label}
        </div>
        <div style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1, color: color || 'rgba(255,255,255,0.9)' }}>
          {value}
        </div>
        {delta && (
          <div className="flex items-center gap-1 mt-1">
            <Icon size={10} style={{ color: dc }} />
            <span style={{ fontSize: '0.6rem', fontWeight: 600, color: dc }}>{delta}</span>
          </div>
        )}
      </SBPCardBody>
    </SBPCard>
  );
}

export default SBPCard;