import { format } from 'date-fns';

/**
 * Convert data array to CSV format
 */
export function convertToCSV(data, columns) {
  if (!data || data.length === 0) return '';

  // If columns not provided, use all keys from first object
  const headers = columns || Object.keys(data[0]);
  
  // Create header row
  const headerRow = headers.map(h => {
    const label = typeof h === 'object' ? h.label : h;
    return `"${label}"`;
  }).join(',');

  // Create data rows
  const dataRows = data.map(row => {
    return headers.map(col => {
      const key = typeof col === 'object' ? col.key : col;
      const formatter = typeof col === 'object' ? col.formatter : null;
      
      let value = row[key];
      
      // Apply custom formatter if provided
      if (formatter) {
        value = formatter(row);
      }
      
      // Handle different value types
      if (value === null || value === undefined) {
        return '""';
      }
      
      if (typeof value === 'object') {
        value = JSON.stringify(value);
      }
      
      // Escape quotes and wrap in quotes
      return `"${String(value).replace(/"/g, '""')}"`;
    }).join(',');
  }).join('\n');

  return `${headerRow}\n${dataRows}`;
}

/**
 * Download CSV file
 */
export function downloadCSV(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export data to CSV
 */
export function exportToCSV(data, columns, filename) {
  const csv = convertToCSV(data, columns);
  const timestamp = format(new Date(), 'yyyy-MM-dd_HHmm');
  const fullFilename = `${filename}_${timestamp}.csv`;
  downloadCSV(csv, fullFilename);
}

/**
 * Common column definitions for different entities
 */
export const exportColumns = {
  projects: [
    { key: 'project_number', label: 'Project #' },
    { key: 'name', label: 'Name' },
    { key: 'client', label: 'Client' },
    { key: 'location', label: 'Location' },
    { key: 'status', label: 'Status' },
    { key: 'contract_value', label: 'Contract Value' },
    { key: 'start_date', label: 'Start Date' },
    { key: 'target_completion', label: 'Target Completion' },
    { key: 'project_manager', label: 'PM' },
    { key: 'superintendent', label: 'Superintendent' }
  ],
  
  tasks: [
    { key: 'name', label: 'Task' },
    { key: 'phase', label: 'Phase' },
    { key: 'status', label: 'Status' },
    { key: 'start_date', label: 'Start Date' },
    { key: 'end_date', label: 'End Date' },
    { key: 'duration_days', label: 'Duration (days)' },
    { key: 'progress_percent', label: 'Progress %' },
    { key: 'estimated_hours', label: 'Est. Hours' },
    { key: 'estimated_cost', label: 'Est. Cost' },
    { key: 'is_milestone', label: 'Milestone', formatter: (row) => row.is_milestone ? 'Yes' : 'No' },
    { key: 'is_critical', label: 'Critical', formatter: (row) => row.is_critical ? 'Yes' : 'No' }
  ],
  
  rfis: [
    { key: 'rfi_number', label: 'RFI #' },
    { key: 'subject', label: 'Subject' },
    { key: 'status', label: 'Status' },
    { key: 'priority', label: 'Priority' },
    { key: 'submitted_date', label: 'Submitted' },
    { key: 'due_date', label: 'Due Date' },
    { key: 'response_date', label: 'Response Date' },
    { key: 'assigned_to', label: 'Assigned To' },
    { key: 'cost_impact', label: 'Cost Impact', formatter: (row) => row.cost_impact ? 'Yes' : 'No' },
    { key: 'schedule_impact', label: 'Schedule Impact', formatter: (row) => row.schedule_impact ? 'Yes' : 'No' }
  ],
  
  changeOrders: [
    { key: 'co_number', label: 'CO #' },
    { key: 'title', label: 'Title' },
    { key: 'status', label: 'Status' },
    { key: 'cost_impact', label: 'Cost Impact' },
    { key: 'schedule_impact_days', label: 'Schedule Impact (days)' },
    { key: 'submitted_date', label: 'Submitted' },
    { key: 'approved_date', label: 'Approved' },
    { key: 'approved_by', label: 'Approved By' }
  ],
  
  documents: [
    { key: 'title', label: 'Title' },
    { key: 'category', label: 'Category' },
    { key: 'phase', label: 'Phase' },
    { key: 'status', label: 'Status' },
    { key: 'version', label: 'Version' },
    { key: 'revision', label: 'Revision' },
    { key: 'workflow_stage', label: 'Workflow Stage' },
    { key: 'reviewer', label: 'Reviewer' },
    { key: 'review_due_date', label: 'Review Due Date' },
    { key: 'file_name', label: 'File Name' },
    { key: 'created_date', label: 'Created' }
  ],
  
  expenses: [
    { key: 'expense_date', label: 'Date' },
    { key: 'description', label: 'Description' },
    { key: 'category', label: 'Category' },
    { key: 'vendor', label: 'Vendor' },
    { key: 'amount', label: 'Amount' },
    { key: 'invoice_number', label: 'Invoice #' },
    { key: 'payment_status', label: 'Status' },
    { key: 'paid_date', label: 'Paid Date' }
  ],
  
  drawings: [
    { key: 'set_name', label: 'Set Name' },
    { key: 'set_number', label: 'Set #' },
    { key: 'status', label: 'Status' },
    { key: 'discipline', label: 'Discipline' },
    { key: 'current_revision', label: 'Revision' },
    { key: 'sheet_count', label: 'Sheets' },
    { key: 'ifa_date', label: 'IFA Date' },
    { key: 'bfa_date', label: 'BFA Date' },
    { key: 'released_for_fab_date', label: 'Released for Fab' },
    { key: 'due_date', label: 'Due Date' },
    { key: 'reviewer', label: 'Reviewer' }
  ],
  
  deliveries: [
    { key: 'delivery_number', label: 'Delivery #' },
    { key: 'status', label: 'Status' },
    { key: 'scheduled_date', label: 'Scheduled Date' },
    { key: 'actual_date', label: 'Actual Date' },
    { key: 'truck_count', label: 'Trucks' },
    { key: 'tonnage', label: 'Tonnage' },
    { key: 'carrier', label: 'Carrier' },
    { key: 'received_by', label: 'Received By' }
  ],
  
  laborBreakdown: [
    { key: 'category_name', label: 'Category' },
    { key: 'shop_hours', label: 'Shop Hours' },
    { key: 'field_hours', label: 'Field Hours' },
    { key: 'total_hours', label: 'Total Hours', formatter: (row) => (row.shop_hours || 0) + (row.field_hours || 0) },
    { key: 'notes', label: 'Notes' }
  ],
  
  dailyLogs: [
    { key: 'log_date', label: 'Date' },
    { key: 'weather_condition', label: 'Weather' },
    { key: 'temperature_high', label: 'High Temp' },
    { key: 'temperature_low', label: 'Low Temp' },
    { key: 'crew_count', label: 'Crew Count' },
    { key: 'hours_worked', label: 'Hours Worked' },
    { key: 'work_performed', label: 'Work Performed' },
    { key: 'safety_incidents', label: 'Safety Incidents', formatter: (row) => row.safety_incidents ? 'Yes' : 'No' },
    { key: 'delays', label: 'Delays', formatter: (row) => row.delays ? 'Yes' : 'No' }
  ]
};