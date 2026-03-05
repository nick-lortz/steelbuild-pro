import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { spreadsheetId, sheetName, projectId, columnMap } = await req.json();

    if (!spreadsheetId || !projectId) {
      return Response.json(
        { error: 'spreadsheetId and projectId required' },
        { status: 400 }
      );
    }

    // Get access token for Google Sheets
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');

    // Fetch sheet data from Google Sheets API
    const sheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName || 'Sheet1'}`;
    const sheetResponse = await fetch(sheetUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!sheetResponse.ok) {
      throw new Error('Failed to fetch Google Sheet');
    }

    const sheetData = await sheetResponse.json();
    const values = sheetData.values || [];

    if (values.length === 0) {
      return Response.json({ error: 'No data found in sheet' }, { status: 400 });
    }

    // Parse budget data (expect: SOV Code, Description, Amount)
    const headers = values[0];
    const dataRows = values.slice(1);

    const sovItems = [];
    for (const row of dataRows) {
      if (!row || row.length === 0) continue;

      const sovCode = row[columnMap.code || 0]?.trim();
      const description = row[columnMap.description || 1]?.trim();
      const amount = parseFloat(row[columnMap.amount || 2]?.toString().replace(/[^0-9.-]/g, ''));

      if (sovCode && description && !isNaN(amount)) {
        sovItems.push({
          project_id: projectId,
          sov_code: sovCode,
          description: description,
          scheduled_value: amount,
          sov_category: 'labor',
        });
      }
    }

    if (sovItems.length === 0) {
      return Response.json(
        { error: 'No valid budget rows found in sheet' },
        { status: 400 }
      );
    }

    // Create SOV items in batch
    const created = await base44.entities.SOVItem.bulkCreate(sovItems);

    return Response.json({
      success: true,
      itemsCreated: created.length,
      items: created,
    });
  } catch (error) {
    console.error('Budget import error:', error);
    return Response.json(
      { error: error.message || 'Failed to import budget' },
      { status: 500 }
    );
  }
});