import { expect, test } from 'bun:test';
import { dailyCounts, monthCells } from './monthly.ts';

test('counts each person once per status per date', () => {
  const c = dailyCounts([
    { personId: 'a', date: '2026-11-02', status: 'present' },
    { personId: 'a', date: '2026-11-02', status: 'present' },
    { personId: 'b', date: '2026-11-02', status: 'absent' },
    { personId: 'c', date: '2026-11-03', status: 'late' },
  ]);
  expect(c['2026-11-02']).toEqual({ present: 1, absent: 1, late: 0, other: 0 });
  expect(c['2026-11-03'].late).toBe(1);
});

test('November 2026 starts on Sunday so six Monday-first pads', () => {
  const cells = monthCells(2026, 10);
  expect(cells.slice(0, 6)).toEqual([null, null, null, null, null, null]);
  expect(cells[6]).toBe('2026-11-01');
  expect(cells.length).toBe(36);
});
