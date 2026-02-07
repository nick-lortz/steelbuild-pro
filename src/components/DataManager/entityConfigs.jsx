export const ENTITY_CONFIGS = {
  WorkPackage: {
    label: 'Work Packages',
    singularLabel: 'Work Package',
    description: 'Production execution tracking',
    entityName: 'WorkPackage',
    columns: [
      { id: 'name', label: 'Name', sortable: true, searchable: true, width: '180px' },
      { id: 'status', label: 'Status', sortable: true, width: '100px' },
      { id: 'progress_percent', label: 'Progress', sortable: true, width: '80px', format: (v) => `${v || 0}%` },
      { id: 'assigned_lead', label: 'Lead', sortable: true, width: '120px' },
      { id: 'target_date', label: 'Target', sortable: true, width: '100px', format: (v) => v ? new Date(v).toLocaleDateString() : '-' },
      { id: 'budget_amount', label: 'Budget', sortable: true, width: '100px', format: (v) => `$${(v / 1000).toFixed(0)}K` },
      { id: 'actual_amount', label: 'Actual', sortable: true, width: '100px', format: (v) => `$${(v / 1000).toFixed(0)}K` },
      { id: 'committed_amount', label: 'Committed', sortable: true, width: '100px', format: (v) => `$${(v / 1000).toFixed(0)}K` },
      { id: 'blockers_count', label: 'Blockers', sortable: true, width: '80px', format: (v) => v || 0 },
      { id: 'updated_at', label: 'Updated', sortable: true, width: '100px', format: (v) => v ? new Date(v).toLocaleDateString() : '-' }
    ],
    defaultSort: { field: 'target_date', direction: 'asc' },
    defaultColumns: ['name', 'status', 'progress_percent', 'assigned_lead', 'target_date', 'budget_amount', 'updated_at'],
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'status', label: 'Status', type: 'select', options: ['planned', 'in_progress', 'blocked', 'completed'] },
      { name: 'progress_percent', label: 'Progress %', type: 'number', min: 0, max: 100 },
      { name: 'assigned_lead', label: 'Lead', type: 'text' },
      { name: 'target_date', label: 'Target Date', type: 'date' },
      { name: 'budget_amount', label: 'Budget ($)', type: 'number', min: 0 },
      { name: 'description', label: 'Description', type: 'textarea' }
    ],
    inlineEditFields: ['status', 'progress_percent', 'assigned_lead', 'target_date'],
    quickFilters: [
      { id: 'blocked', label: 'Blocked', filter: (r) => r.status === 'blocked' },
      { id: 'needs_attention', label: 'Needs Attention', filter: (r) => (r.blockers_count || 0) > 0 },
      { id: 'due_14d', label: 'Due in 14 days', filter: (r) => {
        if (!r.target_date) return false;
        const d = new Date(r.target_date).getTime();
        const now = new Date().getTime();
        return d > now && d <= now + 14 * 24 * 60 * 60 * 1000;
      }},
      { id: 'completed', label: 'Completed', filter: (r) => r.status === 'completed' }
    ]
  },

  DetailingItem: {
    label: 'Detailing',
    singularLabel: 'Detailing Item',
    description: 'Shop drawing details and releases',
    entityName: 'DetailingItem',
    columns: [
      { id: 'name', label: 'Name', sortable: true, searchable: true, width: '180px' },
      { id: 'status', label: 'Status', sortable: true, width: '100px' },
      { id: 'priority', label: 'Priority', sortable: true, width: '80px' },
      { id: 'assigned_to', label: 'Assigned', sortable: true, width: '120px' },
      { id: 'due_date', label: 'Due', sortable: true, width: '100px', format: (v) => v ? new Date(v).toLocaleDateString() : '-' },
      { id: 'notes', label: 'Notes', width: '200px', format: (v) => (v || '').substring(0, 50) + (v && v.length > 50 ? '...' : '') },
      { id: 'updated_at', label: 'Updated', sortable: true, width: '100px', format: (v) => v ? new Date(v).toLocaleDateString() : '-' }
    ],
    defaultSort: { field: 'due_date', direction: 'asc' },
    defaultColumns: ['name', 'status', 'priority', 'assigned_to', 'due_date', 'updated_at'],
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'status', label: 'Status', type: 'select', options: ['draft', 'released', 'returned', 'finalized'] },
      { name: 'priority', label: 'Priority', type: 'select', options: ['low', 'medium', 'high', 'critical'] },
      { name: 'assigned_to', label: 'Assigned To', type: 'text' },
      { name: 'due_date', label: 'Due Date', type: 'date' },
      { name: 'notes', label: 'Notes', type: 'textarea' }
    ],
    inlineEditFields: ['status', 'priority', 'assigned_to', 'due_date'],
    quickFilters: [
      { id: 'released', label: 'Released', filter: (r) => r.status === 'released' },
      { id: 'returned', label: 'Returned', filter: (r) => r.status === 'returned' },
      { id: 'due_week', label: 'Due this week', filter: (r) => {
        if (!r.due_date) return false;
        const d = new Date(r.due_date).getTime();
        const now = new Date().getTime();
        const oneWeek = 7 * 24 * 60 * 60 * 1000;
        return d > now && d <= now + oneWeek;
      }},
      { id: 'critical', label: 'Critical', filter: (r) => r.priority === 'critical' }
    ]
  },

  FabricationItem: {
    label: 'Fabrication',
    singularLabel: 'Fabrication Item',
    description: 'Shop production tracking',
    entityName: 'FabricationItem',
    columns: [
      { id: 'name', label: 'Name', sortable: true, searchable: true, width: '180px' },
      { id: 'status', label: 'Status', sortable: true, width: '100px' },
      { id: 'package_id', label: 'Package', sortable: true, width: '100px' },
      { id: 'ship_date_target', label: 'Target Ship', sortable: true, width: '100px', format: (v) => v ? new Date(v).toLocaleDateString() : '-' },
      { id: 'ship_date_actual', label: 'Actual Ship', sortable: true, width: '100px', format: (v) => v ? new Date(v).toLocaleDateString() : '-' },
      { id: 'qty', label: 'Qty', sortable: true, width: '60px' },
      { id: 'uom', label: 'UOM', width: '60px' },
      { id: 'shop_hours', label: 'Shop Hrs', sortable: true, width: '80px' },
      { id: 'field_hours', label: 'Field Hrs', sortable: true, width: '80px' }
    ],
    defaultSort: { field: 'ship_date_target', direction: 'asc' },
    defaultColumns: ['name', 'status', 'ship_date_target', 'qty', 'shop_hours', 'updated_at'],
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'status', label: 'Status', type: 'select', options: ['planned', 'in_progress', 'ready_to_ship', 'shipped', 'installed'] },
      { name: 'ship_date_target', label: 'Target Ship Date', type: 'date' },
      { name: 'ship_date_actual', label: 'Actual Ship Date', type: 'date' },
      { name: 'qty', label: 'Quantity', type: 'number', min: 0 },
      { name: 'uom', label: 'Unit of Measure', type: 'text' },
      { name: 'shop_hours', label: 'Shop Hours', type: 'number', min: 0 },
      { name: 'field_hours', label: 'Field Hours', type: 'number', min: 0 }
    ],
    inlineEditFields: ['status', 'ship_date_target', 'qty', 'shop_hours'],
    quickFilters: [
      { id: 'ready_ship', label: 'Ready to Ship', filter: (r) => r.status === 'ready_to_ship' },
      { id: 'shipped', label: 'Shipped', filter: (r) => r.status === 'shipped' },
      { id: 'late', label: 'Late', filter: (r) => r.status !== 'shipped' && r.status !== 'installed' && r.ship_date_target && new Date(r.ship_date_target) < new Date() }
    ]
  },

  Delivery: {
    label: 'Deliveries',
    singularLabel: 'Delivery',
    description: 'Material shipment tracking',
    entityName: 'Delivery',
    columns: [
      { id: 'delivery_number', label: 'Number', sortable: true, searchable: true, width: '100px' },
      { id: 'status', label: 'Status', sortable: true, width: '100px' },
      { id: 'carrier', label: 'Carrier', sortable: true, searchable: true, width: '120px' },
      { id: 'pickup_date', label: 'Pickup', sortable: true, width: '100px', format: (v) => v ? new Date(v).toLocaleDateString() : '-' },
      { id: 'delivery_date', label: 'Delivery', sortable: true, width: '100px', format: (v) => v ? new Date(v).toLocaleDateString() : '-' },
      { id: 'location', label: 'Location', sortable: true, width: '150px' },
      { id: 'related_package_id', label: 'Package', sortable: true, width: '100px' }
    ],
    defaultSort: { field: 'delivery_date', direction: 'asc' },
    defaultColumns: ['delivery_number', 'status', 'carrier', 'delivery_date', 'location', 'updated_at'],
    fields: [
      { name: 'delivery_number', label: 'Delivery Number', type: 'text', required: true },
      { name: 'status', label: 'Status', type: 'select', options: ['scheduled', 'in_transit', 'delivered', 'delayed', 'cancelled'] },
      { name: 'carrier', label: 'Carrier', type: 'text' },
      { name: 'pickup_date', label: 'Pickup Date', type: 'date' },
      { name: 'delivery_date', label: 'Delivery Date', type: 'date' },
      { name: 'location', label: 'Location', type: 'text' },
      { name: 'related_package_id', label: 'Related Package', type: 'text' }
    ],
    inlineEditFields: ['status', 'carrier', 'delivery_date'],
    quickFilters: [
      { id: 'this_week', label: 'This week', filter: (r) => {
        if (!r.delivery_date) return false;
        const d = new Date(r.delivery_date).getTime();
        const now = new Date().getTime();
        const oneWeek = 7 * 24 * 60 * 60 * 1000;
        return d > now && d <= now + oneWeek;
      }},
      { id: 'delayed', label: 'Delayed', filter: (r) => r.status === 'delayed' },
      { id: 'in_transit', label: 'In Transit', filter: (r) => r.status === 'in_transit' },
      { id: 'delivered', label: 'Delivered', filter: (r) => r.status === 'delivered' }
    ]
  },

  Task: {
    label: 'Schedule',
    singularLabel: 'Task',
    description: 'Project schedule activities',
    entityName: 'Task',
    columns: [
      { id: 'name', label: 'Name', sortable: true, searchable: true, width: '180px' },
      { id: 'phase', label: 'Phase', sortable: true, width: '100px' },
      { id: 'status', label: 'Status', sortable: true, width: '100px' },
      { id: 'owner', label: 'Owner', sortable: true, width: '120px' },
      { id: 'start_date', label: 'Start', sortable: true, width: '100px', format: (v) => v ? new Date(v).toLocaleDateString() : '-' },
      { id: 'end_date', label: 'End', sortable: true, width: '100px', format: (v) => v ? new Date(v).toLocaleDateString() : '-' },
      { id: 'percent_complete', label: '% Complete', sortable: true, width: '80px', format: (v) => `${v || 0}%` },
      { id: 'critical_path', label: 'Critical', sortable: true, width: '80px', format: (v) => v ? 'Yes' : 'No' }
    ],
    defaultSort: { field: 'end_date', direction: 'asc' },
    defaultColumns: ['name', 'phase', 'status', 'owner', 'end_date', 'percent_complete', 'critical_path'],
    fields: [
      { name: 'name', label: 'Task Name', type: 'text', required: true },
      { name: 'phase', label: 'Phase', type: 'select', options: ['planning', 'detailing', 'fabrication', 'delivery', 'erection', 'closeout'] },
      { name: 'status', label: 'Status', type: 'select', options: ['not_started', 'in_progress', 'completed', 'on_hold', 'blocked'] },
      { name: 'owner', label: 'Owner', type: 'text' },
      { name: 'start_date', label: 'Start Date', type: 'date' },
      { name: 'end_date', label: 'End Date', type: 'date' },
      { name: 'percent_complete', label: '% Complete', type: 'number', min: 0, max: 100 },
      { name: 'critical_path', label: 'Critical Path', type: 'checkbox' }
    ],
    inlineEditFields: ['status', 'owner', 'percent_complete'],
    quickFilters: [
      { id: 'overdue', label: 'Overdue', filter: (r) => r.status !== 'completed' && r.end_date && new Date(r.end_date) < new Date() },
      { id: 'critical', label: 'Critical Path', filter: (r) => r.critical_path },
      { id: 'blocked', label: 'Blocked', filter: (r) => r.status === 'blocked' },
      { id: 'due_week', label: 'Due this week', filter: (r) => {
        if (!r.end_date) return false;
        const d = new Date(r.end_date).getTime();
        const now = new Date().getTime();
        const oneWeek = 7 * 24 * 60 * 60 * 1000;
        return d > now && d <= now + oneWeek;
      }}
    ]
  },

  BudgetLine: {
    label: 'Budget',
    singularLabel: 'Budget Line',
    description: 'Cost code budget tracking',
    entityName: 'Financial',
    columns: [
      { id: 'cost_code_id', label: 'Cost Code', sortable: true, searchable: true, width: '100px' },
      { id: 'category', label: 'Category', sortable: true, width: '100px' },
      { id: 'original_budget', label: 'Original', sortable: true, width: '100px', format: (v) => `$${(v / 1000).toFixed(0)}K` },
      { id: 'approved_changes', label: 'Changes', sortable: true, width: '80px', format: (v) => `${v >= 0 ? '+' : ''}$${(v / 1000).toFixed(0)}K` },
      { id: 'current_budget', label: 'Current', sortable: true, width: '100px', format: (v) => `$${(v / 1000).toFixed(0)}K` },
      { id: 'actual_amount', label: 'Actual', sortable: true, width: '100px', format: (v) => `$${(v / 1000).toFixed(0)}K` },
      { id: 'committed_amount', label: 'Committed', sortable: true, width: '100px', format: (v) => `$${(v / 1000).toFixed(0)}K` },
      { id: 'forecast_amount', label: 'Forecast', sortable: true, width: '100px', format: (v) => `$${(v / 1000).toFixed(0)}K` }
    ],
    defaultSort: { field: 'original_budget', direction: 'desc' },
    defaultColumns: ['cost_code_id', 'original_budget', 'actual_amount', 'committed_amount', 'forecast_amount'],
    fields: [
      { name: 'cost_code_id', label: 'Cost Code', type: 'text', required: true },
      { name: 'category', label: 'Category', type: 'select', options: ['labor', 'material', 'equipment', 'subcontract', 'other'] },
      { name: 'original_budget', label: 'Original Budget ($)', type: 'number', min: 0, required: true },
      { name: 'approved_changes', label: 'Approved Changes ($)', type: 'number' }
    ],
    inlineEditFields: ['category', 'approved_changes'],
    quickFilters: [
      { id: 'over_budget', label: 'Over Budget', filter: (r) => (r.actual_amount || 0) > (r.current_budget || 0) },
      { id: 'high_exposure', label: 'High Exposure', filter: (r) => ((r.committed_amount || 0) + (r.actual_amount || 0)) > ((r.current_budget || 0) * 0.8) }
    ]
  },

  SOVItem: {
    label: 'SOV',
    singularLabel: 'SOV Line',
    description: 'Schedule of values billing',
    entityName: 'SOVItem',
    columns: [
      { id: 'line_number', label: 'Line #', sortable: true, width: '70px' },
      { id: 'description', label: 'Description', sortable: true, searchable: true, width: '200px' },
      { id: 'scheduled_value', label: 'Value', sortable: true, width: '100px', format: (v) => `$${(v / 1000).toFixed(0)}K` },
      { id: 'percent_complete', label: '% Complete', sortable: true, width: '80px', format: (v) => `${v || 0}%` },
      { id: 'earned_to_date', label: 'Earned', sortable: true, width: '100px', format: (v) => `$${(v / 1000).toFixed(0)}K` },
      { id: 'billed_to_date', label: 'Billed', sortable: true, width: '100px', format: (v) => `$${(v / 1000).toFixed(0)}K` },
      { id: 'ready_to_bill', label: 'Ready to Bill', sortable: true, width: '100px', format: (v) => `$${(v / 1000).toFixed(0)}K` }
    ],
    defaultSort: { field: 'line_number', direction: 'asc' },
    defaultColumns: ['line_number', 'description', 'scheduled_value', 'percent_complete', 'earned_to_date', 'billed_to_date'],
    fields: [
      { name: 'line_number', label: 'Line Number', type: 'text', required: true },
      { name: 'description', label: 'Description', type: 'textarea', required: true },
      { name: 'scheduled_value', label: 'Value ($)', type: 'number', min: 0, required: true },
      { name: 'percent_complete', label: '% Complete', type: 'number', min: 0, max: 100 },
      { name: 'billing_period', label: 'Billing Period', type: 'text' }
    ],
    inlineEditFields: ['percent_complete'],
    quickFilters: [
      { id: 'ready_bill', label: 'Ready to Bill', filter: (r) => (r.ready_to_bill || 0) > 0 },
      { id: 'incomplete', label: 'Incomplete', filter: (r) => (r.percent_complete || 0) < 100 }
    ]
  },

  Expense: {
    label: 'Expenses',
    singularLabel: 'Expense',
    description: 'Project expenses and receipts',
    entityName: 'Expense',
    columns: [
      { id: 'expense_date', label: 'Date', sortable: true, width: '100px', format: (v) => v ? new Date(v).toLocaleDateString() : '-' },
      { id: 'vendor', label: 'Vendor', sortable: true, searchable: true, width: '150px' },
      { id: 'description', label: 'Description', sortable: true, searchable: true, width: '200px' },
      { id: 'amount', label: 'Amount', sortable: true, width: '100px', format: (v) => `$${(v / 1000).toFixed(1)}K` },
      { id: 'cost_code_id', label: 'Cost Code', sortable: true, width: '100px' },
      { id: 'payment_status', label: 'Status', sortable: true, width: '100px' }
    ],
    defaultSort: { field: 'expense_date', direction: 'desc' },
    defaultColumns: ['expense_date', 'vendor', 'description', 'amount', 'payment_status', 'updated_at'],
    fields: [
      { name: 'expense_date', label: 'Date', type: 'date', required: true },
      { name: 'vendor', label: 'Vendor', type: 'text' },
      { name: 'description', label: 'Description', type: 'textarea', required: true },
      { name: 'amount', label: 'Amount ($)', type: 'number', min: 0, required: true },
      { name: 'cost_code_id', label: 'Cost Code', type: 'text' },
      { name: 'category', label: 'Category', type: 'select', options: ['labor', 'material', 'equipment', 'subcontract', 'overhead', 'other'] },
      { name: 'payment_status', label: 'Status', type: 'select', options: ['pending', 'approved', 'paid', 'disputed'] }
    ],
    inlineEditFields: ['vendor', 'amount', 'payment_status'],
    quickFilters: [
      { id: 'draft', label: 'Draft', filter: (r) => r.payment_status === 'pending' },
      { id: 'approved', label: 'Approved', filter: (r) => r.payment_status === 'approved' },
      { id: 'missing_cc', label: 'Missing Cost Code', filter: (r) => !r.cost_code_id },
      { id: 'this_month', label: 'This Month', filter: (r) => {
        if (!r.expense_date) return false;
        const d = new Date(r.expense_date);
        const now = new Date();
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      }}
    ]
  },

  ChangeOrder: {
    label: 'Change Orders',
    singularLabel: 'Change Order',
    description: 'Contract modifications',
    entityName: 'ChangeOrder',
    columns: [
      { id: 'co_number', label: '#', sortable: true, width: '60px' },
      { id: 'title', label: 'Title', sortable: true, searchable: true, width: '200px' },
      { id: 'status', label: 'Status', sortable: true, width: '100px' },
      { id: 'value', label: 'Value', sortable: true, width: '100px', format: (v) => `${v >= 0 ? '+' : ''}$${(v / 1000).toFixed(0)}K` },
      { id: 'cost_impact', label: 'Cost Impact', sortable: true, width: '100px', format: (v) => `${v >= 0 ? '+' : ''}$${(v / 1000).toFixed(0)}K` },
      { id: 'schedule_impact_days', label: 'Schedule Days', sortable: true, width: '80px' },
      { id: 'owner', label: 'Owner', sortable: true, width: '120px' },
      { id: 'date_submitted', label: 'Submitted', sortable: true, width: '100px', format: (v) => v ? new Date(v).toLocaleDateString() : '-' }
    ],
    defaultSort: { field: 'date_submitted', direction: 'desc' },
    defaultColumns: ['co_number', 'title', 'status', 'cost_impact', 'schedule_impact_days', 'owner'],
    fields: [
      { name: 'co_number', label: 'CO Number', type: 'number', required: true },
      { name: 'title', label: 'Title', type: 'text', required: true },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'status', label: 'Status', type: 'select', options: ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'void'] },
      { name: 'value', label: 'Value ($)', type: 'number' },
      { name: 'cost_impact', label: 'Cost Impact ($)', type: 'number' },
      { name: 'schedule_impact_days', label: 'Schedule Impact (days)', type: 'number' },
      { name: 'owner', label: 'Owner', type: 'text' },
      { name: 'date_submitted', label: 'Date Submitted', type: 'date' },
      { name: 'date_approved', label: 'Date Approved', type: 'date' }
    ],
    inlineEditFields: ['status', 'owner'],
    quickFilters: [
      { id: 'draft', label: 'Potential', filter: (r) => r.status === 'draft' },
      { id: 'submitted', label: 'Submitted', filter: (r) => r.status === 'submitted' },
      { id: 'approved', label: 'Approved', filter: (r) => r.status === 'approved' },
      { id: 'missing_owner', label: 'Missing Owner', filter: (r) => !r.owner },
      { id: 'high_value', label: 'High Value', filter: (r) => Math.abs(r.cost_impact || 0) > 50000 }
    ]
  },

  EquipmentLog: {
    label: 'Equipment',
    singularLabel: 'Equipment Log',
    description: 'Equipment usage tracking',
    entityName: 'EquipmentLog',
    columns: [
      { id: 'equipment_name', label: 'Equipment', sortable: true, searchable: true, width: '150px' },
      { id: 'equipment_id', label: 'ID', sortable: true, width: '100px' },
      { id: 'date', label: 'Date', sortable: true, width: '100px', format: (v) => v ? new Date(v).toLocaleDateString() : '-' },
      { id: 'hours_used', label: 'Hours', sortable: true, width: '80px' },
      { id: 'operator', label: 'Operator', sortable: true, width: '120px' },
      { id: 'location', label: 'Location', sortable: true, width: '150px' },
      { id: 'cost', label: 'Cost', sortable: true, width: '100px', format: (v) => `$${(v / 1000).toFixed(1)}K` }
    ],
    defaultSort: { field: 'date', direction: 'desc' },
    defaultColumns: ['equipment_name', 'date', 'hours_used', 'operator', 'location', 'cost'],
    fields: [
      { name: 'equipment_name', label: 'Equipment Name', type: 'text', required: true },
      { name: 'equipment_id', label: 'Equipment ID', type: 'text' },
      { name: 'date', label: 'Date', type: 'date', required: true },
      { name: 'hours_used', label: 'Hours Used', type: 'number', min: 0, required: true },
      { name: 'operator', label: 'Operator', type: 'text' },
      { name: 'location', label: 'Location', type: 'text' },
      { name: 'cost', label: 'Cost ($)', type: 'number', min: 0 },
      { name: 'notes', label: 'Notes', type: 'textarea' }
    ],
    inlineEditFields: ['hours_used', 'operator', 'location'],
    quickFilters: [
      { id: 'this_week', label: 'This Week', filter: (r) => {
        if (!r.date) return false;
        const d = new Date(r.date).getTime();
        const now = new Date().getTime();
        const oneWeek = 7 * 24 * 60 * 60 * 1000;
        return d > now - oneWeek && d <= now;
      }},
      { id: 'high_hours', label: 'High Hours', filter: (r) => (r.hours_used || 0) > 8 },
      { id: 'missing_op', label: 'Missing Operator', filter: (r) => !r.operator }
    ]
  },

  RFI: {
    label: 'RFIs',
    singularLabel: 'RFI',
    description: 'Request for information tracking',
    entityName: 'RFI',
    columns: [
      { id: 'rfi_number', label: '#', sortable: true, width: '60px' },
      { id: 'subject', label: 'Subject', sortable: true, searchable: true, width: '200px' },
      { id: 'status', label: 'Status', sortable: true, width: '100px' },
      { id: 'submitted_by', label: 'Submitted By', sortable: true, width: '120px' },
      { id: 'assigned_to', label: 'Assigned To', sortable: true, width: '120px' },
      { id: 'date_submitted', label: 'Submitted', sortable: true, width: '100px', format: (v) => v ? new Date(v).toLocaleDateString() : '-' },
      { id: 'date_needed', label: 'Needed By', sortable: true, width: '100px', format: (v) => v ? new Date(v).toLocaleDateString() : '-' },
      { id: 'date_answered', label: 'Answered', sortable: true, width: '100px', format: (v) => v ? new Date(v).toLocaleDateString() : '-' }
    ],
    defaultSort: { field: 'date_needed', direction: 'asc' },
    defaultColumns: ['rfi_number', 'subject', 'status', 'assigned_to', 'date_needed', 'date_answered'],
    fields: [
      { name: 'rfi_number', label: 'RFI Number', type: 'number', required: true },
      { name: 'subject', label: 'Subject', type: 'text', required: true },
      { name: 'question', label: 'Question', type: 'textarea', required: true },
      { name: 'status', label: 'Status', type: 'select', options: ['draft', 'submitted', 'under_review', 'answered', 'closed'] },
      { name: 'submitted_by', label: 'Submitted By', type: 'text' },
      { name: 'assigned_to', label: 'Assigned To', type: 'text' },
      { name: 'date_submitted', label: 'Date Submitted', type: 'date' },
      { name: 'date_needed', label: 'Date Needed', type: 'date' },
      { name: 'date_answered', label: 'Date Answered', type: 'date' },
      { name: 'response', label: 'Response', type: 'textarea' }
    ],
    inlineEditFields: ['status', 'assigned_to'],
    quickFilters: [
      { id: 'open', label: 'Open', filter: (r) => ['draft', 'submitted', 'under_review'].includes(r.status) },
      { id: 'overdue', label: 'Overdue', filter: (r) => r.status !== 'answered' && r.status !== 'closed' && r.date_needed && new Date(r.date_needed) < new Date() },
      { id: 'answered', label: 'Answered', filter: (r) => r.status === 'answered' }
    ]
  }
};