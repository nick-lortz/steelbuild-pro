import React, { useState, useEffect, useMemo } from "react";

// ── Persistent storage helpers ──────────────────────────────────────────────
const STORAGE_KEY = "rfi-manager-data";
const loadData = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};
const saveData = (data) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
};

// ── Seed data ────────────────────────────────────────────────────────────────
const SEED_RFIS = [
  {
    id: "RFI-001", title: "Column baseplate anchor bolt spacing — Grid B4",
    project: "Mesa Distribution Center", discipline: "Structural",
    drawing: "S-101", workPackage: "WP-04 Foundations",
    status: "OPEN", priority: "CRITICAL",
    submitted: "2026-02-10", due: "2026-02-20", responded: null,
    assignedTo: "EOR — Thornton Tomasetti", submittedBy: "J. Rivera",
    description: "Anchor bolt pattern shown on S-101 does not match the embed plate detail on S-204. Column is fabricated per S-204. Need clarification before erection at Grid B4.",
    response: "", notes: "Holding erection sequence at B-line until resolved.",
  },
  {
    id: "RFI-002", title: "Connection detail at HSS beam pocket — Level 2",
    project: "Riverside Warehouse", discipline: "Structural",
    drawing: "S-304", workPackage: "WP-07 Level 2 Framing",
    status: "UNDER REVIEW", priority: "HIGH",
    submitted: "2026-02-15", due: "2026-02-28", responded: null,
    assignedTo: "Architect — HKS Inc.", submittedBy: "M. Torres",
    description: "HSS pocket dimension on S-304 is 1/2\" undersized per fabricated member. Requesting field modification approval or revised detail.",
    response: "", notes: "",
  },
  {
    id: "RFI-003", title: "Embed plate tolerance for precast panel interface",
    project: "Chandler Office Build", discipline: "Structural",
    drawing: "S-502", workPackage: "WP-02 Embeds",
    status: "ANSWERED", priority: "MEDIUM",
    submitted: "2026-01-28", due: "2026-02-07", responded: "2026-02-05",
    assignedTo: "EOR — Cardno", submittedBy: "J. Rivera",
    description: "Tolerance requirement for embed plate location not specified. Precast vendor requires ±1/4\" for panel setting.",
    response: "±3/8\" acceptable per EOR. See attached sketch SK-22.",
    notes: "Resolved. Shop drawings updated.",
  },
  {
    id: "RFI-004", title: "Roof beam camber requirement — Grid 7-9",
    project: "Mesa Distribution Center", discipline: "Structural",
    drawing: "S-206", workPackage: "WP-09 Roof Framing",
    status: "OPEN", priority: "HIGH",
    submitted: "2026-02-18", due: "2026-02-25", responded: null,
    assignedTo: "EOR — Thornton Tomasetti", submittedBy: "D. Kim",
    description: "W24x55 beams at Grid 7-9 show no camber on S-206 but span exceeds 40'. Standard practice requires camber. Confirm EOR intent.",
    response: "", notes: "Affects fabrication release for WP-09.",
  },
  {
    id: "RFI-005", title: "Stair stringer weld size discrepancy",
    project: "Riverside Warehouse", discipline: "Misc Metals",
    drawing: "M-14", workPackage: "WP-11 Stairs",
    status: "CLOSED", priority: "LOW",
    submitted: "2026-01-15", due: "2026-01-22", responded: "2026-01-20",
    assignedTo: "Architect — HKS Inc.", submittedBy: "M. Torres",
    description: "M-14 shows 3/16 fillet weld at stringer-to-landing connection. AWS D1.1 minimum for material thickness is 1/4\".",
    response: "Revise to 1/4\" fillet weld per D1.1. No change to design intent.",
    notes: "Closed. Shop drawings revised Rev B.",
  },
];

const PROJECTS = ["All Projects", "Mesa Distribution Center", "Riverside Warehouse", "Chandler Office Build"];
const DISCIPLINES = ["Structural", "Misc Metals", "Architectural", "MEP", "Civil"];
const PRIORITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
const STATUSES = ["OPEN", "UNDER REVIEW", "ANSWERED", "CLOSED"];
const STATUS_META = {
  "OPEN":         { color: "#FF4D4D", bg: "rgba(255,77,77,0.12)",   dot: "#FF4D4D" },
  "UNDER REVIEW": { color: "#FFB020", bg: "rgba(255,176,32,0.12)",  dot: "#FFB020" },
  "ANSWERED":     { color: "#36B37E", bg: "rgba(54,179,126,0.12)",  dot: "#36B37E" },
  "CLOSED":       { color: "#6B7280", bg: "rgba(107,114,128,0.12)", dot: "#6B7280" },
};
const PRIORITY_META = {
  "CRITICAL": { color: "#FF4D4D" },
  "HIGH":     { color: "#FF8C42" },
  "MEDIUM":   { color: "#FFB020" },
  "LOW":      { color: "#6B7280" },
};

const today = new Date();
const daysDiff = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return Math.ceil((d - today) / (1000 * 60 * 60 * 24));
};
const isOverdue = (rfi) => rfi.status !== "ANSWERED" && rfi.status !== "CLOSED" && daysDiff(rfi.due) < 0;
const isDueSoon = (rfi) => rfi.status !== "ANSWERED" && rfi.status !== "CLOSED" && daysDiff(rfi.due) >= 0 && daysDiff(rfi.due) <= 3;

const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
const newId = (rfis) => {
  const nums = rfis.map(r => parseInt(r.id.replace("RFI-", ""))).filter(Boolean);
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `RFI-${String(next).padStart(3, "0")}`;
};

const EMPTY_RFI = {
  title: "", project: "Mesa Distribution Center", discipline: "Structural",
  drawing: "", workPackage: "", status: "OPEN", priority: "HIGH",
  submitted: new Date().toISOString().slice(0, 10),
  due: "", responded: null, assignedTo: "", submittedBy: "",
  description: "", response: "", notes: "",
};

// ── Components ───────────────────────────────────────────────────────────────
const Badge = ({ status }) => {
  const m = STATUS_META[status] || STATUS_META["OPEN"];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 4, fontSize: 11, fontWeight: 700,
      letterSpacing: "0.08em", color: m.color, background: m.bg,
      border: `1px solid ${m.color}33`, fontFamily: "'IBM Plex Mono', monospace",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: m.dot, flexShrink: 0 }} />
      {status}
    </span>
  );
};

const PriorityTag = ({ p }) => (
  <span style={{
    fontSize: 10, fontWeight: 800, letterSpacing: "0.1em",
    color: PRIORITY_META[p]?.color || "#fff", fontFamily: "'IBM Plex Mono', monospace",
  }}>{p}</span>
);

const OverdueBadge = ({ rfi }) => {
  if (isOverdue(rfi)) {
    const d = Math.abs(daysDiff(rfi.due));
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "2px 8px", borderRadius: 3, fontSize: 10, fontWeight: 700,
        color: "#FF4D4D", background: "rgba(255,77,77,0.1)",
        border: "1px solid rgba(255,77,77,0.3)", letterSpacing: "0.06em",
        fontFamily: "'IBM Plex Mono', monospace",
      }}>
        ⚠ {d}d OVERDUE
      </span>
    );
  }
  if (isDueSoon(rfi)) {
    const d = daysDiff(rfi.due);
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "2px 8px", borderRadius: 3, fontSize: 10, fontWeight: 700,
        color: "#FFB020", background: "rgba(255,176,32,0.1)",
        border: "1px solid rgba(255,176,32,0.3)", letterSpacing: "0.06em",
        fontFamily: "'IBM Plex Mono', monospace",
      }}>
        ◉ DUE IN {d}d
      </span>
    );
  }
  return null;
};

const Input = ({ label, value, onChange, type = "text", required, placeholder, style }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 5, ...style }}>
    <label style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'IBM Plex Mono', monospace" }}>
      {label}{required && <span style={{ color: "#FF4D4D" }}> *</span>}
    </label>
    <input
      type={type} value={value || ""} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 6, padding: "8px 12px", color: "#fff", fontSize: 13,
        fontFamily: "'IBM Plex Mono', monospace", outline: "none",
        transition: "border-color 0.15s",
      }}
      onFocus={e => e.target.style.borderColor = "#FF8C42"}
      onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
    />
  </div>
);

const Select = ({ label, value, onChange, options, style }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 5, ...style }}>
    <label style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'IBM Plex Mono', monospace" }}>
      {label}
    </label>
    <select
      value={value || ""} onChange={e => onChange(e.target.value)}
      style={{
        background: "#0D1117", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 6, padding: "8px 12px", color: "#fff", fontSize: 13,
        fontFamily: "'IBM Plex Mono', monospace", outline: "none", cursor: "pointer",
      }}
      onFocus={e => e.target.style.borderColor = "#FF8C42"}
      onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
    >
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

const Textarea = ({ label, value, onChange, rows = 3, placeholder }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
    <label style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'IBM Plex Mono', monospace" }}>
      {label}
    </label>
    <textarea
      value={value || ""} onChange={e => onChange(e.target.value)}
      rows={rows} placeholder={placeholder}
      style={{
        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 6, padding: "10px 12px", color: "#fff", fontSize: 13,
        fontFamily: "'IBM Plex Mono', monospace", outline: "none", resize: "vertical",
        lineHeight: 1.6,
      }}
      onFocus={e => e.target.style.borderColor = "#FF8C42"}
      onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
    />
  </div>
);

const Btn = ({ children, onClick, variant = "primary", style, disabled }) => {
  const base = {
    padding: "9px 18px", borderRadius: 6, fontWeight: 700, fontSize: 12,
    letterSpacing: "0.08em", cursor: disabled ? "not-allowed" : "pointer",
    border: "none", fontFamily: "'IBM Plex Mono', monospace",
    transition: "all 0.15s", opacity: disabled ? 0.5 : 1, ...style,
  };
  const variants = {
    primary:   { background: "linear-gradient(135deg,#FF5A1F,#FF8C42)", color: "#fff" },
    secondary: { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.12)" },
    danger:    { background: "rgba(255,77,77,0.15)", color: "#FF4D4D", border: "1px solid rgba(255,77,77,0.3)" },
    ghost:     { background: "transparent", color: "rgba(255,255,255,0.5)", padding: "6px 10px" },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant] }}>{children}</button>;
};

// ── RFI Form Modal ───────────────────────────────────────────────────────────
const RFIForm = ({ rfi, onSave, onClose, allRfis }) => {
  const [form, setForm] = useState(rfi || EMPTY_RFI);
  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));
  const isNew = !rfi;

  const handleSave = () => {
    if (!form.title || !form.due || !form.assignedTo || !form.submittedBy) {
      alert("Fill in required fields: Title, Due Date, Assigned To, Submitted By");
      return;
    }
    const saved = isNew ? { ...form, id: newId(allRfis) } : form;
    onSave(saved);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "#0D1117", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 12, width: "100%", maxWidth: 760, maxHeight: "90vh",
        overflowY: "auto", padding: 28,
        boxShadow: "0 32px 80px rgba(0,0,0,0.8)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 10, color: "#FF8C42", letterSpacing: "0.15em", fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", marginBottom: 4 }}>
              {isNew ? "NEW REQUEST FOR INFORMATION" : `EDITING ${form.id}`}
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.02em" }}>
              {isNew ? "Create RFI" : form.title}
            </div>
          </div>
          <Btn variant="ghost" onClick={onClose}>✕ CLOSE</Btn>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          {/* Row 1 */}
          <Input label="RFI Title" value={form.title} onChange={set("title")} required placeholder="Describe the issue clearly" />

          {/* Row 2 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Select label="Project" value={form.project} onChange={set("project")} options={PROJECTS.slice(1)} />
            <Select label="Discipline" value={form.discipline} onChange={set("discipline")} options={DISCIPLINES} />
            <Select label="Priority" value={form.priority} onChange={set("priority")} options={PRIORITIES} />
          </div>

          {/* Row 3 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Input label="Drawing Reference" value={form.drawing} onChange={set("drawing")} placeholder="e.g. S-101, M-14" />
            <Input label="Work Package" value={form.workPackage} onChange={set("workPackage")} placeholder="e.g. WP-04 Foundations" />
          </div>

          {/* Row 4 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Input label="Submitted By" value={form.submittedBy} onChange={set("submittedBy")} required placeholder="Your name" />
            <Input label="Assigned To" value={form.assignedTo} onChange={set("assignedTo")} required placeholder="EOR / Architect / GC" />
          </div>

          {/* Row 5 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Input label="Date Submitted" value={form.submitted} onChange={set("submitted")} type="date" />
            <Input label="Response Due" value={form.due} onChange={set("due")} type="date" required />
            <Select label="Status" value={form.status} onChange={set("status")} options={STATUSES} />
          </div>

          {/* Row 6 */}
          <Textarea label="Description / Question" value={form.description} onChange={set("description")} rows={4} placeholder="Clearly state the issue, reference spec sections, detail numbers, and what decision is needed." />

          {/* Row 7 — only show if not new */}
          {!isNew && (
            <>
              <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Input label="Date Responded" value={form.responded} onChange={set("responded")} type="date" />
                <div />
              </div>
              <Textarea label="Response / Resolution" value={form.response} onChange={set("response")} rows={3} placeholder="Engineer / Architect response..." />
              <Textarea label="Internal Notes" value={form.notes} onChange={set("notes")} rows={2} placeholder="Internal tracking notes, schedule impacts, etc." />
            </>
          )}

          {/* Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
            <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
            <Btn variant="primary" onClick={handleSave}>{isNew ? "▶ CREATE RFI" : "✓ SAVE CHANGES"}</Btn>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── RFI Detail Panel ─────────────────────────────────────────────────────────
const RFIDetail = ({ rfi, onEdit, onClose, onDelete }) => {
  const overdue = isOverdue(rfi);
  const soon = isDueSoon(rfi);
  const days = daysDiff(rfi.due);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "#0D1117", border: `1px solid ${overdue ? "rgba(255,77,77,0.3)" : "rgba(255,255,255,0.1)"}`,
        borderRadius: 12, width: "100%", maxWidth: 680, maxHeight: "90vh",
        overflowY: "auto", padding: 28,
        boxShadow: `0 32px 80px rgba(0,0,0,0.8)${overdue ? ", 0 0 0 1px rgba(255,77,77,0.2)" : ""}`,
      }}>
        {/* Top bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "#FF8C42", fontWeight: 700 }}>{rfi.id}</span>
            <Badge status={rfi.status} />
            <OverdueBadge rfi={rfi} />
          </div>
          <Btn variant="ghost" onClick={onClose}>✕</Btn>
        </div>

        <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 4, lineHeight: 1.2 }}>
          {rfi.title}
        </h2>
        <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "'IBM Plex Mono', monospace" }}>{rfi.project}</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "'IBM Plex Mono', monospace" }}>·</span>
          <PriorityTag p={rfi.priority} />
        </div>

        {/* Info grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          {[
            ["Drawing Ref", rfi.drawing || "—"],
            ["Work Package", rfi.workPackage || "—"],
            ["Submitted By", rfi.submittedBy],
            ["Assigned To", rfi.assignedTo],
            ["Date Submitted", fmtDate(rfi.submitted)],
            ["Response Due", <span style={{ color: overdue ? "#FF4D4D" : soon ? "#FFB020" : "inherit" }}>{fmtDate(rfi.due)}{overdue ? ` (${Math.abs(days)}d overdue)` : soon ? ` (${days}d)` : ""}</span>],
            ["Responded", rfi.responded ? fmtDate(rfi.responded) : "—"],
            ["Discipline", rfi.discipline],
          ].map(([k, v]) => (
            <div key={k} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 6, padding: "10px 14px" }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.1em", marginBottom: 4, textTransform: "uppercase" }}>{k}</div>
              <div style={{ fontSize: 13, color: "#fff", fontFamily: "'IBM Plex Mono', monospace" }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Description */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.1em", marginBottom: 8, textTransform: "uppercase" }}>Description / Question</div>
          <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 6, padding: "12px 14px", fontSize: 13, color: "rgba(255,255,255,0.8)", lineHeight: 1.7, fontFamily: "'IBM Plex Mono', monospace", whiteSpace: "pre-wrap" }}>
            {rfi.description || "—"}
          </div>
        </div>

        {/* Response */}
        {rfi.response && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: "#36B37E", fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.1em", marginBottom: 8, textTransform: "uppercase" }}>✓ Response / Resolution</div>
            <div style={{ background: "rgba(54,179,126,0.06)", border: "1px solid rgba(54,179,126,0.2)", borderRadius: 6, padding: "12px 14px", fontSize: 13, color: "rgba(255,255,255,0.8)", lineHeight: 1.7, fontFamily: "'IBM Plex Mono', monospace" }}>
              {rfi.response}
            </div>
          </div>
        )}

        {/* Notes */}
        {rfi.notes && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.1em", marginBottom: 8, textTransform: "uppercase" }}>Internal Notes</div>
            <div style={{ background: "rgba(255,176,32,0.05)", border: "1px solid rgba(255,176,32,0.15)", borderRadius: 6, padding: "10px 14px", fontSize: 12, color: "rgba(255,255,255,0.6)", fontFamily: "'IBM Plex Mono', monospace", fontStyle: "italic" }}>
              {rfi.notes}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16 }}>
          <Btn variant="danger" onClick={() => { if (window.confirm(`Delete ${rfi.id}?`)) onDelete(rfi.id); }}>DELETE</Btn>
          <Btn variant="primary" onClick={() => onEdit(rfi)}>✎ EDIT RFI</Btn>
        </div>
      </div>
    </div>
  );
};

// ── Notification Banner ───────────────────────────────────────────────────────
const NotificationBanner = ({ rfis, onDismiss }) => {
  const overdue = rfis.filter(isOverdue);
  const soon = rfis.filter(r => !isOverdue(r) && isDueSoon(r));
  if (!overdue.length && !soon.length) return null;

  return (
    <div style={{
      background: "rgba(255,77,77,0.08)", border: "1px solid rgba(255,77,77,0.25)",
      borderRadius: 8, padding: "12px 16px", marginBottom: 20,
      display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 800, color: "#FF4D4D", letterSpacing: "0.1em", fontFamily: "'IBM Plex Mono', monospace", marginBottom: 6 }}>
          ⚠ AUTOMATED RESPONSE ALERTS
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {overdue.map(r => (
            <span key={r.id} style={{ fontSize: 11, color: "#FF4D4D", fontFamily: "'IBM Plex Mono', monospace" }}>
              {r.id} — {r.assignedTo} overdue {Math.abs(daysDiff(r.due))}d
            </span>
          ))}
          {soon.map(r => (
            <span key={r.id} style={{ fontSize: 11, color: "#FFB020", fontFamily: "'IBM Plex Mono', monospace" }}>
              {r.id} — due in {daysDiff(r.due)}d ({r.assignedTo})
            </span>
          ))}
        </div>
      </div>
      <Btn variant="ghost" onClick={onDismiss} style={{ fontSize: 11, padding: "4px 8px" }}>DISMISS</Btn>
    </div>
  );
};

// ── Main App ─────────────────────────────────────────────────────────────────
export default function RFIHub() {
  const [rfis, setRfis] = useState(() => loadData() || SEED_RFIS);
  const [filterProject, setFilterProject] = useState("All Projects");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterPriority, setFilterPriority] = useState("ALL");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editRfi, setEditRfi] = useState(null);
  const [viewRfi, setViewRfi] = useState(null);
  const [showAlerts, setShowAlerts] = useState(true);
  const [sortBy, setSortBy] = useState("due");

  useEffect(() => { saveData(rfis); }, [rfis]);

  const filtered = useMemo(() => {
    let list = [...rfis];
    if (filterProject !== "All Projects") list = list.filter(r => r.project === filterProject);
    if (filterStatus !== "ALL") list = list.filter(r => r.status === filterStatus);
    if (filterPriority !== "ALL") list = list.filter(r => r.priority === filterPriority);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(r =>
        r.title.toLowerCase().includes(s) || r.id.toLowerCase().includes(s) ||
        r.drawing.toLowerCase().includes(s) || r.assignedTo.toLowerCase().includes(s) ||
        r.workPackage.toLowerCase().includes(s)
      );
    }
    list.sort((a, b) => {
      if (sortBy === "due") return new Date(a.due) - new Date(b.due);
      if (sortBy === "priority") return PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority);
      if (sortBy === "id") return a.id.localeCompare(b.id);
      if (sortBy === "status") return STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status);
      return 0;
    });
    return list;
  }, [rfis, filterProject, filterStatus, filterPriority, search, sortBy]);

  const stats = useMemo(() => ({
    total: rfis.length,
    open: rfis.filter(r => r.status === "OPEN").length,
    overdue: rfis.filter(isOverdue).length,
    critical: rfis.filter(r => r.priority === "CRITICAL" && r.status !== "CLOSED").length,
    answered: rfis.filter(r => r.status === "ANSWERED" || r.status === "CLOSED").length,
  }), [rfis]);

  const handleSave = (rfi) => {
    setRfis(prev => {
      const exists = prev.find(r => r.id === rfi.id);
      return exists ? prev.map(r => r.id === rfi.id ? rfi : r) : [...prev, rfi];
    });
    setShowForm(false);
    setEditRfi(null);
    setViewRfi(null);
  };

  const handleDelete = (id) => {
    setRfis(prev => prev.filter(r => r.id !== id));
    setViewRfi(null);
  };

  const handleEdit = (rfi) => {
    setViewRfi(null);
    setEditRfi(rfi);
    setShowForm(true);
  };

  return (
    <>
      {/* Google Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div style={{
        minHeight: "100vh", background: "#080B10",
        backgroundImage: "radial-gradient(ellipse at 20% 0%, rgba(255,90,31,0.06) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, rgba(255,140,66,0.04) 0%, transparent 50%)",
        fontFamily: "'IBM Plex Mono', monospace", color: "#fff", padding: "24px",
      }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 10, color: "#FF8C42", letterSpacing: "0.2em", fontWeight: 700, marginBottom: 4 }}>
              STEELBUILD PRO — FIELD REPLACEMENT MODULE
            </div>
            <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 36, fontWeight: 800, letterSpacing: "0.02em", lineHeight: 1, margin: 0 }}>
              RFI MANAGEMENT
            </h1>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>
              Request for Information · Status Tracking · Automated Alerts
            </div>
          </div>
          <Btn variant="primary" onClick={() => { setEditRfi(null); setShowForm(true); }} style={{ fontSize: 13, padding: "11px 22px" }}>
            + NEW RFI
          </Btn>
        </div>

        {/* ── Alert Banner ── */}
        {showAlerts && <NotificationBanner rfis={rfis} onDismiss={() => setShowAlerts(false)} />}

        {/* ── Stats ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 24 }}>
          {[
            { label: "TOTAL RFIs", value: stats.total, color: "rgba(255,255,255,0.7)" },
            { label: "OPEN", value: stats.open, color: "#FFB020" },
            { label: "OVERDUE", value: stats.overdue, color: "#FF4D4D" },
            { label: "CRITICAL", value: stats.critical, color: "#FF5A1F" },
            { label: "RESOLVED", value: stats.answered, color: "#36B37E" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 8, padding: "14px 16px", textAlign: "center",
            }}>
              <div style={{ fontSize: 28, fontWeight: 800, color, fontFamily: "'Barlow Condensed', sans-serif", lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.12em", marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div style={{
          display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center",
          background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 8, padding: "12px 16px", marginBottom: 16,
        }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search RFI, drawing, package, assignee..."
            style={{
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 6, padding: "7px 12px", color: "#fff", fontSize: 12,
              fontFamily: "'IBM Plex Mono', monospace", outline: "none", minWidth: 260,
            }}
          />
          <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
            style={{ background: "#0D1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "7px 12px", color: "#fff", fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", cursor: "pointer" }}>
            {PROJECTS.map(p => <option key={p}>{p}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            style={{ background: "#0D1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "7px 12px", color: "#fff", fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", cursor: "pointer" }}>
            <option value="ALL">All Statuses</option>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
            style={{ background: "#0D1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "7px 12px", color: "#fff", fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", cursor: "pointer" }}>
            <option value="ALL">All Priorities</option>
            {PRIORITIES.map(p => <option key={p}>{p}</option>)}
          </select>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em" }}>SORT</span>
            {["due", "priority", "status", "id"].map(s => (
              <button key={s} onClick={() => setSortBy(s)} style={{
                background: sortBy === s ? "rgba(255,140,66,0.2)" : "transparent",
                border: sortBy === s ? "1px solid rgba(255,140,66,0.4)" : "1px solid transparent",
                borderRadius: 4, padding: "4px 8px", color: sortBy === s ? "#FF8C42" : "rgba(255,255,255,0.35)",
                fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", cursor: "pointer", letterSpacing: "0.08em",
              }}>{s.toUpperCase()}</button>
            ))}
          </div>
        </div>

        {/* ── RFI count ── */}
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 10, letterSpacing: "0.08em" }}>
          SHOWING {filtered.length} OF {rfis.length} RFIs
        </div>

        {/* ── Table ── */}
        <div style={{
          background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 10, overflow: "hidden",
        }}>
          {/* Table header */}
          <div style={{
            display: "grid", gridTemplateColumns: "90px 1fr 140px 100px 110px 100px 110px 90px",
            padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(255,255,255,0.02)",
          }}>
            {["RFI #", "TITLE / PROJECT", "DRAWING / PKG", "PRIORITY", "STATUS", "DUE DATE", "ASSIGNED TO", "ACTION"].map(h => (
              <div key={h} style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontWeight: 700, letterSpacing: "0.12em" }}>{h}</div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 12 }}>
              No RFIs match your filters.
            </div>
          )}

          {filtered.map((rfi, i) => {
            const over = isOverdue(rfi);
            const soon = isDueSoon(rfi);
            const days = daysDiff(rfi.due);
            return (
              <div key={rfi.id}
                onClick={() => setViewRfi(rfi)}
                style={{
                  display: "grid", gridTemplateColumns: "90px 1fr 140px 100px 110px 100px 110px 90px",
                  padding: "13px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)",
                  background: over ? "rgba(255,77,77,0.03)" : i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                  cursor: "pointer", transition: "background 0.12s", alignItems: "center",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,140,66,0.06)"}
                onMouseLeave={e => e.currentTarget.style.background = over ? "rgba(255,77,77,0.03)" : i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)"}
              >
                <div style={{ fontSize: 11, color: "#FF8C42", fontWeight: 700 }}>{rfi.id}</div>
                <div>
                  <div style={{ fontSize: 12, color: "#fff", fontWeight: 600, marginBottom: 2, lineHeight: 1.3 }}>{rfi.title}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>{rfi.project}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>{rfi.drawing || "—"}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>{rfi.workPackage || "—"}</div>
                </div>
                <div><PriorityTag p={rfi.priority} /></div>
                <div><Badge status={rfi.status} /></div>
                <div>
                  <div style={{ fontSize: 11, color: over ? "#FF4D4D" : soon ? "#FFB020" : "rgba(255,255,255,0.6)" }}>
                    {fmtDate(rfi.due)}
                  </div>
                  {over && <div style={{ fontSize: 9, color: "#FF4D4D", marginTop: 2 }}>{Math.abs(days)}d OVERDUE</div>}
                  {soon && !over && <div style={{ fontSize: 9, color: "#FFB020", marginTop: 2 }}>DUE IN {days}d</div>}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{rfi.assignedTo}</div>
                <div>
                  <Btn variant="secondary" onClick={e => { e.stopPropagation(); handleEdit(rfi); }} style={{ fontSize: 10, padding: "5px 10px" }}>
                    EDIT
                  </Btn>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 16, fontSize: 10, color: "rgba(255,255,255,0.2)", textAlign: "center", letterSpacing: "0.08em" }}>
          STEELBUILD PRO · RFI MODULE · DATA STORED LOCALLY · {rfis.length} RECORDS
        </div>
      </div>

      {/* Modals */}
      {showForm && (
        <RFIForm
          rfi={editRfi}
          allRfis={rfis}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditRfi(null); }}
        />
      )}
      {viewRfi && !showForm && (
        <RFIDetail
          rfi={viewRfi}
          onEdit={handleEdit}
          onClose={() => setViewRfi(null)}
          onDelete={handleDelete}
        />
      )}
    </>
  );
}