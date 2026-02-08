import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { current_drawing_set_id, previous_drawing_set_id } = await req.json();

    if (!current_drawing_set_id || !previous_drawing_set_id) {
      return Response.json({ error: 'Both drawing set IDs required' }, { status: 400 });
    }

    const [current, previous] = await Promise.all([
      base44.entities.DrawingSet.filter({ id: current_drawing_set_id }),
      base44.entities.DrawingSet.filter({ id: previous_drawing_set_id })
    ]);

    if (!current[0] || !previous[0]) {
      return Response.json({ error: 'Drawing sets not found' }, { status: 404 });
    }

    // Parse AI metadata from sheets
    const [currentSheets, prevSheets] = await Promise.all([
      base44.entities.DrawingSheet.filter({ drawing_set_id: current_drawing_set_id }),
      base44.entities.DrawingSheet.filter({ drawing_set_id: previous_drawing_set_id })
    ]);

    const parseMetadata = (sheets) => {
      const members = {};
      sheets.forEach(sheet => {
        try {
          const meta = sheet.ai_metadata ? JSON.parse(sheet.ai_metadata) : null;
          if (meta?.extracted_members) {
            meta.extracted_members.forEach(m => {
              const key = `${m.type}|${m.designation}|${m.grade}`;
              members[key] = (members[key] || 0) + (m.quantity || 1);
            });
          }
        } catch (e) {
          // skip
        }
      });
      return members;
    };

    const currentMembers = parseMetadata(currentSheets);
    const previousMembers = parseMetadata(prevSheets);

    const changes = {
      added: [],
      increased: [],
      decreased: [],
      removed: []
    };

    let tonageDelta = 0;

    // Detect changes
    Object.entries(currentMembers).forEach(([key, qty]) => {
      const prevQty = previousMembers[key] || 0;
      if (prevQty === 0) {
        changes.added.push({ member: key, quantity: qty });
        // Rough tonnage estimate: ~0.3 tons per beam, ~0.15 tons per connection
        tonageDelta += qty * 0.3;
      } else if (qty > prevQty) {
        changes.increased.push({ member: key, from: prevQty, to: qty });
        tonageDelta += (qty - prevQty) * 0.25;
      }
    });

    Object.entries(previousMembers).forEach(([key, qty]) => {
      const currQty = currentMembers[key] || 0;
      if (currQty === 0) {
        changes.removed.push({ member: key, quantity: qty });
        tonageDelta -= qty * 0.3;
      } else if (currQty < qty) {
        changes.decreased.push({ member: key, from: qty, to: currQty });
        tonageDelta -= (qty - currQty) * 0.25;
      }
    });

    // Generate CO draft language
    let coLanguage = '';
    if (changes.added.length > 0) {
      coLanguage += `Add structural members:\n${changes.added.map(c => `  • ${c.member} (${c.quantity}x)`).join('\n')}\n\n`;
    }
    if (changes.increased.length > 0) {
      coLanguage += `Increase quantities:\n${changes.increased.map(c => `  • ${c.member} from ${c.from} to ${c.to}`).join('\n')}\n\n`;
    }
    if (changes.removed.length > 0) {
      coLanguage += `Delete members:\n${changes.removed.map(c => `  • ${c.member} (${c.quantity}x)`).join('\n')}\n\n`;
    }

    coLanguage += `Estimated tonnage impact: ${tonageDelta > 0 ? '+' : ''}${tonageDelta.toFixed(2)} tons\n`;
    coLanguage += `Revision: ${current[0].current_revision} vs ${previous[0].current_revision}`;

    return Response.json({
      success: true,
      changes,
      tonnage_delta: parseFloat(tonageDelta.toFixed(2)),
      co_draft: coLanguage,
      severity: Math.abs(tonageDelta) > 5 ? 'high' : Math.abs(tonageDelta) > 2 ? 'medium' : 'low'
    });
  } catch (error) {
    console.error('Scope change detection error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});