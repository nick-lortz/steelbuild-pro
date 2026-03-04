{
  "_file": "tokens.json",
  "_app": "SteelBuild-Pro",
  "_theme": "Industrial Dark v1.0",

  "colors": {
    "primary": {
      "DEFAULT": "#FF5A1F",
      "hover":   "#FF7A2F",
      "subtle":  "rgba(255,90,31,0.12)",
      "glow":    "rgba(255,90,31,0.35)"
    },
    "surface": {
      "page":        "#2B2F38",
      "frame":       "#0B0D10",
      "panel":       "#14181E",
      "panel-alt":   "#1A1F27",
      "panel-deep":  "#0F1318",
      "overlay":     "rgba(11,13,16,0.85)"
    },
    "border": {
      "default":  "rgba(255,255,255,0.06)",
      "subtle":   "rgba(255,255,255,0.04)",
      "strong":   "rgba(255,255,255,0.12)",
      "focus":    "rgba(255,90,31,0.50)"
    },
    "text": {
      "primary":   "rgba(255,255,255,0.92)",
      "secondary": "rgba(255,255,255,0.70)",
      "muted":     "rgba(255,255,255,0.50)",
      "disabled":  "rgba(255,255,255,0.25)",
      "inverse":   "#0B0D10"
    },
    "status": {
      "success":         "#4DD6A4",
      "success-subtle":  "rgba(77,214,164,0.12)",
      "warning":         "#FFB15A",
      "warning-subtle":  "rgba(255,177,90,0.12)",
      "danger":          "#FF4D4D",
      "danger-subtle":   "rgba(255,77,77,0.12)",
      "info":            "#4DA3FF",
      "info-subtle":     "rgba(77,163,255,0.12)"
    },
    "legacy": {
      "_note": "Original app colors — kept as aliases. Use surface.frame and text.muted instead.",
      "#000000": { "replacement": "#0B0D10", "token": "surface.frame",   "reason": "Softer near-black; less harsh glare on monitors" },
      "#6b7280": { "replacement": "#52596A", "token": "text.muted",      "reason": "Cooler blue-gray; passes WCAG AA on dark panels" },
      "#374151": { "replacement": "#1A1F27", "token": "surface.panel-alt","reason": "Deeper tone; cohesive with panel layer system" }
    }
  },

  "spacing": {
    "1":  "4px",
    "2":  "8px",
    "3":  "12px",
    "4":  "16px",
    "5":  "20px",
    "6":  "24px",
    "8":  "32px",
    "10": "40px",
    "12": "48px",
    "16": "64px",
    "20": "80px",
    "24": "96px"
  },

  "typography": {
    "fontFamily": {
      "sans": "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      "mono": "'JetBrains Mono', 'Fira Code', 'Courier New', monospace"
    },
    "h1":      { "size": "1.5rem",    "weight": 800, "lineHeight": 1.2,  "letterSpacing": "-0.02em" },
    "h2":      { "size": "1.125rem",  "weight": 700, "lineHeight": 1.3,  "letterSpacing": "-0.01em" },
    "h3":      { "size": "0.875rem",  "weight": 700, "lineHeight": 1.4,  "letterSpacing": "0" },
    "h4":      { "size": "0.75rem",   "weight": 700, "lineHeight": 1.4,  "letterSpacing": "0.06em",  "textTransform": "uppercase" },
    "body":    { "size": "0.8125rem", "weight": 400, "lineHeight": 1.5,  "letterSpacing": "0" },
    "body-sm": { "size": "0.75rem",   "weight": 400, "lineHeight": 1.5,  "letterSpacing": "0" },
    "caption": { "size": "0.625rem",  "weight": 700, "lineHeight": 1.4,  "letterSpacing": "0.10em",  "textTransform": "uppercase" },
    "label":   { "size": "0.70rem",   "weight": 600, "lineHeight": 1.4,  "letterSpacing": "0.06em" },
    "metric":  { "size": "2rem",      "weight": 700, "lineHeight": 1.0,  "letterSpacing": "-0.02em" }
  },

  "borderRadius": {
    "none":   "0",
    "sm":     "4px",
    "md":     "8px",
    "control":"10px",
    "card":   "16px",
    "frame":  "20px",
    "pill":   "9999px"
  },

  "elevation": {
    "e0":          "none",
    "e1":          "0 2px 8px rgba(0,0,0,0.30)",
    "e2":          "0 8px 24px rgba(0,0,0,0.45)",
    "e3":          "0 16px 40px rgba(0,0,0,0.60)",
    "e4":          "0 24px 64px rgba(0,0,0,0.70)",
    "glow-accent": "0 0 0 1px rgba(255,90,31,0.25), 0 8px 22px rgba(255,90,31,0.18)",
    "glow-success":"0 0 0 1px rgba(77,214,164,0.20), 0 4px 12px rgba(77,214,164,0.12)",
    "glow-danger": "0 0 0 1px rgba(255,77,77,0.20),  0 4px 12px rgba(255,77,77,0.12)",
    "focus":       "0 0 0 3px rgba(255,90,31,0.18)"
  },

  "layout": {
    "containerMax": "1280px",
    "framePadding": "16px",
    "navHeight":    "48px",
    "pagePadding": {
      "mobile":  "8px",
      "tablet":  "12px",
      "desktop": "16px"
    }
  },

  "motion": {
    "easing": {
      "standard":   "cubic-bezier(0.65, 0, 0.35, 1)",
      "decelerate": "cubic-bezier(0.0, 0.0, 0.2, 1)",
      "accelerate": "cubic-bezier(0.4, 0.0, 1, 1)",
      "spring":     "cubic-bezier(0.34, 1.56, 0.64, 1)"
    },
    "duration": {
      "instant": "80ms",
      "fast":    "150ms",
      "normal":  "200ms",
      "slow":    "300ms"
    }
  },

  "components": {
    "button": {
      "primary": {
        "background":    "linear-gradient(90deg, #FF5A1F, #FF7A2F)",
        "color":         "#ffffff",
        "borderRadius":  "10px",
        "border":        "none",
        "padding":       "8px 20px",
        "fontSize":      "0.7rem",
        "fontWeight":    700,
        "letterSpacing": "0.10em",
        "textTransform": "uppercase",
        "shadow":        "0 0 0 1px rgba(255,90,31,0.25), 0 8px 22px rgba(255,90,31,0.18)",
        "hover": {
          "transform": "translateY(-1px)",
          "shadow":    "0 0 0 1px rgba(255,90,31,0.40), 0 12px 28px rgba(255,90,31,0.30)"
        },
        "pressed": { "transform": "translateY(0) scale(0.98)" },
        "focus":   { "shadow": "0 0 0 3px rgba(255,90,31,0.18)" }
      },
      "secondary": {
        "background":   "#1A1F27",
        "color":        "rgba(255,255,255,0.70)",
        "borderRadius": "9999px",
        "border":       "1px solid rgba(255,255,255,0.06)",
        "padding":      "7px 16px",
        "fontSize":     "0.7rem",
        "fontWeight":   600,
        "hover": {
          "background": "rgba(255,255,255,0.06)",
          "borderColor":"rgba(255,255,255,0.12)",
          "color":      "rgba(255,255,255,0.92)"
        }
      },
      "ghost": {
        "background":   "transparent",
        "color":        "rgba(255,255,255,0.50)",
        "borderRadius": "8px",
        "border":       "none",
        "padding":      "6px 12px",
        "hover": { "background": "rgba(255,255,255,0.05)", "color": "rgba(255,255,255,0.88)" }
      },
      "danger": {
        "background":   "rgba(255,77,77,0.12)",
        "color":        "#FF4D4D",
        "borderRadius": "10px",
        "border":       "1px solid rgba(255,77,77,0.20)"
      },
      "icon": {
        "size":         "36px",
        "borderRadius": "50%",
        "background":   "#1A1F27",
        "border":       "1px solid rgba(255,255,255,0.06)"
      }
    },
    "card": {
      "background":   "#14181E",
      "borderRadius": "16px",
      "border":       "1px solid rgba(255,255,255,0.06)",
      "shadow":       "inset 0 0 0 1px rgba(255,255,255,0.04), 0 8px 24px rgba(0,0,0,0.45)",
      "padding":      "16px",
      "hover":        { "shadow": "0 16px 40px rgba(0,0,0,0.60)" },
      "variants": {
        "elevated": { "shadow": "0 16px 40px rgba(0,0,0,0.60)" },
        "flat":     { "shadow": "none", "border": "1px solid rgba(255,255,255,0.04)" },
        "accent":   { "border": "1px solid rgba(255,90,31,0.18)", "shadow": "0 0 12px rgba(255,90,31,0.08)" }
      }
    },
    "input": {
      "background":   "#14181E",
      "border":       "1px solid rgba(255,255,255,0.08)",
      "borderRadius": "10px",
      "color":        "rgba(255,255,255,0.92)",
      "padding":      "7px 12px",
      "fontSize":     "0.8125rem",
      "height":       "36px",
      "placeholder":  "rgba(255,255,255,0.25)",
      "focus": {
        "borderColor": "rgba(255,90,31,0.50)",
        "shadow":      "0 0 0 3px rgba(255,90,31,0.18)"
      }
    },
    "table": {
      "header": {
        "background":    "rgba(255,255,255,0.02)",
        "color":         "rgba(255,255,255,0.30)",
        "fontSize":      "0.6rem",
        "fontWeight":    700,
        "letterSpacing": "0.10em",
        "textTransform": "uppercase",
        "padding":       "5px 10px",
        "borderBottom":  "1px solid rgba(255,255,255,0.06)"
      },
      "row": {
        "borderBottom":  "1px solid rgba(255,255,255,0.03)",
        "hoverBg":       "rgba(255,255,255,0.025)",
        "height":        "28px"
      },
      "cell": {
        "padding":   "5px 10px",
        "fontSize":  "0.72rem",
        "color":     "rgba(255,255,255,0.75)"
      }
    },
    "badge": {
      "borderRadius": "9999px",
      "padding":      "2px 8px",
      "fontSize":     "0.6rem",
      "fontWeight":   700,
      "letterSpacing":"0.08em",
      "textTransform":"uppercase",
      "variants": {
        "accent":  { "background": "rgba(255,90,31,0.12)",  "color": "#FF8C42",  "border": "1px solid rgba(255,90,31,0.25)" },
        "success": { "background": "rgba(77,214,164,0.12)", "color": "#4DD6A4",  "border": "1px solid rgba(77,214,164,0.20)" },
        "warning": { "background": "rgba(255,177,90,0.12)", "color": "#FFB15A",  "border": "1px solid rgba(255,177,90,0.20)" },
        "danger":  { "background": "rgba(255,77,77,0.12)",  "color": "#FF4D4D",  "border": "1px solid rgba(255,77,77,0.20)" },
        "info":    { "background": "rgba(77,163,255,0.12)", "color": "#4DA3FF",  "border": "1px solid rgba(77,163,255,0.20)" },
        "muted":   { "background": "rgba(255,255,255,0.05)","color": "rgba(255,255,255,0.50)", "border": "1px solid rgba(255,255,255,0.06)" }
      }
    },
    "modal": {
      "background":   "#14181E",
      "border":       "1px solid rgba(255,255,255,0.08)",
      "borderRadius": "16px",
      "shadow":       "0 24px 64px rgba(0,0,0,0.70)",
      "overlay":      "rgba(11,13,16,0.85)",
      "backdropBlur": "12px",
      "openDuration": "200ms",
      "closeDuration":"150ms",
      "easing":       "cubic-bezier(0.0, 0.0, 0.2, 1)"
    },
    "nav": {
      "height":          "48px",
      "background":      "rgba(13,17,23,0.97)",
      "backdropBlur":    "12px",
      "borderBottom":    "1px solid rgba(255,255,255,0.06)",
      "activeItem": {
        "background": "linear-gradient(90deg, rgba(255,90,31,0.18), rgba(255,122,47,0.08))",
        "border":     "1px solid rgba(255,90,31,0.18)",
        "color":      "#FF8C42",
        "shadow":     "0 0 12px rgba(255,90,31,0.10)"
      }
    },
    "dropdown": {
      "openDuration":  "150ms",
      "closeDuration": "120ms",
      "openEasing":    "cubic-bezier(0.0, 0.0, 0.2, 1)",
      "closeEasing":   "cubic-bezier(0.4, 0.0, 1, 1)"
    }
  }
}