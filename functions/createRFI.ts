/**
 * SECURE RFI CREATION ENDPOINT (Self-contained)
 *
 * Avoids local imports to prevent Base44 packaging/module resolution errors.
 * Implements:
 * - Auth + project access enforcement (assigned_users)
 * - Input validation
 * - Auto-increment RFI number per project (best-effort)
 * - Uniqueness with retry (relies on DB unique index: ["project_id","rfi_number"])
 * - Safe error handling
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

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

function hasProjectAccess(user, project) {
  // Admin bypass
  const isAdmin = user?.role === "admin" || user?.is_admin === true;
  if (isAdmin) return true;

  // Project-level access via assigned_users (array of emails or ids)
  const assigned = project?.assigned_users || [];
  const email = user?.email;

  if (!email) return false;
  return Array.isArray(assigned) && assigned.some((x) => String(x).toLowerCase() === String(email).toLowerCase());
}

async function getNextRfiNumber(base44, projectId) {
  // Best-effort: compute max existing rfi_number for project, then +1
  // This is NOT perfectly concurrency-safe by itself; we combine it with DB unique constraint + retry.
  const existing = await base44.asServiceRole.entities.RFI.filter({ project_id: projectId });

  let maxNum = 0;
  for (const r of existing || []) {
    const n = asNumber(r?.rfi_number);
    if (n != null && n > maxNum) maxNum = n;
  }
  return maxNum + 1;
}

function isConflictError(err) {
  // Base44/SDK error shapes can vary. Detect common patterns.
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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // 1) AUTH
    const user = await base44.auth.me();
    if (!user) return json(401, { error: "Unauthorized" });

    // 2) PARSE BODY
    let data;
    try {
      data = await req.json();
    } catch {
      return json(400, { error: "Invalid JSON body" });
    }

    const projectId = data?.project_id;
    if (!isNonEmptyString(projectId)) {
      return json(400, { error: "Validation failed", details: ["project_id is required"] });
    }

    // 3) LOAD PROJECT (service role so access filtering doesn't hide record)
    const projects = await base44.asServiceRole.entities.Project.filter({ id: projectId });
    const project = projects?.[0];
    if (!project) return json(404, { error: "Project not found" });

    // 4) PROJECT ACCESS ENFORCEMENT (assigned_users)
    if (!hasProjectAccess(user, project)) {
      return json(403, { error: "Forbidden (no project access)" });
    }

    // 5) VALIDATION (minimal required + safe guards)
    const errors = [];

    const subject = data?.subject;
    if (!isNonEmptyString(subject)) errors.push("subject is required");

    const rfiType = normalizeEnum(data?.rfi_type);
    if (rfiType && !isNonEmptyString(rfiType)) errors.push("rfi_type must be a string");

    const status = normalizeEnum(data?.status || "draft");
    const priority = normalizeEnum(data?.priority || "medium");

    // Date guards
    if (data?.submitted_date && !isISODate(data.submitted_date)) errors.push("submitted_date must be YYYY-MM-DD");
    if (data?.due_date && !isISODate(data.due_date)) errors.push("due_date must be YYYY-MM-DD");
    if (data?.response_date && !isISODate(data.response_date)) errors.push("response_date must be YYYY-MM-DD");

    // Impact guards
    if (data?.estimated_cost_impact != null) {
      const n = asNumber(data.estimated_cost_impact);
      if (n == null || n < 0) errors.push("estimated_cost_impact must be a number >= 0");
    }
    if (data?.schedule_impact_days != null) {
      const n = asNumber(data.schedule_impact_days);
      if (n == null || n < 0) errors.push("schedule_impact_days must be a number >= 0");
    }

    // Basic length limits (enterprise-safe, prevents abuse)
    if (typeof subject === "string" && subject.length > 200) errors.push("subject max length is 200");
    if (typeof data?.question === "string" && data.question.length > 5000) errors.push("question max length is 5000");
    if (typeof data?.response === "string" && data.response.length > 5000) errors.push("response max length is 5000");

    if (errors.length) {
      return json(400, { error: "Validation failed", details: errors });
    }

    // 6) RFI NUMBER: accept provided or generate next
    let rfiNumber = asNumber(data?.rfi_number);
    if (rfiNumber == null) {
      rfiNumber = await getNextRfiNumber(base44, projectId);
    }
    if (!Number.isFinite(rfiNumber) || rfiNumber <= 0) {
      return json(400, { error: "Validation failed", details: ["rfi_number must be a positive number"] });
    }

    // 7) CREATE with uniqueness retry
    // Relies on DB unique index: ["project_id","rfi_number"]
    const MAX_RETRIES = 5;
    let lastErr = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const rfi = await base44.asServiceRole.entities.RFI.create({
          ...data,
          project_id: projectId,
          rfi_type: rfiType || data?.rfi_type || "general",
          status,
          priority,
          rfi_number: rfiNumber,
          project_number: project?.project_number ?? data?.project_number,
          project_name: project?.name ?? data?.project_name,
          created_by: user.email,
          updated_by: user.email,
        });

        return json(201, { success: true, rfi });
      } catch (err) {
        lastErr = err;
        if (isConflictError(err)) {
          // pick next number and retry
          rfiNumber += 1;
          continue;
        }
        // Non-conflict error
        console.error("Create RFI error:", err);
        return json(500, { error: "Internal server error" });
      }
    }

    // If we got here: repeated conflicts
    console.error("Create RFI conflict retries exhausted:", lastErr);
    return json(409, {
      error: "Failed to allocate a unique RFI number. Please retry.",
    });
  } catch (error) {
    console.error("Create RFI fatal error:", error);
    return json(500, { error: "Internal server error" });
  }
});
