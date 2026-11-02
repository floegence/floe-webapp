import { describe, expect, it } from 'vitest';
import {
  addCalendarDays,
  addCalendarMonths,
  calendarDays,
  parseCalendarDate,
} from '../src/components/ui/calendarModel';
import { createTableModel } from '../src/components/ui/dataTableModel';
describe('civil dates', () => {
  it('rejects rollover dates and preserves leap days and month bounds', () => {
    expect(() => parseCalendarDate('2025-02-29')).toThrow();
    expect(() => parseCalendarDate('2026-13-01')).toThrow();
    expect(addCalendarDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addCalendarDays('2026-03-08', 1)).toBe('2026-03-09');
    expect(addCalendarMonths('2024-01-31', 1)).toBe('2024-02-29');
    expect(addCalendarMonths('2024-02-29', 12)).toBe('2025-02-28');
  });
  it('constructs complete weeks with an explicit first weekday', () => {
    const dates = calendarDays('2026-11-02', 1);
    expect(dates).toHaveLength(42);
    expect(dates[0]).toBe('2026-10-26');
    expect(dates[41]).toBe('2026-12-06');
    expect(() => calendarDays('2026-11-02', 7)).toThrow();
  });
});
describe('local table projection', () => {
  it('filters then sorts then pages without mutating caller data', () => {
    const rows = [
      { id: 'c', n: 3 },
      { id: 'a', n: 1 },
      { id: 'b', n: 2 },
    ];
    const model = createTableModel({
      rows,
      filter: (r) => r.n > 1,
      compare: (a, b) => a.n - b.n,
      page: 2,
      pageSize: 1,
    });
    expect(model).toEqual({ rows: [{ id: 'c', n: 3 }], totalRows: 2, totalPages: 2, page: 2 });
    expect(rows.map((r) => r.id)).toEqual(['c', 'a', 'b']);
  });
  it('bounds stale pagination after filtering and rejects invalid sizes', () => {
    expect(createTableModel({ rows: [], page: 4, pageSize: 10 })).toEqual({
      rows: [],
      totalRows: 0,
      totalPages: 1,
      page: 1,
    });
    expect(() => createTableModel({ rows: [], pageSize: 0 })).toThrow();
    expect(() => createTableModel({ rows: [], page: NaN })).toThrow();
  });
});
