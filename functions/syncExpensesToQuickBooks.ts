import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { config } from './_lib/config.js';
import { requireRole } from './_lib/authz.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    // QuickBooks sync requires Finance/Admin only
    requireRole(user, ['admin', 'finance']);

    const { project_id, date_from } = await req.json();

    const clientId = config.QUICKBOOKS_CLIENT_ID();
    const clientSecret = config.QUICKBOOKS_CLIENT_SECRET();
    const refreshToken = Deno.env.get('QUICKBOOKS_REFRESH_TOKEN'); // Stored server-side
    const realmId = Deno.env.get('QUICKBOOKS_REALM_ID');

    if (!clientId || !clientSecret || !refreshToken || !realmId) {
      return Response.json({ 
        error: 'QuickBooks not configured',
        required_secrets: ['QUICKBOOKS_CLIENT_ID', 'QUICKBOOKS_CLIENT_SECRET', 'QUICKBOOKS_REFRESH_TOKEN', 'QUICKBOOKS_REALM_ID']
      }, { status: 400 });
    }

    // Get fresh access token
    const tokenResponse = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`)
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
    });

    if (!tokenResponse.ok) {
      return Response.json({ error: 'Failed to refresh QuickBooks token' }, { status: 401 });
    }

    const { access_token } = await tokenResponse.json();

    // Fetch expenses to sync
    const query = { project_id };
    if (date_from) {
      query.expense_date = { $gte: date_from };
    }

    const expenses = await base44.entities.Expense.filter(query);
    
    let syncedCount = 0;
    const errors = [];

    // Sync each expense to QuickBooks (no sensitive data logging)
    for (const expense of expenses) {
      try {
        // Build minimal payload (no internal notes/PII)
        const billPayload = {
          Line: [{
            DetailType: 'AccountBasedExpenseLineDetail',
            Amount: expense.amount,
            Description: expense.description.substring(0, 200), // Truncate descriptions
            AccountBasedExpenseLineDetail: {
              AccountRef: {
                name: 'Job Expenses'
              }
            }
          }],
          VendorRef: {
            name: expense.vendor || 'General Vendor'
          },
          TxnDate: expense.expense_date
        };

        const qbResponse = await fetch(`https://quickbooks.api.intuit.com/v3/company/${realmId}/bill`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(billPayload)
        });

        if (qbResponse.ok) {
          syncedCount++;
          // DO NOT log response payload (contains QB internal IDs)
        } else {
          const errorData = await qbResponse.json();
          // Only log error message, not full payload
          errors.push({ 
            expense_id: expense.id, 
            error: errorData.Fault?.Error?.[0]?.Message || 'Sync failed' 
          });
        }

      } catch (err) {
        errors.push({ expense_id: expense.id, error: err.message });
      }
    }

    // DO NOT return access_token or refresh_token
    return Response.json({
      success: true,
      synced_count: syncedCount,
      total_expenses: expenses.length,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined
    });

  } catch (error) {
    // DO NOT log tokens or credentials
    console.error('QuickBooks sync error:', error.message);
    return Response.json({ error: 'QuickBooks sync failed' }, { status: 500 });
  }
});