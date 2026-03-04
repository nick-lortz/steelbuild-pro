{
  "test_cases": [
    {
      "test_name": "RFI - Numeric Code Parsing",
      "entity": "RFI",
      "field": "rfi_number",
      "field_type": "alphanumeric",
      "input": [
        { "id": "1", "rfi_number": "A-042" },
        { "id": "2", "rfi_number": "A-007" },
        { "id": "3", "rfi_number": "A-001" },
        { "id": "4", "rfi_number": "B-015" },
        { "id": "5", "rfi_number": null }
      ],
      "expected_output": [
        { "id": "3", "rfi_number": "A-001" },
        { "id": "2", "rfi_number": "A-007" },
        { "id": "1", "rfi_number": "A-042" },
        { "id": "4", "rfi_number": "B-015" },
        { "id": "5", "rfi_number": null }
      ],
      "rule": "Split alphanumeric code into prefix (numeric) + suffix (letter), sort by numeric prefix ascending, then suffix",
      "notes": "Handles leading zeros (007→7), case-insensitive suffix sort"
    },
    {
      "test_name": "Change Order - Numeric Cost Comparison",
      "entity": "ChangeOrder",
      "field": "cost_impact",
      "field_type": "numeric",
      "input": [
        { "id": "1", "cost_impact": 5000 },
        { "id": "2", "cost_impact": 25000 },
        { "id": "3", "cost_impact": 8500 },
        { "id": "4", "cost_impact": null },
        { "id": "5", "cost_impact": 12000 }
      ],
      "expected_output": [
        { "id": "1", "cost_impact": 5000 },
        { "id": "3", "cost_impact": 8500 },
        { "id": "5", "cost_impact": 12000 },
        { "id": "2", "cost_impact": 25000 },
        { "id": "4", "cost_impact": null }
      ],
      "rule": "Parse numeric strings/numbers, sort ascending, nulls last",
      "notes": "Handles '5000' and 5000 identically"
    },
    {
      "test_name": "Project - Case-Insensitive Text Sort",
      "entity": "Project",
      "field": "name",
      "field_type": "auto",
      "input": [
        { "id": "1", "name": "Zebra Project" },
        { "id": "2", "name": "apple tower" },
        { "id": "3", "name": "Banana Heights" },
        { "id": "4", "name": null },
        { "id": "5", "name": "" }
      ],
      "expected_output": [
        { "id": "2", "name": "apple tower" },
        { "id": "3", "name": "Banana Heights" },
        { "id": "1", "name": "Zebra Project" },
        { "id": "4", "name": null },
        { "id": "5", "name": "" }
      ],
      "rule": "Normalize (trim, collapse whitespace), compare case-insensitive, nulls/empty last",
      "notes": "Uses locale-aware collation (en-US, base sensitivity)"
    },
    {
      "test_name": "Task - Date Parsing (ISO→Timestamp)",
      "entity": "Task",
      "field": "start_date",
      "field_type": "date",
      "input": [
        { "id": "1", "start_date": "2026-03-15T08:00:00Z" },
        { "id": "2", "start_date": "2026-03-01T08:00:00Z" },
        { "id": "3", "start_date": "2026-02-24T10:00:00Z" },
        { "id": "4", "start_date": null },
        { "id": "5", "start_date": "2026-03-10T08:00:00Z" }
      ],
      "expected_output": [
        { "id": "3", "start_date": "2026-02-24T10:00:00Z" },
        { "id": "2", "start_date": "2026-03-01T08:00:00Z" },
        { "id": "5", "start_date": "2026-03-10T08:00:00Z" },
        { "id": "1", "start_date": "2026-03-15T08:00:00Z" },
        { "id": "4", "start_date": null }
      ],
      "rule": "Parse ISO/timestamp date strings, sort by milliseconds ascending, nulls last",
      "notes": "Handles timezone-aware timestamps, invalid dates return null"
    },
    {
      "test_name": "Drawing - Whitespace & Punctuation Normalization",
      "entity": "Drawing",
      "field": "drawing_number",
      "field_type": "alphanumeric",
      "input": [
        { "id": "1", "drawing_number": "  S - 042  " },
        { "id": "2", "drawing_number": "S-007" },
        { "id": "3", "drawing_number": "---S---001" },
        { "id": "4", "drawing_number": "S-020" },
        { "id": "5", "drawing_number": null }
      ],
      "expected_output": [
        { "id": "3", "drawing_number": "---S---001" },
        { "id": "4", "drawing_number": "S-020" },
        { "id": "1", "drawing_number": "  S - 042  " },
        { "id": "2", "drawing_number": "S-007" },
        { "id": "5", "drawing_number": null }
      ],
      "rule": "Normalize whitespace/punctuation before parsing, split by numeric prefix",
      "notes": "All variants (spaced, dashed, hyphenated) normalize to S-XXX logic"
    },
    {
      "test_name": "RFI - created_at Tiebreaker (Same RFI Number)",
      "entity": "RFI",
      "field": "rfi_number",
      "field_type": "alphanumeric",
      "tiebreaker": "created_date",
      "input": [
        { "id": "1", "rfi_number": "RFI-007", "created_date": "2026-02-15T10:00:00Z" },
        { "id": "2", "rfi_number": "RFI-007", "created_date": "2026-02-10T08:00:00Z" },
        { "id": "3", "rfi_number": "RFI-007", "created_date": "2026-02-20T14:00:00Z" }
      ],
      "expected_output": [
        { "id": "2", "rfi_number": "RFI-007", "created_date": "2026-02-10T08:00:00Z" },
        { "id": "1", "rfi_number": "RFI-007", "created_date": "2026-02-15T10:00:00Z" },
        { "id": "3", "rfi_number": "RFI-007", "created_date": "2026-02-20T14:00:00Z" }
      ],
      "rule": "When primary field values are equal, use created_at as secondary sort (ascending timestamp)",
      "notes": "Ensures stable, predictable ordering for duplicate values"
    },
    {
      "test_name": "Change Order - Descending Cost Sort",
      "entity": "ChangeOrder",
      "field": "cost_impact",
      "field_type": "numeric",
      "sort_direction": "desc",
      "input": [
        { "id": "1", "cost_impact": 5000 },
        { "id": "2", "cost_impact": 25000 },
        { "id": "3", "cost_impact": 8500 },
        { "id": "4", "cost_impact": null },
        { "id": "5", "cost_impact": 12000 }
      ],
      "expected_output": [
        { "id": "2", "cost_impact": 25000 },
        { "id": "5", "cost_impact": 12000 },
        { "id": "3", "cost_impact": 8500 },
        { "id": "1", "cost_impact": 5000 },
        { "id": "4", "cost_impact": null }
      ],
      "rule": "Reverse numeric comparison, nulls still last",
      "notes": "Nulls always sort to end, regardless of direction"
    },
    {
      "test_name": "Task - Date Sort with Null Fallback to created_date",
      "entity": "Task",
      "field": "start_date",
      "field_type": "date",
      "tiebreaker": "created_date",
      "input": [
        { "id": "1", "start_date": null, "created_date": "2026-02-20T10:00:00Z" },
        { "id": "2", "start_date": "2026-03-01T08:00:00Z", "created_date": "2026-02-15T09:00:00Z" },
        { "id": "3", "start_date": null, "created_date": "2026-02-18T14:00:00Z" }
      ],
      "expected_output": [
        { "id": "2", "start_date": "2026-03-01T08:00:00Z", "created_date": "2026-02-15T09:00:00Z" },
        { "id": "3", "start_date": null, "created_date": "2026-02-18T14:00:00Z" },
        { "id": "1", "start_date": null, "created_date": "2026-02-20T10:00:00Z" }
      ],
      "rule": "Non-null dates sort first, then null values sorted by created_date (ascending)",
      "notes": "Nulls are marked as 'last' but tiebreaker applies within null group"
    },
    {
      "test_name": "Mixed Alphanumeric Codes (Letter Prefix Variation)",
      "entity": "RFI",
      "field": "rfi_number",
      "field_type": "alphanumeric",
      "input": [
        { "id": "1", "rfi_number": "A-007" },
        { "id": "2", "rfi_number": "Z-002" },
        { "id": "3", "rfi_number": "A-010" },
        { "id": "4", "rfi_number": "M-005" }
      ],
      "expected_output": [
        { "id": "2", "rfi_number": "Z-002" },
        { "id": "1", "rfi_number": "A-007" },
        { "id": "4", "rfi_number": "M-005" },
        { "id": "3", "rfi_number": "A-010" }
      ],
      "rule": "Sort by numeric prefix first (2, 5, 7, 10), then by suffix (A, M, Z)",
      "notes": "Numeric portion drives primary sort, letter prefix is secondary tiebreaker"
    }
  ],
  "field_type_mapping": {
    "rfi_number": "alphanumeric",
    "co_number": "alphanumeric",
    "drawing_number": "alphanumeric",
    "task_id": "alphanumeric",
    "cost_impact": "numeric",
    "cost_code": "alphanumeric",
    "name": "auto (text)",
    "title": "auto (text)",
    "status": "auto (text)",
    "start_date": "date",
    "end_date": "date",
    "created_date": "date",
    "invoice_date": "date",
    "contract_value": "numeric",
    "actual_cost": "numeric",
    "forecast_cost": "numeric",
    "tonnage": "numeric",
    "hours": "numeric"
  },
  "logging_rules": {
    "type_mismatch": "When field value cannot be parsed as expected type (e.g., 'abc' as numeric), log warning and use fallback comparator",
    "invalid_date": "When date parsing fails (e.g., '2026-13-01'), log warning and treat as null",
    "null_object": "When safeCompare receives null object, log debug and return 0 (no ordering change)",
    "empty_array": "When sortBy receives non-array, return as-is and log warning"
  },
  "null_handling": {
    "rule": "Null and empty string values always sort to end, after all non-null values",
    "behavior_ascending": "Non-null values [ascending order], then null/empty",
    "behavior_descending": "Non-null values [descending order], then null/empty",
    "tiebreaker": "If both null, use created_at; if both empty, return 0"
  }
}