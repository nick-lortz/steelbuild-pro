import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { validateInput, ProjectCreateSchema } from './utils/schemas.js';
import { handleFunctionError } from './utils/errorHandler.js';

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function normalizeProjectNumber(v: unknown) {
  return String(v ?? "").trim().toUpperCase();
}

async function requireUser(base44: any) {
  const user = await base44.auth.me();
  if (!user) return { error: json(401, { error: "Unauthorized" }) };
  return { user };
}

function requireFields(data: any, fields: string[]) {
  const missing = fields.filter((f) => !String(data?.[f] ?? "").trim());
  return missing;
}

async function projectNumberExists(base44: any, project_number: string, excludeId?: string) {
  const existing = await base44.entities.Project.filter({ project_number });
  const filtered = excludeId ? existing.filter((p: any) => p.id !== excludeId) : existing;
  return filtered.length > 0 ? filtered : null;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const auth = await requireUser(base44);
    if (auth.error) return auth.error;
    const user = auth.user;

    // OPTIONAL: lock to admin only
    if (user.role !== "admin") {
      return json(403, { error: "Forbidden (admin only)" });
    }

    const data = await req.json();

    // Validate against schema
    const validation = validateInput(ProjectCreateSchema, data);
    if (!validation.valid) {
      return json(400, { error: validation.error });
    }

    const project_number = normalizeProjectNumber(data.project_number);

    // Pre-check uniqueness
    const dup = await projectNumberExists(base44.asServiceRole, project_number);
    if (dup) {
      return json(409, {
        error: "Duplicate project_number",
        project_number,
        existing_ids: dup.map((p: any) => p.id),
      });
    }

    // Create with small retry loop to reduce race collisions
    // (Not truly atomic, but better than nothing on platforms without DB unique constraints.)
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const project = await base44.asServiceRole.entities.Project.create({
          ...data,
          project_number,
          created_by: user.email,
        });

        // Post-check (detect a race where another insert occurred between checks)
        const post = await projectNumberExists(base44.asServiceRole, project_number);
        if (post && post.length > 1) {
          // We created a duplicate due to race – best-effort rollback of the newest
          // NOTE: if you prefer, return 409 and keep record for manual cleanup instead.
          const newest = post
            .map((p: any) => ({ ...p, _t: new Date(p.created_at || 0).getTime() }))
            .sort((a: any, b: any) => b._t - a._t)[0];

          // If our created id is the newest, delete it
          if (newest?.id === project.id) {
            await base44.asServiceRole.entities.Project.delete(project.id);
          }
          return json(409, {
            error: "Duplicate project_number detected (race)",
            project_number,
          });
        }

        return json(201, { success: true, project });
      } catch (e: any) {
        // If platform returns a conflict error sometimes, treat as 409
        const msg = String(e?.message ?? e);
        if (msg.toLowerCase().includes("duplicate") || msg.includes("409")) {
          return json(409, { error: "Duplicate project_number", project_number });
        }
        if (attempt === 2) throw e;
      }
    }

    return json(500, { error: "Unexpected createProject failure" });
  } catch (error: any) {
    const { status, body } = handleFunctionError(error, 'createProject');
    return new Response(body, { status, headers: { 'Content-Type': 'application/json' } });
  }
});