# Tab State Persistence - Verification Checklist

## Implementation Status

✅ **Core Hook**: `useTabState.js` created with IndexedDB + localStorage fallback

✅ **Applied to Modules**:
- Financials (view selection)
- Schedule (filters, view, sort)
- Work Packages (filters, expanded items)
- RFI Hub (filters, sort)
- Deliveries (filters, view mode)

## Verification Steps

### 1. Financials Tab
- [ ] Switch to "Actuals" tab
- [ ] Switch to different bottom tab
- [ ] Return to Financials
- [ ] **Verify**: Still on "Actuals" tab (not reset to Budget)

### 2. Schedule Tab
- [ ] Set filters: status=in_progress, assignee=specific user
- [ ] Change view to Gantt
- [ ] Sort by due date
- [ ] Scroll down page
- [ ] Switch to different bottom tab
- [ ] Return to Schedule
- [ ] **Verify**: Filters, view, sort, and scroll position preserved

### 3. Work Packages Tab
- [ ] Set filters: status=active
- [ ] Expand 2-3 work packages
- [ ] Scroll down
- [ ] Switch to different bottom tab
- [ ] Return to Work Packages
- [ ] **Verify**: Filters, expanded packages, and scroll preserved

### 4. RFI Hub Tab
- [ ] Set filters: status=submitted, priority=high
- [ ] Sort by escalation level
- [ ] Scroll down
- [ ] Switch to different bottom tab
- [ ] Return to RFI Hub
- [ ] **Verify**: Filters, sort, and scroll preserved

### 5. Deliveries Tab
- [ ] Set filters: status=scheduled
- [ ] Change view mode to calendar/map
- [ ] Scroll down
- [ ] Switch to different bottom tab
- [ ] Return to Deliveries
- [ ] **Verify**: Filters, view mode, and scroll preserved

### 6. Cross-Project Testing
- [ ] Configure state in Project A
- [ ] Switch to Project B
- [ ] **Verify**: Fresh state (not leaking from Project A)
- [ ] Switch back to Project A
- [ ] **Verify**: Project A state restored

### 7. Browser Storage Testing
- [ ] Open DevTools → Application → IndexedDB
- [ ] **Verify**: `steelbuild_tab_state` database exists
- [ ] **Verify**: `tab_states` store contains keys with format:
  - `tab_{userId}_{projectId}_{tabId}_{routeId}_{stateType}`
- [ ] Block IndexedDB (in browser settings/incognito)
- [ ] Repeat test
- [ ] **Verify**: Falls back to localStorage (check DevTools → Application → Local Storage)

### 8. Performance Testing
- [ ] Switch between tabs rapidly
- [ ] **Verify**: No lag or visual jumps
- [ ] **Verify**: Scroll restoration happens after content ready (no flash)
- [ ] **Verify**: Console shows no errors

## Storage Keys Format

Expected keys in IndexedDB:
```
tab_<user_id>_<project_id>_financials_budget_scroll
tab_<user_id>_<project_id>_financials_budget_filters
tab_<user_id>_<project_id>_schedule_list_scroll
tab_<user_id>_<project_id>_schedule_list_filters
tab_<user_id>_<project_id>_schedule_list_table
tab_<user_id>_<project_id>_workpackages_default_scroll
tab_<user_id>_<project_id>_workpackages_default_filters
tab_<user_id>_<project_id>_workpackages_default_selection
tab_<user_id>_<project_id>_rfis_default_scroll
tab_<user_id>_<project_id>_rfis_default_filters
tab_<user_id>_<project_id>_rfis_default_table
tab_<user_id>_<project_id>_deliveries_list_scroll
tab_<user_id>_<project_id>_deliveries_list_filters
```

## Troubleshooting

### State Not Persisting
1. Check browser console for errors
2. Verify IndexedDB is enabled (not in private browsing)
3. Check localStorage as fallback
4. Verify user is authenticated (`user.id` exists)
5. Verify `activeProjectId` is set

### Visual Jumps on Restore
1. Check that scroll restoration uses `requestAnimationFrame`
2. Verify content is fully loaded before scroll (add delay if needed)
3. Check for layout shifts during data loading

### State Leaking Across Projects
1. Verify storage keys include `activeProjectId`
2. Check that state clears when project changes
3. Verify keys are being generated correctly in DevTools

### Storage Quota Exceeded
1. Add cleanup for old state (entries older than 30 days)
2. Limit stored data size per key
3. Clear unused state on user logout

## Future Enhancements

- [ ] Add state expiration (auto-clear after 30 days)
- [ ] Add state migration on schema changes
- [ ] Add manual "Clear Tab State" button in settings
- [ ] Track state restoration analytics
- [ ] Add state compression for large datasets
- [ ] Implement state versioning