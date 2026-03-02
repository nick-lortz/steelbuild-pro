/**
 * normalizeRecord / normalizeRecords
 *
 * Coerces known numeric fields from the API layer to actual JS numbers.
 * This prevents string-vs-number bugs in reduce/sum operations across the app.
 *
 * Apply at query boundaries:
 *   const data = await base44.entities.Foo.list();
 *   return normalizeRecords(data);
 *
 * Or in react-query select:
 *   select: (data) => normalizeRecords(data)
 */

const NUMERIC_FIELDS = new Set([
  // IDs
  'id', 'project_id', 'work_package_id', 'rfi_id', 'delivery_id',
  'change_order_id', 'submittal_id', 'cost_code_id', 'sov_item_id',
  'resource_id', 'equipment_id', 'task_id', 'budget_id', 'invoice_id',
  'labor_entry_id', 'crew_id', 'drawing_set_id', 'drawing_sheet_id',

  // Financial
  'contract_value', 'amount', 'cost', 'budget', 'actual', 'forecast',
  'variance', 'total', 'subtotal', 'price', 'rate', 'billing_amount',
  'approved_amount', 'pending_amount', 'paid_amount', 'retention_amount',
  'estimated_cost', 'actual_cost', 'budgeted_cost', 'cost_to_complete',
  'estimated_cost_impact', 'actual_cost_impact', 'contract_value',
  'base_amount', 'markup_amount', 'markup_percent', 'tax_amount',
  'invoice_amount', 'billed_to_date', 'percent_complete',
  'sov_percent_complete', 'allocation_percent',
  'crane_budget', 'sub_budget', 'rough_price_per_sqft',
  'rough_square_footage', 'rough_lift_hr_rate',

  // Labor / Hours
  'hours', 'actual_hours', 'estimated_hours', 'budgeted_hours',
  'regular_hours', 'overtime_hours', 'shop_hours', 'field_hours',
  'baseline_shop_hours', 'baseline_field_hours',
  'productive_hours', 'idle_hours', 'setup_time_hours', 'breakdown_time_hours',
  'sla_hours', 'days_to_respond', 'response_days_actual',
  'business_days_open', 'schedule_impact_days', 'est_detail_hours',

  // Quantities / Dimensions
  'quantity', 'weight_tons', 'length_ft', 'tonnage', 'tons',
  'load_unload_hours', 'distance_miles', 'time_from_shop_hours',
  'loads_shipped', 'load_order',

  // Sequence / Order
  'rfi_number', 'sequence_order', 'task_number', 'delivery_number',
  'version', 'question_version', 'response_version',

  // Risk / Score
  'risk_score', 'health_score', 'confidence_score', 'severity_score',
  'effectiveness_score', 'escalation_level',

  // Rates
  'labor_rate', 'ot_labor_rate', 'mileage_rate', 'per_load_cost',
  'total_cost', 'cost_per_hour',
]);

/**
 * Coerce a single record's numeric fields to numbers.
 * Non-numeric strings and nulls are left as-is.
 */
export function normalizeRecord(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return record;

  const out = { ...record };
  for (const key of Object.keys(out)) {
    if (NUMERIC_FIELDS.has(key)) {
      const val = out[key];
      if (val !== null && val !== undefined && val !== '') {
        const coerced = Number(val);
        if (!isNaN(coerced)) out[key] = coerced;
      }
    }
  }
  return out;
}

/**
 * Coerce an array of records.
 */
export function normalizeRecords(records) {
  if (!Array.isArray(records)) return records;
  return records.map(normalizeRecord);
}