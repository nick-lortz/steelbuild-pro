import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { project_id, change_type, change_summary, affected_sov_codes, field_changes, notes } = await req.json();

    if (!project_id || !change_type) {
      return Response.json({ error: 'project_id and change_type required' }, { status: 400 });
    }

    // Get current SOV state
    const currentSOV = await base44.entities.SOVItem.filter({ project_id });

    // Get latest version number
    const existingVersions = await base44.entities.SOVVersion.filter(
      { project_id },
      '-version_number',
      1
    );
    const nextVersion = existingVersions.length > 0 ? existingVersions[0].version_number + 1 : 1;

    // Mark all previous versions as not current
    const allVersions = await base44.entities.SOVVersion.filter({ project_id, is_current: true });
    await Promise.all(
      allVersions.map(v => base44.entities.SOVVersion.update(v.id, { is_current: false }))
    );

    // Create new version
    const version = await base44.entities.SOVVersion.create({
      project_id,
      version_number: nextVersion,
      snapshot_data: JSON.stringify(currentSOV),
      change_summary: change_summary || `${change_type} operation`,
      changed_by: user.email,
      change_type,
      affected_sov_codes: affected_sov_codes || [],
      field_changes: field_changes || [],
      is_current: true,
      notes: notes || null
    });

    // Log to audit
    await base44.functions.invoke('logCriticalError', {
      level: 'info',
      message: `SOV Version ${nextVersion} created for project ${project_id}`,
      context: {
        action: 'sov_version_created',
        project_id,
        version_number: nextVersion,
        change_type,
        user: user.email
      }
    });

    return Response.json({ version, version_number: nextVersion });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});