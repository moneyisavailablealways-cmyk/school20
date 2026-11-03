import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { addMonths, format, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarRange, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTerminology } from '@/hooks/useTerminology';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { dailyCounts, monthCells } from '@/lib/attendance/monthly';
import { fetchAttendanceRange } from './attendanceData';

const statusStyle: Record<string, string> = {
  present: 'attendance-present', absent: 'attendance-absent', late: 'attendance-late', excused: 'attendance-excused',
};
const label = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

/** Monthly calendar with per-day Present (green) / Absent (red) counts; click a date to see each person. */
export default function AttendanceMonthCalendar({ kind }: { kind: 'student' | 'teacher' }) {
  const { profile } = useAuth();
  const t = useTerminology();
  const client = useQueryClient();
  const schoolId = profile?.school_id;
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [classId, setClassId] = useState('all');
  const [openDate, setOpenDate] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const isAdminLike = !!profile && ['admin', 'principal', 'head_teacher'].includes(profile.role);
  const canApprove = kind === 'teacher' && isAdminLike;
  const start = format(month, 'yyyy-MM-dd');
  const end = format(new Date(month.getFullYear(), month.getMonth() + 1, 0), 'yyyy-MM-dd');

  const classesQuery = useQuery({
    queryKey: ['calendar-classes', schoolId, profile?.id], enabled: !!schoolId && kind === 'student',
    queryFn: async () => {
      const { data, error } = await supabase.from('classes').select('id,name').eq('school_id', schoolId!).order('name');
      if (error) throw error;
      if (isAdminLike) return data || [];
      const allowed = await Promise.all((data || []).map(async c => {
        const { data: ok } = await supabase.rpc('attendance_class_access', { p_class_id: c.id });
        return ok ? c : null;
      }));
      return allowed.filter((c): c is { id: string; name: string } => !!c);
    },
  });
  const teacherOnly = kind === 'student' && !isAdminLike;
  const recordsQuery = useQuery({
    queryKey: ['attendance-month', kind, schoolId, start, classId, teacherOnly ? classesQuery.data?.map(c => c.id).join() : ''],
    enabled: !!schoolId && (!teacherOnly || !!classesQuery.data),
    // Database policies already limit teachers to the classes they are authorised for.
    queryFn: () => fetchAttendanceRange(kind, schoolId!, start, end, { classId }),
  });
  const counts = useMemo(() => dailyCounts(recordsQuery.data || []), [recordsQuery.data]);
  const cells = monthCells(month.getFullYear(), month.getMonth());
  const dayRows = (recordsQuery.data || []).filter(r => r.date === openDate && `${r.name} ${r.number} ${r.className || ''}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name));
  const people = kind === 'teacher' ? 'Teachers' : t.Students;

  const approve = async (recordId: string) => {
    const { error } = await supabase.rpc('approve_teacher_attendance', { p_record_id: recordId, p_approve: true });
    if (error) return toast.error(`Approval failed: ${error.message}`);
    toast.success('Attendance approved');
    client.invalidateQueries({ queryKey: ['attendance-month'] });
    client.invalidateQueries({ queryKey: ['weekly-records'] });
  };

  return <section className="min-w-0 space-y-4" aria-label={`${people} attendance calendar`}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-xl font-semibold"><CalendarRange className="h-5 w-5 text-primary" />{kind === 'teacher' ? 'Teacher' : t.Student} Attendance Calendar</h2>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" aria-label="Previous month" onClick={() => setMonth(m => addMonths(m, -1))}><ChevronLeft className="h-4 w-4" /></Button>
        <span className="min-w-32 text-center text-sm font-medium">{format(month, 'MMMM yyyy')}</span>
        <Button variant="outline" size="icon" aria-label="Next month" onClick={() => setMonth(m => addMonths(m, 1))}><ChevronRight className="h-4 w-4" /></Button>
      </div>
    </div>
    {kind === 'student' && <div className="w-56"><Label>Class</Label><Select value={classId} onValueChange={setClassId}><SelectTrigger aria-label="Calendar class filter"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Classes</SelectItem>{classesQuery.data?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>}
    <div className="flex gap-4 text-xs text-muted-foreground"><span className="flex items-center gap-1"><span className="attendance-present h-3 w-3 rounded-sm border" />Present</span><span className="flex items-center gap-1"><span className="attendance-absent h-3 w-3 rounded-sm border" />Absent</span></div>
    {recordsQuery.error ? <p role="alert" className="text-destructive">Calendar could not be loaded: {(recordsQuery.error as Error).message}</p>
      : recordsQuery.isPending ? <Skeleton className="h-80 w-full" /> :
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <div key={d} className="py-1 text-center text-xs font-medium text-muted-foreground">{d}</div>)}
        {cells.map((day, i) => {
          if (!day) return <div key={`pad-${i}`} />;
          const c = counts[day];
          return <button key={day} type="button" onClick={() => { setOpenDate(day); setSearch(''); }}
            className="flex min-h-16 flex-col rounded-md border bg-card p-1 text-left transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring sm:min-h-20 sm:p-2"
            aria-label={`${format(parseISO(day), 'EEEE d MMMM')}: ${c?.present || 0} present, ${c?.absent || 0} absent`}>
            <span className="text-xs font-semibold sm:text-sm">{Number(day.slice(8))}</span>
            {c && <span className="mt-auto flex flex-wrap gap-1 text-[10px] font-semibold tabular-nums sm:text-xs">
              <span className="attendance-present rounded px-1">{c.present}</span>
              <span className="attendance-absent rounded px-1">{c.absent}</span>
            </span>}
          </button>;
        })}
      </div>}
    <Dialog open={!!openDate} onOpenChange={o => !o && setOpenDate(null)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{openDate && format(parseISO(openDate), 'EEEE, d MMMM yyyy')}</DialogTitle>
          <DialogDescription>{openDate && counts[openDate] ? `${counts[openDate].present} present · ${counts[openDate].absent} absent · ${counts[openDate].late} late` : `No attendance recorded for this date.`}</DialogDescription>
        </DialogHeader>
        <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder={`Search ${people.toLowerCase()}…`} value={search} onChange={e => setSearch(e.target.value)} /></div>
        {dayRows.length ? <ul className="divide-y rounded-md border">{dayRows.map(r => <li key={r.recordId} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
          <div className="min-w-0"><p className="font-medium break-words">{r.name}</p><p className="text-xs text-muted-foreground break-all">{r.className ? `${r.className} · ` : ''}{r.number}</p></div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={statusStyle[r.status] || ''}>{label(r.status)}</Badge>
            {kind === 'teacher' && r.approved === false && (canApprove ? <Button size="sm" variant="outline" onClick={() => approve(r.recordId)}>Approve</Button> : <span className="text-xs text-muted-foreground">Pending approval</span>)}
          </div>
        </li>)}</ul> : <p className="py-6 text-center text-muted-foreground">No records found.</p>}
      </DialogContent>
    </Dialog>
  </section>;
}
