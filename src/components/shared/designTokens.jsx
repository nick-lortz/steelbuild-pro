{
  "$schema": "https://design-tokens.github.io/community-group/format/",
  "$metadata": {
    "name": "SteelBuild-Pro Design Tokens v2",
    "version": "2.0.0",
    "description": "Industrial dark theme — copy-paste into Tailwind extend or CSS vars"
  },

  "color": {
    "frame":      { "$value": "#0B0D10",  "$type": "color", "$description": "App shell background" },
    "panel":      { "$value": "#14181E",  "$type": "color", "$description": "Card / panel surface" },
    "panel2":     { "$value": "#1A1F27",  "$type": "color", "$description": "Nested panels, alt rows" },
    "page":       { "$value": "#2B2F38",  "$type": "color", "$description": "Outer page margin" },
    "border":     { "$value": "rgba(255,255,255,0.06)", "$type": "color" },
    "text":       { "$value": "rgba(255,255,255,0.92)", "$type": "color" },
    "textDim":    { "$value": "rgba(255,255,255,0.70)", "$type": "color" },
    "textMute":   { "$value": "rgba(255,255,255,0.50)", "$type": "color" },
    "accent":     { "$value": "#FF5A1F",  "$type": "color", "$description": "Primary brand / CTA" },
    "accent2":    { "$value": "#FF7A2F",  "$type": "color", "$description": "Hover state of accent" },
    "accentGlow": { "$value": "rgba(255,90,31,0.35)", "$type": "color" },
    "success":    { "$value": "#4DD6A4",  "$type": "color" },
    "warning":    { "$value": "#FFB15A",  "$type": "color" },
    "danger":     { "$value": "#FF4D4D",  "$type": "color" },
    "info":       { "$value": "#4DA3FF",  "$type": "color" },

    "substitutions": {
      "$description": "Map old #000000 / #6b7280 values to SBP tokens",
      "black000000":  { "replace_with": "#0B0D10", "token": "frame" },
      "gray6b7280":   { "replace_with": "rgba(255,255,255,0.50)", "token": "textMute" },
      "gray374151":   { "replace_with": "#1A1F27", "token": "panel2" },
      "gray1f2937":   { "replace_with": "#14181E", "token": "panel" },
      "gray9ca3af":   { "replace_with": "rgba(255,255,255,0.70)", "token": "textDim" }
    }
  },

  "typography": {
    "fontFamily": { "$value": "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
    "h1": { "size": "1.5rem",    "weight": 800, "letterSpacing": "-0.02em" },
    "h2": { "size": "1.125rem",  "weight": 700, "letterSpacing": "-0.01em" },
    "h3": { "size": "0.875rem",  "weight": 700, "letterSpacing": "0" },
    "h4": { "size": "0.75rem",   "weight": 700, "letterSpacing": "0.06em" },
    "body": { "size": "0.8125rem", "weight": 400, "letterSpacing": "0" },
    "bodySm": { "size": "0.75rem", "weight": 400, "letterSpacing": "0" },
    "caption": { "size": "0.625rem", "weight": 700, "letterSpacing": "0.12em", "textTransform": "uppercase" },
    "mono": { "size": "0.6875rem", "weight": 400, "fontFamily": "monospace" }
  },

  "spacing": {
    "1":  { "$value": "4px" },
    "2":  { "$value": "8px" },
    "3":  { "$value": "12px" },
    "4":  { "$value": "16px" },
    "5":  { "$value": "20px" },
    "6":  { "$value": "24px" },
    "8":  { "$value": "32px" },
    "10": { "$value": "40px" },
    "12": { "$value": "48px" },
    "16": { "$value": "64px" }
  },

  "borderRadius": {
    "sm":    { "$value": "6px" },
    "md":    { "$value": "8px" },
    "lg":    { "$value": "10px" },
    "xl":    { "$value": "12px" },
    "2xl":   { "$value": "16px" },
    "3xl":   { "$value": "20px" },
    "pill":  { "$value": "999px" }
  },

  "shadow": {
    "panel":   { "$value": "0 8px 24px rgba(0,0,0,0.45)" },
    "frame":   { "$value": "0 24px 64px rgba(0,0,0,0.7)" },
    "accentGlow": { "$value": "0 0 0 1px rgba(255,90,31,0.25), 0 8px 22px rgba(255,90,31,0.18)" },
    "accentGlowStrong": { "$value": "0 0 0 1px rgba(255,90,31,0.4), 0 12px 28px rgba(255,90,31,0.3)" },
    "focusInput": { "$value": "0 0 0 3px rgba(255,90,31,0.18)" }
  },

  "transition": {
    "fast":       { "$value": "100ms ease-in" },
    "base":       { "$value": "200ms cubic-bezier(0.65,0,0.35,1)" },
    "smooth":     { "$value": "200ms ease" },
    "spring":     { "$value": "200ms cubic-bezier(0.34,1.56,0.64,1)" },
    "page":       { "$value": "180ms cubic-bezier(0.65,0,0.35,1)" },
    "dropdown":   { "open": "150ms ease-out", "close": "100ms ease-in" },
    "modal":      { "open": "200ms cubic-bezier(0.34,1.56,0.64,1)", "close": "150ms ease-in" }
  },

  "zIndex": {
    "base":         0,
    "stickyHeader": 100,
    "errorBanner":  800,
    "drawer":       1000,
    "modal":        9000,
    "queueBar":     9000,
    "toast":        9500
  },

  "components": {
    "button": {
      "primary": {
        "background": "linear-gradient(90deg, #FF5A1F, #FF7A2F)",
        "color": "#ffffff",
        "borderRadius": "8px",
        "padding": "7px 16px",
        "shadow": "0 0 0 1px rgba(255,90,31,0.25), 0 8px 22px rgba(255,90,31,0.18)",
        "hoverShadow": "0 0 0 1px rgba(255,90,31,0.4), 0 12px 28px rgba(255,90,31,0.3)",
        "hoverTransform": "translateY(-1px)"
      },
      "secondary": {
        "background": "#1A1F27",
        "color": "rgba(255,255,255,0.6)",
        "border": "1px solid rgba(255,255,255,0.08)",
        "borderRadius": "999px",
        "padding": "7px 16px"
      },
      "ghost": {
        "background": "transparent",
        "color": "rgba(255,255,255,0.4)",
        "border": "1px solid rgba(255,255,255,0.07)",
        "borderRadius": "8px",
        "padding": "7px 16px"
      },
      "danger": {
        "background": "rgba(255,77,77,0.1)",
        "color": "#FF4D4D",
        "border": "1px solid rgba(255,77,77,0.25)",
        "borderRadius": "8px"
      },
      "success": {
        "background": "rgba(77,214,164,0.08)",
        "color": "#4DD6A4",
        "border": "1px solid rgba(77,214,164,0.2)",
        "borderRadius": "8px"
      }
    },
    "card": {
      "background": "#14181E",
      "border": "1px solid rgba(255,255,255,0.06)",
      "innerHighlight": "inset 0 0 0 1px rgba(255,255,255,0.04)",
      "borderRadius": "16px",
      "shadow": "0 8px 24px rgba(0,0,0,0.45)",
      "padding": "16px 20px",
      "hoverBorder": "rgba(255,255,255,0.10)"
    },
    "input": {
      "background": "#14181E",
      "border": "1px solid rgba(255,255,255,0.08)",
      "borderRadius": "10px",
      "padding": "7px 12px",
      "color": "rgba(255,255,255,0.88)",
      "placeholderColor": "rgba(255,255,255,0.25)",
      "focusBorder": "rgba(255,90,31,0.5)",
      "focusShadow": "0 0 0 3px rgba(255,90,31,0.18)"
    },
    "tableRow": {
      "default":  { "background": "transparent",              "borderBottom": "1px solid rgba(255,255,255,0.03)" },
      "hover":    { "background": "rgba(255,255,255,0.025)",   "borderBottom": "none" },
      "selected": { "background": "rgba(255,90,31,0.06)",      "borderBottom": "none" },
      "error":    { "background": "rgba(255,77,77,0.04)",      "borderBottom": "1px dashed rgba(255,77,77,0.2)" }
    },
    "badge": {
      "borderRadius": "999px",
      "padding": "3px 8px",
      "fontSize": "0.6rem",
      "fontWeight": 700,
      "letterSpacing": "0.08em",
      "variants": {
        "accent":  { "bg": "rgba(255,90,31,0.12)",  "color": "#FF7A2F", "border": "rgba(255,90,31,0.25)" },
        "success": { "bg": "rgba(77,214,164,0.12)", "color": "#4DD6A4", "border": "rgba(77,214,164,0.2)" },
        "warning": { "bg": "rgba(255,177,90,0.12)", "color": "#FFB15A", "border": "rgba(255,177,90,0.2)" },
        "danger":  { "bg": "rgba(255,77,77,0.12)",  "color": "#FF4D4D", "border": "rgba(255,77,77,0.2)" },
        "info":    { "bg": "rgba(77,163,255,0.12)", "color": "#4DA3FF", "border": "rgba(77,163,255,0.2)" },
        "mute":    { "bg": "rgba(255,255,255,0.05)","color": "rgba(255,255,255,0.5)", "border": "rgba(255,255,255,0.06)" }
      }
    }
  }
}