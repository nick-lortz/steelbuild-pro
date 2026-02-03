/**
 * SECURE RFI UPDATE ENDPOINT (Self-contained)
 *
 * Avoids local imports to prevent Base44 packaging/module resolution issues.
 * Includes:
 * - Auth + project access enforcement
 * - Partial update validation
 * - rfi_number uniqueness enforcement
 * - Auto-set dates by status
 * - Safe error handling
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { checkRateLimit, rateLimitResponse } from './utils/rateLimit.js';
import { validateInput, RFIUpdateSchema } from './utils/validation.js';
import { handleFunctionError } from './utils/errorHandler.js';

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function isISODate(v) {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function asNumber(v) {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  return null;
}

function normalizeEnum(v) {
  return typeof v === "string" ? v.trim().toLowerCase() : v;
}

function isConflictError(err) {
  const msg = (err?.message || "").toLowerCase();
  const detail = (err?.detail || "").toLowerCase();
  const errType = (err?.error_type || "").toLowerCase();
  return (
    msg.includes("unique") ||
    msg.includes("duplicate") ||
    msg.includes("conflict") ||
    detail.includes("unique") ||
    detail.includes("duplicate") ||
    detail.includes("conflict") ||
    errType.includes("conflict")
  );
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function userHasProjectAccess(user, project) {
  const isAdmin = user?.role === "admin" || user?.is_admin === true;
  if (isAdmin) return true;

  const email = user?.email ? String(user.email).toLowerCase() : null;
  if (!email) return false;

  const pm = project?.project_manager ? String(project.project_manager).toLowerCase() : null;
  const supt = project?.superintendent ? String(project.superintendent).toLowerCase() : null;

  const assigned = Array.isArray(project?.assigned_users) ? project.assigned_users : [];
  const assignedMatch = assigned.some((x) => String(x).toLowerCase() === email);

  return email === pm || email === supt || assignedMatch;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // 1) AUTH
    const user = await base44.auth.me();
    if (!user) return json(401, { error: "Unauthorized" });

    // Rate limiting: 150 RFI updates per minute per user
    const rateLimit = checkRateLimit(user.email, 150, 60 * 1000);
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfter);
    }

    // 2) PARSE BODY
    let body;
    try {
      body = await req.json();
    } catch {
      return json(400, { error: "Invalid JSON body" });
    }

    // Accept both shapes:
    // A) { id: "...", data: { ... } }  (your current pattern)
    // B) { rfi_id: "...", ...fields }  (fallback)
    const id = body?.id || body?.rfi_id;
    const data = body?.data || body;

    if (!isNonEmptyString(id)) {
      return json(400, { error: "RFI ID is required", details: ["id (or rfi_id) is required"] });
    }

    // Prevent accidental overwrite if client included ids in data
    if (data?.id) delete data.id;
    if (data?.rfi_id) delete data.rfi_id;

    // 3) FETCH EXISTING RFI (service role, then we enforce access explicitly)
    const existingRFIs = await base44.asServiceRole.entities.RFI.filter({ id });
    const existingRFI = existingRFIs?.[0];

    if (!existingRFI) {
      return json(404, { error: "RFI not found" });
    }

    // 4) FETCH PROJECT + ACCESS CHECK
    const projects = await base44.asServiceRole.entities.Project.filter({ id: existingRFI.project_id });
    const project = projects?.[0];

    if (!project) {
      return json(404, { error: "Project not found" });
    }

    if (!userHasProjectAccess(user, project)) {
      return json(403, { error: "Forbidden: No access to this project" });
    }

    // 5) VALIDATION (partial update)
    const errors = [];

    if (data?.subject != null && typeof data.subject !== "string") errors.push("subject must be a string");
    if (typeof data?.subject === "string" && data.subject.length > 200) errors.push("subject max length is 200");

    if (data?.question != null && typeof data.question !== "string") errors.push("question must be a string");
    if (typeof data?.question === "string" && data.question.length > 5000) errors.push("question max length is 5000");

    if (data?.response != null && typeof data.response !== "string") errors.push("response must be a string");
    if (typeof data?.response === "string" && data.response.length > 5000) errors.push("response max length is 5000");

    // Enum-ish
    if (data?.status != null) data.status = normalizeEnum(data.status);
    if (data?.priority != null) data.priority = normalizeEnum(data.priority);
    if (data?.rfi_type != null) data.rfi_type = normalizeEnum(data.rfi_type);

    // Date fields
    const dateFields = ["submitted_date", "due_date", "response_date", "closed_date"];
    for (const f of dateFields) {
      if (data?.[f] != null && !isISODate(data[f])) errors.push(`${f} must be YYYY-MM-DD`);
    }

    // Numeric fields
    if (data?.estimated_cost_impact != null) {
      const n = asNumber(data.estimated_cost_impact);
      if (n == null || n < 0) errors.push("estimated_cost_impact must be a number >= 0");
      else data.estimated_cost_impact = n;
    }

    if (data?.schedule_impact_days != null) {
      const n = asNumber(data.schedule_impact_days);
      if (n == null || n < 0) errors.push("schedule_impact_days must be a number >= 0");
      else data.schedule_impact_days = n;
    }

    // rfi_number validation if present
    if (data?.rfi_number != null) {
      const n = asNumber(data.rfi_number);
      if (n == null || n <= 0) errors.push("rfi_number must be a positive number");
      else data.rfi_number = n;
    }

    if (errors.length) {
      return json(400, { error: "Validation failed", details: errors });
    }

    // 6) UNIQUE CHECK if rfi_number is changing
    if (data?.rfi_number != null && data.rfi_number !== existingRFI.rfi_number) {
      // Query same project, same number; reject if someone else has it
      const dup = await base44.asServiceRole.entities.RFI.filter({
        project_id: existingRFI.project_id,
        rfi_number: data.rfi_number,
      });

      const someoneElseHasIt = (dup || []).some((r) => r.id !== id);
      if (someoneElseHasIt) {
        return json(409, { error: "RFI number already exists for this project" });
      }
    }

    // 7) AUTO-SET DATES BASED ON STATUS
    const updates = { ...data };

    if (updates.status === "submitted" && !updates.submitted_date) {
      updates.submitted_date = todayISO();
    }
    if (updates.status === "answered" && !updates.response_date) {
      updates.response_date = todayISO();
    }
    if (updates.status === "closed" && !updates.closed_date) {
      updates.closed_date = todayISO();
    }

    // Always track who updated
    updates.updated_by = user.email;

    // 8) UPDATE
    try {
      const rfi = await base44.asServiceRole.entities.RFI.update(id, updates);
      return json(200, { success: true, rfi });
    } catch (err) {
      if (isConflictError(err)) {
        return json(409, { error: "Update conflict / unique constraint violation" });
      }
      console.error("Update RFI error:", err);
      return json(500, { error: "Internal server error" });
    }
  } catch (error) {
    const { status, body } = handleFunctionError(error, 'updateRFI');
    return new Response(body, { status, headers: { 'Content-Type': 'application/json' } });
  }
});