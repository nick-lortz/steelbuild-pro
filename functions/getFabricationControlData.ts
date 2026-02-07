import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await req.json();

    if (!projectId) {
      return Response.json({ 
        error: 'Project ID required',
        snapshot: {},
        packages: [],
        shipping: [],
        holds: [],
        ai: { summary: 'No project selected', risks: [], recommendations: [], confidence: 'low', missingDataReasons: ['No project'] },
        warnings: ['No project selected'],
        lastUpdated: new Date().toISOString()
      }, { status: 400 });
    }

    const project = (await base44.entities.Project.filter({ id: projectId }))[0];
    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    const [fabPackages, workPackages, drawingSets] = await Promise.all([
      base44.entities.FabricationPackage.filter({ project_id: projectId }),
      base44.entities.WorkPackage.filter({ project_id: projectId }),
      base44.entities.DrawingSet.filter({ project_id: projectId })
    ]);

    const warnings = [];
    if (fabPackages.length === 0) warnings.push('No fabrication packages created');

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Snapshot by stage
    const notStarted = fabPackages.filter(fp => fp.status === 'not_started' || !fp.status).length;
    const cutting = fabPackages.filter(fp => fp.status === 'cutting').length;
    const fitUp = fabPackages.filter(fp => fp.status === 'fit_up').length;
    const weld = fabPackages.filter(fp => fp.status === 'weld').length;
    const paint = fabPackages.filter(fp => fp.status === 'paint').length;
    const qa = fabPackages.filter(fp => fp.status === 'qa').length;
    const readyToShip = fabPackages.filter(fp => fp.status === 'ready_to_ship').length;
    const shipped = fabPackages.filter(fp => fp.status === 'shipped').length;

    const shipped7d = fabPackages.filter(fp => 
      fp.status === 'shipped' && 
      fp.shipped_date && 
      new Date(fp.shipped_date) >= sevenDaysAgo
    ).length;

    const shipped30d = fabPackages.filter(fp => 
      fp.status === 'shipped' && 
      fp.shipped_date && 
      new Date(fp.shipped_date) >= thirtyDaysAgo
    ).length;

    const onHold = fabPackages.filter(fp => fp.on_hold || fp.hold_reason).length;

    // Build packages with hold/blocker analysis
    const packages = fabPackages.map(fp => {
      const holds = [];

      if (fp.on_hold || fp.hold_reason) {
        holds.push({
          type: 'hold',
          reason: fp.hold_reason || 'On hold',
          age_days: fp.hold_since ? Math.floor((now - new Date(fp.hold_since)) / (24 * 60 * 60 * 1000)) : 0
        });
      }

      // Missing QA
      if ((fp.status === 'qa' || fp.status === 'ready_to_ship') && !fp.qa_approved_date) {
        holds.push({ type: 'missing_qa', reason: 'QA not approved' });
      }

      // No ship target
      if (!fp.ship_target_date && fp.status !== 'shipped') {
        holds.push({ type: 'no_ship_target', reason: 'No ship target set' });
      }

      // Late
      if (fp.ship_target_date && !fp.shipped_date && new Date(fp.ship_target_date) < now) {
        holds.push({ type: 'late', reason: 'Past ship target' });
      }

      const linkedWP = workPackages.find(wp => wp.id === fp.work_package_id);

      return {
        id: fp.id,
        name: fp.package_name || fp.piece_marks || 'Unnamed',
        stage: fp.status || 'not_started',
        progress_pct: Number(fp.progress_percent) || 0,
        ship_target: fp.ship_target_date,
        shipped_date: fp.shipped_date,
        qa_status: fp.qa_approved_date ? 'approved' : fp.status === 'qa' ? 'pending' : 'not_started',
        qa_approved_date: fp.qa_approved_date,
        holds,
        updated_date: fp.updated_date,
        linked_wp: linkedWP?.title || null,
        linked_wp_id: fp.work_package_id,
        on_hold: fp.on_hold || false,
        hold_reason: fp.hold_reason
      };
    });

    // Shipping schedule (next 7 days)
    const shipping = fabPackages
      .filter(fp => fp.ship_target_date && new Date(fp.ship_target_date) <= sevenDaysOut && !fp.shipped_date)
      .sort((a, b) => new Date(a.ship_target_date) - new Date(b.ship_target_date))
      .map(fp => ({
        id: fp.id,
        name: fp.package_name || fp.piece_marks,
        ship_target: fp.ship_target_date,
        status: fp.status,
        qa_status: fp.qa_approved_date ? 'approved' : 'pending'
      }));

    // Holds list
    const holdsList = packages
      .filter(p => p.holds.length > 0)
      .map(p => ({
        package_id: p.id,
        package_name: p.name,
        reason: p.holds.map(h => h.reason).join(', '),
        age_days: Math.max(...p.holds.map(h => h.age_days || 0)),
        next_step: p.holds.some(h => h.type === 'missing_qa') ? 'Complete QA' :
                   p.holds.some(h => h.type === 'no_ship_target') ? 'Set ship date' :
                   'Review hold reason'
      }));

    // AI analysis
    const risks = packages
      .filter(p => p.holds.some(h => h.type === 'late') || p.on_hold)
      .slice(0, 5)
      .map(p => ({
        package_id: p.id,
        package_name: p.name,
        risk_level: p.holds.some(h => h.type === 'late') ? 'critical' : 'high',
        reason: p.holds.map(h => h.reason).join(', '),
        impact: 'Shipment delay risk'
      }));

    const recommendations = [
      onHold > 0 && {
        action: `Resolve ${onHold} packages on hold`,
        priority: 'critical',
        impact: 'Restore shop flow',
        affectedPackages: packages.filter(p => p.on_hold).map(p => p.name)
      },
      qa > 5 && {
        action: `QA backlog: ${qa} packages awaiting inspection`,
        priority: 'high',
        impact: 'Prevent shipping delays'
      },
      shipping.filter(s => s.qa_status !== 'approved').length > 0 && {
        action: 'Complete QA for packages shipping this week',
        priority: 'high',
        impact: 'Enable on-time shipment',
        affectedPackages: shipping.filter(s => s.qa_status !== 'approved').map(s => s.name)
      }
    ].filter(Boolean);

    const missingDataReasons = [];
    if (fabPackages.length === 0) missingDataReasons.push('No fabrication packages');
    if (fabPackages.filter(fp => !fp.ship_target_date).length > 0) {
      missingDataReasons.push('Some packages missing ship targets');
    }

    return Response.json({
      project: {
        id: project.id,
        name: project.name,
        project_number: project.project_number
      },
      snapshot: {
        notStarted,
        cutting,
        fitUp,
        weld,
        paint,
        qa,
        readyToShip,
        shipped,
        shipped7d,
        shipped30d,
        onHold
      },
      packages,
      shipping,
      holds: holdsList,
      ai: {
        summary: onHold > 0 ? `${onHold} packages on hold - resolve immediately` :
                 holdsList.length > 0 ? `${holdsList.length} packages with issues` :
                 'Shop production on track',
        risks,
        recommendations,
        confidence: fabPackages.length > 5 ? 'high' : 'medium',
        missingDataReasons
      },
      warnings,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('getFabricationControlData error:', error);
    return Response.json({ 
      error: error.message,
      details: error.stack 
    }, { status: 500 });
  }
});