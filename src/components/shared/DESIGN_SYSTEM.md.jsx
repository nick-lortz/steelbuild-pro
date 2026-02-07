# SteelBuild Pro Design System

**Last updated:** 2026-02-07  
**Version:** 1.0

This document defines the visual language and UI patterns for SteelBuild Pro—a steel fabrication project management platform. The system prioritizes clarity, scannability, and production-readiness for field and office users.

---

## 1. Typography Scale

### Headings
```
Page Title:       text-3xl font-bold text-white tracking-tight
Section Heading:  text-xl font-bold text-white uppercase tracking-wide
Subsection:       text-sm font-bold text-zinc-400 uppercase tracking-widest
```

### Body Text
```
Body:             text-sm text-zinc-300
Caption:          text-xs text-zinc-500
Muted:            text-xs text-zinc-600
Label:            text-xs font-medium text-zinc-400 uppercase tracking-wider
```

### Monospace (data, codes)
```
font-mono text-sm
```

---

## 2. Spacing Scale

Use Tailwind spacing consistently:

```
Page container:       max-w-[1800px] mx-auto px-8 py-6
Section spacing:      space-y-6 (between major sections)
Card padding:         p-4 (compact), p-6 (standard)
Form field spacing:   space-y-4
Grid gaps:            gap-4 (standard), gap-6 (spacious)
```

**Rule:** Never use arbitrary values like `mb-7`, `px-5`. Stick to 4-unit increments.

---

## 3. Color System

### Backgrounds
```
Page background:      bg-gradient-to-b from-zinc-950 to-black
Section background:   bg-zinc-950/50
Card background:      bg-zinc-900 border-zinc-800
Hover state:          hover:bg-zinc-800
```

### Borders
```
Standard border:      border-zinc-800/50
Divider:              border-zinc-800
Accent border:        border-amber-500/30
```

### Status Colors
```
Success:    text-green-400, bg-green-500/10, border-green-500/30
Warning:    text-amber-400, bg-amber-500/10, border-amber-500/30
Error:      text-red-400, bg-red-500/10, border-red-500/30
Info:       text-blue-400, bg-blue-500/10, border-blue-500/30
Neutral:    text-zinc-400, bg-zinc-800, border-zinc-700
```

### Accent (Primary Action)
```
Amber:      bg-amber-500 hover:bg-amber-600 text-black
```

---

## 4. Component Standards

### Buttons

**Primary (main action)**
```jsx
<Button className="bg-amber-500 hover:bg-amber-600 text-black font-bold">
  <Plus size={16} className="mr-2" />
  Create
</Button>
```

**Secondary (less emphasis)**
```jsx
<Button variant="outline" className="border-zinc-700 text-white">
  Cancel
</Button>
```

**Destructive**
```jsx
<Button className="bg-red-500 hover:bg-red-600 text-white">
  Delete
</Button>
```

**Ghost (tertiary)**
```jsx
<Button variant="ghost" size="sm" className="text-zinc-400">
  Edit
</Button>
```

### Cards

**Standard card**
```jsx
<Card className="bg-zinc-900 border-zinc-800 rounded-lg">
  <CardHeader>
    <CardTitle className="text-sm font-bold uppercase tracking-wider">
      Title
    </CardTitle>
  </CardHeader>
  <CardContent className="p-4">
    {/* content */}
  </CardContent>
</Card>
```

**Metric card (KPI)**
```jsx
<Card className="bg-zinc-900 border-zinc-800">
  <CardContent className="p-4">
    <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-1">
      Label
    </div>
    <div className="text-3xl font-bold text-white">123</div>
  </CardContent>
</Card>
```

### Forms

**Field wrapper**
```jsx
<div className="space-y-2">
  <Label className="text-xs font-medium text-zinc-400 uppercase">
    Field Name
  </Label>
  <Input 
    className="bg-zinc-900 border-zinc-800 text-white"
    placeholder="Enter value..."
  />
</div>
```

**Form grid**
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {/* fields */}
</div>
```

### Tables

**Data table wrapper** (use DataTable component)
```jsx
<DataTable 
  columns={columns}
  data={data}
  onRowClick={handleRowClick}
  emptyMessage="No records found."
/>
```

**Table styles** (if custom)
```
Header:    text-xs font-medium text-zinc-400 uppercase tracking-wider p-3
Row:       hover:bg-zinc-800/50 border-b border-zinc-800 p-3
```

---

## 5. Page Layout Template

Every page MUST follow this structure:

```jsx
<div className="min-h-screen bg-gradient-to-b from-zinc-950 to-black">
  {/* 1. HEADER SECTION */}
  <div className="border-b border-zinc-800/50 bg-gradient-to-b from-zinc-900 to-zinc-950/50">
    <div className="max-w-[1800px] mx-auto px-8 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Page Title</h1>
          <p className="text-sm text-zinc-500 font-mono mt-1">subtitle or count</p>
        </div>
        {/* Primary actions */}
        <div className="flex gap-2">
          <Button>Action</Button>
        </div>
      </div>
    </div>
  </div>

  {/* 2. METRICS SECTION (if applicable) */}
  <div className="border-b border-zinc-800/50 bg-zinc-950/50">
    <div className="max-w-[1800px] mx-auto px-8 py-4">
      <div className="grid grid-cols-4 gap-4">
        {/* KPI cards */}
      </div>
    </div>
  </div>

  {/* 3. FILTERS SECTION (if applicable) */}
  <div className="border-b border-zinc-800/50 bg-zinc-950/30">
    <div className="max-w-[1800px] mx-auto px-8 py-3">
      {/* Search, selects, filters */}
    </div>
  </div>

  {/* 4. CONTENT SECTION */}
  <div className="max-w-[1800px] mx-auto px-8 py-6">
    {/* Main content */}
  </div>
</div>
```

---

## 6. State Components

### Loading State
```jsx
<div className="flex items-center justify-center py-20">
  <div className="text-center">
    <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
    <p className="text-sm text-zinc-500">Loading...</p>
  </div>
</div>
```

### Empty State
```jsx
<div className="text-center py-20">
  <Icon size={64} className="mx-auto mb-4 text-zinc-700" />
  <h3 className="text-lg font-bold text-zinc-400 mb-2">No Items Found</h3>
  <p className="text-sm text-zinc-600 mb-6">Description of empty state</p>
  <Button>Create First Item</Button>
</div>
```

### Error State
```jsx
<div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
  <div className="flex items-start gap-3">
    <AlertTriangle size={16} className="text-red-400 mt-0.5" />
    <div>
      <p className="text-sm font-bold text-red-400">Error Title</p>
      <p className="text-xs text-zinc-400 mt-1">Error description</p>
    </div>
  </div>
</div>
```

---

## 7. Navigation Patterns

### Sidebar (global layout)
- Black background (`bg-black`)
- Collapsible groups
- Active page: `bg-amber-500 text-black`
- Hover: `hover:bg-zinc-900 text-white`

### Mobile Bottom Nav
- Fixed bottom bar with primary nav items

### Breadcrumbs (if needed)
```jsx
Project > Work Packages > WP-001
```

---

## 8. Responsive Behavior

```
Mobile:      Stack all, full-width selects
Tablet:      2-column grids where appropriate
Desktop:     Max 4-6 columns for KPIs, maintain readability
```

**Touch targets:** Minimum 44px height on mobile for buttons/links.

---

## 9. Accessibility

- All buttons: proper focus rings (`focus-visible:ring-2 focus-visible:ring-amber-500`)
- Form fields: associated labels with `<Label htmlFor>`
- Color contrast: WCAG AA minimum
- Keyboard navigation: all interactive elements reachable via Tab
- Skip to main content link for screen readers

---

## 10. Do's and Don'ts

### ✅ DO
- Use consistent spacing (px-8, py-6, gap-4)
- Use semantic colors (red = error, amber = primary, green = success)
- Keep card padding uniform (p-4 or p-6)
- Use uppercase tracking-wide for labels/headings
- Use monospace for codes, IDs, numbers
- Wrap pages in the standard 4-section layout

### ❌ DON'T
- Use arbitrary spacing values (e.g., `mb-7`, `px-5`)
- Mix heading styles on the same page
- Create one-off button variants
- Use inline styles unless unavoidable
- Skip loading/empty states
- Nest cards unnecessarily (keep hierarchy flat)

---

## 11. File Organization

**Shared primitives:** `/components/layout/`
- PageShell.jsx
- PageHeader.jsx  
- SectionCard.jsx
- Toolbar.jsx
- MetricsBar.jsx
- LoadingState.jsx
- EmptyState.jsx

**Page structure:** Always use these primitives instead of custom markup.

---

**End of Design System**