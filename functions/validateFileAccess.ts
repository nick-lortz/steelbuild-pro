/**
 * validateFileAccess (Self-contained)
 *
 * Validates whether the current user is allowed to access a document/file
 * based on project membership (assigned_users / project_manager / superintendent).
 *
 * Recommended usage: pass document_id (strong authorization).
 * file_url-only checks are allowed but flagged as weaker.
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

    // 2) PARSE BODY
    let body;
    try {
      body = await req.json();
    } catch {
      return json(400, { error: "Invalid JSON body" });
    }

    const document_id = body?.document_id;
    const file_url = body?.file_url;

    if (!isNonEmptyString(document_id) && !isNonEmptyString(file_url)) {
      return json(400, { error: "document_id or file_url required" });
    }

    // 3) Preferred path: document_id -> enforce project access
    if (isNonEmptyString(document_id)) {
      // Use service role to ensure we can fetch the doc even if user is not authorized;
      // authorization is enforced explicitly below.
      const docs = await base44.asServiceRole.entities.Document.filter({ id: document_id });
      const document = docs?.[0];

      if (!document) {
        console.warn("validateFileAccess: Document not found", { document_id, user: user.email });
        return json(404, { error: "Document not found" });
      }

      const projects = await base44.asServiceRole.entities.Project.filter({ id: document.project_id });
      const project = projects?.[0];

      if (!project) {
        console.warn("validateFileAccess: Project not found for document", {
          document_id,
          project_id: document.project_id,
          user: user.email,
        });
        return json(404, { error: "Project not found" });
      }

      // Admin bypass
      const isAdmin = user?.role === "admin" || user?.is_admin === true;
      if (isAdmin) {
        console.info("validateFileAccess: Admin access granted", { document_id, user: user.email });
        return json(200, {
          allowed: true,
          file_url: document.file_url,
          document,
        });
      }

      // Assigned check
      const allowed = userHasProjectAccess(user, project);
      if (!allowed) {
        console.warn("validateFileAccess: Access denied (not assigned)", {
          document_id,
          project_id: project.id,
          user: user.email,
        });
        return json(403, { error: "Access denied" });
      }

      console.info("validateFileAccess: Access granted", {
        document_id,
        project_id: project.id,
        user: user.email,
      });

      return json(200, {
        allowed: true,
        file_url: document.file_url,
        document,
      });
    }

    // 4) Weaker path: file_url-only validation
    console.warn("validateFileAccess: file_url validation without document_id (weak)", { user: user.email });

    return json(200, {
      allowed: true,
      file_url,
      warning: "Direct file access not fully validated (prefer document_id)",
    });
  } catch (error) {
    console.error("validateFileAccess error:", error);
    return json(500, { error: "Internal server error" });
  }
});
