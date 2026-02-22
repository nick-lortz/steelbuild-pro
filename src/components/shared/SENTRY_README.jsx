# Sentry Enterprise Monitoring

## Configuration

### Required Environment Variable
```bash
VITE_SENTRY_DSN=https://your-key@o123456.ingest.sentry.io/7654321
```
Set in Base44 Dashboard → Settings → Environment Variables

### Features

**Error Boundaries**
- Global: Layout-level boundary catches all render errors
- Module-level: `ModuleBoundary` for high-risk modules (Financials, Scheduling, Work Packages)

**Performance Tracing** (20% sample rate)
- Route transitions
- Data fetching operations
- Mutations (create/update/delete)

**Breadcrumbs**
- User navigation
- Tab switches
- Filter changes
- Mutation lifecycle

**Context Tags**
- user_id, email, role
- project_id (active project)
- route path
- module name

### Privacy
- Scrubs: notes, attachments, description fields
- Masks all text in session replay
- Blocks all media
- Ignores browser extension errors, network failures

### Sample Rates
- Transactions: 20%
- Profiling: 10%
- Session replay: 5% (normal), 100% (errors)

## Usage

### Wrap High-Risk Modules
```javascript
import { ModuleBoundary } from '@/components/ui/ModuleBoundary';

<ModuleBoundary 
  module="Financials" 
  route="FinancialsRedesign"
  entityContext={{ project_id: activeProjectId }}
>
  <YourComponent />
</ModuleBoundary>
```

### Track Mutations
```javascript
import { useSentryMutation } from '@/components/shared/hooks/useSentryPerformance';

const mutation = useMutation({
  mutationFn: createRFI,
  ...useSentryMutation('RFI'),
});
```

### Track Navigation
```javascript
import { trackNavigation } from '@/components/shared/hooks/useSentryPerformance';

trackNavigation('Dashboard', 'RFI Hub', { project_id });
```

### Manual Exception
```javascript
import { captureSentryException } from '@/components/providers/SentryProvider';

captureSentryException(error, {
  operation: { name: 'fabrication_release', package_id }
});
```

## Verification

1. Add `?sentry_test=true` to any page URL
2. Add test code to trigger error:
```javascript
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('sentry_test') === 'true') {
    throw new Error('Sentry test error');
  }
}, []);
```
3. Check Sentry dashboard for event with user/project context

## Deployment Checklist
- [ ] Set VITE_SENTRY_DSN in production
- [ ] Test error capture with `?sentry_test=true`
- [ ] Verify user context in Sentry events
- [ ] Check performance transactions logging
- [ ] Confirm PII scrubbing (no notes in events)
- [ ] Set up alerts for critical thresholds