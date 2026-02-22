# SteelBuild Pro - Enterprise Theme System

## Overview
Dual-theme system (Dark + Light) for enterprise construction management. Zero hardcoded colors - all styling uses CSS custom properties (design tokens).

## Theme Architecture

### Token Structure
All theme tokens are defined in `globals.css` under `[data-theme="dark"]` and `[data-theme="light"]`.

**DO NOT** hardcode hex/rgb colors in components. Always use `hsl(var(--token-name))`.

### Core Token Categories

#### Backgrounds
- `--app-bg` - Root app background
- `--surface-1` - Primary surface (cards, panels)
- `--surface-2` - Secondary surface (inputs, nested panels)
- `--surface-elevated` - Elevated UI (dropdowns, modals)
- `--surface-hover` - Hover state for interactive surfaces

#### Text
- `--text-primary` - Body text, headings
- `--text-secondary` - Labels, secondary info
- `--text-muted` - Placeholder, helper text
- `--text-inverse` - Text on dark/accent backgrounds

#### Borders
- `--border-default` - Standard borders
- `--border-subtle` - Dividers, soft separators
- `--border-strong` - Emphasized borders
- `--border-accent` - Brand color borders

#### Brand/Accent (Steel Orange)
- `--accent-primary` - Primary brand color
- `--accent-hover` - Hover state
- `--accent-pressed` - Active/pressed state
- `--accent-subtle` - Subtle backgrounds (alpha)
- `--accent-text` - Text on accent backgrounds

#### Status Colors
Each has: `{color}-bg`, `{color}-text`, `{color}-border`
- `--success-*` - Green (completed, approved)
- `--warning-*` - Amber (pending, caution)
- `--error-*` - Red (critical, errors)
- `--info-*` - Blue (informational)

#### Interactive
- `--link-default` - Link color
- `--link-hover` - Link hover
- `--focus-ring` - Keyboard focus indicator
- `--disabled-bg` - Disabled element background
- `--disabled-text` - Disabled text

#### Shadows
- `--shadow-sm` - Subtle elevation
- `--shadow-md` - Medium elevation
- `--shadow-lg` - High elevation
- `--shadow-glow` - Accent glow (dark theme only)

## Usage Patterns

### ✅ CORRECT
```jsx
<div className="bg-[hsl(var(--surface-1))] text-[hsl(var(--text-primary))] border border-[hsl(var(--border-default))]">
  <h3 className="text-[hsl(var(--accent-primary))]">Title</h3>
</div>
```

### ❌ WRONG
```jsx
<div className="bg-zinc-900 text-white border border-zinc-800">
  <h3 className="text-amber-500">Title</h3>
</div>
```

## Adding New Components

1. **Never hardcode colors** - Use tokens only
2. **Test both themes** - Verify readability and contrast
3. **Interactive states** - Define hover, focus, disabled for both themes
4. **Respect token semantics** - Use `--surface-1` for cards, not `--app-bg`

## Theme Toggle

Implemented in `ThemeProvider` + `ThemeToggle` component.
- Default: Dark theme
- Persists in localStorage as `steelbuild-theme`
- Instant switch, no page reload
- Pre-paint application (no FOUC)

## Light Theme Direction

- **Background**: Warm concrete/off-white (construction feel)
- **Surfaces**: Crisp white + light gray
- **Accents**: Same steel orange, tuned for light BG
- **Borders**: Stronger than typical consumer apps (enterprise clarity)
- **Optional texture**: Subtle blueprint grid (low opacity, behind content)

## Migration Checklist

When refactoring existing components:
1. Search for hardcoded Tailwind colors (`bg-zinc-`, `text-white`, etc.)
2. Replace with token equivalents
3. Test component in BOTH themes
4. Verify focus states and hover effects
5. Check tables, forms, modals for readability

## Shadcn Compatibility

Legacy shadcn variables are mapped to theme tokens for backward compatibility:
- `--background` → `--app-bg`
- `--foreground` → `--text-primary`
- `--card` → `--surface-1`
- `--primary` → `--accent-primary`
- etc.

This allows gradual migration of existing shadcn components.