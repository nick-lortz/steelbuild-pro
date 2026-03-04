/**
 * Unit tests for comparison logic
 * Testing: parsing, normalization, comparison rules, null handling
 */

import {
  normalize,
  splitAlphanumeric,
  parseNumeric,
  parseDate,
  compareValues,
  safeCompare,
  sortBy,
} from './comparison';

describe('Comparison Utilities', () => {
  
  describe('normalize', () => {
    it('should trim and collapse whitespace', () => {
      expect(normalize('  hello   world  ')).toBe('hello world');
      expect(normalize('\t  foo\n')).toBe('foo');
    });

    it('should handle null/undefined', () => {
      expect(normalize(null)).toBe('');
      expect(normalize(undefined)).toBe('');
    });

    it('should remove leading punctuation', () => {
      expect(normalize('---RFI-007')).toBe('RFI-007');
      expect(normalize('***test')).toBe('test');
    });
  });

  describe('splitAlphanumeric', () => {
    it('should split code with numeric prefix', () => {
      const result = splitAlphanumeric('RFI-007');
      expect(result.prefix).toBe(7);
      expect(result.suffix).toBe('RFI');
      expect(result.isNumeric).toBe(true);
    });

    it('should handle pure numeric', () => {
      const result = splitAlphanumeric('007');
      expect(result.prefix).toBe(7);
      expect(result.suffix).toBe('');
      expect(result.isNumeric).toBe(true);
    });

    it('should handle alphanumeric with suffix', () => {
      const result = splitAlphanumeric('A-007-X');
      expect(result.prefix).toBe(7);
      expect(result.suffix).toContain('X');
      expect(result.isNumeric).toBe(true);
    });

    it('should handle non-numeric', () => {
      const result = splitAlphanumeric('NONUM');
      expect(result.isNumeric).toBe(false);
      expect(result.prefix).toBe(Number.MAX_SAFE_INTEGER);
    });
  });

  describe('parseNumeric', () => {
    it('should parse numeric strings', () => {
      expect(parseNumeric('007')).toBe(7);
      expect(parseNumeric('42')).toBe(42);
      expect(parseNumeric('-5')).toBe(-5);
    });

    it('should return null for non-numeric', () => {
      expect(parseNumeric('abc')).toBeNull();
      expect(parseNumeric('7x')).toBeNull();
    });

    it('should handle null/undefined', () => {
      expect(parseNumeric(null)).toBeNull();
      expect(parseNumeric(undefined)).toBeNull();
      expect(parseNumeric('')).toBeNull();
    });
  });

  describe('parseDate', () => {
    it('should parse ISO date strings', () => {
      const date = parseDate('2026-03-04T10:30:00Z');
      expect(date).toBeInstanceOf(Date);
      expect(date.getFullYear()).toBe(2026);
    });

    it('should handle invalid dates', () => {
      expect(parseDate('not-a-date')).toBeNull();
      expect(parseDate('2026-13-01')).toBeNull();
    });

    it('should handle null/undefined', () => {
      expect(parseDate(null)).toBeNull();
      expect(parseDate(undefined)).toBeNull();
    });
  });

  describe('compareValues - Text (case-insensitive)', () => {
    it('should compare text case-insensitively', () => {
      expect(compareValues('Apple', 'apple')).toBe(0);
      expect(compareValues('Alice', 'Bob')).toBeLessThan(0);
      expect(compareValues('Zebra', 'Apple')).toBeGreaterThan(0);
    });
  });

  describe('compareValues - Numeric', () => {
    it('should compare numeric strings numerically', () => {
      expect(compareValues('007', '42', 'numeric')).toBeLessThan(0);
      expect(compareValues('100', '20', 'numeric')).toBeGreaterThan(0);
      expect(compareValues('5', '5', 'numeric')).toBe(0);
    });
  });

  describe('compareValues - Alphanumeric (codes)', () => {
    it('should compare alphanumeric codes by numeric prefix', () => {
      expect(compareValues('RFI-007', 'RFI-042', 'alphanumeric')).toBeLessThan(0);
      expect(compareValues('CO-100', 'CO-020', 'alphanumeric')).toBeGreaterThan(0);
    });

    it('should tiebreak by suffix', () => {
      expect(compareValues('A-007', 'B-007', 'alphanumeric')).toBeLessThan(0);
      expect(compareValues('Z-007', 'A-007', 'alphanumeric')).toBeGreaterThan(0);
    });
  });

  describe('compareValues - Dates', () => {
    it('should compare dates by timestamp', () => {
      const earlier = '2026-01-01T00:00:00Z';
      const later = '2026-12-31T23:59:59Z';
      expect(compareValues(earlier, later, 'date')).toBeLessThan(0);
      expect(compareValues(later, earlier, 'date')).toBeGreaterThan(0);
    });
  });

  describe('compareValues - Null/Empty Handling', () => {
    it('should sort nulls/empty to end', () => {
      expect(compareValues('value', null)).toBeLessThan(0);
      expect(compareValues(null, 'value')).toBeGreaterThan(0);
      expect(compareValues(null, null)).toBe(0);
      expect(compareValues('', null)).toBe(0);
    });
  });

  describe('safeCompare - with fallback', () => {
    it('should use created_at as tiebreaker', () => {
      const obj1 = {
        rfi_number: 'RFI-007',
        created_date: '2026-01-01T00:00:00Z',
      };
      const obj2 = {
        rfi_number: 'RFI-007',
        created_date: '2026-02-01T00:00:00Z',
      };
      const result = safeCompare(obj1, obj2, 'rfi_number', 'alphanumeric');
      expect(result).toBeLessThan(0); // obj1 created earlier
    });

    it('should handle null objects', () => {
      const obj = { field: 'value' };
      expect(safeCompare(null, obj, 'field')).toBe(0);
      expect(safeCompare(obj, null, 'field')).toBe(0);
    });
  });

  describe('sortBy - Integration', () => {
    it('should sort array of objects by field', () => {
      const items = [
        { id: 1, rfi_number: 'RFI-042' },
        { id: 2, rfi_number: 'RFI-007' },
        { id: 3, rfi_number: 'RFI-001' },
      ];
      const sorted = sortBy(items, 'rfi_number', 'alphanumeric');
      expect(sorted.map((x) => x.rfi_number)).toEqual(['RFI-001', 'RFI-007', 'RFI-042']);
    });

    it('should sort descending', () => {
      const items = [
        { id: 1, value: 5 },
        { id: 2, value: 20 },
        { id: 3, value: 10 },
      ];
      const sorted = sortBy(items, 'value', 'numeric', true);
      expect(sorted.map((x) => x.value)).toEqual([20, 10, 5]);
    });

    it('should handle mixed null/empty values', () => {
      const items = [
        { id: 1, name: 'Charlie' },
        { id: 2, name: null },
        { id: 3, name: 'Alice' },
        { id: 4, name: '' },
        { id: 5, name: 'Bob' },
      ];
      const sorted = sortBy(items, 'name', 'auto');
      const names = sorted.map((x) => x.name);
      expect(names.slice(0, 3)).toEqual(['Alice', 'Bob', 'Charlie']);
      expect(names.slice(3)).toEqual([null, '']);
    });
  });
});