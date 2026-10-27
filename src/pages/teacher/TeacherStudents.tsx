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

const TeacherStudents = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const t = useTerminology();
  const [classesData, setClassesData] = useState<ClassData[]>([]);
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

    try {
      setLoading(true);

      // Get teacher record
      const { data: teacherData } = await supabase
        .from('teachers')
        .select('id')
        .eq('school_id', profile.school_id)
        .eq('profile_id', profile.id)
        .single();

      const teacherId = teacherData?.id;

      // Get classes where teacher is the class teacher
      const { data: classTeacherClasses } = await supabase
        .from('classes')
        .select('id, name')
        .eq('school_id', profile.school_id)
        .eq('class_teacher_id', profile.id);

      // Get streams where teacher is the section teacher
      const { data: sectionTeacherStreams } = await supabase
        .from('streams')
        .select(`
          id,
          name,
          class_id,
          classes!inner (id, name)
        `)
        .eq('school_id', profile.school_id)
        .eq('section_teacher_id', profile.id);

      // Get subject specializations
      let specializations: any[] = [];
      if (teacherId) {
        const { data: specData } = await supabase
          .from('teacher_specializations')
          .select(`
            class_id,
            subject_id,
            classes!inner (id, name),
            subjects (id, name)
          `)
          .eq('school_id', profile.school_id)
          .eq('teacher_id', teacherId)
          .not('class_id', 'is', null);
        
        specializations = specData || [];
      }

      // Collect all unique class IDs and build subject map
      const classIds = new Set<string>();
      const classSubjects = new Map<string, any[]>();
      
      (classTeacherClasses || []).forEach(c => {
        classIds.add(c.id);
        if (!classSubjects.has(c.id)) classSubjects.set(c.id, []);
      });
      
      (sectionTeacherStreams || []).forEach(s => {
        classIds.add(s.class_id);
        if (!classSubjects.has(s.class_id)) classSubjects.set(s.class_id, []);
      });
      
      specializations.forEach(s => {
        if (s.class_id) {
          classIds.add(s.class_id);
          if (!classSubjects.has(s.class_id)) {
            classSubjects.set(s.class_id, []);
          }
          if (s.subjects) classSubjects.get(s.class_id)?.push(s.subjects);
        }
      });

      if (classIds.size === 0) {
        setClassesData([]);
        setLoading(false);
        return;
      }

      // Fetch all student enrollments for these classes
      const { data: enrollments, error: enrollError } = await supabase
        .from('student_enrollments')
        .select(`
          student_id,
          class_id,
          stream_id,
          status
        `)
        .eq('school_id', profile.school_id)
        .in('class_id', Array.from(classIds))
        .eq('status', 'active');

      if (enrollError) {
        console.error('Error fetching enrollments:', enrollError);
        throw enrollError;
      }

      if (!enrollments || enrollments.length === 0) {
        setClassesData([]);
        setLoading(false);
        return;
      }

      // Get class and stream details
      const { data: classDetails } = await supabase
        .from('classes')
        .select('id, name')
        .eq('school_id', profile.school_id)
        .in('id', Array.from(classIds));

      const { data: streamDetails } = await supabase
        .from('streams')
        .select('id, name, class_id')
        .eq('school_id', profile.school_id);

      // Get student details separately
      const studentIds = [...new Set(enrollments.map(e => e.student_id))];
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select(`
          id,
          student_id,
          date_of_birth,
          gender,
          profile_id
        `)
        .eq('school_id', profile.school_id)
        .in('id', studentIds);

      if (studentsError) {
        console.error('Error fetching students:', studentsError);
        throw studentsError;
      }

      // Get profiles for these students
      const profileIds = students?.map(s => s.profile_id) || [];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, phone, avatar_url')
        .eq('school_id', profile.school_id)
        .in('id', profileIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      // Create maps for easy lookup
      const classMap = new Map(classDetails?.map(c => [c.id, c]) || []);
      const streamMap = new Map(streamDetails?.map(s => [s.id, s]) || []);
      const studentMap = new Map(students?.map(s => [s.id, s]) || []);
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // For subject teachers, also get subject enrollments
      const studentSubjectMap = new Map<string, Set<string>>();
      if (specializations.length > 0) {
        const subjectIds = specializations.map(s => s.subject_id);
        const { data: subjectEnrollments } = await supabase
          .from('student_subject_enrollments')
          .select('student_id, subject_id')
          .eq('school_id', profile.school_id)
          .in('subject_id', subjectIds)
          .eq('status', 'active');

        (subjectEnrollments || []).forEach(se => {
          if (!studentSubjectMap.has(se.student_id)) {
            studentSubjectMap.set(se.student_id, new Set());
          }
          studentSubjectMap.get(se.student_id)?.add(se.subject_id);
        });
      }

      // Process and group students by class/stream and subject
      const groupedClassMap = new Map<string, any>();

      enrollments.forEach(enrollment => {
        const classId = enrollment.class_id;
        const student = studentMap.get(enrollment.student_id);
        const profile = student ? profileMap.get(student.profile_id) : null;
        const classDetail = classMap.get(classId);
        const streamDetail = enrollment.stream_id ? streamMap.get(enrollment.stream_id) : null;

        // Skip if we don't have student or profile data
        if (!student || !profile || !classDetail) return;

        const subjects = classSubjects.get(classId) || [];
        
        // Build student object
        const studentData = {
          id: student.id,
          student_id: student.student_id,
          date_of_birth: student.date_of_birth,
          gender: student.gender,
          profiles: {
            first_name: profile.first_name,
            last_name: profile.last_name,
            email: profile.email,
            phone: profile.phone,
            avatar_url: profile.avatar_url
          }
        };
        
        // If this is a subject teacher, group by subject
        if (subjects.length > 0) {
          subjects.forEach(subject => {
            const studentSubjects = studentSubjectMap.get(enrollment.student_id);
            
            // Only include student if they're enrolled in this subject
            if (studentSubjects && studentSubjects.has(subject.id)) {
              const key = `${classId}-${enrollment.stream_id || "none"}-${subject.id}`;
              
              if (!groupedClassMap.has(key)) {
                groupedClassMap.set(key, {
                  class_id: classId,
                  class_name: classDetail.name,
                  stream_name: streamDetail?.name,
                  subject_id: subject.id,
                  subject_name: subject.name,
                  students: []
                });
              }
              
              groupedClassMap.get(key)?.students.push(studentData);
            }
          });
        } else {
          // Class teacher - show all students
          const key = enrollment.stream_id 
            ? `${classId}-${enrollment.stream_id}`
            : classId;

          if (!groupedClassMap.has(key)) {
            groupedClassMap.set(key, {
              class_id: classId,
              class_name: classDetail.name,
              stream_name: streamDetail?.name,
              students: []
            });
          }

          groupedClassMap.get(key)?.students.push(studentData);
        }
      });

      setClassesData(Array.from(groupedClassMap.values()));

    } catch (error: any) {
      console.error('Error fetching teacher students:', error);
      toast({
        title: 'Error',
        description: error.message || `Failed to fetch ${t.students} data`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const rows = useMemo(() => {
    const roster = new Map<string, DirectoryStudent>();
    classesData.forEach(group => group.students.forEach(student => {
      const key = `${student.id}-${group.class_id}-${group.stream_name || ''}`;
      const existing = roster.get(key);
      const subject = group.subject_id && group.subject_name ? { id: group.subject_id, name: group.subject_name } : null;
      if (existing) {
        if (subject && !existing.subjects.some(s => s.id === subject.id)) existing.subjects.push(subject);
      } else roster.set(key, { ...student, class_id: group.class_id, class_name: group.class_name, stream_name: group.stream_name, subjects: subject ? [subject] : [] });
    }));
    return Array.from(roster.values()).sort((a, b) => `${a.profiles.first_name} ${a.profiles.last_name}`.localeCompare(`${b.profiles.first_name} ${b.profiles.last_name}`));
  }, [classesData]);
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
  const classOptions = Array.from(new Map(rows.map(r => [`${r.class_id}|${r.stream_name || ''}`, [r.class_name, r.stream_name].filter(Boolean).join(' • ')])).entries());
  const subjectOptions = Array.from(new Map(rows.flatMap(r => r.subjects.map(s => [s.id, s.name] as const))).entries());
  const filtered = rows.filter(r => (classFilter === 'all' || `${r.class_id}|${r.stream_name || ''}` === classFilter) && (subjectFilter === 'all' || r.subjects.some(s => s.id === subjectFilter)) && `${r.profiles.first_name} ${r.profiles.last_name} ${r.student_id} ${r.profiles.email}`.toLowerCase().includes(search.toLowerCase()));
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
          <div className="grid items-end gap-3 rounded-md border bg-card p-4 sm:grid-cols-2 lg:grid-cols-[minmax(160px,1.5fr)_minmax(120px,1fr)_minmax(120px,1fr)_auto]">
            <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label={`Search ${t.students}`} placeholder="Search by name, admission no. or email..." className="pl-9 text-xs" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></div>
            <div><label className="mb-1.5 block text-xs text-muted-foreground">Class / Stream</label><Select value={classFilter} onValueChange={value => { setClassFilter(value); setPage(1); }}><SelectTrigger className="text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Classes</SelectItem>{classOptions.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}</SelectContent></Select></div>
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
                <tbody>{loading ? <tr><td colSpan={9} className="py-16 text-center text-muted-foreground">Loading {t.students}…</td></tr> : !visible.length ? <tr><td colSpan={9} className="py-16 text-center text-muted-foreground"><Users className="mx-auto mb-3 h-8 w-8" />{t.noStudents}</td></tr> : visible.map((student, index) => <tr key={`${student.id}-${student.class_id}-${student.stream_name}`} className={`h-[58px] border-b transition-colors hover:bg-secondary/50 ${selectedId === student.id ? 'bg-secondary/40' : ''}`}>
                  <td className="pl-2"><Checkbox aria-label={`Select ${student.profiles.first_name} ${student.profiles.last_name}`} checked={checked.has(student.id)} onCheckedChange={() => toggleChecked(student.id)} /></td><td className="text-muted-foreground">{(currentPage - 1) * pageSize + index + 1}</td><td><StudentPhoto student={student} /></td>
                  <td className="pr-2 font-medium break-words">{student.profiles.first_name} {student.profiles.last_name}</td><td className="pr-2 text-muted-foreground break-words">{student.student_id}</td><td className="pr-2 text-muted-foreground break-words">{[student.class_name, student.stream_name].filter(Boolean).join(' • ')}</td><td className="truncate pr-3 text-muted-foreground" title={student.profiles.email}>{student.profiles.email || '—'}</td><td>{attendanceBadge(attendance.find(a => a.student_id === student.id)?.status)}</td>
                  <td><div className="flex items-center gap-1"><Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-[11px]" onClick={() => setSelectedId(student.id)}><Eye className="h-3 w-3" />View</Button><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-6" aria-label={`Actions for ${student.profiles.first_name}`}><MoreVertical /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => setSelectedId(student.id)}>View Details</DropdownMenuItem onClick={() => navigate('/teacher/communication')}>Send Message</DropdownMenuItem onClick={() => navigate(`/teacher/classes/${student.class_id}/students`)}>View Class</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></td>
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
