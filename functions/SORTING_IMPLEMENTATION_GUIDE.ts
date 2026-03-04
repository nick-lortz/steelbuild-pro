# SteelBuild-Pro Sorting Implementation Guide

## Overview

Robust, type-aware sorting across RFI, Change Orders, Projects, Tasks, and Drawings with unified comparison logic on both frontend and backend.

---

## Files Created

### Frontend (React/JavaScript)

- **`components/shared/comparison.js`** - Core comparison utilities
  - `normalize()` - whitespace/punctuation normalization
  - `splitAlphanumeric()` - code parsing (RFI-007 → {prefix: 7, suffix: "RFI"})
  - `parseNumeric()` - safe numeric parsing
  - `parseDate()` - ISO/timestamp date parsing
  - `compareValues()` - type-aware comparison
  - `safeCompare()` - with created_at fallback
  - `sortBy()` - array sorting with full ruleset

- **`components/shared/comparison.test.js`** - Unit tests
  - 15+ test cases covering all comparison rules
  - Null/empty value handling
  - Type mismatch scenarios
  - Edge cases (whitespace, punctuation, case-insensitivity)

- **`components/shared/comparison.integration.test.js`** - Integration tests
  - RFI, CO, Projects, Tasks, Drawings datasets
  - Real-world mixed-value sorting scenarios
  - Tiebreaker validation
  - Descending sort verification

### Backend (Deno)

- **`functions/utils/comparisonServer.js`** - Server-side sorting logic
  - Mirrors frontend implementation
  - Includes logging for type mismatches and errors
  - `validateSortParams()` - parameter validation
  - Production-ready error handling

- **`functions/utils/comparisonServer.test.js`** - Deno tests
  - 25+ test cases
  - Run with: `deno test functions/utils/comparisonServer.test.js`

### Reference

- **`functions/utils/testCaseReference.json`** - Machine-readable test cases
  - 9 representative test scenarios
  - Field-type mapping table
  - Logging rules
  - Null handling specifications

---

## Comparison Rules

### 1. **Numeric Parsing**
- Parse numeric strings: `"007"` → `7`, `"42"` → `42`
- Non-numeric strings return `null`
- Ascending by default (7 < 42)

**Field Type**: `numeric`

### 2. **Alphanumeric Codes**
- Split into: numeric prefix + suffix
- Sort by numeric prefix (ascending) → tiebreak by suffix (A–Z)
- Examples: `RFI-007`, `CO-1`, `S-101`

**Field Type**: `alphanumeric`

### 3. **Case-Insensitive Text**
- Normalize, then use locale-aware collation (`en-US`, base sensitivity)
- Trailing whitespace trimmed, internal whitespace collapsed
- Punctuation removed before comparison

**Field Type**: `auto` (default)

### 4. **Date Parsing**
- Parse ISO strings and timestamps to milliseconds
- Invalid dates return `null`
- Sort by milliseconds (ascending)

**Field Type**: `date`

### 5. **Null/Empty Values**
- **Always sort to end**, regardless of sort direction
- Empty string `""` and `null` both sort last
- If both null/empty, use `created_at` as tiebreaker (secondary sort)

### 6. **Tiebreaker (created_at)**
- When primary sort values are equal, use `created_date`
- Ascending by timestamp (earliest first)

---

## Test Case Reference (JSON)

See `functions/utils/testCaseReference.json` for:
- 9 representative test scenarios
- Expected outputs for each entity type
- Field-type mapping table
- Logging rules and null handling

### Example Test Cases:

**RFI Numeric Code Parsing**
```json
{
  "input": [
    {"rfi_number": "A-042"},
    {"rfi_number": "A-007"},
    {"rfi_number": null}
  ],
  "expected": [
    {"rfi_number": "A-001"},
    {"rfi_number": "A-007"},
    {"rfi_number": "A-042"},
    {"rfi_number": null}
  ]
}
```

**Change Order Cost Comparison**
```json
{
  "input": [
    {"cost_impact": 5000},
    {"cost_impact": 25000},
    {"cost_impact": 8500},
    {"cost_impact": null}
  ],
  "expected": [5000, 8500, 12000, 25000, null]
}
```

---

## Running Tests

### Frontend Tests (Jest)
```bash
npm test components/shared/comparison.test.js
npm test components/shared/comparison.integration.test.js
```

### Backend Tests (Deno)
```bash
deno test functions/utils/comparisonServer.test.js
```

---

## Logging & Debugging

### Type Mismatch Warnings
```
[SORT_COMPARISON] Type mismatch: expected numeric { a: 'abc', b: 42 }
```

### Invalid Date
```
[SORT_COMPARISON] Invalid date in field { a: '2026-13-01', b: '2026-03-04' }
```

### Server-Side Logging
```
[2026-03-04T10:30:00Z] [SORT_WARN] Type mismatch: expected numeric
[2026-03-04T10:30:01Z] [SORT_INFO] Sort completed { fieldName: 'rfi_number', count: 47 }
```

---

## Field Type Mapping

| Field | Type | Example |
|-------|------|---------|
| `rfi_number` | `alphanumeric` | `A-007` |
| `co_number` | `alphanumeric` | `CO-1` |
| `drawing_number` | `alphanumeric` | `S-101` |
| `task_id` | `alphanumeric` | `T-007` |
| `cost_impact` | `numeric` | `25000` |
| `contract_value` | `numeric` | `2500000` |
| `tonnage` | `numeric` | `150.5` |
| `name` | `auto` | `Acme Tower` |
| `title` | `auto` | `Connection Detail` |
| `status` | `auto` | `open` |
| `start_date` | `date` | `2026-03-15T08:00:00Z` |
| `created_date` | `date` | `2026-02-20T10:00:00Z` |

---

## Rollout Checklist

- [ ] Run all frontend tests
- [ ] Run all backend tests
- [ ] Verify sorting on RFI Hub
- [ ] Verify sorting on Change Orders
- [ ] Verify sorting on Projects
- [ ] Verify sorting on Tasks
- [ ] Verify sorting on Drawings
- [ ] Monitor logs for type mismatches
- [ ] Test null/empty value handling
- [ ] Verify descending sort
- [ ] Confirm created_at tiebreaker
- [ ] Update API docs