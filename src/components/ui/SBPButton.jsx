/**
 * SBPButton — SteelBuild-Pro unified button component
 *
 * Variants: primary | secondary | ghost | danger
 * Sizes:    lg | md | sm | xs
 *
 * Usage:
 *   <SBPButton variant="primary" size="sm" icon={<Plus size={12} />}>Add RFI</SBPButton>
 *   <SBPButton variant="ghost" size="xs" onClick={...}>Cancel</SBPButton>
 *   <SBPButton variant="danger" size="sm" loading={isDeleting}>Delete</SBPButton>
 *   <SBPButton variant="secondary" size="md" iconOnly icon={<Filter size={14} />} aria-label="Filter" />
 */
import React from 'react';
import { Loader2 } from 'lucide-react';

const VARIANT_STYLES = {
  primary: {
    base: 'bg-gradient-to-r from-[#FF5A1F] to-[#FF7A2F] text-white border-transparent shadow-[0_0_0_1px_rgba(255,90,31,0.25),0_4px_12px_rgba(255,90,31,0.2)]',
    hover: 'hover:shadow-[0_0_0_1px_rgba(255,90,31,0.4),0_8px_20px_rgba(255,90,31,0.3)] hover:-translate-y-px',
    focus: 'focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D1117]',
    disabled: 'disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none',
  },
  secondary: {
    base: 'bg-[#1A1F27] text-[rgba(255,255,255,0.7)] border border-[rgba(255,255,255,0.08)]',
    hover: 'hover:bg-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.14)] hover:text-[rgba(255,255,255,0.9)]',
    focus: 'focus-visible:ring-2 focus-visible:ring-[rgba(255,255,255,0.2)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D1117]',
    disabled: 'disabled:opacity-40 disabled:cursor-not-allowed',
  },
  ghost: {
    base: 'bg-transparent text-[rgba(255,255,255,0.45)] border border-transparent',
    hover: 'hover:bg-[rgba(255,255,255,0.05)] hover:text-[rgba(255,255,255,0.8)]',
    focus: 'focus-visible:ring-2 focus-visible:ring-[rgba(255,255,255,0.15)] focus-visible:ring-offset-1 focus-visible:ring-offset-[#0D1117]',
    disabled: 'disabled:opacity-30 disabled:cursor-not-allowed',
  },
  danger: {
    base: 'bg-[rgba(255,77,77,0.12)] text-[#FF4D4D] border border-[rgba(255,77,77,0.2)]',
    hover: 'hover:bg-[rgba(255,77,77,0.2)] hover:border-[rgba(255,77,77,0.35)]',
    focus: 'focus-visible:ring-2 focus-visible:ring-[#FF4D4D] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D1117]',
    disabled: 'disabled:opacity-40 disabled:cursor-not-allowed',
  },
};

const SIZE_STYLES = {
  lg: { btn: 'h-10 px-5 text-[0.8rem] gap-2 rounded-[10px]', icon: 16 },
  md: { btn: 'h-8 px-4 text-[0.75rem] gap-1.5 rounded-[8px]', icon: 14 },
  sm: { btn: 'h-7 px-3 text-[0.7rem] gap-1.5 rounded-[7px]', icon: 12 },
  xs: { btn: 'h-6 px-2 text-[0.65rem] gap-1 rounded-[6px]', icon: 11 },
};

const ICON_ONLY_SIZE = {
  lg: 'h-10 w-10',
  md: 'h-8 w-8',
  sm: 'h-7 w-7',
  xs: 'h-6 w-6',
};

export default function SBPButton({
  variant = 'secondary',
  size = 'sm',
  icon,
  iconOnly = false,
  loading = false,
  children,
  className = '',
  ...props
}) {
  const v = VARIANT_STYLES[variant] || VARIANT_STYLES.secondary;
  const s = SIZE_STYLES[size] || SIZE_STYLES.sm;
  const iconSize = s.icon;

  const base = [
    'inline-flex items-center justify-center font-semibold tracking-wide',
    'transition-all duration-150 ease-out select-none',
    'whitespace-nowrap',
    iconOnly ? `${ICON_ONLY_SIZE[size] || 'h-7 w-7'} rounded-[8px] p-0` : s.btn,
    v.base, v.hover, v.focus, v.disabled,
    className,
  ].join(' ');

  return (
    <button className={base} disabled={loading || props.disabled} {...props}>
      {loading
        ? <Loader2 size={iconSize} className="animate-spin" />
        : icon && <span className="flex-shrink-0">{React.cloneElement(icon, { size: iconSize })}</span>
      }
      {!iconOnly && children && <span>{children}</span>}
    </button>
  );
}

/** Convenience: icon-only variant */
export function IconButton({ icon, size = 'sm', variant = 'ghost', tooltip, ...props }) {
  return (
    <SBPButton variant={variant} size={size} iconOnly icon={icon} title={tooltip} aria-label={tooltip} {...props} />
  );
}

/** Overflow-safe button row — shows first N buttons then a "+N more" trigger */
export function ButtonGroup({ children, maxVisible = 4 }) {
  const items = React.Children.toArray(children);
  if (items.length <= maxVisible) {
    return <div className="flex items-center gap-1.5 flex-wrap">{items}</div>;
  }
  const visible = items.slice(0, maxVisible);
  const overflow = items.slice(maxVisible);
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="flex items-center gap-1.5 flex-wrap" ref={ref}>
      {visible}
      <div className="relative">
        <SBPButton variant="ghost" size="sm" onClick={() => setOpen(o => !o)}>
          +{overflow.length}
        </SBPButton>
        {open && (
          <div
            role="menu"
            className="absolute right-0 top-full mt-1 z-50 flex flex-col gap-0.5 p-1 rounded-[10px] border min-w-[140px]"
            style={{ background: '#14181E', borderColor: 'rgba(255,255,255,0.08)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}
          >
            {overflow.map((child, i) => (
              <div key={i} role="menuitem" onClick={() => setOpen(false)}>{child}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}