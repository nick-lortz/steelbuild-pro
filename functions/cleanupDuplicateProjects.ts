import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return json(403, { error: "Admin access required" });
    }

    const { dry_run = true } = await req.json();

    // Fetch all projects
    const projects = await base44.asServiceRole.entities.Project.list();

    // Group by project_number
    const grouped = new Map<string, any[]>();
    for (const p of projects) {
      const num = p.project_number;
      if (!grouped.has(num)) grouped.set(num, []);
      grouped.get(num)!.push(p);
    }

    // Find duplicates
    const duplicates: any[] = [];
    for (const [num, list] of grouped.entries()) {
      if (list.length > 1) {
        // Sort by created_date, keep oldest
        const sorted = list.sort((a, b) => 
          new Date(a.created_date).getTime() - new Date(b.created_date).getTime()
        );
        const keeper = sorted[0];
        const dupes = sorted.slice(1);
        duplicates.push({
          project_number: num,
          keeper: { id: keeper.id, name: keeper.name, created_date: keeper.created_date },
          duplicates: dupes.map(d => ({ id: d.id, name: d.name, created_date: d.created_date }))
        });

        if (!dry_run) {
          // Delete duplicates
          for (const d of dupes) {
            await base44.asServiceRole.entities.Project.delete(d.id);
          }
        }
      }
    }

    return json(200, {
      dry_run,
      duplicates_found: duplicates.length,
      total_duplicate_records: duplicates.reduce((sum, d) => sum + d.duplicates.length, 0),
      details: duplicates,
      message: dry_run 
        ? "Dry run - no deletions performed. Set dry_run:false to execute cleanup."
        : "Cleanup complete. Duplicate projects deleted."
    });
  } catch (error: any) {
    console.error("cleanupDuplicateProjects error:", error);
    return json(500, { error: "Internal server error", message: String(error?.message ?? error) });
  }
});