import { addDays, format, startOfWeek } from 'date-fns';

export const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5];
export const HOLIDAY_TYPES = ['holiday', 'break', 'public_holiday', 'school_holiday', 'non_working_day'];

export function workingDates(date: Date, configuredDays: number[] | null | undefined, holidays: string[] = []) {
  const monday = startOfWeek(date, { weekStartsOn: 1 });
  const days = configuredDays ?? DEFAULT_WORKING_DAYS;
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index))
    .filter(day => days.includes(day.getDay() || 7) && !holidays.includes(format(day, 'yyyy-MM-dd')));
}

export function attendanceSummary(statuses: (string | undefined)[], expected: number) {
  const count = (status: string) => statuses.filter(value => value === status).length;
  const recorded = statuses.filter(Boolean).length;
  return {
    present: count('present'), absent: count('absent'), late: count('late'), excused: count('excused'),
    recorded, unmarked: Math.max(0, expected - recorded),
    rate: recorded ? Math.round(((count('present') + count('late')) / recorded) * 100) : 0,
  };
}

export function markingBlocked(date: string, today: string, settings: { allow_future_attendance?: boolean; auto_lock_enabled?: boolean; lock_time?: string } | null, locked: boolean, time: string, kind: 'student' | 'teacher') {
  if (locked) return 'Locked';
  if (date > today && !settings?.allow_future_attendance) return 'Future date';
  if (kind === 'student' && settings?.auto_lock_enabled && (date < today || (date === today && time >= (settings.lock_time || '18:00:00')))) return 'Lock time passed';
  return null;
}