/**
 * Server-side (Deno) comparison tests
 * Run with: deno test functions/utils/comparisonServer.test.js
 */

import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import {
  normalize,
  splitAlphanumeric,
  parseNumeric,
  parseDate,
  compareValues,
  safeCompare,
  sortBy,
  validateSortParams,
} from './comparisonServer.js';

Deno.test('normalize - trim and collapse whitespace', () => {
  assertEquals(normalize('  hello   world  '), 'hello world');
  assertEquals(normalize('  RFI-007  '), 'RFI-007');
  assertEquals(normalize(null), '');
});

Deno.test('splitAlphanumeric - extract numeric prefix', () => {
  const result = splitAlphanumeric('RFI-007');
  assertEquals(result.prefix, 7);
  assertEquals(result.suffix, 'RFI');
  assertEquals(result.isNumeric, true);
});

Deno.test('splitAlphanumeric - pure numeric', () => {
  const result = splitAlphanumeric('007');
  assertEquals(result.prefix, 7);
  assertEquals(result.suffix, '');
  assertEquals(result.isNumeric, true);
});

Deno.test('splitAlphanumeric - non-numeric', () => {
  const result = splitAlphanumeric('NONUM');
  assertEquals(result.isNumeric, false);
  assertEquals(result.prefix, Number.MAX_SAFE_INTEGER);
});

Deno.test('parseNumeric - parse numeric strings', () => {
  assertEquals(parseNumeric('007'), 7);
  assertEquals(parseNumeric('42'), 42);
  assertEquals(parseNumeric('abc'), null);
  assertEquals(parseNumeric(null), null);
});

Deno.test('parseDate - parse ISO dates', () => {
  const date = parseDate('2026-03-04T10:30:00Z');
  assertEquals(typeof date, 'number'); // Returns timestamp (milliseconds)
  assertEquals(date > 0, true);
});

Deno.test('parseDate - invalid dates return null', () => {
  assertEquals(parseDate('not-a-date'), null);
  assertEquals(parseDate('2026-13-01'), null);
  assertEquals(parseDate(null), null);
});

Deno.test('compareValues - numeric ascending', () => {
  assertEquals(compareValues('007', '42', 'numeric') < 0, true);
  assertEquals(compareValues('100', '20', 'numeric') > 0, true);
  assertEquals(compareValues('5', '5', 'numeric'), 0);
});

Deno.test('compareValues - alphanumeric by prefix', () => {
  assertEquals(compareValues('RFI-007', 'RFI-042', 'alphanumeric') < 0, true);
  assertEquals(compareValues('CO-100', 'CO-020', 'alphanumeric') > 0, true);
});

Deno.test('compareValues - text case-insensitive', () => {
  assertEquals(compareValues('Apple', 'apple', 'auto'), 0);
  assertEquals(compareValues('Alice', 'Bob', 'auto') < 0, true);
});

Deno.test('compareValues - dates by timestamp', () => {
  const early = '2026-01-01T00:00:00Z';
  const late = '2026-12-31T23:59:59Z';
  assertEquals(compareValues(early, late, 'date') < 0, true);
});

Deno.test('compareValues - null/empty handling', () => {
  assertEquals(compareValues('value', null), -1);
  assertEquals(compareValues(null, 'value'), 1);
  assertEquals(compareValues(null, null), 0);
});

Deno.test('safeCompare - with created_date tiebreaker', () => {
  const obj1 = { rfi_number: 'RFI-007', created_date: '2026-01-01T00:00:00Z' };
  const obj2 = { rfi_number: 'RFI-007', created_date: '2026-02-01T00:00:00Z' };
  const result = safeCompare(obj1, obj2, 'rfi_number', 'alphanumeric');
  assertEquals(result < 0, true);
});

Deno.test('sortBy - sort array of objects', () => {
  const items = [
    { id: 1, rfi_number: 'RFI-042' },
    { id: 2, rfi_number: 'RFI-007' },
    { id: 3, rfi_number: 'RFI-001' },
  ];
  const sorted = sortBy(items, 'rfi_number', 'alphanumeric');
  assertEquals(sorted[0].rfi_number, 'RFI-001');
  assertEquals(sorted[1].rfi_number, 'RFI-007');
  assertEquals(sorted[2].rfi_number, 'RFI-042');
});

Deno.test('sortBy - descending with nulls last', () => {
  const items = [
    { id: 1, cost: 5000 },
    { id: 2, cost: 25000 },
    { id: 3, cost: null },
  ];
  const sorted = sortBy(items, 'cost', 'numeric', true);
  assertEquals(sorted[0].cost, 25000);
  assertEquals(sorted[1].cost, 5000);
  assertEquals(sorted[2].cost, null);
});

Deno.test('sortBy - mixed null values', () => {
  const items = [
    { id: 1, name: 'Charlie' },
    { id: 2, name: null },
    { id: 3, name: 'Alice' },
    { id: 4, name: '' },
  ];
  const sorted = sortBy(items, 'name', 'auto');
  assertEquals(sorted[0].name, 'Alice');
  assertEquals(sorted[1].name, 'Charlie');
  // Null and empty both sort last
  assertEquals(sorted[2].name, null);
  assertEquals(sorted[3].name, '');
});

Deno.test('validateSortParams - valid params', () => {
  const valid = validateSortParams('rfi_number', 'alphanumeric', ['rfi_number', 'created_date']);
  assertEquals(valid, true);
});

Deno.test('validateSortParams - invalid field', () => {
  const invalid = validateSortParams('bad_field', 'alphanumeric', ['rfi_number']);
  assertEquals(invalid, false);
});

Deno.test('validateSortParams - invalid type', () => {
  const invalid = validateSortParams('rfi_number', 'bad_type', ['rfi_number']);
  assertEquals(invalid, false);
});

Deno.test('Integration - RFI dataset sort', () => {
  const rfis = [
    { id: '1', rfi_number: 'A-042', created_date: '2026-02-15T10:00:00Z' },
    { id: '2', rfi_number: 'A-007', created_date: '2026-02-10T08:00:00Z' },
    { id: '3', rfi_number: 'A-001', created_date: '2026-02-01T09:00:00Z' },
    { id: '4', rfi_number: null, created_date: '2026-02-20T11:00:00Z' },
    { id: '5', rfi_number: 'B-015', created_date: '2026-02-18T14:00:00Z' },
  ];
  const sorted = sortBy(rfis, 'rfi_number', 'alphanumeric');
  assertEquals(sorted[0].rfi_number, 'A-001');
  assertEquals(sorted[1].rfi_number, 'A-007');
  assertEquals(sorted[2].rfi_number, 'A-042');
  assertEquals(sorted[3].rfi_number, 'B-015');
  assertEquals(sorted[4].rfi_number, null);
});

Deno.test('Integration - Change Order by cost', () => {
  const cos = [
    { id: '1', co_number: 'CO-1', cost_impact: 5000 },
    { id: '2', co_number: 'CO-10', cost_impact: 25000 },
    { id: '3', co_number: 'CO-002', cost_impact: 8500 },
    { id: '4', co_number: 'CO-005', cost_impact: 12000 },
  ];
  const sorted = sortBy(cos, 'cost_impact', 'numeric');
  assertEquals(sorted[0].cost_impact, 5000);
  assertEquals(sorted[1].cost_impact, 8500);
  assertEquals(sorted[2].cost_impact, 12000);
  assertEquals(sorted[3].cost_impact, 25000);
});

Deno.test('Integration - Projects by name', () => {
  const projects = [
    { id: '1', name: 'Zebra Tower' },
    { id: '2', name: 'Apple Park' },
    { id: '3', name: 'Banana Plaza' },
  ];
  const sorted = sortBy(projects, 'name', 'auto');
  assertEquals(sorted[0].name, 'Apple Park');
  assertEquals(sorted[1].name, 'Banana Plaza');
  assertEquals(sorted[2].name, 'Zebra Tower');
});

Deno.test('Integration - Tasks by start_date', () => {
  const tasks = [
    { id: '1', name: 'Task A', start_date: '2026-03-15T08:00:00Z' },
    { id: '2', name: 'Task B', start_date: '2026-03-01T08:00:00Z' },
    { id: '3', name: 'Task C', start_date: null },
  ];
  const sorted = sortBy(tasks, 'start_date', 'date');
  assertEquals(sorted[0].start_date, '2026-03-01T08:00:00Z');
  assertEquals(sorted[1].start_date, '2026-03-15T08:00:00Z');
  assertEquals(sorted[2].start_date, null);
});