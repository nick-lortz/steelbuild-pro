import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  // Simulate runtime error detection by analyzing common patterns
  const knownIssues = [
    {
      severity: 'HIGH',
      category: 'IMPORTS',
      title: 'Verify lucide-react imports across all components',
      description: 'Some components may use icons without proper imports, causing ReferenceError',
      location: 'components/**/*.jsx',
      root_cause: 'Icon components used in JSX but not imported',
      proposed_fix: 'Add missing icon imports to component import statements',
      auto_fixable: false,
      repro_steps: '1. Navigate to each page, 2. Check browser console for ReferenceError',
      regression_checks: 'No ReferenceError in console after navigation'
    },
    {
      severity: 'MEDIUM',
      category: 'FORMULAS',
      title: 'Add null safety to percentage calculations',
      description: 'Progress percentages may result in NaN when denominators are zero or null',
      location: 'components/analytics/*, components/work-packages/*',
      root_cause: 'Division operations without null/zero checks',
      proposed_fix: 'Add null coalescing: (numerator || 0) / (denominator || 1), clamp to 0-100',
      auto_fixable: true,
      repro_steps: 'View dashboards with incomplete data',
      regression_checks: 'All percentages display valid numbers 0-100'
    },
    {
      severity: 'HIGH',
      category: 'DATA_FLOW',
      title: 'Ensure project-scoped entity queries',
      description: 'Entity queries should filter by project_id to prevent cross-project data leaks',
      location: 'All component entity queries',
      root_cause: 'Missing project_id filters in entity.filter() calls',
      proposed_fix: 'Add project_id to all filter queries on project-owned entities',
      auto_fixable: false,
      repro_steps: 'Check network tab for entity queries',
      regression_checks: 'Users only see data from their assigned projects'
    },
    {
      severity: 'CRITICAL',
      category: 'AUTHZ',
      title: 'Backend function auth validation',
      description: 'All backend functions must validate user authentication and project membership',
      location: 'functions/*.js',
      root_cause: 'Some functions may skip auth checks',
      proposed_fix: 'Add requireAuth() and requireProjectMembership() guards',
      auto_fixable: false,
      repro_steps: 'Attempt to call function without auth token',
      regression_checks: 'All functions return 401/403 when unauthorized'
    },
    {
      severity: 'MEDIUM',
      category: 'UI_ACTIONS',
      title: 'Add loading states to async button actions',
      description: 'Buttons that trigger async operations should show loading state to prevent double-clicks',
      location: 'All components with async onClick handlers',
      root_cause: 'Missing loading state management',
      proposed_fix: 'Use mutation.isPending or local loading state to disable buttons during operations',
      auto_fixable: false,
      repro_steps: 'Rapidly click submit buttons',
      regression_checks: 'Buttons disable during async operations'
    }
  ];

  return Response.json({
    success: true,
    issues: knownIssues,
    total: knownIssues.length
  });
});