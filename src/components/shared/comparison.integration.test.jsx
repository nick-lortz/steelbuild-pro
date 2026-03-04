/**
 * Integration tests: RFI, CO, Projects, Tasks, Drawings with realistic datasets
 */

import { sortBy } from './comparison';

const testDatasets = {
  rfis: [
    { id: '1', rfi_number: 'A-042', title: 'Anchor bolt dims', status: 'open', created_date: '2026-02-15T10:00:00Z' },
    { id: '2', rfi_number: 'A-007', title: 'Connection detail', status: 'closed', created_date: '2026-02-10T08:00:00Z' },
    { id: '3', rfi_number: 'A-001', title: 'General coordination', status: 'open', created_date: '2026-02-01T09:00:00Z' },
    { id: '4', rfi_number: null, title: 'Unassigned RFI', status: 'draft', created_date: '2026-02-20T11:00:00Z' },
    { id: '5', rfi_number: 'B-015', title: 'Embed plate', status: 'open', created_date: '2026-02-18T14:00:00Z' },
  ],

  changeOrders: [
    { id: '1', co_number: 'CO-1', title: 'Additional bolts', cost_impact: 5000, status: 'submitted', created_date: '2026-01-15T10:00:00Z' },
    { id: '2', co_number: 'CO-10', title: 'Schedule acceleration', cost_impact: 25000, status: 'approved', created_date: '2026-01-20T14:00:00Z' },
    { id: '3', co_number: 'CO-002', title: 'Material change', cost_impact: 8500, status: 'pending', created_date: '2026-01-18T09:00:00Z' },
    { id: '4', co_number: null, title: 'Draft CO', cost_impact: null, status: 'draft', created_date: '2026-02-01T10:00:00Z' },
    { id: '5', co_number: 'CO-005', title: 'Scope addition', cost_impact: 12000, status: 'rejected', created_date: '2026-01-25T16:00:00Z' },
  ],

  projects: [
    { id: '1', name: 'Acme Tower', status: 'in_progress', contract_value: 2500000, created_date: '2025-10-01T08:00:00Z' },
    { id: '2', name: 'Baker Heights', status: 'in_progress', contract_value: 1800000, created_date: '2025-11-15T10:00:00Z' },
    { id: '3', name: 'Central Hub', status: 'planning', contract_value: 3200000, created_date: '2025-12-01T09:00:00Z' },
    { id: '4', name: null, status: 'planning', contract_value: null, created_date: '2026-01-01T00:00:00Z' },
    { id: '5', name: 'Downtown Plaza', status: 'closed', contract_value: 1500000, created_date: '2025-09-20T07:00:00Z' },
  ],

  tasks: [
    { id: '1', task_id: 'T-042', name: 'Fab detailing', phase: 'detailing', start_date: '2026-03-15T08:00:00Z', created_date: '2026-02-20T10:00:00Z' },
    { id: '2', task_id: 'T-007', name: 'Material procurement', phase: 'fabrication', start_date: '2026-03-01T08:00:00Z', created_date: '2026-02-18T09:00:00Z' },
    { id: '3', task_id: 'T-001', name: 'Kickoff meeting', phase: 'planning', start_date: '2026-02-24T10:00:00Z', created_date: '2026-02-15T14:00:00Z' },
    { id: '4', task_id: 'T-020', name: 'Field inspection', phase: 'erection', start_date: null, created_date: '2026-02-25T11:00:00Z' },
    { id: '5', task_id: 'T-015', name: 'Shop drawings review', phase: 'detailing', start_date: '2026-03-10T08:00:00Z', created_date: '2026-02-22T13:00:00Z' },
  ],

  drawings: [
    { id: '1', drawing_number: 'S-101', title: 'Main frame', revision: 'B', status: 'approved', sheet_sequence: 1, created_date: '2026-01-20T10:00:00Z' },
    { id: '2', drawing_number: 'S-042', title: 'Connections', revision: 'A', status: 'pending', sheet_sequence: 5, created_date: '2026-02-01T14:00:00Z' },
    { id: '3', drawing_number: 'S-007', title: 'Embeds', revision: 'C', status: 'approved', sheet_sequence: 2, created_date: '2026-01-15T09:00:00Z' },
    { id: '4', drawing_number: null, title: 'Unassigned drawing', revision: 'A', status: 'draft', sheet_sequence: null, created_date: '2026-02-10T10:00:00Z' },
    { id: '5', drawing_number: 'S-020', title: 'Details', revision: 'A', status: 'for review', sheet_sequence: 3, created_date: '2026-01-25T11:00:00Z' },
  ],
};

describe('Integration Tests: Sorting Mixed Datasets', () => {

  describe('RFI Hub - sort by rfi_number (alphanumeric)', () => {
    it('should sort RFIs by numeric code, nulls last', () => {
      const sorted = sortBy(testDatasets.rfis, 'rfi_number', 'alphanumeric');
      const expected = ['A-001', 'A-007', 'A-042', 'B-015', null];
      const actual = sorted.map((r) => r.rfi_number);
      expect(actual).toEqual(expected);
    });

    it('should maintain created_date tiebreaker for same rfi_number', () => {
      const dupRfis = [
        { id: '1', rfi_number: 'RFI-007', created_date: '2026-02-15T10:00:00Z' },
        { id: '2', rfi_number: 'RFI-007', created_date: '2026-02-10T08:00:00Z' },
        { id: '3', rfi_number: 'RFI-007', created_date: '2026-02-20T14:00:00Z' },
      ];
      const sorted = sortBy(dupRfis, 'rfi_number', 'alphanumeric');
      const dates = sorted.map((r) => r.created_date);
      expect(dates[0]).toBe('2026-02-10T08:00:00Z');
      expect(dates[1]).toBe('2026-02-15T10:00:00Z');
      expect(dates[2]).toBe('2026-02-20T14:00:00Z');
    });
  });

  describe('Change Orders - sort by co_number (alphanumeric)', () => {
    it('should sort CO numbers numerically, nulls last', () => {
      const sorted = sortBy(testDatasets.changeOrders, 'co_number', 'alphanumeric');
      const expected = ['CO-1', 'CO-002', 'CO-005', 'CO-10', null];
      const actual = sorted.map((c) => c.co_number);
      expect(actual).toEqual(expected);
    });
  });

  describe('Change Orders - sort by cost_impact (numeric)', () => {
    it('should sort cost numerically, nulls last', () => {
      const sorted = sortBy(testDatasets.changeOrders, 'cost_impact', 'numeric');
      const expected = [5000, 8500, 12000, 25000, null];
      const actual = sorted.map((c) => c.cost_impact);
      expect(actual).toEqual(expected);
    });
  });

  describe('Projects - sort by name (text, case-insensitive)', () => {
    it('should sort names alphabetically, nulls last', () => {
      const sorted = sortBy(testDatasets.projects, 'name', 'auto');
      const expected = ['Acme Tower', 'Baker Heights', 'Central Hub', 'Downtown Plaza', null];
      const actual = sorted.map((p) => p.name);
      expect(actual).toEqual(expected);
    });
  });

  describe('Tasks - sort by start_date (date)', () => {
    it('should sort by timestamp, nulls last', () => {
      const sorted = sortBy(testDatasets.tasks, 'start_date', 'date');
      const expected = ['2026-02-24T10:00:00Z', '2026-03-01T08:00:00Z', '2026-03-10T08:00:00Z', '2026-03-15T08:00:00Z', null];
      const actual = sorted.map((t) => t.start_date);
      expect(actual).toEqual(expected);
    });

    it('should use created_date tiebreaker for null start_date', () => {
      const tasks = [
        { id: '1', name: 'Task A', start_date: null, created_date: '2026-02-20T10:00:00Z' },
        { id: '2', name: 'Task B', start_date: '2026-03-01T08:00:00Z', created_date: '2026-02-15T09:00:00Z' },
        { id: '3', name: 'Task C', start_date: null, created_date: '2026-02-18T14:00:00Z' },
      ];
      const sorted = sortBy(tasks, 'start_date', 'date');
      expect(sorted[0].name).toBe('Task B');
      expect(sorted[1].id).toBe('3'); // Task C, created 2026-02-18
      expect(sorted[2].id).toBe('1'); // Task A, created 2026-02-20
    });
  });

  describe('Drawings - sort by drawing_number (alphanumeric)', () => {
    it('should sort drawing codes by numeric portion, nulls last', () => {
      const sorted = sortBy(testDatasets.drawings, 'drawing_number', 'alphanumeric');
      const expected = ['S-007', 'S-020', 'S-042', 'S-101', null];
      const actual = sorted.map((d) => d.drawing_number);
      expect(actual).toEqual(expected);
    });
  });

  describe('Drawings - sort by sheet_sequence (numeric)', () => {
    it('should sort sequence numbers, nulls last', () => {
      const sorted = sortBy(testDatasets.drawings, 'sheet_sequence', 'numeric');
      const expected = [1, 2, 3, 5, null];
      const actual = sorted.map((d) => d.sheet_sequence);
      expect(actual).toEqual(expected);
    });
  });

  describe('Mixed-type edge cases', () => {
    it('should handle whitespace and punctuation in codes', () => {
      const items = [
        { id: '1', code: '  RFI - 042  ' },
        { id: '2', code: 'RFI-007' },
        { id: '3', code: '---RFI---001' },
      ];
      const sorted = sortBy(items, 'code', 'alphanumeric');
      const codes = sorted.map((i) => i.code);
      expect(codes[0]).toContain('001');
      expect(codes[1]).toContain('007');
      expect(codes[2]).toContain('042');
    });

    it('should handle case-insensitive text sorting', () => {
      const items = [
        { id: '1', name: 'Zebra' },
        { id: '2', name: 'apple' },
        { id: '3', name: 'Banana' },
      ];
      const sorted = sortBy(items, 'name', 'auto');
      const names = sorted.map((i) => i.name);
      expect(names).toEqual(['apple', 'Banana', 'Zebra']);
    });
  });

  describe('Descending sort', () => {
    it('should sort descending with nulls last', () => {
      const sorted = sortBy(testDatasets.changeOrders, 'cost_impact', 'numeric', true);
      const expected = [25000, 12000, 8500, 5000, null];
      const actual = sorted.map((c) => c.cost_impact);
      expect(actual).toEqual(expected);
    });
  });
});