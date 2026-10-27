import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Mail, FileText, ClipboardCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTerminology } from '@/hooks/useTerminology';

export interface DirectoryStudent {
  id: string;
  student_id: string;
  date_of_birth: string | null;
  gender: string | null;
  profiles: { first_name: string; last_name: string; email: string; phone?: string | null; avatar_url?: string | null };
  class_id: string;
  class_name: string;
  stream_name?: string;
  subjects: { id: string; name: string }[];
}
export interface DirectoryAttendance { student_id: string | null; status: string; date: string; marked_at: string | null }
export const attendanceBadge = (status?: string) => {
  const styles: Record<string, string> = { present: 'attendance-present', absent: 'attendance-absent', late: 'attendance-late', excused: 'attendance-excused' };
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize whitespace-nowrap ${styles[status || ''] || 'bg-muted text-muted-foreground'}`}>{status || 'Not marked'}</span>;
};
export const StudentPhoto = ({ student, large = false }: { student: DirectoryStudent; large?: boolean }) => <Avatar className={large ? 'h-20 w-20 shrink-0' : 'h-9 w-9 shrink-0'}><AvatarImage src={student.profiles.avatar_url || undefined} alt={`${student.profiles.first_name} ${student.profiles.last_name}`} /><AvatarFallback className="bg-secondary text-primary font-semibold">{student.profiles.first_name?.[0]}{student.profiles.last_name?.[0]}</AvatarFallback></Avatar>;

export default function StudentDirectoryDetails({ student, attendance, onClose }: { student: DirectoryStudent; attendance: DirectoryAttendance[]; onClose: () => void }) {
  const { profile } = useAuth();
  const t = useTerminology();
  const navigate = useNavigate();
  const [fullProfile, setFullProfile] = useState(false);
  const [academic, setAcademic] = useState<{ id: string; term: string; grade: string | null; marks: number | null }[]>([]);
  const [academicError, setAcademicError] = useState('');
  useEffect(() => {
    let active = true;
    setAcademic([]);
    setAcademicError('');
    if (profile?.school_id) {
      void supabase.from('subject_submissions').select('id, term, grade, marks').eq('school_id', profile.school_id).eq('student_id', student.id).order('submitted_at', { ascending: false }).limit(20).then(({ data, error }) => {
        if (!active) return;
        if (error) setAcademicError(error.message);
        else setAcademic(data || []);
      });
    }
    return () => { active = false; };
  }, [student.id, profile?.school_id]);
  const latest = attendance[0];
  const name = `${student.profiles.first_name} ${student.profiles.last_name}`;
  const classLabel = [student.class_name, student.stream_name].filter(Boolean).join(' • ');
  const fields = [['Full Name', name], ['Admission No.', student.student_id], ['Class / Stream', classLabel], ['Email', student.profiles.email], ['Phone', student.profiles.phone], ['Gender', student.gender], ['Date of Birth', student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null]];
  const information = <dl className="space-y-4 text-xs">{fields.map(([label, value]) => <div key={label} className="grid grid-cols-[90px_minmax(0,1fr)] gap-3"><dt className="text-muted-foreground">{label}</dt><dd className="break-words font-medium capitalize">{value || '—'}</dd></div>)}</dl>;
  return <aside className="student-directory-details min-w-0 rounded-md border bg-card p-4 text-card-foreground lg:sticky lg:top-0 lg:self-start" aria-label={`${t.Student} details`}>
    <div className="mb-5 flex items-center justify-between"><h2 className="text-sm font-bold">{t.Student} Details</h2><Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={onClose} aria-label="Close details"><X /></Button></div>
    <div className="mb-5 flex items-center gap-3"><StudentPhoto student={student} large /><div className="min-w-0 space-y-1"><h3 className="text-sm font-bold break-words">{name}</h3><p className="text-xs text-muted-foreground">{student.student_id}</p>{attendanceBadge(latest?.status)}<p className="pt-1 text-[11px] text-muted-foreground break-words">{classLabel}{student.subjects.length > 0 && ` • ${student.subjects.map(s => s.name).join(', ')}`}</p></div></div>
    <Tabs defaultValue="overview" key={student.id}>
      <TabsList className="directory-tabs grid w-full grid-cols-4 rounded-none border-b bg-transparent p-0"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="academic">Academic</TabsTrigger><TabsTrigger value="attendance">Attendance</TabsTrigger><TabsTrigger value="fees">Fees</TabsTrigger></TabsList>
      <TabsContent value="overview" className="space-y-3 pt-2"><section className="rounded-md border p-3"><h4 className="mb-4 text-xs font-bold">Basic Information</h4>{information}</section><section className="rounded-md border p-3"><h4 className="mb-3 text-xs font-bold">Quick Actions</h4><Button className="mb-2 w-full justify-start text-xs" onClick={() => navigate('/teacher/communication')}><Mail />Send Message</Button><Button variant="outline" className="w-full justify-start text-xs" onClick={() => setFullProfile(true)}><FileText />View Full Profile</Button></section><section className="rounded-md border p-3"><h4 className="mb-4 text-xs font-bold">Recent Activity</h4>{latest ? <div className="flex gap-3"><ClipboardCheck className="h-5 w-5 text-primary" /><div className="text-xs"><p className="font-semibold">Attendance marked</p><p className="mt-1 capitalize text-muted-foreground">{latest.status} · {new Date(latest.date).toLocaleDateString('en-GB')}</p></div></div> : <p className="text-xs text-muted-foreground">No attendance recorded.</p>}</section></TabsContent>
      <TabsContent value="academic" className="space-y-3 pt-3"><h4 className="text-xs font-bold">Subjects & Marks</h4>{student.subjects.map(s => <p key={s.id} className="text-xs">{s.name}</p>)}{academicError ? <p className="text-xs text-destructive">{academicError}</p> : academic.length ? academic.map(a => <div key={a.id} className="flex justify-between border-b py-2 text-xs"><span>{a.term}</span><span>{a.marks ?? '—'} · {a.grade || 'Not graded'}</span></div>) : <p className="text-xs text-muted-foreground">No marks available.</p>}</TabsContent>
      <TabsContent value="attendance" className="pt-3"><h4 className="mb-3 text-xs font-bold">Attendance History</h4>{attendance.length ? attendance.slice(0, 20).map((a, i) => <div key={`${a.date}-${i}`} className="flex items-center justify-between border-b py-2 text-xs"><span>{new Date(a.date).toLocaleDateString('en-GB')}</span>{attendanceBadge(a.status)}</div>) : <p className="text-xs text-muted-foreground">No attendance recorded.</p>}</TabsContent>
      <TabsContent value="fees" className="pt-3"><p className="text-xs text-muted-foreground">Fee information is managed by the bursar.</p></TabsContent>
    </Tabs>
    <Dialog open={fullProfile} onOpenChange={setFullProfile}><DialogContent><DialogHeader><DialogTitle>{t.Student} Profile</DialogTitle></DialogHeader><div className="flex items-center gap-4 py-3"><StudentPhoto student={student} large /><h3 className="font-bold">{name}</h3></div>{information}<h4 className="mt-3 text-sm font-bold">Subjects</h4><p className="text-sm text-muted-foreground">{student.subjects.map(s => s.name).join(', ') || '—'}</p></DialogContent></Dialog>
  </aside>;
}