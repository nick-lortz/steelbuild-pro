
// designTokens.js — SteelBuild-Pro token map
// Import these in components: import { t } from '@/components/shared/designTokens'

export const t = {
  // Surfaces
  frameBg:    '#0B0D10',
  panelBg:    '#14181E',
  panelAlt:   '#1A1F27',
  pageBg:     '#2B2F38',

  // Brand
  accent:     '#FF5A1F',
  accentHover:'#FF7A2F',
  accentSub:  'rgba(255,90,31,0.12)',
  accentGlow: 'rgba(255,90,31,0.35)',

  // Text
  textPrimary:  'rgba(255,255,255,0.92)',
  textSecondary:'rgba(255,255,255,0.70)',
  textMuted:    'rgba(255,255,255,0.50)',
  textDisabled: 'rgba(255,255,255,0.25)',

  // Borders
  border:       'rgba(255,255,255,0.06)',
  borderStrong: 'rgba(255,255,255,0.12)',
  borderFocus:  'rgba(255,90,31,0.50)',

  // Status
  success: '#4DD6A4',
  warning: '#FFB15A',
  danger:  '#FF4D4D',
  info:    '#4DA3FF',

  // Shadows
  shadowPanel:  'inset 0 0 0 1px rgba(255,255,255,0.04), 0 8px 24px rgba(0,0,0,0.45)',
  shadowGlow:   '0 0 0 1px rgba(255,90,31,0.25), 0 8px 22px rgba(255,90,31,0.18)',
  shadowFocus:  '0 0 0 3px rgba(255,90,31,0.18)',
};

// Tailwind class bundles — use with cn() or className={}
export const cls = {
  // Buttons
  btnPrimary:   'bg-gradient-to-r from-[#FF5A1F] to-[#FF7A2F] text-white text-[0.7rem] font-bold tracking-[0.10em] uppercase px-5 py-2 rounded-[10px] shadow-glow-accent hover:-translate-y-px hover:shadow-e3 focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0D10] active:scale-[0.98] transition-all duration-150 disabled:opacity-30 disabled:pointer-events-none',
  btnSecondary: 'bg-[#1A1F27] text-[rgba(255,255,255,0.70)] text-[0.7rem] font-semibold border border-[rgba(255,255,255,0.06)] rounded-full px-4 py-[7px] hover:bg-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] hover:text-[rgba(255,255,255,0.92)] focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0D10] transition-all duration-150 disabled:opacity-30 disabled:pointer-events-none',
  btnGhost:     'bg-transparent text-[rgba(255,255,255,0.50)] text-[0.7rem] rounded-lg px-3 py-1.5 hover:bg-[rgba(255,255,255,0.05)] hover:text-[rgba(255,255,255,0.88)] focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0D10] transition-all duration-150 disabled:opacity-25 disabled:pointer-events-none',
  btnDanger:    'bg-[rgba(255,77,77,0.12)] text-[#FF4D4D] border border-[rgba(255,77,77,0.20)] rounded-[10px] px-5 py-2 text-[0.7rem] font-bold tracking-[0.10em] uppercase hover:bg-[rgba(255,77,77,0.20)] focus-visible:ring-2 focus-visible:ring-[#FF4D4D] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0D10] transition-all duration-150 disabled:opacity-30 disabled:pointer-events-none',
  btnIcon:      'w-9 h-9 flex items-center justify-center rounded-full bg-[#1A1F27] border border-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.50)] hover:bg-[rgba(255,255,255,0.08)] hover:text-[rgba(255,255,255,0.88)] focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0D10] transition-all duration-150 disabled:opacity-30 disabled:pointer-events-none',

  // Card
  card:         'bg-[#14181E] border border-[rgba(255,255,255,0.06)] rounded-2xl shadow-e2 p-4',
  cardHover:    'bg-[#14181E] border border-[rgba(255,255,255,0.06)] rounded-2xl shadow-e2 p-4 hover:shadow-e3 transition-shadow duration-200',
  cardAccent:   'bg-[#14181E] border border-[rgba(255,90,31,0.18)] rounded-2xl shadow-[0_0_12px_rgba(255,90,31,0.08)] p-4',

  // Input / Textarea / Select
  input:        'bg-[#14181E] border border-[rgba(255,255,255,0.08)] rounded-[10px] text-[rgba(255,255,255,0.92)] text-[0.8125rem] placeholder:text-[rgba(255,255,255,0.25)] px-3 h-9 w-full focus:outline-none focus:border-[rgba(255,90,31,0.50)] focus:shadow-[0_0_0_3px_rgba(255,90,31,0.18)] transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed',

  // Table
  tableHead:    'text-[0.6rem] font-bold tracking-[0.10em] uppercase text-[rgba(255,255,255,0.30)] px-[10px] py-[5px] bg-[rgba(255,255,255,0.02)] border-b border-[rgba(255,255,255,0.06)] whitespace-nowrap',
  tableRow:     'border-b border-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.025)] transition-colors duration-[120ms] h-7',
  tableCell:    'px-[10px] py-[5px] text-[0.72rem] text-[rgba(255,255,255,0.75)] whitespace-nowrap',

  // Badge / Status pill
  badge:        'inline-flex items-center px-2 py-[1px] rounded-full text-[0.6rem] font-bold tracking-[0.08em] uppercase whitespace-nowrap',
  badgeAccent:  'bg-[rgba(255,90,31,0.12)] text-[#FF8C42] border border-[rgba(255,90,31,0.25)]',
  badgeSuccess: 'bg-[rgba(77,214,164,0.12)] text-[#4DD6A4] border border-[rgba(77,214,164,0.20)]',
  badgeWarning: 'bg-[rgba(255,177,90,0.12)] text-[#FFB15A] border border-[rgba(255,177,90,0.20)]',
  badgeDanger:  'bg-[rgba(255,77,77,0.12)] text-[#FF4D4D] border border-[rgba(255,77,77,0.20)]',
  badgeInfo:    'bg-[rgba(77,163,255,0.12)] text-[#4DA3FF] border border-[rgba(77,163,255,0.20)]',
  badgeMuted:   'bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.50)] border border-[rgba(255,255,255,0.06)]',

  // Nav
  navItem:      'flex items-center gap-2 px-3 py-1.5 rounded-lg text-[0.75rem] font-medium text-[rgba(255,255,255,0.50)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[rgba(255,255,255,0.88)] focus-visible:ring-2 focus-visible:ring-[#FF5A1F] transition-all duration-150',
  navItemActive:'flex items-center gap-2 px-3 py-1.5 rounded-lg text-[0.75rem] font-medium text-[#FF8C42] bg-gradient-to-r from-[rgba(255,90,31,0.18)] to-[rgba(255,122,47,0.08)] border border-[rgba(255,90,31,0.18)] shadow-[0_0_12px_rgba(255,90,31,0.10)]',

  // Metric card (KPI)
  metricCard:   'bg-[#14181E] border border-[rgba(255,255,255,0.06)] rounded-2xl p-4 flex flex-col gap-1',
  metricValue:  'text-[2rem] font-bold tracking-[-0.02em] leading-none text-[rgba(255,255,255,0.92)]',
  metricLabel:  'text-[0.6rem] font-bold tracking-[0.10em] uppercase text-[rgba(255,255,255,0.35)]',

  // List item
  listItem:     'flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[rgba(255,255,255,0.03)] border border-transparent hover:border-[rgba(255,255,255,0.04)] transition-all duration-150 cursor-pointer',
  listItemActive:'flex items-center gap-3 px-3 py-2 rounded-xl bg-[rgba(255,90,31,0.08)] border border-[rgba(255,90,31,0.15)]',

  // Section label
  sectionLabel: 'text-[0.6rem] font-bold tracking-[0.10em] uppercase text-[rgba(255,255,255,0.35)] mb-2',
};
