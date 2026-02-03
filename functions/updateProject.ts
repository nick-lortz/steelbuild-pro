/**
 * SECURE PROJECT UPDATE ENDPOINT (Self-contained)
 *
 * Avoids local imports to prevent Base44 packaging/module resolution issues.
 * Includes:
 * - Auth + admin enforcement
 * - Partial update validation
 * - project_number uniqueness enforcement
 * - Safe error handling
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { validateInput, ProjectUpdateSchema } from './utils/schemas.js';
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

function isFiniteNumber(v) {
  return typeof v === "number" && Number.isFinite(v);
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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // 1) AUTH
    const user = await base44.auth.me();
    if (!user) return json(401, { error: "Unauthorized" });

    // 2) ADMIN CHECK
    const isAdmin = user?.role === "admin" || user?.is_admin === true;
    if (!isAdmin) return json(403, { error: "Forbidden (admin only)" });

    // 3) PARSE BODY
    let body;
    try {
      body = await req.json();
    } catch {
      return json(400, { error: "Invalid JSON body" });
    }

    // Accept both shapes:
    // A) { id: "...", data: { ...fields } }  (your current pattern)
    // B) { project_id: "...", ...fields }    (fallback)
    const id = body?.id || body?.project_id;
    const data = body?.data || body;

    if (!isNonEmptyString(id)) {
      return json(400, { error: "Project ID is required", details: ["id (or project_id) is required"] });
    }

    // Prevent accidental full-object overwrite if they passed id in the "data"
    if (data?.id) delete data.id;
    if (data?.project_id) delete data.project_id;

    // 4) Ensure project exists
    const existing = await base44.asServiceRole.entities.Project.filter({ id });
    const currentProject = existing?.[0];
    if (!currentProject) return json(404, { error: "Project not found" });

    // 5) VALIDATION (partial update)
    const errors = [];

    // Only validate fields if present
    if (data?.project_number != null && !isNonEmptyString(data.project_number)) errors.push("project_number must be a non-empty string");
    if (data?.name != null && !isNonEmptyString(data.name)) errors.push("name must be a non-empty string");
    if (data?.client != null && !isNonEmptyString(data.client)) errors.push("client must be a non-empty string");

    // Dates
    if (data?.start_date != null && !isISODate(data.start_date)) errors.push("start_date must be YYYY-MM-DD");
    if (data?.target_completion != null && !isISODate(data.target_completion)) errors.push("target_completion must be YYYY-MM-DD");

    // Numeric
    if (data?.contract_value != null) {
      if (!isFiniteNumber(data.contract_value)) errors.push("contract_value must be a number");
      if (isFiniteNumber(data.contract_value) && data.contract_value < 0) errors.push("contract_value must be >= 0");
    }

    // Enum-ish
    if (data?.status != null) data.status = normalizeEnum(data.status);

    // Date ordering rule (only if both are known after patch)
    const startDate = data?.start_date ?? currentProject?.start_date;
    const targetCompletion = data?.target_completion ?? currentProject?.target_completion;
    if (startDate && targetCompletion) {
      // Compare as strings works for YYYY-MM-DD ISO format
      if (String(startDate) > String(targetCompletion)) errors.push("start_date must be <= target_completion");
    }

    if (errors.length) {
      return json(400, { error: "Validation failed", details: errors });
    }

    // 6) UNIQUE CHECK if project_number is changing
    if (data?.project_number && data.project_number !== currentProject?.project_number) {
      const dup = await base44.asServiceRole.entities.Project.filter({
        project_number: data.project_number,
      });

      const someoneElseHasIt = (dup || []).some((p) => p.id !== id);
      if (someoneElseHasIt) {
        return json(409, { error: "Project number already exists" });
      }
    }

    // 7) UPDATE
    try {
      const updated = await base44.asServiceRole.entities.Project.update(id, {
        ...data,
        updated_by: user.email,
      });

      return json(200, { success: true, project: updated });
    } catch (err) {
      if (isConflictError(err)) {
        return json(409, { error: "Update conflict / unique constraint violation" });
      }
      console.error("Update project error:", err);
      return json(500, { error: "Internal server error" });
    }
  } catch (error) {
    const { status, body } = handleFunctionError(error, 'updateProject');
    return new Response(body, { status, headers: { 'Content-Type': 'application/json' } });
  }
});