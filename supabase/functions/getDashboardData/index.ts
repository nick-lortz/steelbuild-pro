import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders } from '../_shared/cors.ts';

type DashboardPayload = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  risk?: 'all' | 'at_risk' | 'healthy';
  sort?: 'risk' | 'name' | 'progress' | 'budget' | 'schedule';
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({ error: 'Supabase env vars missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const payload: DashboardPayload = await req.json().catch(() => ({}));
    const page = Math.max(1, payload.page ?? 1);
    const pageSize = Math.max(1, Math.min(payload.pageSize ?? 20, 100));
    const search = (payload.search ?? '').trim().toLowerCase();
    const status = payload.status ?? 'all';
    const sort = payload.sort ?? 'risk';

    let query = supabase.from('projects').select('*', { count: 'exact' }).eq('archived', false);

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,project_number.ilike.%${search}%`);
    }

    if (sort === 'name') {
      query = query.order('name', { ascending: true });
    } else {
      query = query.order('updated_at', { ascending: false });
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data: projects, count, error } = await query.range(from, to);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const rows = projects ?? [];
    const projectsWithHealth = rows.map((p) => ({
      id: p.id,
      name: p.name,
      project_number: p.project_number,
      status: p.status,
      phase: p.phase || 'detailing',
      progress: 0,
      costHealth: 100,
      daysSlip: 0,
      completedTasks: 0,
      overdueTasks: 0,
      openRFIs: 0,
      pendingCOs: 0,
      isAtRisk: false,
      riskScore: 0
    }));

    const totalProjects = count ?? projectsWithHealth.length;
    const activeProjects = projectsWithHealth.filter((p) => p.status === 'in_progress' || p.status === 'awarded').length;

    const body = {
      projects: projectsWithHealth,
      pagination: {
        page,
        pageSize,
        totalFiltered: totalProjects,
        totalProjects
      },
      metrics: {
        totalProjects,
        activeProjects,
        atRiskProjects: 0,
        overdueTasks: 0,
        upcomingMilestones: 0
      }
    };

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unexpected error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
