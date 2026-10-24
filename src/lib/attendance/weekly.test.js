import { describe, test, expect } from 'bun:test';
import { workingDates, attendanceSummary, markingBlocked } from './weekly';
import { format } from 'date-fns';

describe('weekly attendance rules', () => {
  test('configured days include Sunday in Monday–Sunday order, excluding non-working days', () => {
    expect(workingDates(new Date(2026, 9, 21), [7, 1, 3]).map(d => format(d, 'yyyy-MM-dd'))).toEqual(['2026-10-19', '2026-10-21', '2026-10-25']);
  });
  test('school holidays are excluded', () => {
    expect(workingDates(new Date(2026, 9, 21), [1, 2, 3], ['2026-10-20']).map(d => format(d, 'yyyy-MM-dd'))).toEqual(['2026-10-19', '2026-10-21']);
  });
  test('an explicitly empty working week stays empty', () => {
    expect(workingDates(new Date(2026, 9, 21), []).length).toBe(0);
  });
  test('summary counts explicit statuses without treating unmarked as present', () => {
    expect(attendanceSummary(['present', 'absent', 'late', 'excused', undefined], 5)).toEqual({present: 1, absent: 1, late: 1, excused: 1, recorded: 4, unmarked: 1, rate: 50});
  });
  test('locked attendance cannot be edited', () => {
    expect(markingBlocked('2026-10-21', '2026-10-21', null, true, '09:00:00', 'student')).toBe('Locked');
  });
  test('future dates follow school permissions', () => {
    expect(markingBlocked('2026-10-22', '2026-10-21', {allow_future_attendance: false}, false, '09:00:00', 'teacher')).toBe('Future date');
    expect(markingBlocked('2026-10-22', '2026-10-21', {allow_future_attendance: true}, false, '09:00:00', 'teacher')).toBeNull();
  });
  test('student lock time is preserved', () => {
    expect(markingBlocked('2026-10-21', '2026-10-21', {auto_lock_enabled: true, lock_time: '18:00:00'}, false, '18:00:00', 'student')).toBe('Lock time passed');
  });
});