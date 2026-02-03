import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { validateInput, RFICreateSchema } from './utils/validation.js';
import { handleFunctionError } from './utils/errorHandler.js';

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

async function requireUser(base44: any) {
  const user = await base44.auth.me();
  if (!user) return { error: json(401, { error: "Unauthorized" }) };
  return { user };
}

async function requireProjectAccess(base44: any, user: any, project_id: string) {
  const [project] = await base44.entities.Project.filter({ id: project_id });
  if (!project) return { error: json(404, { error: "Project not found" }) };

  if (user.role === "admin") return { project };

  const assigned =
    project.project_manager === user.email ||
    project.superintendent === user.email ||
    (Array.isArray(project.assigned_users) && project.assigned_users.includes(user.email));

  if (!assigned) return { error: json(403, { error: "Forbidden: No access to this project" }) };
  return { project };
}

async function rfiNumberExists(base44: any, project_id: string, rfi_number: number, excludeId?: string) {
  const existing = await base44.entities.RFI.filter({ project_id, rfi_number });
  const filtered = excludeId ? existing.filter((r: any) => r.id !== excludeId) : existing;
  return filtered.length > 0 ? filtered : null;
}

async function getNextRfiNumber(base44: any, project_id: string) {
  // best-effort: look at existing RFIs and choose max+1
  const rfis = await base44.entities.RFI.filter({ project_id });
  const max = rfis.reduce((m: number, r: any) => Math.max(m, Number(r.rfi_number || 0)), 0);
  return max + 1;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const auth = await requireUser(base44);
    if (auth.error) return auth.error;
    const user = auth.user;

    const data = await req.json();

    // Validate input
    const validation = validateInput(RFICreateSchema, data);
    if (!validation.valid) return json(400, { error: validation.error });

    const access = await requireProjectAccess(base44, user, data.project_id);
    if (access.error) return access.error;

    // determine rfi_number
    let rfi_number = data.rfi_number ? Number(data.rfi_number) : await getNextRfiNumber(base44.asServiceRole, data.project_id);
    if (!Number.isFinite(rfi_number) || rfi_number <= 0) {
      return json(400, { error: "rfi_number must be a positive number" });
    }

    // pre-check uniqueness
    const dup = await rfiNumberExists(base44.asServiceRole, data.project_id, rfi_number);
    if (dup) {
      return json(409, {
        error: "Duplicate RFI number for project",
        project_id: data.project_id,
        rfi_number,
        existing_ids: dup.map((r: any) => r.id),
      });
    }

    // create with retry to mitigate collisions
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const rfi = await base44.asServiceRole.entities.RFI.create({
          ...data,
          rfi_number,
          created_by: user.email,
        });

        // post-check: detect race duplicates
        const post = await rfiNumberExists(base44.asServiceRole, data.project_id, rfi_number);
        if (post && post.length > 1) {
          // best-effort rollback of our insert
          await base44.asServiceRole.entities.RFI.delete(rfi.id);
          return json(409, {
            error: "Duplicate RFI number detected (race)",
            project_id: data.project_id,
            rfi_number,
          });
        }

        return json(201, { success: true, rfi });
      } catch (e: any) {
        const msg = String(e?.message ?? e);
        if (msg.toLowerCase().includes("duplicate") || msg.includes("409")) {
          // Recompute next number and retry once
          if (attempt === 1) {
            rfi_number = await getNextRfiNumber(base44.asServiceRole, data.project_id);
            continue;
          }
          return json(409, { error: "Duplicate RFI number for project", project_id: data.project_id, rfi_number });
        }
        if (attempt === 2) throw e;
      }
    }

    return json(500, { error: "Unexpected createRFI failure" });
  } catch (error: any) {
    const { status, body } = handleFunctionError(error, 'createRFI');
    return new Response(body, { status, headers: { 'Content-Type': 'application/json' } });
  }
});