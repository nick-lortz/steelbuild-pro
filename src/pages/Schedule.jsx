import { useState, useMemo, useRef, useCallback, useEffect } from "react";

// ── Persistent storage helpers ──────────────────────────────────────────────
const STORAGE_KEY = "gantt-manager-data";
const loadData = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};
const saveData = (data) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
};

// ── Google Fonts injector ────────────────────────────────────────────────────
const FontLoader = () => (
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
);

// ── Constants ────────────────────────────────────────────────────────────────
const TASK_TYPES = {
  DETAILING:    { label: "Detailing",        color: "#7C6AF7", bg: "rgba(124,106,247,0.18)" },
  FABRICATION:  { label: "Fabrication",      color: "#FF8C42", bg: "rgba(255,140,66,0.18)"  },
  DELIVERY:     { label: "Delivery",         color: "#36B37E", bg: "rgba(54,179,126,0.18)"  },
  ERECTION:     { label: "Erection",         color: "#FF5A1F", bg: "rgba(255,90,31,0.18)"   },
  CUSTOM:       { label: "Custom",           color: "#4DC8E8", bg: "rgba(77,200,232,0.18)"  },
};

const STATUS_COLORS = {
  "NOT STARTED": "#6B7280",
  "IN PROGRESS": "#FFB020",
  "COMPLETE":    "#36B37E",
  "DELAYED":     "#FF4D4D",
  "ON HOLD":     "#7C6AF7",
};

const PROJECTS = [
  "Mesa Distribution Center",
  "Riverside Warehouse",
  "Chandler Office Build",
];

// ── Seed data ────────────────────────────────────────────────────────────────
const SEED_TASKS = [
  // Mesa Distribution Center
  { id: "T001", project: "Mesa Distribution Center", name: "IFC Drawing Release — Foundations", type: "DETAILING",   start: "2026-01-05", end: "2026-01-18", status: "COMPLETE",    crew: "Detailing Team", notes: "Issued for construction Rev 1" },
  { id: "T002", project: "Mesa Distribution Center", name: "IFC Drawing Release — Superstructure", type: "DETAILING",start: "2026-01-15", end: "2026-02-05", status: "COMPLETE",    crew: "Detailing Team", notes: "" },
  { id: "T003", project: "Mesa Distribution Center", name: "Fabrication — Foundations & Columns", type: "FABRICATION",start: "2026-01-20", end: "2026-02-28", status: "COMPLETE",  crew: "Shop Floor A",   notes: "Mark list WP-01 through WP-04" },
  { id: "T004", project: "Mesa Distribution Center", name: "Fabrication — Roof Beams & Joists",   type: "FABRICATION",start: "2026-02-10", end: "2026-03-20", status: "IN PROGRESS",crew: "Shop Floor B",   notes: "WP-09 camber RFI pending" },
  { id: "T005", project: "Mesa Distribution Center", name: "Delivery — Phase 1 Steel",            type: "DELIVERY",  start: "2026-02-25", end: "2026-03-03", status: "COMPLETE",    crew: "Logistics",      notes: "4 loads, flatbed" },
  { id: "T006", project: "Mesa Distribution Center", name: "Delivery — Phase 2 Steel",            type: "DELIVERY",  start: "2026-03-18", end: "2026-03-24", status: "NOT STARTED", crew: "Logistics",      notes: "Pending fab completion" },
  { id: "T007", project: "Mesa Distribution Center", name: "Erection — Columns Grid A–D",         type: "ERECTION",  start: "2026-03-04", end: "2026-03-14", status: "IN PROGRESS",crew: "Iron Crew 1",    notes: "Anchor bolt RFI-001 holding B4" },
  { id: "T008", project: "Mesa Distribution Center", name: "Erection — Main Roof Framing",        type: "ERECTION",  start: "2026-03-24", end: "2026-04-12", status: "NOT STARTED", crew: "Iron Crew 1",    notes: "" },
  { id: "T009", project: "Mesa Distribution Center", name: "Final Punch & Closeout",              type: "CUSTOM",    start: "2026-04-14", end: "2026-04-22", status: "NOT STARTED", crew: "PM",             notes: "" },

  // Riverside Warehouse
  { id: "T010", project: "Riverside Warehouse",      name: "IFC Drawing Release — Full Set",      type: "DETAILING",  start: "2026-01-10", end: "2026-01-28", status: "COMPLETE",    crew: "Detailing Team", notes: "" },
  { id: "T011", project: "Riverside Warehouse",      name: "Fabrication — Level 1 & 2 Framing",  type: "FABRICATION",start: "2026-01-28", end: "2026-03-10", status: "IN PROGRESS", crew: "Shop Floor A",   notes: "HSS pocket RFI-002 open" },
  { id: "T012", project: "Riverside Warehouse",      name: "Fabrication — Misc Metals / Stairs",  type: "FABRICATION",start: "2026-02-15", end: "2026-03-05", status: "COMPLETE",    crew: "Shop Floor C",   notes: "RFI-005 resolved Rev B" },
  { id: "T013", project: "Riverside Warehouse",      name: "Delivery — Structural Steel",         type: "DELIVERY",   start: "2026-03-12", end: "2026-03-17", status: "NOT STARTED", crew: "Logistics",      notes: "" },
  { id: "T014", project: "Riverside Warehouse",      name: "Erection — Level 1 Framing",          type: "ERECTION",   start: "2026-03-18", end: "2026-04-04", status: "NOT STARTED", crew: "Iron Crew 2",    notes: "" },
  { id: "T015", project: "Riverside Warehouse",      name: "Erection — Level 2 & Roof",           type: "ERECTION",   start: "2026-04-06", end: "2026-04-25", status: "NOT STARTED", crew: "Iron Crew 2",    notes: "" },

  // Chandler Office Build
  { id: "T016", project: "Chandler Office Build",    name: "IFC Drawing Release",                 type: "DETAILING",  start: "2025-12-15", end: "2026-01-10", status: "COMPLETE",    crew: "Detailing Team", notes: "" },
  { id: "T017", project: "Chandler Office Build",    name: "Fabrication — Embeds & Misc",         type: "FABRICATION",start: "2026-01-12", end: "2026-02-01", status: "COMPLETE",    crew: "Shop Floor B",   notes: "RFI-003 resolved" },
  { id: "T018", project: "Chandler Office Build",    name: "Fabrication — Structural Frame",      type: "FABRICATION",start: "2026-01-20", end: "2026-02-28", status: "COMPLETE",    crew: "Shop Floor A",   notes: "" },
  { id: "T019", project: "Chandler Office Build",    name: "Delivery — All Steel",                type: "DELIVERY",   start: "2026-03-01", end: "2026-03-06", status: "COMPLETE",    crew: "Logistics",      notes: "" },
  { id: "T020", project: "Chandler Office Build",    name: "Erection — Full Frame",               type: "ERECTION",   start: "2026-03-07", end: "2026-03-28", status: "IN PROGRESS", crew: "Iron Crew 3",    notes: "On schedule" },
  { id: "T021", project: "Chandler Office Build",    name: "Touch-up & Final Inspection",         type: "CUSTOM",     start: "2026-03-29", end: "2026-04-05", status: "NOT STARTED", crew: "PM",             notes: "" },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
const parseDate = (s) => new Date(s);
const fmtShort  = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
const fmtFull   = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const addDays   = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };

const EMPTY_TASK = {
  name: "", project: PROJECTS[0], type: "FABRICATION",
  start: new Date().toISOString().slice(0, 10),
  end: "", status: "NOT STARTED", crew: "", notes: "",
};

let _id = 100;
const genId = () => `T${String(++_id).padStart(3, "0")}`;

// ── Sub-components ───────────────────────────────────────────────────────────
const Pill = ({ type }) => {
  const m = TASK_TYPES[type] || TASK_TYPES.CUSTOM;
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
      padding: "2px 7px", borderRadius: 3,
      color: m.color, background: m.bg,
      fontFamily: "'IBM Plex Mono', monospace",
    }}>{m.label.toUpperCase()}</span>
  );
};

const StatusDot = ({ status }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 5,
    fontSize: 10, fontWeight: 700, color: STATUS_COLORS[status] || "#fff",
    fontFamily: "'IBM Plex Mono', monospace",
  }}>
    <span style={{ width: 6, height: 6, borderRadius: "50%", background: STATUS_COLORS[status], flexShrink: 0 }} />
    {status}
  </span>
);

const Btn = ({ children, onClick, variant = "primary", style, disabled }) => {
  const variants = {
    primary:   { background: "linear-gradient(135deg,#FF5A1F,#FF8C42)", color: "#fff" },
    secondary: { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.12)" },
    danger:    { background: "rgba(255,77,77,0.12)", color: "#FF4D4D", border: "1px solid rgba(255,77,77,0.25)" },
    ghost:     { background: "transparent", color: "rgba(255,255,255,0.45)" },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: "8px 16px", borderRadius: 6, fontWeight: 700, fontSize: 11,
      letterSpacing: "0.08em", cursor: disabled ? "not-allowed" : "pointer",
      border: "none", fontFamily: "'IBM Plex Mono', monospace",
      transition: "opacity 0.15s", opacity: disabled ? 0.5 : 1,
      ...variants[variant], ...style,
    }}>{children}</button>
  );
};

const Field = ({ label, children, style }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 5, ...style }}>
    <label style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "'IBM Plex Mono', monospace" }}>{label}</label>
    {children}
  </div>
);

const inputStyle = {
  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 6, padding: "8px 11px", color: "#fff", fontSize: 12,
  fontFamily: "'IBM Plex Mono', monospace", outline: "none",
};

// ── Task Form Modal ──────────────────────────────────────────────────────────
const TaskForm = ({ task, onSave, onClose, onDelete }) => {
  const [f, setF] = useState(task || EMPTY_TASK);
  const set = k => v => setF(p => ({ ...p, [k]: v }));
  const isNew = !task?.id;

  const inp = (k, type = "text", ph = "") => (
    <input type={type} value={f[k] || ""} placeholder={ph}
      onChange={e => set(k)(e.target.value)}
      style={inputStyle}
      onFocus={e => e.target.style.borderColor = "#FF8C42"}
      onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
    />
  );

  const sel = (k, opts) => (
    <select value={f[k] || ""} onChange={e => set(k)(e.target.value)}
      style={{ ...inputStyle, background: "#0A0E15", cursor: "pointer" }}>
      {opts.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );

  const handleSave = () => {
    if (!f.name || !f.start || !f.end) { alert("Name, Start, and End are required."); return; }
    if (new Date(f.end) <= new Date(f.start)) { alert("End date must be after start date."); return; }
    onSave(isNew ? { ...f, id: genId() } : f);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#0A0E15", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, width: "100%", maxWidth: 680, padding: 28, boxShadow: "0 40px 80px rgba(0,0,0,0.8)", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 9, color: "#FF8C42", letterSpacing: "0.18em", fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", marginBottom: 4 }}>
              {isNew ? "NEW TASK" : `EDIT ${f.id}`}
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "'Barlow Condensed', sans-serif", color: "#fff" }}>
              {isNew ? "Add Gantt Task" : f.name}
            </div>
          </div>
          <Btn variant="ghost" onClick={onClose} style={{ fontSize: 13 }}>✕</Btn>
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          <Field label="Task Name *">
            {inp("name", "text", "Describe this phase or milestone")}
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Field label="Project">{sel("project", PROJECTS)}</Field>
            <Field label="Task Type">{sel("type", Object.keys(TASK_TYPES))}</Field>
            <Field label="Status">{sel("status", Object.keys(STATUS_COLORS))}</Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Start Date *">{inp("start", "date")}</Field>
            <Field label="End Date *">{inp("end", "date")}</Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Crew / Responsible">{inp("crew", "text", "e.g. Iron Crew 1, Shop Floor A")}</Field>
            <Field label="Notes">{inp("notes", "text", "Optional notes")}</Field>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            <div>{!isNew && <Btn variant="danger" onClick={() => { if (window.confirm("Delete this task?")) onDelete(f.id); }}>DELETE</Btn>}</div>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
              <Btn variant="primary" onClick={handleSave}>{isNew ? "▶ ADD TASK" : "✓ SAVE"}</Btn>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Today Marker ─────────────────────────────────────────────────────────────
const TODAY = new Date();

// ── Main Gantt ───────────────────────────────────────────────────────────────
export default function GanttChart() {
  const [tasks, setTasks] = useState(() => loadData() || SEED_TASKS);
  const [selectedProject, setSelectedProject] = useState("All Projects");
  const [filterType, setFilterType] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [showForm, setShowForm] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [zoom, setZoom] = useState(28); // px per day
  const [tooltipTask, setTooltipTask] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const scrollRef = useRef(null);
  
  useEffect(() => { saveData(tasks); }, [tasks]);

  // Compute date range from all visible tasks
  const visibleTasks = useMemo(() => {
    let list = [...tasks];
    if (selectedProject !== "All Projects") list = list.filter(t => t.project === selectedProject);
    if (filterType !== "ALL") list = list.filter(t => t.type === filterType);
    if (filterStatus !== "ALL") list = list.filter(t => t.status === filterStatus);
    return list.sort((a, b) => new Date(a.start) - new Date(b.start));
  }, [tasks, selectedProject, filterType, filterStatus]);

  const { rangeStart, totalDays, months } = useMemo(() => {
    if (!visibleTasks.length) {
      const s = new Date(TODAY); s.setDate(1);
      return { rangeStart: s, totalDays: 60, months: [] };
    }
    const allStarts = visibleTasks.map(t => parseDate(t.start));
    const allEnds   = visibleTasks.map(t => parseDate(t.end));
    const minDate = new Date(Math.min(...allStarts));
    const maxDate = new Date(Math.max(...allEnds));
    minDate.setDate(minDate.getDate() - 3);
    maxDate.setDate(maxDate.getDate() + 7);
    const totalDays = Math.ceil((maxDate - minDate) / 86400000);

    // Build month headers
    const months = [];
    let cur = new Date(minDate); cur.setDate(1);
    while (cur <= maxDate) {
      const mStart = new Date(Math.max(cur, minDate));
      const mEnd   = new Date(cur.getFullYear(), cur.getMonth() + 1, 0);
      const clampEnd = new Date(Math.min(mEnd, maxDate));
      const offsetDays = Math.ceil((mStart - minDate) / 86400000);
      const spanDays   = Math.ceil((clampEnd - mStart) / 86400000) + 1;
      months.push({
        label: cur.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        offset: offsetDays, span: spanDays,
      });
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
    return { rangeStart: minDate, totalDays, months };
  }, [visibleTasks]);

  const dayOffset = (dateStr) => Math.floor((parseDate(dateStr) - rangeStart) / 86400000);
  const todayOffset = Math.floor((TODAY - rangeStart) / 86400000);

  // Group by project for labels
  const grouped = useMemo(() => {
    const groups = {};
    visibleTasks.forEach(t => {
      if (!groups[t.project]) groups[t.project] = [];
      groups[t.project].push(t);
    });
    return groups;
  }, [visibleTasks]);

  const handleSave = (task) => {
    setTasks(prev => {
      const exists = prev.find(t => t.id === task.id);
      return exists ? prev.map(t => t.id === task.id ? task : t) : [...prev, task];
    });
    setShowForm(false); setEditTask(null);
  };

  const handleDelete = (id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    setShowForm(false); setEditTask(null);
  };

  const ROW_H = 38;
  const LABEL_W = 280;
  const HEADER_H = 56;

  // Stats
  const stats = useMemo(() => ({
    total: visibleTasks.length,
    complete: visibleTasks.filter(t => t.status === "COMPLETE").length,
    inProgress: visibleTasks.filter(t => t.status === "IN PROGRESS").length,
    delayed: visibleTasks.filter(t => t.status === "DELAYED").length,
    notStarted: visibleTasks.filter(t => t.status === "NOT STARTED").length,
  }), [visibleTasks]);

  return (
    <>
      <FontLoader />
      <div style={{
        minHeight: "100vh", background: "#060A10",
        backgroundImage: "radial-gradient(ellipse at 10% 0%, rgba(255,90,31,0.07) 0%, transparent 55%)",
        fontFamily: "'IBM Plex Mono', monospace", color: "#fff",
      }}>
        {/* ── Header ── */}
        <div style={{ padding: "22px 24px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 9, color: "#FF8C42", letterSpacing: "0.2em", fontWeight: 700, marginBottom: 4 }}>STEELBUILD PRO</div>
              <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 32, fontWeight: 800, margin: 0, letterSpacing: "0.02em" }}>
                PROJECT GANTT CHART
              </h1>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
                Fabrication · Detailing · Erection · Delivery · Milestones
              </div>
            </div>
            <Btn variant="primary" onClick={() => { setEditTask(null); setShowForm(true); }} style={{ padding: "10px 20px" }}>
              + ADD TASK
            </Btn>
          </div>

          {/* Stats row */}
          <div style={{ display: "flex", gap: 24, marginBottom: 16 }}>
            {[
              { label: "TOTAL", val: stats.total, c: "rgba(255,255,255,0.6)" },
              { label: "COMPLETE", val: stats.complete, c: "#36B37E" },
              { label: "IN PROGRESS", val: stats.inProgress, c: "#FFB020" },
              { label: "NOT STARTED", val: stats.notStarted, c: "#6B7280" },
              { label: "DELAYED", val: stats.delayed, c: "#FF4D4D" },
            ].map(({ label, val, c }) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: c, fontFamily: "'Barlow Condensed', sans-serif", lineHeight: 1 }}>{val}</div>
                <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", marginTop: 2 }}>{label}</div>
              </div>
            ))}
            {/* Progress bar */}
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, paddingLeft: 12, borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${stats.total ? (stats.complete / stats.total) * 100 : 0}%`, height: "100%", background: "linear-gradient(90deg,#36B37E,#4DC8E8)", borderRadius: 3, transition: "width 0.4s" }} />
              </div>
              <span style={{ fontSize: 10, color: "#36B37E", fontWeight: 700, minWidth: 36 }}>
                {stats.total ? Math.round((stats.complete / stats.total) * 100) : 0}%
              </span>
            </div>
          </div>

          {/* Filters */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", paddingBottom: 14 }}>
            {/* Project tabs */}
            {["All Projects", ...PROJECTS].map(p => (
              <button key={p} onClick={() => setSelectedProject(p)} style={{
                padding: "5px 12px", borderRadius: 5, fontSize: 10, fontWeight: 700,
                fontFamily: "'IBM Plex Mono', monospace", cursor: "pointer",
                border: selectedProject === p ? "1px solid rgba(255,140,66,0.5)" : "1px solid rgba(255,255,255,0.08)",
                background: selectedProject === p ? "rgba(255,140,66,0.15)" : "rgba(255,255,255,0.03)",
                color: selectedProject === p ? "#FF8C42" : "rgba(255,255,255,0.4)",
                letterSpacing: "0.06em",
              }}>{p}</button>
            ))}
            <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.08)", margin: "0 4px" }} />
            {/* Type filter */}
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              style={{ background: "#0A0E15", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 5, padding: "5px 10px", color: "#fff", fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", cursor: "pointer" }}>
              <option value="ALL">All Types</option>
              {Object.entries(TASK_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            {/* Status filter */}
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              style={{ background: "#0A0E15", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 5, padding: "5px 10px", color: "#fff", fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", cursor: "pointer" }}>
              <option value="ALL">All Statuses</option>
              {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {/* Zoom */}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em" }}>ZOOM</span>
              {[{ label: "1W", val: 52 }, { label: "2W", val: 34 }, { label: "1M", val: 20 }, { label: "2M", val: 12 }, { label: "3M", val: 8 }].map(z => (
                <button key={z.label} onClick={() => setZoom(z.val)} style={{
                  padding: "4px 9px", borderRadius: 4, fontSize: 9, fontWeight: 700, cursor: "pointer",
                  fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.08em",
                  border: zoom === z.val ? "1px solid rgba(255,140,66,0.4)" : "1px solid rgba(255,255,255,0.08)",
                  background: zoom === z.val ? "rgba(255,140,66,0.15)" : "transparent",
                  color: zoom === z.val ? "#FF8C42" : "rgba(255,255,255,0.3)",
                }}>{z.label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Legend ── */}
        <div style={{ display: "flex", gap: 16, padding: "10px 24px", borderBottom: "1px solid rgba(255,255,255,0.04)", flexWrap: "wrap" }}>
          {Object.entries(TASK_TYPES).map(([k, v]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: v.color }} />
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em" }}>{v.label.toUpperCase()}</span>
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: 12 }}>
            <div style={{ width: 2, height: 12, background: "#4DC8E8" }} />
            <span style={{ fontSize: 9, color: "rgba(77,200,232,0.7)", letterSpacing: "0.08em" }}>TODAY</span>
          </div>
        </div>

        {/* ── Gantt Body ── */}
        <div style={{ padding: "0 24px 24px" }}>
          {visibleTasks.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,0.2)", fontSize: 12 }}>
              No tasks match current filters. Click + ADD TASK to get started.
            </div>
          ) : (
            <div style={{ overflowX: "auto", overflowY: "visible" }} ref={scrollRef}>
              <div style={{ minWidth: LABEL_W + totalDays * zoom }}>

                {/* Render grouped by project */}
                {Object.entries(grouped).map(([proj, projTasks]) => (
                  <div key={proj}>
                    {/* Project group header */}
                    <div style={{
                      display: "flex", alignItems: "center",
                      background: "rgba(255,140,66,0.06)",
                      borderTop: "1px solid rgba(255,140,66,0.2)",
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      position: "sticky", top: 0, zIndex: 5,
                    }}>
                      {/* Label column */}
                      <div style={{
                        width: LABEL_W, minWidth: LABEL_W, padding: "8px 14px",
                        display: "flex", alignItems: "center", gap: 8,
                        borderRight: "1px solid rgba(255,255,255,0.06)",
                        position: "sticky", left: 0, background: "rgba(15,18,26,0.97)", zIndex: 6,
                      }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: "#FF8C42", letterSpacing: "0.08em", fontFamily: "'Barlow Condensed', sans-serif" }}>
                          ▸ {proj.toUpperCase()}
                        </span>
                        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>{projTasks.length} tasks</span>
                      </div>
                      {/* Timeline header months */}
                      <div style={{ flex: 1, position: "relative", height: HEADER_H, overflow: "hidden" }}>
                        {/* Month labels */}
                        {months.map((m, i) => (
                          <div key={i} style={{
                            position: "absolute", left: m.offset * zoom, width: m.span * zoom,
                            top: 0, height: "50%", borderRight: "1px solid rgba(255,255,255,0.08)",
                            display: "flex", alignItems: "center", paddingLeft: 8,
                          }}>
                            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", fontWeight: 700, letterSpacing: "0.08em", whiteSpace: "nowrap" }}>{m.label}</span>
                          </div>
                        ))}
                        {/* Week lines */}
                        {Array.from({ length: Math.ceil(totalDays / 7) }, (_, i) => (
                          <div key={i} style={{
                            position: "absolute", left: i * 7 * zoom, top: "50%", bottom: 0,
                            width: 1, background: "rgba(255,255,255,0.05)",
                          }} />
                        ))}
                        {/* Day labels (only if zoom >= 20) */}
                        {zoom >= 20 && Array.from({ length: totalDays }, (_, i) => {
                          const d = addDays(rangeStart, i);
                          if (d.getDay() !== 1) return null;
                          return (
                            <div key={i} style={{
                              position: "absolute", left: i * zoom + 2, top: "55%",
                              fontSize: 8, color: "rgba(255,255,255,0.25)", letterSpacing: "0.04em",
                              whiteSpace: "nowrap",
                            }}>{fmtShort(d)}</div>
                          );
                        })}
                        {/* Today line in header */}
                        {todayOffset >= 0 && todayOffset <= totalDays && (
                          <div style={{
                            position: "absolute", left: todayOffset * zoom,
                            top: 0, bottom: 0, width: 2, background: "#4DC8E8", opacity: 0.6,
                          }} />
                        )}
                      </div>
                    </div>

                    {/* Task rows */}
                    {projTasks.map((task, rowIdx) => {
                      const off = dayOffset(task.start);
                      const dur = Math.max(1, Math.ceil((parseDate(task.end) - parseDate(task.start)) / 86400000));
                      const tm  = TASK_TYPES[task.type] || TASK_TYPES.CUSTOM;
                      const isDelayed = task.status === "DELAYED";
                      const isComplete = task.status === "COMPLETE";
                      const barW = Math.max(dur * zoom, 4);

                      return (
                        <div key={task.id} style={{
                          display: "flex", alignItems: "center",
                          borderBottom: "1px solid rgba(255,255,255,0.035)",
                          background: rowIdx % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent",
                          height: ROW_H,
                        }}>
                          {/* Label */}
                          <div style={{
                            width: LABEL_W, minWidth: LABEL_W, height: "100%",
                            display: "flex", alignItems: "center",
                            padding: "0 14px", gap: 8, overflow: "hidden",
                            borderRight: "1px solid rgba(255,255,255,0.06)",
                            position: "sticky", left: 0, background: rowIdx % 2 === 0 ? "#0B0F18" : "#080C13",
                            zIndex: 3, cursor: "pointer",
                          }}
                            onClick={() => { setEditTask(task); setShowForm(true); }}
                            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,140,66,0.07)"}
                            onMouseLeave={e => e.currentTarget.style.background = rowIdx % 2 === 0 ? "#0B0F18" : "#080C13"}
                          >
                            <Pill type={task.type} />
                            <span style={{
                              fontSize: 11, color: isComplete ? "rgba(255,255,255,0.4)" : "#fff",
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1,
                              textDecoration: isComplete ? "line-through" : "none",
                            }}>{task.name}</span>
                            <span style={{ fontSize: 9, color: STATUS_COLORS[task.status], flexShrink: 0 }}>●</span>
                          </div>

                          {/* Timeline row */}
                          <div style={{ flex: 1, height: "100%", position: "relative", overflow: "hidden" }}>
                            {/* Alternating day columns */}
                            {Array.from({ length: totalDays }, (_, i) => (
                              addDays(rangeStart, i).getDay() === 0 || addDays(rangeStart, i).getDay() === 6
                                ? <div key={i} style={{ position: "absolute", left: i * zoom, width: zoom, top: 0, bottom: 0, background: "rgba(255,255,255,0.012)" }} />
                                : null
                            ))}

                            {/* Today line */}
                            {todayOffset >= 0 && todayOffset <= totalDays && (
                              <div style={{
                                position: "absolute", left: todayOffset * zoom,
                                top: 0, bottom: 0, width: 2, background: "#4DC8E8",
                                opacity: 0.35, zIndex: 2,
                              }} />
                            )}

                            {/* Gantt bar */}
                            <div
                              style={{
                                position: "absolute",
                                left: Math.max(0, off * zoom),
                                width: barW,
                                top: "50%", transform: "translateY(-50%)",
                                height: 22, borderRadius: 4,
                                background: isComplete
                                  ? `repeating-linear-gradient(45deg,${tm.color}44,${tm.color}44 3px,${tm.color}22 3px,${tm.color}22 6px)`
                                  : isDelayed
                                  ? `linear-gradient(90deg,#FF4D4D,#FF8080)`
                                  : `linear-gradient(90deg,${tm.color}cc,${tm.color}88)`,
                                border: `1px solid ${isDelayed ? "#FF4D4D" : tm.color}55`,
                                cursor: "pointer",
                                zIndex: 2,
                                display: "flex", alignItems: "center",
                                paddingLeft: 6, overflow: "hidden",
                                boxShadow: `0 2px 8px ${tm.color}33`,
                                transition: "opacity 0.12s",
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.opacity = "0.85";
                                setTooltipTask(task);
                                setTooltipPos({ x: e.clientX, y: e.clientY });
                              }}
                              onMouseMove={e => setTooltipPos({ x: e.clientX, y: e.clientY })}
                              onMouseLeave={e => { e.currentTarget.style.opacity = "1"; setTooltipTask(null); }}
                              onClick={() => { setEditTask(task); setShowForm(true); }}
                            >
                              {barW > 60 && (
                                <span style={{ fontSize: 9, color: "#fff", fontWeight: 700, whiteSpace: "nowrap", letterSpacing: "0.04em", opacity: 0.9 }}>
                                  {task.crew}
                                </span>
                              )}
                              {isComplete && barW > 20 && (
                                <span style={{ position: "absolute", right: 5, fontSize: 9, color: "#fff", opacity: 0.7 }}>✓</span>
                              )}
                            </div>

                            {/* Duration label */}
                            {barW > 40 && (
                              <div style={{
                                position: "absolute",
                                left: Math.max(0, off * zoom) + barW + 4,
                                top: "50%", transform: "translateY(-50%)",
                                fontSize: 8, color: "rgba(255,255,255,0.25)", whiteSpace: "nowrap",
                              }}>
                                {dur}d
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Tooltip ── */}
        {tooltipTask && (
          <div style={{
            position: "fixed",
            left: tooltipPos.x + 14,
            top: tooltipPos.y - 10,
            background: "#0D1117",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8, padding: "10px 14px",
            zIndex: 9999, pointerEvents: "none",
            boxShadow: "0 12px 32px rgba(0,0,0,0.6)",
            minWidth: 200, maxWidth: 280,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#fff", marginBottom: 6, lineHeight: 1.3 }}>{tooltipTask.name}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>{tooltipTask.project}</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
              <Pill type={tooltipTask.type} />
              <StatusDot status={tooltipTask.status} />
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", lineHeight: 1.8 }}>
              <div>📅 {fmtFull(parseDate(tooltipTask.start))} → {fmtFull(parseDate(tooltipTask.end))}</div>
              <div>👷 {tooltipTask.crew || "—"}</div>
              {tooltipTask.notes && <div>📝 {tooltipTask.notes}</div>}
            </div>
          </div>
        )}

        {/* ── Form Modal ── */}
        {showForm && (
          <TaskForm
            task={editTask}
            onSave={handleSave}
            onClose={() => { setShowForm(false); setEditTask(null); }}
            onDelete={handleDelete}
          />
        )}
      </div>
    </>
  );
}