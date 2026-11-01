import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Eye, MoreVertical, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import StudentDirectoryDetails, { DirectoryStudent, DirectoryAttendance, attendanceBadge, StudentPhoto } from '@/components/teacher/StudentDirectoryDetails';
import { useToast } from '@/hooks/use-toast';
import { useTerminology } from '@/hooks/useTerminology';

interface StudentProfile {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  avatar_url?: string | null;
}

interface Student {
  id: string;
  student_id: string;
  date_of_birth: string | null;
  gender: string | null;
  profiles: StudentProfile;
}

interface ClassData {
  class_id: string;
  class_name: string;
  stream_name?: string;
  subject_id?: string;
  subject_name?: string;
  students: Student[];
}

const cap = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);

const TeacherStudents = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const t = useTerminology();
  const [subjectRows, setSubjectRows] = useState<DirectoryStudent[]>([]);
  const [classRows, setClassRows] = useState<DirectoryStudent[]>([]);
  const [tab, setTab] = useState<'subject' | 'class'>('subject');
  const [streamFilter, setStreamFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [attendance, setAttendance] = useState<DirectoryAttendance[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTeacherStudents();
  }, [profile?.id, profile?.school_id]);

  const fetchTeacherStudents = async () => {
    if (!profile?.id || !profile.school_id) return;
    const schoolId = profile.school_id;
    try {
      setLoading(true);
      const { data: teacherData, error: teacherError } = await supabase.from('teachers').select('id')
        .eq('school_id', schoolId).eq('profile_id', profile.id).maybeSingle();
      if (teacherError) throw teacherError;

      // Subject assignments (teacher -> subject -> class)
      let specs: any[] = [];
      if (teacherData?.id) {
        const { data, error } = await supabase.from('teacher_specializations')
          .select('class_id, subject_id, subjects (id, name)')
          .eq('school_id', schoolId).eq('teacher_id', teacherData.id).not('class_id', 'is', null);
        if (error) throw error;
        specs = data || [];
      }
      // Official class-teacher assignments
      const { data: ctClasses, error: ctError } = await supabase.from('classes').select('id')
        .eq('school_id', schoolId).eq('class_teacher_id', profile.id);
      if (ctError) throw ctError;

      const classSubjects = new Map<string, { id: string; name: string }[]>();
      specs.forEach(s => {
        if (!s.class_id || !s.subjects) return;
        const list = classSubjects.get(s.class_id) || [];
        if (!list.some(x => x.id === s.subjects.id)) list.push({ id: s.subjects.id, name: s.subjects.name });
        classSubjects.set(s.class_id, list);
      });
      const subjectClassIds = new Set(classSubjects.keys());
      const ctClassIds = new Set((ctClasses || []).map(c => c.id));
      const allClassIds = [...new Set([...subjectClassIds, ...ctClassIds])];
      if (!allClassIds.length) { setSubjectRows([]); setClassRows([]); return; }

      const { data: enrollments, error: enrollError } = await supabase.from('student_enrollments')
        .select('student_id, class_id, stream_id').eq('school_id', schoolId).eq('status', 'active').in('class_id', allClassIds);
      if (enrollError) throw enrollError;
      if (!enrollments?.length) { setSubjectRows([]); setClassRows([]); return; }

      const [{ data: classDetails }, { data: streamDetails }] = await Promise.all([
        supabase.from('classes').select('id, name').eq('school_id', schoolId).in('id', allClassIds),
        supabase.from('streams').select('id, name').eq('school_id', schoolId).in('class_id', allClassIds),
      ]);
      const studentIds = [...new Set(enrollments.map(e => e.student_id))];
      const { data: students, error: studentsError } = await supabase.from('students')
        .select('id, student_id, date_of_birth, gender, profile_id').eq('school_id', schoolId).in('id', studentIds);
      if (studentsError) throw studentsError;
      const { data: profiles, error: profilesError } = await supabase.from('profiles')
        .select('id, first_name, last_name, email, phone, avatar_url').eq('school_id', schoolId)
        .in('id', (students || []).map(s => s.profile_id).filter(Boolean));
      if (profilesError) throw profilesError;

      const classMap = new Map((classDetails || []).map(c => [c.id, c.name]));
      const streamMap = new Map((streamDetails || []).map(s => [s.id, s.name]));
      const studentMap = new Map((students || []).map(s => [s.id, s]));
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      const build = (classIds: Set<string>, withSubjects: boolean) => {
        const roster = new Map<string, DirectoryStudent>();
        enrollments.forEach(e => {
          if (!classIds.has(e.class_id) || roster.has(e.student_id)) return;
          const st = studentMap.get(e.student_id);
          const pr = st ? profileMap.get(st.profile_id) : null;
          const className = classMap.get(e.class_id);
          if (!st || !pr || !className) return;
          roster.set(st.id, {
            id: st.id, student_id: st.student_id, date_of_birth: st.date_of_birth, gender: st.gender,
            profiles: { first_name: pr.first_name, last_name: pr.last_name, email: pr.email, phone: pr.phone, avatar_url: pr.avatar_url },
            class_id: e.class_id, class_name: className,
            stream_name: e.stream_id ? streamMap.get(e.stream_id) : undefined,
            subjects: withSubjects ? [...(classSubjects.get(e.class_id) || [])] : (classSubjects.get(e.class_id) || []).slice(),
          } as DirectoryStudent);
        });
        return [...roster.values()].sort((a, b) => `${a.profiles.first_name} ${a.profiles.last_name}`.localeCompare(`${b.profiles.first_name} ${b.profiles.last_name}`));
      };
      setSubjectRows(build(subjectClassIds, true));
      setClassRows(build(ctClassIds, false));
    } catch (error: any) {
      console.error('Error fetching teacher students:', error);
      toast({ title: 'Error', description: error.message || `Failed to fetch ${t.students} data`, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const rows = tab === 'subject' ? subjectRows : classRows;
  useEffect(() => {
    if (!profile?.school_id || !rows.length) { setAttendance([]); return; }
    let active = true;
    void supabase.from('attendance_records').select('student_id, status, date, marked_at').eq('school_id', profile.school_id).in('student_id', [...new Set(rows.map(r => r.id))]).order('date', { ascending: false }).order('marked_at', { ascending: false }).limit(1000).then(({ data, error }) => {
      if (!active) return;
      if (error) toast({ title: 'Attendance unavailable', description: error.message, variant: 'destructive' });
      setAttendance(data || []);
    });
    return () => { active = false; };
  }, [rows, profile?.school_id]);
  const classOptions = Array.from(new Map(rows.map(r => [r.class_id, r.class_name])).entries());
  const streamOptions = [...new Set(rows.filter(r => classFilter === 'all' || r.class_id === classFilter).map(r => r.stream_name).filter(Boolean) as string[])].sort();
  const subjectOptions = Array.from(new Map(rows.flatMap(r => r.subjects.map(s => [s.id, s.name] as const))).entries());
  const filtered = rows.filter(r => (classFilter === 'all' || r.class_id === classFilter) && (streamFilter === 'all' || r.stream_name === streamFilter) && (subjectFilter === 'all' || r.subjects.some(s => s.id === subjectFilter)) && `${r.profiles.first_name} ${r.profiles.last_name} ${r.student_id} ${r.profiles.email}`.toLowerCase().includes(search.toLowerCase()));
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const selected = rows.find(r => r.id === selectedId);
  const toggleChecked = (id: string) => setChecked(previous => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  return (
    <div className="student-directory -m-4 min-h-full p-4 md:-m-6 md:p-6">
      <div className={`grid items-start gap-4 ${selected ? 'xl:grid-cols-[minmax(0,1fr)_300px]' : 'grid-cols-1'}`}>
        <div className="min-w-0 space-y-4">
          <header><h1 className="text-[28px] font-bold text-foreground">{t.myStudents}</h1></header>
          <div role="tablist" className="inline-flex rounded-md border bg-card p-1 text-xs">
            {([['subject', `Subject ${cap(t.students)}`, subjectRows.length], ['class', 'My Class', classRows.length]] as const).map(([key, label, count]) => <button key={key} role="tab" aria-selected={tab === key} onClick={() => { setTab(key); setClassFilter('all'); setStreamFilter('all'); setSubjectFilter('all'); setPage(1); setSelectedId(null); }} className={`rounded px-3 py-1.5 font-medium transition-colors ${tab === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{label} ({count})</button>)}
          </div>
          <div className="grid items-end gap-3 rounded-md border bg-card p-4 sm:grid-cols-2 lg:grid-cols-[minmax(160px,1.5fr)_minmax(110px,1fr)_minmax(110px,1fr)_minmax(110px,1fr)_auto]">
            <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label={`Search ${t.students}`} placeholder="Search by name, admission no. or email..." className="pl-9 text-xs" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></div>
            <div><label className="mb-1.5 block text-xs text-muted-foreground">Class</label><Select value={classFilter} onValueChange={value => { setClassFilter(value); setStreamFilter('all'); setPage(1); }}><SelectTrigger className="text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Classes</SelectItem>{classOptions.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}</SelectContent></Select></div>
            <div><label className="mb-1.5 block text-xs text-muted-foreground">Stream</label><Select value={streamFilter} onValueChange={value => { setStreamFilter(value); setPage(1); }}><SelectTrigger className="text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Streams</SelectItem>{streamOptions.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent></Select></div>
            <div><label className="mb-1.5 block text-xs text-muted-foreground">Subject</label><Select value={subjectFilter} onValueChange={value => { setSubjectFilter(value); setPage(1); }}><SelectTrigger className="text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Subjects</SelectItem>{subjectOptions.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}</SelectContent></Select></div>
            <div className="px-2 lg:border-l"><p className="text-[11px] text-muted-foreground">{t.totalStudents}</p><p className="text-xl font-bold text-primary">{new Set(filtered.map(r => r.id)).size}</p></div>
          </div>
          <div className="rounded-md border bg-card p-3">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[740px] table-fixed text-left text-xs">
                <thead className="bg-secondary text-foreground"><tr className="h-11">
                  <th className="w-8 pl-2"><Checkbox aria-label="Select all on this page" checked={visible.length > 0 && visible.every(r => checked.has(r.id))} onCheckedChange={value => setChecked(prev => { const next = new Set(prev); visible.forEach(r => value ? next.add(r.id) : next.delete(r.id)); return next; })} /></th>
                  <th className="w-7">#</th><th className="w-12">Photo</th><th className="w-[19%]">Name</th><th className="w-[14%]">Admission No.</th><th className="w-[14%]">Class / Stream</th><th>Email</th><th className="w-[90px]">Status</th><th className="w-[105px]">Actions</th>
                </tr></thead>
                <tbody>{loading ? <tr><td colSpan={9} className="py-16 text-center text-muted-foreground">Loading {t.students}…</td></tr> : !visible.length ? <tr><td colSpan={9} className="py-16 text-center text-muted-foreground"><Users className="mx-auto mb-3 h-8 w-8" />{t.noStudents}</td></tr> : visible.map((student, index) => <tr key={student.id} className={`h-[58px] border-b transition-colors hover:bg-secondary/50 ${selectedId === student.id ? 'bg-secondary/40' : ''}`}>
                  <td className="pl-2"><Checkbox aria-label={`Select ${student.profiles.first_name} ${student.profiles.last_name}`} checked={checked.has(student.id)} onCheckedChange={() => toggleChecked(student.id)} /></td><td className="text-muted-foreground">{(currentPage - 1) * pageSize + index + 1}</td><td><StudentPhoto student={student} /></td>
                  <td className="pr-2 font-medium break-words">{student.profiles.first_name} {student.profiles.last_name}{student.subjects.length > 0 && <span className="block text-[10px] font-normal text-muted-foreground">{student.subjects.map(sub => sub.name).join(', ')}</span>}</td><td className="pr-2 text-muted-foreground break-words">{student.student_id}</td><td className="pr-2 text-muted-foreground break-words">{[student.class_name, student.stream_name].filter(Boolean).join(' • ')}</td><td className="truncate pr-3 text-muted-foreground" title={student.profiles.email}>{student.profiles.email || '—'}</td><td>{attendanceBadge(attendance.find(a => a.student_id === student.id)?.status)}</td>
                  <td><div className="flex items-center gap-1"><Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-[11px]" onClick={() => setSelectedId(student.id)}><Eye className="h-3 w-3" />View</Button><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-6" aria-label={`Actions for ${student.profiles.first_name}`}><MoreVertical /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => setSelectedId(student.id)}>View Details</DropdownMenuItem><DropdownMenuItem onClick={() => navigate('/teacher/communication')}>Send Message</DropdownMenuItem><DropdownMenuItem onClick={() => navigate(`/teacher/classes/${student.class_id}/students`)}>View Class</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></td>
                </tr>)}</tbody>
              </table>
            </div>
            <footer className="flex flex-wrap items-center justify-between gap-3 pt-4 text-[11px] text-muted-foreground"><span>Showing {filtered.length ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} {t.students}</span><div className="flex items-center gap-1"><Button variant="outline" size="icon" className="h-7 w-7" aria-label="Previous page" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft /></Button>{Array.from({ length: Math.min(5, pageCount) }, (_, i) => Math.max(1, Math.min(currentPage - 2, pageCount - 4)) + i).map(number => <Button key={number} variant={currentPage === number ? 'default' : 'secondary'} className="h-7 w-7 p-0 text-xs" onClick={() => setPage(number)}>{number}</Button>)}<Button variant="outline" size="icon" className="h-7 w-7" aria-label="Next page" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}><ChevronRight /></Button></div><div className="flex items-center gap-2"><span>Page size</span><Select value={String(pageSize)} onValueChange={value => { setPageSize(Number(value)); setPage(1); }}><SelectTrigger aria-label="Page size" className="h-7 w-16 text-xs"><SelectValue /></SelectTrigger><SelectContent>{[10, 20, 50].map(size => <SelectItem key={size} value={String(size)}>{size}</SelectItem>)}</SelectContent></Select></div></footer>
          </div>
        </div>
        {selected && <StudentDirectoryDetails student={selected} attendance={attendance.filter(a => a.student_id === selected.id)} onClose={() => setSelectedId(null)} />}
      </div>
    </div>
  );
};

export default TeacherStudents;
