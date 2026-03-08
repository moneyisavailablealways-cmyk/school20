import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Send, AlertCircle, Plus, X, CheckCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface StudentRow {
  studentId: string;
  name: string;
  admissionNo: string;
  a1: string;
  a2: string;
  a3: string;
  exam: string;
  total: number | null;
  grade: string;
  gradePoints: number | null;
  remark: string;
  identifier: string;
  existingId?: string;
  status?: string;
}

interface SubjectCard {
  id: string;
  subjectId: string;
  students: StudentRow[];
  loading: boolean;
}

const MarksSubmission = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('Term 1');
  const [subjectCards, setSubjectCards] = useState<SubjectCard[]>([
    { id: crypto.randomUUID(), subjectId: '', students: [], loading: false },
  ]);
  const autoSaveTimerRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Fetch teacher record
  const { data: teacherRecord } = useQuery({
    queryKey: ['teacher-record', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;
      const { data } = await supabase
        .from('teachers')
        .select('id')
        .eq('profile_id', profile.id)
        .maybeSingle();
      return data;
    },
    enabled: !!profile?.id,
  });

  // Fetch classes
  const { data: classes } = useQuery({
    queryKey: ['teacher-classes', profile?.id, teacherRecord?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const classIds = new Set<string>();
      const [{ data: ct }, { data: st }, { data: sp }] = await Promise.all([
        supabase.from('classes').select('id').eq('class_teacher_id', profile.id),
        supabase.from('streams').select('class_id').eq('section_teacher_id', profile.id),
        teacherRecord?.id
          ? supabase.from('teacher_specializations').select('class_id').eq('teacher_id', teacherRecord.id).not('class_id', 'is', null)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      (ct || []).forEach((c: any) => classIds.add(c.id));
      (st || []).forEach((s: any) => s.class_id && classIds.add(s.class_id));
      (sp || []).forEach((s: any) => s.class_id && classIds.add(s.class_id));
      if (classIds.size === 0) return [];
      const { data } = await supabase.from('classes').select('id, name').in('id', Array.from(classIds)).order('name');
      return data || [];
    },
    enabled: !!profile?.id,
  });

  // Fetch subjects for this teacher (filtered by selected class via specializations)
  const { data: subjects } = useQuery({
    queryKey: ['teacher-subjects-for-class', teacherRecord?.id, selectedClass],
    queryFn: async () => {
      if (!teacherRecord?.id) return [];
      let query = supabase
        .from('teacher_specializations')
        .select('subject_id')
        .eq('teacher_id', teacherRecord.id)
        .not('subject_id', 'is', null);
      if (selectedClass) {
        query = query.eq('class_id', selectedClass);
      }
      const { data: specs } = await query;
      const ids = Array.from(new Set((specs || []).map((s: any) => s.subject_id).filter(Boolean)));
      if (ids.length === 0) return [];
      const { data } = await supabase.from('subjects').select('id, name, code').eq('is_active', true).in('id', ids).order('name');
      return data || [];
    },
    enabled: !!teacherRecord?.id,
  });

  // Current academic year
  const { data: currentYear } = useQuery({
    queryKey: ['current-academic-year'],
    queryFn: async () => {
      const { data } = await supabase
        .from('academic_years')
        .select('id, name')
        .eq('is_current', true)
        .order('created_at', { ascending: false })
        .limit(1);
      return data?.[0] || null;
    },
  });

  // Grading config
  const { data: gradingConfig } = useQuery({
    queryKey: ['grading-config'],
    queryFn: async () => {
      const { data } = await supabase.from('grading_config').select('*').eq('is_active', true).order('min_marks', { ascending: false });
      return data || [];
    },
  });

  const calculateGrade = useCallback(
    (total: number | null) => {
      if (total === null || !gradingConfig?.length) return { grade: '', gradePoints: null, remark: '' };
      const config = gradingConfig.find(g => total >= g.min_marks && total <= g.max_marks);
      return config
        ? { grade: config.grade, gradePoints: config.grade_points, remark: config.remark || '' }
        : { grade: '', gradePoints: null, remark: '' };
    },
    [gradingConfig]
  );

  const calcTotal = useCallback((a1: string, a2: string, a3: string, exam: string) => {
    const scores = [parseFloat(a1), parseFloat(a2), parseFloat(a3)].filter(n => !isNaN(n));
    if (scores.length === 0) return null;
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const ca20 = (avg / 3) * 20;
    const examVal = parseFloat(exam);
    if (isNaN(examVal)) return null;
    const exam80 = (examVal / 100) * 80;
    return Math.round((ca20 + exam80) * 10) / 10;
  }, []);

  // Load students for a subject card
  const loadStudents = useCallback(
    async (cardId: string, subjectId: string) => {
      if (!selectedClass || !subjectId || !currentYear?.id) return;

      setSubjectCards(prev => prev.map(c => (c.id === cardId ? { ...c, loading: true } : c)));

      try {
        // 1. Get enrolled students
        const { data: enrollments } = await supabase
          .from('student_enrollments')
          .select('student_id')
          .eq('class_id', selectedClass)
          .eq('status', 'active')
          .or(`academic_year_id.eq.${currentYear.id},academic_year_id.is.null`);

        const classStudentIds = (enrollments || []).map(e => e.student_id);
        if (classStudentIds.length === 0) {
          setSubjectCards(prev => prev.map(c => (c.id === cardId ? { ...c, students: [], loading: false } : c)));
          return;
        }

        // 2. Check if core
        const { data: subjectData } = await supabase.from('subjects').select('is_core').eq('id', subjectId).maybeSingle();
        let validIds = classStudentIds;

        if (!subjectData?.is_core) {
          const { data: subEnroll } = await supabase
            .from('student_subject_enrollments')
            .select('student_id')
            .eq('subject_id', subjectId)
            .eq('status', 'active')
            .in('student_id', classStudentIds)
            .or(`academic_year_id.eq.${currentYear.id},academic_year_id.is.null`);
          validIds = (subEnroll || []).map(e => e.student_id);
        }

        if (validIds.length === 0) {
          setSubjectCards(prev => prev.map(c => (c.id === cardId ? { ...c, students: [], loading: false } : c)));
          return;
        }

        // 3. Get student details + profiles
        const { data: studentsData } = await supabase.from('students').select('id, student_id, profile_id').in('id', validIds);
        const profileIds = (studentsData || []).map(s => s.profile_id).filter(Boolean);
        const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name').in('id', profileIds);
        const profileMap = new Map((profiles || []).map(p => [p.id, p]));

        // 4. Get existing submissions
        const { data: submissions } = await supabase
          .from('subject_submissions')
          .select('*')
          .eq('subject_id', subjectId)
          .eq('academic_year_id', currentYear.id)
          .eq('term', selectedTerm)
          .in('student_id', validIds);

        const subMap = new Map((submissions || []).map(s => [s.student_id, s]));

        const rows: StudentRow[] = (studentsData || [])
          .map(s => {
            const p = profileMap.get(s.profile_id);
            const sub = subMap.get(s.id);
            const total = sub?.marks ?? null;
            const gc = calculateGrade(total);
            return {
              studentId: s.id,
              name: `${p?.first_name || ''} ${p?.last_name || ''}`.trim() || 'Unknown',
              admissionNo: s.student_id || '',
              a1: sub?.a1_score?.toString() || '',
              a2: sub?.a2_score?.toString() || '',
              a3: sub?.a3_score?.toString() || '',
              exam: sub?.exam_score?.toString() || '',
              total,
              grade: sub?.grade || gc.grade,
              gradePoints: sub?.grade_points ?? gc.gradePoints,
              remark: sub?.remark || gc.remark,
              identifier: sub?.identifier?.toString() || '2',
              existingId: sub?.id,
              status: sub?.status,
            };
          })
          .sort((a, b) => a.name.localeCompare(b.name));

        setSubjectCards(prev => prev.map(c => (c.id === cardId ? { ...c, students: rows, loading: false, subjectId } : c)));
      } catch (err: any) {
        toast.error('Failed to load students: ' + err.message);
        setSubjectCards(prev => prev.map(c => (c.id === cardId ? { ...c, loading: false } : c)));
      }
    },
    [selectedClass, currentYear?.id, selectedTerm, calculateGrade]
  );

  // Update a student's marks in a card
  const updateStudentMark = useCallback(
    (cardId: string, studentId: string, field: 'a1' | 'a2' | 'a3' | 'exam' | 'identifier', value: string) => {
      setSubjectCards(prev =>
        prev.map(card => {
          if (card.id !== cardId) return card;
          return {
            ...card,
            students: card.students.map(s => {
              if (s.studentId !== studentId) return s;
              const updated = { ...s, [field]: value };
              if (field !== 'identifier') {
                const total = calcTotal(updated.a1, updated.a2, updated.a3, updated.exam);
                const gc = calculateGrade(total);
                updated.total = total;
                updated.grade = gc.grade;
                updated.gradePoints = gc.gradePoints;
                updated.remark = gc.remark;
              }
              return updated;
            }),
          };
        })
      );

      // Auto-save after 2s of inactivity
      const key = `${cardId}-${studentId}`;
      if (autoSaveTimerRef.current[key]) clearTimeout(autoSaveTimerRef.current[key]);
      autoSaveTimerRef.current[key] = setTimeout(() => {
        autoSaveSingleStudent(cardId, studentId);
      }, 2000);
    },
    [calcTotal, calculateGrade]
  );

  // Auto-save a single student draft
  const autoSaveSingleStudent = useCallback(
    async (cardId: string, studentId: string) => {
      const card = subjectCards.find(c => c.id === cardId);
      const student = card?.students.find(s => s.studentId === studentId);
      if (!card || !student || !profile?.id || !currentYear?.id) return;
      if (student.status === 'approved') return;

      const a1 = parseFloat(student.a1) || null;
      const a2 = parseFloat(student.a2) || null;
      const a3 = parseFloat(student.a3) || null;
      const exam = parseFloat(student.exam) || null;
      if (a1 === null && a2 === null && a3 === null && exam === null) return;

      try {
        await supabase.from('subject_submissions').upsert(
          {
            ...(student.existingId ? { id: student.existingId } : {}),
            student_id: studentId,
            subject_id: card.subjectId,
            academic_year_id: currentYear.id,
            term: selectedTerm,
            a1_score: a1,
            a2_score: a2,
            a3_score: a3,
            exam_score: exam,
            marks: student.total,
            grade: student.grade || null,
            grade_points: student.gradePoints,
            remark: student.remark || null,
            identifier: parseInt(student.identifier) || 2,
            teacher_initials: `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase(),
            submitted_by: profile.id,
            status: 'draft',
          },
          { onConflict: 'student_id,subject_id,academic_year_id,term' }
        );
      } catch {
        // silent fail for auto-save
      }
    },
    [subjectCards, profile, currentYear?.id, selectedTerm]
  );

  // Submit all marks
  const submitAll = useMutation({
    mutationFn: async () => {
      if (!profile?.id || !currentYear?.id) throw new Error('Missing data');

      const cardsWithSubject = subjectCards.filter(c => c.subjectId && c.students.length > 0);
      if (cardsWithSubject.length === 0) throw new Error('No subjects with students to submit');

      // Validate
      const errors: string[] = [];
      cardsWithSubject.forEach(card => {
        const subName = subjects?.find(s => s.id === card.subjectId)?.name || 'Unknown';
        card.students.forEach(s => {
          if (s.status === 'approved') return;
          if (!s.a1 && !s.a2 && !s.a3 && !s.exam) {
            errors.push(`${subName}: ${s.name} has no marks entered`);
          }
        });
      });

      if (errors.length > 0 && errors.length === cardsWithSubject.flatMap(c => c.students.filter(s => s.status !== 'approved')).length) {
        throw new Error('No marks entered for any student');
      }

      const initials = `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase();
      const allRecords = cardsWithSubject.flatMap(card =>
        card.students
          .filter(s => s.status !== 'approved' && (s.a1 || s.a2 || s.a3 || s.exam))
          .map(s => ({
            ...(s.existingId ? { id: s.existingId } : {}),
            student_id: s.studentId,
            subject_id: card.subjectId,
            academic_year_id: currentYear!.id,
            term: selectedTerm,
            a1_score: parseFloat(s.a1) || null,
            a2_score: parseFloat(s.a2) || null,
            a3_score: parseFloat(s.a3) || null,
            exam_score: parseFloat(s.exam) || null,
            marks: s.total,
            grade: s.grade || null,
            grade_points: s.gradePoints,
            remark: s.remark || null,
            identifier: parseInt(s.identifier) || 2,
            teacher_initials: initials,
            submitted_by: profile!.id,
            submitted_at: new Date().toISOString(),
            status: 'pending',
          }))
      );

      if (allRecords.length === 0) throw new Error('No marks to submit');

      // Batch upsert in chunks of 50
      for (let i = 0; i < allRecords.length; i += 50) {
        const chunk = allRecords.slice(i, i + 50);
        const { error } = await supabase
          .from('subject_submissions')
          .upsert(chunk, { onConflict: 'student_id,subject_id,academic_year_id,term' });
        if (error) throw error;
      }

      return allRecords.length;
    },
    onSuccess: (count) => {
      toast.success(`${count} mark(s) submitted for approval across all subjects`);
      queryClient.invalidateQueries({ queryKey: ['class-students-marks'] });
      // Reload all cards
      subjectCards.forEach(card => {
        if (card.subjectId) loadStudents(card.id, card.subjectId);
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const addSubjectCard = () => {
    setSubjectCards(prev => [...prev, { id: crypto.randomUUID(), subjectId: '', students: [], loading: false }]);
  };

  const removeSubjectCard = (cardId: string) => {
    if (subjectCards.length <= 1) return;
    setSubjectCards(prev => prev.filter(c => c.id !== cardId));
  };

  const handleSubjectChange = (cardId: string, subjectId: string) => {
    setSubjectCards(prev => prev.map(c => (c.id === cardId ? { ...c, subjectId, students: [] } : c)));
    loadStudents(cardId, subjectId);
  };

  // Reload students when class/term changes
  useEffect(() => {
    if (selectedClass && selectedTerm) {
      subjectCards.forEach(card => {
        if (card.subjectId) loadStudents(card.id, card.subjectId);
      });
    }
  }, [selectedClass, selectedTerm, currentYear?.id]);

  const getSubjectName = (id: string) => {
    const s = subjects?.find(sub => sub.id === id);
    return s ? `${s.code ? s.code + ' – ' : ''}${s.name}` : '';
  };

  const totalCompleted = subjectCards.reduce((acc, card) => {
    return acc + card.students.filter(s => s.a1 || s.a2 || s.a3 || s.exam).length;
  }, 0);
  const totalStudents = subjectCards.reduce((acc, card) => acc + card.students.length, 0);

  // Get already-selected subject IDs to prevent duplicates
  const usedSubjectIds = subjectCards.map(c => c.subjectId).filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/teacher/dashboard')}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Dashboard
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mark Submission Form</h1>
          <p className="text-muted-foreground">Enter marks for multiple subjects at once</p>
        </div>
      </div>

      {/* Top Filters: Class, Term, Academic Year */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Class (Only Your Assigned Classes)</Label>
              <Select
                value={selectedClass}
                onValueChange={v => {
                  setSelectedClass(v);
                  setSubjectCards([{ id: crypto.randomUUID(), subjectId: '', students: [], loading: false }]);
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes?.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Term</Label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Term 1">Term 1</SelectItem>
                  <SelectItem value="Term 2">Term 2</SelectItem>
                  <SelectItem value="Term 3">Term 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Academic Year</Label>
              <Input value={currentYear?.name || 'Not set'} disabled className="bg-muted" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subject Cards */}
      {selectedClass &&
        subjectCards.map((card, idx) => (
          <Card key={card.id} className="relative">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="text-lg">Subject {idx + 1}</CardTitle>
                <div className="flex items-center gap-2">
                  {card.students.length > 0 && (
                    <Badge variant="outline">
                      {card.students.filter(s => s.a1 || s.a2 || s.a3 || s.exam).length}/{card.students.length} entered
                    </Badge>
                  )}
                  {subjectCards.length > 1 && (
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeSubjectCard(card.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Subject (Only Your Assigned Subjects for This Class)</Label>
                  <Select value={card.subjectId} onValueChange={v => handleSubjectChange(card.id, v)}>
                    <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                    <SelectContent>
                      {subjects
                        ?.filter(s => !usedSubjectIds.includes(s.id) || s.id === card.subjectId)
                        .map(s => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.code ? `${s.code} – ` : ''}{s.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Subject Code</Label>
                  <Input
                    value={subjects?.find(s => s.id === card.subjectId)?.code || ''}
                    disabled
                    className="bg-muted"
                    placeholder="Auto-filled"
                  />
                </div>
              </div>

              {/* Students Table */}
              {card.loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : card.subjectId && card.students.length === 0 ? (
                <div className="p-4 border border-dashed rounded-lg text-center text-muted-foreground">
                  <AlertCircle className="h-5 w-5 mx-auto mb-2" />
                  <p>⚠ No students assigned to this subject in this class.</p>
                </div>
              ) : card.subjectId && card.students.length > 0 ? (
                <div className="overflow-x-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[40px]">#</TableHead>
                        <TableHead className="min-w-[160px]">Student Name</TableHead>
                        <TableHead className="min-w-[80px]">A1 (0-3)</TableHead>
                        <TableHead className="min-w-[80px]">A2 (0-3)</TableHead>
                        <TableHead className="min-w-[80px]">A3 (0-3)</TableHead>
                        <TableHead className="min-w-[90px]">Exam (0-100)</TableHead>
                        <TableHead className="min-w-[70px]">Total</TableHead>
                        <TableHead className="min-w-[60px]">Grade</TableHead>
                        <TableHead className="min-w-[60px]">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {card.students.map((s, sIdx) => {
                        const isApproved = s.status === 'approved';
                        const hasMark = !!(s.a1 || s.a2 || s.a3 || s.exam);
                        return (
                          <TableRow key={s.studentId} className={!hasMark ? 'bg-muted/30' : ''}>
                            <TableCell className="font-medium text-muted-foreground">{sIdx + 1}</TableCell>
                            <TableCell className="font-medium">{s.name}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                max="3"
                                step="0.1"
                                value={s.a1}
                                onChange={e => updateStudentMark(card.id, s.studentId, 'a1', e.target.value)}
                                disabled={isApproved}
                                className="h-8 w-20"
                                placeholder="0-3"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                max="3"
                                step="0.1"
                                value={s.a2}
                                onChange={e => updateStudentMark(card.id, s.studentId, 'a2', e.target.value)}
                                disabled={isApproved}
                                className="h-8 w-20"
                                placeholder="0-3"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                max="3"
                                step="0.1"
                                value={s.a3}
                                onChange={e => updateStudentMark(card.id, s.studentId, 'a3', e.target.value)}
                                disabled={isApproved}
                                className="h-8 w-20"
                                placeholder="0-3"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={s.exam}
                                onChange={e => updateStudentMark(card.id, s.studentId, 'exam', e.target.value)}
                                disabled={isApproved}
                                className="h-8 w-24"
                                placeholder="0-100"
                              />
                            </TableCell>
                            <TableCell>
                              <span className="font-semibold">{s.total !== null ? s.total.toFixed(1) : '-'}</span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">{s.grade || '-'}</Badge>
                            </TableCell>
                            <TableCell>
                              {s.status === 'approved' ? (
                                <Badge className="bg-green-600 text-xs"><CheckCircle className="h-3 w-3 mr-1" />Done</Badge>
                              ) : s.status === 'pending' ? (
                                <Badge className="bg-yellow-600 text-xs">Pending</Badge>
                              ) : hasMark ? (
                                <Badge variant="secondary" className="text-xs">Draft</Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}

      {/* Add Subject + Submit All */}
      {selectedClass && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <Button variant="outline" onClick={addSubjectCard}>
            <Plus className="h-4 w-4 mr-2" />
            New Subject
          </Button>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {totalCompleted}/{totalStudents} entries across {subjectCards.filter(c => c.subjectId).length} subject(s)
            </span>
            <Button onClick={() => submitAll.mutate()} disabled={submitAll.isPending || totalCompleted === 0} size="lg">
              <Send className="h-4 w-4 mr-2" />
              {submitAll.isPending ? 'Submitting...' : 'Submit All Marks'}
            </Button>
          </div>
        </div>
      )}

      {/* Grading Key */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Grading Key</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {gradingConfig?.map(gc => (
              <Badge key={gc.id} variant="outline" className="text-xs">
                {gc.grade}: {gc.min_marks}-{gc.max_marks} ({gc.remark})
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MarksSubmission;
