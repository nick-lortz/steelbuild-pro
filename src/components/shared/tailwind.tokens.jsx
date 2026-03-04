/**
 * SteelBuild-Pro — Tailwind Config Overrides
 * ===========================================
 * Drop this into tailwind.config.js → theme.extend
 *
 * Usage:
 *   const sbpTokens = require('./src/components/shared/tailwind.tokens');
 *   module.exports = { theme: { extend: sbpTokens } };
 */

const sbpTokens = {
  colors: {
    // Frame & surfaces
    'sbp-frame':    '#0B0D10',
    'sbp-panel':    '#14181E',
    'sbp-panel-2':  '#1A1F27',
    'sbp-page':     '#2B2F38',

    // Text
    'sbp-text':     'rgba(255,255,255,0.92)',
    'sbp-dim':      'rgba(255,255,255,0.70)',
    'sbp-mute':     'rgba(255,255,255,0.50)',

    // Accent (replaces #FF5A1F / orange brand)
    'sbp-accent':   '#FF5A1F',
    'sbp-accent-2': '#FF7A2F',

    // Status
    'sbp-success':  '#4DD6A4',
    'sbp-warning':  '#FFB15A',
    'sbp-danger':   '#FF4D4D',
    'sbp-info':     '#4DA3FF',
  },

  borderRadius: {
    'sbp-sm':   '6px',
    'sbp-md':   '8px',
    'sbp-lg':   '10px',
    'sbp-xl':   '12px',
    'sbp-2xl':  '16px',
    'sbp-3xl':  '20px',
    'sbp-pill': '999px',
  },

  spacing: {
    // Extends default Tailwind scale with explicit 8px-grid tokens
    '4.5':  '18px',   // mid between 4 and 5
    '13':   '52px',   // nav bar height
    '18':   '72px',
    '22':   '88px',
  },

  fontSize: {
    'sbp-caption': ['0.625rem',  { lineHeight: '1', fontWeight: '700', letterSpacing: '0.12em' }],
    'sbp-sm':      ['0.6875rem', { lineHeight: '1.4' }],
    'sbp-base':    ['0.8125rem', { lineHeight: '1.5' }],
    'sbp-lg':      ['0.875rem',  { lineHeight: '1.5' }],
    'sbp-xl':      ['1.125rem',  { lineHeight: '1.3' }],
    'sbp-2xl':     ['1.5rem',    { lineHeight: '1.2', letterSpacing: '-0.02em' }],
  },

  boxShadow: {
    'sbp-panel':       '0 8px 24px rgba(0,0,0,0.45)',
    'sbp-frame':       '0 24px 64px rgba(0,0,0,0.7)',
    'sbp-accent':      '0 0 0 1px rgba(255,90,31,0.25), 0 8px 22px rgba(255,90,31,0.18)',
    'sbp-accent-lg':   '0 0 0 1px rgba(255,90,31,0.4), 0 12px 28px rgba(255,90,31,0.3)',
    'sbp-focus':       '0 0 0 3px rgba(255,90,31,0.18)',
    'sbp-focus-input': '0 0 0 3px rgba(255,90,31,0.15)',
  },

  transitionTimingFunction: {
    'sbp-spring': 'cubic-bezier(0.34,1.56,0.64,1)',
    'sbp-base':   'cubic-bezier(0.65,0,0.35,1)',
  },

  transitionDuration: {
    'sbp-fast':   '100ms',
    'sbp-base':   '200ms',
    'sbp-page':   '180ms',
    'sbp-slow':   '300ms',
  },

  zIndex: {
    'sbp-sticky':  '100',
    'sbp-banner':  '800',
    'sbp-drawer':  '1000',
    'sbp-modal':   '9000',
    'sbp-toast':   '9500',
  },
};

module.exports = sbpTokens;