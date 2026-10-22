import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { addDays, format, parseISO, startOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarDays, Search, Lock, Check, X, Clock, ShieldCheck, Save, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTerminology } from '@/hooks/useTerminology';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { attendanceSummary, HOLIDAY_TYPES, markingBlocked, workingDates } from '@/lib/attendance/weekly';
import type { Database } from '@/integrations/supabase/types';

type Kind = 'student' | 'teacher';
type Person = { id: string; name: string; number: string; classId?: string; className?: string };
type Entry = { id: string; personId: string; date: string; status: string; remarks: string; locked: boolean; checkIn?: string; checkOut?: string; lateReason?: string; approved?: boolean };
type Config = { school_days: number[]; settings: Database['public']['Tables']['attendance_settings']['Row'] | null; timezone: string; academic_year_id: string | null };
const statuses = [
  { value: 'present', label: 'Present', icon: Check, style: 'attendance-present' },
  { value: 'absent', label: 'Absent', icon: X, style: 'attendance-absent' },
  { value: 'late', label: 'Late', icon: Clock, style: 'attendance-late' },
  { value: 'excused', label: 'Excused', icon: ShieldCheck, style: 'attendance-excused' },
];
const labelFor = (value: string) => statuses.find(s => s.value === value)?.label || value.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase());

// Read every page rather than silently truncating large school rosters at 1000 rows.
async function readPages<T>(fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await fetchPage(from, from + 999);
    if (error) throw new Error(error.message);
    rows.push(...(data || []));
    if (!data || data.length < 1000) return rows;
  }
}

export default function WeeklyAttendanceGrid({ kind, personal = false }: { kind: Kind; personal?: boolean }) {
  const { profile } = useAuth();
  const t = useTerminology();
  const client = useQueryClient();
  const schoolId = profile?.school_id;
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [classId, setClassId] = useState('all');
  const [search, setSearch] = useState('');
  const [session, setSession] = useState('full_day');
  const [editing, setEditing] = useState<{ person: Person; date: string; entry?: Entry } | null>(null);
  const [status, setStatus] = useState('present');
  const [remarks, setRemarks] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [lateReason, setLateReason] = useState('');
  const [saving, setSaving] = useState(false);
  const monday = startOfWeek(parseISO(date), { weekStartsOn: 1 });
  const start = format(monday, 'yyyy-MM-dd');
  const end = format(addDays(monday, 6), 'yyyy-MM-dd');
  const staff = !!profile?.is_active && ['admin', 'principal', 'head_teacher'].includes(profile.role);
  const canMark = !personal && (staff || (kind === 'student' && profile?.role === 'teacher'));

  const configQuery = useQuery({
    queryKey: ['weekly-config', schoolId, start], enabled: !!schoolId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_weekly_attendance_config', { p_date: date });
      if (error) throw error;
      return data as unknown as Config;
    },
  });
  const config = configQuery.data;
  const effectiveSession = config?.settings?.enable_multiple_sessions ? session : (config?.settings?.default_session || 'full_day');
  const classesQuery = useQuery({
    queryKey: ['weekly-classes', schoolId, profile?.id, personal], enabled: !!schoolId && kind === 'student' && !personal,
    queryFn: async () => {
      if (!schoolId) return [];
      const classes = await readPages((from, to) => supabase.from('classes').select('id,name').eq('school_id', schoolId).order('id').range(from, to));
      if (staff) return classes.sort((a, b) => a.name.localeCompare(b.name));
      const permitted = await Promise.all(classes.map(async cls => {
        const { data, error } = await supabase.rpc('attendance_class_access', { p_class_id: cls.id });
        if (error) throw error;
        return data ? cls : null;
      }));
      return permitted.filter((cls): cls is {id: string; name: string} => cls !== null).sort((a, b) => a.name.localeCompare(b.name));
    },
  });
  const rosterQuery = useQuery({
    queryKey: ['weekly-roster', schoolId, profile?.id, kind, personal, classId, config?.academic_year_id, classesQuery.data],
    enabled: !!schoolId && !!profile && !!config && (kind === 'teacher' || personal || !!classesQuery.data),
    queryFn: async (): Promise<Person[]> => {
      if (!schoolId || !profile) return [];
      if (kind === 'teacher') {
        const rows = await readPages((from, to) => {
          let q = supabase.from('profiles').select('id,first_name,last_name,email').eq('school_id', schoolId).eq('role', 'teacher').eq('is_active', true);
          if (personal) q = q.eq('id', profile.id);
          return q.order('id').range(from, to);
        });
        return rows.map(row => ({ id: row.id, name: `${row.first_name} ${row.last_name}`, number: row.email }));
      }
      if (personal) {
        const { data, error } = await supabase.from('students').select('id,student_id,profiles!inner(first_name,last_name)').eq('school_id', schoolId).eq('profile_id', profile.id).maybeSingle();
        if (error) throw error;
        return data ? [{id: data.id, name: `${data.profiles.first_name} ${data.profiles.last_name}`, number: data.student_id}] : [];
      }
      const allowed = classesQuery.data?.filter(cls => classId === 'all' || cls.id === classId).map(cls => cls.id) || [];
      if (!allowed.length) return [];
      const rows = await readPages((from, to) => {
        let q = supabase.from('student_enrollments').select('id,class_id,students!inner(id,student_id,school_id,profiles!inner(first_name,last_name,is_active)),classes(name)').eq('school_id', schoolId).eq('students.school_id', schoolId).eq('students.profiles.is_active', true).eq('status', 'active').in('class_id', allowed);
        if (config?.academic_year_id) q = q.or(`academic_year_id.eq.${config.academic_year_id},academic_year_id.is.null`);
        else q = q.is('academic_year_id', null);
        return q.order('id').range(from, to);
      });
      const unique = new Map<string, Person>();
      rows.forEach(row => unique.set(row.students.id, {id: row.students.id, name: `${row.students.profiles.first_name} ${row.students.profiles.last_name}`, number: row.students.student_id, classId: row.class_id, className: row.classes?.name}));
      return Array.from(unique.values());
    },
  });
  const holidaysQuery = useQuery({
    queryKey: ['weekly-holidays', schoolId, start], enabled: !!schoolId,
    queryFn: async () => {
      if (!schoolId) return [];
      return readPages((from, to) => supabase.from('school_calendar').select('id,date,name').eq('school_id', schoolId).in('event_type', HOLIDAY_TYPES).gte('date', start).lte('date', end).order('id').range(from, to));
    },
  });
  const recordsQuery = useQuery({
    queryKey: ['weekly-records', schoolId, profile?.id, kind, start, effectiveSession, personal], enabled: !!schoolId && !!config,
    queryFn: async (): Promise<Entry[]> => {
      if (!schoolId) return [];
      if (kind === 'teacher') {
        const rows = await readPages((from, to) => {
          let q = supabase.from('teacher_attendance').select('*').eq('school_id', schoolId).gte('date', start).lte('date', end);
          if (personal && profile) q = q.eq('teacher_id', profile.id);
          return q.order('id').range(from, to);
        });
        return rows.map(row => ({id: row.id, personId: row.teacher_id, date: row.date, status: row.status, remarks: row.remarks || '', locked: false, checkIn: row.check_in_time || '', checkOut: row.check_out_time || '', lateReason: row.late_reason || '', approved: row.is_approved === true}));
      }
      const rows = await readPages((from, to) => supabase.from('attendance_records').select('*').eq('school_id', schoolId).eq('session', effectiveSession).gte('date', start).lte('date', end).order('id').range(from, to));
      return rows.map(row => ({id: row.id, personId: row.student_id, date: row.date, status: row.status, remarks: row.remarks || '', locked: row.is_locked === true}));
    },
  });
  const days = workingDates(parseISO(date), config?.school_days, holidaysQuery.data?.map(h => h.date));
  const people = (rosterQuery.data || []).filter(p => `${p.name} ${p.number} ${p.className || ''}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name));
  const entries = new Map((recordsQuery.data || []).map(entry => [`${entry.personId}:${entry.date}`, entry]));
  const summary = attendanceSummary(people.flatMap(p => days.map(day => entries.get(`${p.id}:${format(day, 'yyyy-MM-dd')}`)?.status)), people.length * days.length);
  const now = new Date();
  const timezone = config?.timezone || 'Africa/Kampala';
  const today = new Intl.DateTimeFormat('en-CA', {timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit'}).format(now);
  const time = new Intl.DateTimeFormat('en-GB', {timeZone: timezone, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'}).format(now);
  const blocked = (day: string, entry?: Entry) => markingBlocked(day, today, config?.settings || null, entry?.locked || false, time, kind);
  const loading = configQuery.isPending || rosterQuery.isPending || holidaysQuery.isPending || recordsQuery.isPending || (kind === 'student' && !personal && classesQuery.isPending);
  const error = configQuery.error || classesQuery.error || rosterQuery.error || holidaysQuery.error || recordsQuery.error;
  const refresh = async () => { await client.invalidateQueries({queryKey: ['weekly-records']}); };
  const openCell = (person: Person, day: string, entry?: Entry) => {
    setEditing({person, date: day, entry}); setStatus(entry?.status || 'present'); setRemarks(entry?.remarks || '');
    setCheckIn(entry?.checkIn || ''); setCheckOut(entry?.checkOut || ''); setLateReason(entry?.lateReason || '');
  };
  const save = async () => {
    if (!editing || !schoolId || !canMark || blocked(editing.date, editing.entry)) return;
    setSaving(true);
    try {
      const { error } = await supabase.rpc('save_weekly_attendance', {p_kind: kind, p_records: [{person_id: editing.person.id, class_id: editing.person.classId || null, date: editing.date, session: effectiveSession, status, remarks, check_in_time: checkIn || null, check_out_time: checkOut || null, late_reason: lateReason || null}]});
      if (error) throw error;
      await refresh();
      for (const key of ['admin-attendance', 'existing-attendance', 'teacher-attendance', 'student-attendance', 'attendance-stats', 'attendance-audit-logs']) client.invalidateQueries({queryKey: [key]});
      setEditing(null); toast.success('Attendance saved successfully');
    } catch (error) { toast.error(`Attendance was not saved: ${error instanceof Error ? error.message : String(error)}`); }
    finally { setSaving(false); }
  };

  return <section className="min-w-0 space-y-5" aria-label={`${kind === 'teacher' ? 'Teacher' : t.Student} weekly attendance`}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-semibold flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" />Weekly Attendance</h2>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" aria-label="Previous week" onClick={() => setDate(format(addDays(monday, -7), 'yyyy-MM-dd'))}><ChevronLeft className="h-4 w-4" /></Button>
        <span className="text-sm font-medium">{format(monday, 'd MMM')} – {format(addDays(monday, 6), 'd MMM yyyy')}</span>
        <Button variant="outline" size="icon" aria-label="Next week" onClick={() => setDate(format(addDays(monday, 7), 'yyyy-MM-dd'))}><ChevronRight className="h-4 w-4" /></Button>
        <Button variant="outline" size="sm" onClick={() => setDate(today)}>This Week</Button>
      </div>
    </div>
    <div className="flex flex-wrap items-end gap-3">
      <div><Label htmlFor={`week-date-${kind}`}>Date / Week</Label><Input id={`week-date-${kind}`} type="date" value={date} onChange={e => e.target.value && setDate(e.target.value)} className="w-44" /></div>
      {kind === 'student' && !personal && <div className="w-48"><Label>Class</Label><Select value={classId} onValueChange={setClassId}><SelectTrigger aria-label="Class filter"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Classes</SelectItem>{classesQuery.data?.map(cls => <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>)}</SelectContent></Select></div>}
      {kind === 'student' && config?.settings?.enable_multiple_sessions && <div className="w-40"><Label>Session</Label><Select value={session} onValueChange={setSession}><SelectTrigger aria-label="Attendance session"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="full_day">Full Day</SelectItem><SelectItem value="morning">Morning</SelectItem><SelectItem value="afternoon">Afternoon</SelectItem></SelectContent></Select></div>}
      <div className="relative min-w-48 flex-1 max-w-sm"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Search attendance names" placeholder={`Search ${kind === 'teacher' ? 'teachers' : t.students}…`} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
      <Button variant="outline" size="icon" aria-label="Refresh attendance" onClick={() => { configQuery.refetch(); classesQuery.refetch(); rosterQuery.refetch(); holidaysQuery.refetch(); refresh(); }}><RefreshCw className="h-4 w-4" /></Button>
    </div>
    {error ? <p role="alert" className="text-destructive">Attendance could not be loaded: {error.message}</p> : loading ? <Skeleton className="h-60 w-full" /> : <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[['Present', summary.present], ['Absent', summary.absent], ['Late', summary.late], ['Excused', summary.excused], ['Unmarked', summary.unmarked], ['Attendance', `${summary.rate}%`]].map(([label, value]) => <div key={label} className="border-l-2 border-border pl-3"><p className="text-xs text-muted-foreground">{label}</p><p className="text-2xl font-semibold tabular-nums">{value}</p></div>)}
      </div>
      {!!holidaysQuery.data?.length && <p className="text-sm text-muted-foreground">School holidays: {holidaysQuery.data.map(h => `${h.name} (${format(parseISO(h.date), 'EEE d MMM')})`).join(', ')}</p>}
      <div className="overflow-x-auto rounded-md border max-w-full">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Weekly {kind === 'teacher' ? 'teacher' : t.student} attendance</caption>
          <thead className="bg-muted"><tr><th scope="col" className="sticky left-0 z-10 min-w-44 max-w-60 bg-muted px-4 py-3 text-left">{kind === 'teacher' ? 'Teacher Name' : `${t.Student} Name`} <span className="text-muted-foreground">({people.length})</span></th>{days.map(day => <th scope="col" key={day.toISOString()} className="min-w-32 border-l px-3 py-3 text-center"><span className="block">{format(day, 'EEEE')}</span><span className="block text-xs font-normal text-muted-foreground">{format(day, 'd MMM')}</span></th>)}<th scope="col" className="min-w-24 border-l px-3 py-3">Summary</th></tr></thead>
          <tbody>{people.map(person => {
            const row = attendanceSummary(days.map(day => entries.get(`${person.id}:${format(day, 'yyyy-MM-dd')}`)?.status), days.length);
            return <tr key={person.id} className="border-t"><th scope="row" className="sticky left-0 z-10 max-w-60 bg-background px-4 py-3 text-left"><span className="block font-medium break-words">{person.name}</span><span className="block text-xs font-normal text-muted-foreground break-all">{person.className ? `${person.className} · ` : ''}{person.number}</span></th>{days.map(day => {
              const key = format(day, 'yyyy-MM-dd'); const entry = entries.get(`${person.id}:${key}`); const reason = blocked(key, entry); const style = statuses.find(s => s.value === entry?.status);
              return <td key={key} className="border-l px-2 py-3 text-center"><Button variant="outline" size="sm" className={`w-full min-w-28 ${style?.style || ''}`} aria-label={`${person.name}, ${format(day, 'EEEE d MMM')}: ${entry ? labelFor(entry.status) : 'Unmarked'}`} title={reason || entry?.remarks || undefined} disabled={!canMark || !!reason} onClick={() => openCell(person, key, entry)}>{entry?.locked && <Lock className="mr-1 h-3 w-3" />}{style && <style.icon className="mr-1 h-3 w-3" />}{entry ? labelFor(entry.status) : '—'}</Button>{reason && <span className="mt-1 block text-xs text-muted-foreground">{reason}</span>}{entry?.approved === false && <span className="mt-1 block text-xs text-muted-foreground">Pending approval</span>}</td>;
            })}<td className="border-l px-3 text-center"><span className="font-medium">{row.rate}%</span><span className="block text-xs text-muted-foreground">{row.recorded}/{days.length} marked</span></td></tr>;
          })}</tbody>
        </table>
        {!people.length && <p className="py-10 text-center text-muted-foreground">No {kind === 'teacher' ? 'teachers' : t.students} found.</p>}
        {!days.length && <p className="py-6 text-center text-muted-foreground">No working days in this week.</p>}
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">{statuses.map(s => <span key={s.value} className="flex items-center gap-1"><s.icon className="h-3 w-3" />{s.label}</span>)}<span>— Unmarked</span></div>
    </>}
    <Dialog open={!!editing} onOpenChange={open => { if (!open && !saving) setEditing(null); }}><DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>{editing?.person.name}</DialogTitle><p className="text-sm text-muted-foreground">{editing && format(parseISO(editing.date), 'EEEE, d MMMM yyyy')}{kind === 'student' ? ` · ${labelFor(effectiveSession)}` : ''}</p></DialogHeader>
      <div className="space-y-4"><div><Label>Status</Label><Select value={status} onValueChange={setStatus}><SelectTrigger aria-label="Attendance status"><SelectValue /></SelectTrigger><SelectContent>{statuses.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}{(kind === 'teacher' ? ['sick_leave', 'vacation_leave', 'half_day'] : ['left_early']).map(value => <SelectItem key={value} value={value}>{labelFor(value)}</SelectItem>)}</SelectContent></Select></div>
      {kind === 'teacher' && <><div className="grid grid-cols-2 gap-3"><div><Label htmlFor="weekly-check-in">Check In</Label><Input id="weekly-check-in" type="time" value={checkIn} onChange={e => setCheckIn(e.target.value)} /></div><div><Label htmlFor="weekly-check-out">Check Out</Label><Input id="weekly-check-out" type="time" value={checkOut} onChange={e => setCheckOut(e.target.value)} /></div></div><div><Label htmlFor="weekly-late-reason">Late Reason</Label><Input id="weekly-late-reason" value={lateReason} onChange={e => setLateReason(e.target.value)} /></div></>}
      <div><Label htmlFor="weekly-remarks">Remarks</Label><Input id="weekly-remarks" value={remarks} onChange={e => setRemarks(e.target.value)} /></div></div>
      <DialogFooter><Button variant="outline" disabled={saving} onClick={() => setEditing(null)}>Cancel</Button><Button disabled={saving || !canMark} onClick={save}><Save className="mr-2 h-4 w-4" />{saving ? 'Saving…' : 'Save Attendance'}</Button></DialogFooter></DialogContent></Dialog>
  </section>;
}