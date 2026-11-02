// Pure helpers for monthly attendance calendars and charts.
export type DayRecord = { personId: string; date: string; status: string };

/** Count distinct people per status for each date (sessions never double-count a person). */
export function dailyCounts(records: DayRecord[]) {
  const map = new Map<string, { present: Set<string>; absent: Set<string>; late: Set<string>; other: Set<string> }>();
  for (const r of records) {
    const day = map.get(r.date) || { present: new Set(), absent: new Set(), late: new Set(), other: new Set() };
    const bucket = r.status === 'present' ? day.present : r.status === 'absent' ? day.absent : r.status === 'late' ? day.late : day.other;
    bucket.add(r.personId);
    map.set(r.date, day);
  }
  const out: Record<string, { present: number; absent: number; late: number; other: number }> = {};
  map.forEach((v, k) => { out[k] = { present: v.present.size, absent: v.absent.size, late: v.late.size, other: v.other.size }; });
  return out;
}

/** Monday-first calendar cells for a month; null = padding before day 1. */
export function monthCells(year: number, month: number): (string | null)[] {
  const first = new Date(Date.UTC(year, month, 1));
  const lead = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (string | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= days; d++) cells.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  return cells;
}
