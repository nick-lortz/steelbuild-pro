/**
 * SECURE PROJECT CREATION ENDPOINT (Self-contained)
 *
 * No local imports to avoid Base44 function packaging/path issues.
 * Includes:
 * - Auth check + admin check
 * - Input validation
 * - Uniqueness check
 * - Safe error handling
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function isISODate(v) {
  // Accepts YYYY-MM-DD
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // 1) AUTH
    const user = await base44.auth.me();
    if (!user) return json(401, { error: "Unauthorized" });

    // 2) ADMIN CHECK (adjust role field if your user shape differs)
    // Common patterns: user.role === 'admin' OR user.is_admin === true
    const isAdmin = user?.role === "admin" || user?.is_admin === true;
    if (!isAdmin) return json(403, { error: "Forbidden (admin only)" });

    // 3) PARSE BODY
    let data;
    try {
      data = await req.json();
    } catch {
      return json(400, { error: "Invalid JSON body" });
    }

    // 4) VALIDATION (minimum required)
    const errors = [];
    if (!isNonEmptyString(data.project_number)) errors.push("project_number is required");
    if (!isNonEmptyString(data.name)) errors.push("name is required");
    if (!isNonEmptyString(data.client)) errors.push("client is required");

    // Optional but recommended
    if (data.start_date && !isISODate(data.start_date)) errors.push("start_date must be YYYY-MM-DD");
    if (data.target_completion && !isISODate(data.target_completion)) errors.push("target_completion must be YYYY-MM-DD");

    // Numeric guards (if present)
    if (data.contract_value != null && typeof data.contract_value !== "number") {
      errors.push("contract_value must be a number");
    }
    if (typeof data.contract_value === "number" && data.contract_value < 0) {
      errors.push("contract_value must be >= 0");
    }

    if (errors.length) {
      return json(400, { error: "Validation failed", details: errors });
    }

    // 5) UNIQUENESS CHECK (project_number)
    // If you added unique_indexes on Project, the DB will enforce too, but we keep this for user-friendly error.
    const existing = await base44.asServiceRole.entities.Project.filter({
      project_number: data.project_number,
    });

    if (existing && existing.length > 0) {
      return json(409, { error: "Project number already exists" });
    }

    // 6) CREATE
    const project = await base44.asServiceRole.entities.Project.create({
      ...data,
      created_by: user.email,
      updated_by: user.email,
    });

    return json(201, { success: true, project });
  } catch (error) {
    console.error("createProject error:", error);
    return json(500, { error: "Internal server error" });
  }
});
