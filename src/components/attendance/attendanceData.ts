import { supabase } from '@/integrations/supabase/client';

export type MonthRow = { personId: string; name: string; number: string; className?: string; date: string; status: string; approved?: boolean; recordId: string };

async function readPages<T>(fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await fetchPage(from, from + 999);
    if (error) throw new Error(error.message);
    rows.push(...(data || []));
    if (!data || data.length < 1000) return rows;
  }
}

/** Real attendance rows for a school and date range, optionally narrowed to one class or one teacher. */
export async function fetchAttendanceRange(kind: 'student' | 'teacher', schoolId: string, start: string, end: string, opts: { classId?: string; teacherId?: string } = {}): Promise<MonthRow[]> {
  if (kind === 'student') {
    const rows = await readPages((from, to) => {
      let q = supabase.from('attendance_records').select('id,student_id,date,status,class_id,classes(name),students(student_id,profiles(first_name,last_name))')
        .eq('school_id', schoolId).gte('date', start).lte('date', end);
      if (opts.classId && opts.classId !== 'all') q = q.eq('class_id', opts.classId);
      return q.order('id').range(from, to);
    });
    return rows.map((r: any) => ({
      recordId: r.id, personId: r.student_id, date: r.date, status: r.status,
      name: r.students?.profiles ? `${r.students.profiles.first_name} ${r.students.profiles.last_name}` : 'Unknown',
      number: r.students?.student_id || '', className: r.classes?.name,
    }));
  }
  const rows = await readPages((from, to) => {
    let q = supabase.from('teacher_attendance').select('id,teacher_id,date,status,is_approved').eq('school_id', schoolId).gte('date', start).lte('date', end);
    if (opts.teacherId) q = q.eq('teacher_id', opts.teacherId);
    return q.order('id').range(from, to);
  });
  const ids = Array.from(new Set(rows.map(r => r.teacher_id)));
  const names = new Map<string, { name: string; email: string }>();
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await supabase.from('profiles').select('id,first_name,last_name,email').eq('school_id', schoolId).in('id', ids.slice(i, i + 200));
    if (error) throw new Error(error.message);
    data?.forEach(p => names.set(p.id, { name: `${p.first_name} ${p.last_name}`, email: p.email }));
  }
  return rows.map(r => ({ recordId: r.id, personId: r.teacher_id, date: r.date, status: r.status, approved: r.is_approved !== false, name: names.get(r.teacher_id)?.name || 'Unknown teacher', number: names.get(r.teacher_id)?.email || '' }));
}
