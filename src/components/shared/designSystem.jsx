/**
 * SteelBuild Pro Design System
 * Ultra-dark, futuristic aesthetic with ambient lighting
 */

export const designTokens = {
  // Color System
  colors: {
    // Base backgrounds
    bg: {
      primary: '#0A0E13',
      secondary: '#0F1419',
      tertiary: '#151B24',
      elevated: '#1A222D',
      modal: 'rgba(10, 14, 19, 0.95)',
    },
    
    // Accent gradients
    accent: {
      orange: '#FF6B2C',
      amber: '#FF9D42',
      warmGlow: 'linear-gradient(135deg, #FF6B2C 0%, #FF9D42 50%, #FFB84D 100%)',
      coolGlow: 'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 50%, #60A5FA 100%)',
      radialWarm: 'radial-gradient(circle at center, rgba(255, 107, 44, 0.3) 0%, transparent 70%)',
      radialCool: 'radial-gradient(circle at center, rgba(59, 130, 246, 0.2) 0%, transparent 70%)',
    },
    
    // Text hierarchy
    text: {
      primary: '#E5E7EB',
      secondary: '#9CA3AF',
      tertiary: '#6B7280',
      accent: '#FF9D42',
      muted: '#4B5563',
    },
    
    // Interactive states
    interactive: {
      hover: 'rgba(255, 157, 66, 0.1)',
      active: 'rgba(255, 157, 66, 0.2)',
      focus: '#FF9D42',
      disabled: '#374151',
    },
    
    // Borders & dividers
    border: {
      default: 'rgba(255, 255, 255, 0.05)',
      elevated: 'rgba(255, 255, 255, 0.1)',
      glow: 'rgba(255, 157, 66, 0.3)',
      glowBlue: 'rgba(59, 130, 246, 0.3)',
    },
    
    // Status colors with glow
    status: {
      success: { base: '#10B981', glow: 'rgba(16, 185, 129, 0.3)' },
      warning: { base: '#F59E0B', glow: 'rgba(245, 158, 11, 0.3)' },
      error: { base: '#EF4444', glow: 'rgba(239, 68, 68, 0.3)' },
      info: { base: '#3B82F6', glow: 'rgba(59, 130, 246, 0.3)' },
    },
  },
  
  // Typography
  typography: {
    fontFamily: {
      primary: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      mono: "'JetBrains Mono', 'Fira Code', monospace",
    },
    
    fontSize: {
      xs: '0.75rem',      // 12px
      sm: '0.875rem',     // 14px
      base: '1rem',       // 16px
      lg: '1.125rem',     // 18px
      xl: '1.25rem',      // 20px
      '2xl': '1.5rem',    // 24px
      '3xl': '1.875rem',  // 30px
      '4xl': '2.25rem',   // 36px
      '5xl': '3rem',      // 48px
      '6xl': '3.75rem',   // 60px
      '7xl': '4.5rem',    // 72px
    },
    
    fontWeight: {
      thin: 100,
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      black: 900,
    },
    
    letterSpacing: {
      tight: '-0.02em',
      normal: '0',
      wide: '0.02em',
      wider: '0.05em',
      widest: '0.1em',
    },
    
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  
  // Spacing system (4px base)
  spacing: {
    0: '0',
    1: '0.25rem',   // 4px
    2: '0.5rem',    // 8px
    3: '0.75rem',   // 12px
    4: '1rem',      // 16px
    5: '1.25rem',   // 20px
    6: '1.5rem',    // 24px
    8: '2rem',      // 32px
    10: '2.5rem',   // 40px
    12: '3rem',     // 48px
    16: '4rem',     // 64px
    20: '5rem',     // 80px
    24: '6rem',     // 96px
    32: '8rem',     // 128px
  },
  
  // Border radius
  radius: {
    none: '0',
    sm: '0.25rem',   // 4px
    base: '0.5rem',  // 8px
    md: '0.75rem',   // 12px
    lg: '1rem',      // 16px
    xl: '1.5rem',    // 24px
    '2xl': '2rem',   // 32px
    full: '9999px',
  },
  
  // Shadows with glow effects
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.5)',
    base: '0 2px 4px rgba(0, 0, 0, 0.6)',
    md: '0 4px 8px rgba(0, 0, 0, 0.7)',
    lg: '0 8px 16px rgba(0, 0, 0, 0.8)',
    xl: '0 16px 32px rgba(0, 0, 0, 0.9)',
    glowOrange: '0 0 20px rgba(255, 157, 66, 0.4), 0 0 40px rgba(255, 157, 66, 0.2)',
    glowBlue: '0 0 20px rgba(59, 130, 246, 0.4), 0 0 40px rgba(59, 130, 246, 0.2)',
    inner: 'inset 0 2px 4px rgba(0, 0, 0, 0.6)',
  },
  
  // Animation
  animation: {
    duration: {
      fast: '150ms',
      base: '250ms',
      slow: '350ms',
      slower: '500ms',
    },
    
    easing: {
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      smooth: 'cubic-bezier(0.65, 0, 0.35, 1)',
    },
  },
  
  // Breakpoints
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
  
  // Z-index layers
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
  },
};

// Glassmorphism utilities
export const glassEffect = {
  light: {
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  
  medium: {
    background: 'rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
  },
  
  strong: {
    background: 'rgba(255, 255, 255, 0.12)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
  },
};

// Glow effects
export const glowEffects = {
  warmSubtle: {
    boxShadow: '0 0 20px rgba(255, 157, 66, 0.2)',
  },
  
  warmMedium: {
    boxShadow: '0 0 30px rgba(255, 157, 66, 0.3), 0 0 60px rgba(255, 157, 66, 0.1)',
  },
  
  warmStrong: {
    boxShadow: '0 0 40px rgba(255, 157, 66, 0.4), 0 0 80px rgba(255, 157, 66, 0.2)',
  },
  
  coolSubtle: {
    boxShadow: '0 0 20px rgba(59, 130, 246, 0.2)',
  },
  
  coolMedium: {
    boxShadow: '0 0 30px rgba(59, 130, 246, 0.3), 0 0 60px rgba(59, 130, 246, 0.1)',
  },
};

export default designTokens;