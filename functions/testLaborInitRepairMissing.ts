import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const project = await base44.asServiceRole.entities.Project.create({
    name: "TEST - Labor Init Repair",
    project_number: `T-${Date.now()}`,
    status: "in_progress",
  });

  const callInit = async () => {
    const res = await base44.asServiceRole.functions.invoke("initializeLaborBreakdown", {
      project_id: project.id,
    });
    return res;
  };

  await callInit();
  let rows = await base44.asServiceRole.entities.LaborBreakdown.filter({ project_id: project.id });

  // Delete one breakdown row to simulate partial/missing state
  if (rows.length > 0) {
    await base44.asServiceRole.entities.LaborBreakdown.delete(rows[0].id);
  }

  const r2 = await callInit();
  rows = await base44.asServiceRole.entities.LaborBreakdown.filter({ project_id: project.id });

  // Cleanup test project
  await base44.asServiceRole.entities.Project.delete(project.id);

  return Response.json({
    success: true,
    created_after_delete: r2?.created ?? null,
    final_count: rows.length,
    pass: rows.length === 12 && Number(r2?.created) === 1,
  });
});