import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Send, Plus, X, ArrowLeft, ArrowDownAZ } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MySubmissions from '@/components/teacher/MySubmissions';

interface SubjectMarks {
  id: string;
  subjectId: string;
  a1: string;
  a2: string;
  a3: string;
  avg: number | null;
  score20: number | null;
  score80: number | null;
  score100: number | null;
  grade: string;
  achievementLevel: string;
  identifier: string;
  existingId?: string;
  status?: string;
}

const MarksSubmission = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [sortAsc, setSortAsc] = useState(true);
  const [subjectCards, setSubjectCards] = useState<SubjectMarks[]>([
    { id: crypto.randomUUID(), subjectId: '', a1: '', a2: '', a3: '', avg: null, score20: null, score80: null, score100: null, grade: '', achievementLevel: '', identifier: '1', existingId: undefined, status: undefined },
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

  // Fetch subjects for this teacher filtered by class
  const { data: subjects } = useQuery({
    queryKey: ['teacher-subjects-for-class', teacherRecord?.id, selectedClass],
    queryFn: async () => {
      if (!teacherRecord?.id || !selectedClass) return [];
      const { data: specs } = await supabase
        .from('teacher_specializations')
        .select('subject_id')
        .eq('teacher_id', teacherRecord.id)
        .eq('class_id', selectedClass)
        .not('subject_id', 'is', null);
      const ids = Array.from(new Set((specs || []).map((s: any) => s.subject_id).filter(Boolean)));
      if (ids.length === 0) return [];
      const { data } = await supabase.from('subjects').select('id, name, code').eq('is_active', true).in('id', ids).order('name');
      return data || [];
    },
    enabled: !!teacherRecord?.id && !!selectedClass,
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

  // Fetch students for selected class
  const { data: students } = useQuery({
    queryKey: ['class-students', selectedClass, currentYear?.id],
    queryFn: async () => {
      if (!selectedClass || !currentYear?.id) return [];
      const { data: enrollments } = await supabase
        .from('student_enrollments')
        .select('student_id')
        .eq('class_id', selectedClass)
        .eq('status', 'active')
        .or(`academic_year_id.eq.${currentYear.id},academic_year_id.is.null`);
      const studentIds = (enrollments || []).map(e => e.student_id);
      if (studentIds.length === 0) return [];
      const { data: studentsData } = await supabase.from('students').select('id, student_id, profile_id').in('id', studentIds);
      const profileIds = (studentsData || []).map(s => s.profile_id).filter(Boolean);
      const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name').in('id', profileIds);
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      return (studentsData || []).map(s => {
        const p = profileMap.get(s.profile_id);
        return {
          id: s.id,
          admissionNo: s.student_id || '',
          name: `${p?.first_name || ''} ${p?.last_name || ''}`.trim() || 'Unknown',
        };
      }).sort((a, b) => a.name.localeCompare(b.name));
    },
    enabled: !!selectedClass && !!currentYear?.id,
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

  const recalcCard = useCallback((card: SubjectMarks): SubjectMarks => {
    const scores = [parseFloat(card.a1), parseFloat(card.a2), parseFloat(card.a3)].filter(n => !isNaN(n));
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    const score20 = avg !== null ? Math.round((avg / 3) * 20 * 100) / 100 : null;
    // 80% score is the exam score itself (entered as 0-100, weighted to 80%)
    const examVal = parseFloat(card.a3); // We'll use a dedicated exam field logic below
    // Actually from the image: A1, A2, A3 are assessment scores, then AVG is their average
    // 20% Score = CA component, 80% Score = Exam component, 100% Score = total
    // But the image doesn't show a separate exam field - it shows A1, A2, A3 → AVG → 20% → 80% → 100%
    // Let me re-interpret: the 80% score field is likely manually entered (the exam score)
    // Looking at image more carefully: A1, A2, A3 are decimal scores, AVG auto-calc
    // Then 20% Score and 80% Score are separate input fields (0-100 range)
    // 100% Score = 20% + 80% auto-calculated
    // So the flow is: teacher enters A1, A2, A3 (assessments) + manually enters 20% and 80% scores
    // Actually re-reading: 20% Score has "0-100" placeholder, 80% Score has "0-100" placeholder
    // These look like input fields, not auto-calculated
    // But AVG is auto-calculated from A1+A2+A3
    // 100% Score is auto-calculated from 20% + 80%
    // Grade and Achievement Level are auto-calculated
    
    return { ...card, avg, score20, score80: card.score80, score100: card.score100, grade: card.grade, achievementLevel: card.achievementLevel };
  }, []);

  // Load existing submissions when student changes
  const loadStudentSubmissions = useCallback(async () => {
    if (!selectedStudent || !currentYear?.id || !selectedTerm) return;

    const subjectIdsInCards = subjectCards.map(c => c.subjectId).filter(Boolean);
    if (subjectIdsInCards.length === 0) return;

    const { data: submissions } = await supabase
      .from('subject_submissions')
      .select('*')
      .eq('student_id', selectedStudent)
      .eq('academic_year_id', currentYear.id)
      .eq('term', selectedTerm)
      .in('subject_id', subjectIdsInCards);

    if (!submissions?.length) return;

    const subMap = new Map(submissions.map(s => [s.subject_id, s]));
    setSubjectCards(prev => prev.map(card => {
      const sub = subMap.get(card.subjectId);
      if (!sub) return card;
      const gc = calculateGrade(sub.marks);
      return {
        ...card,
        a1: sub.a1_score?.toString() || '',
        a2: sub.a2_score?.toString() || '',
        a3: sub.a3_score?.toString() || '',
        avg: sub.a1_score != null && sub.a2_score != null && sub.a3_score != null
          ? Math.round(((sub.a1_score + sub.a2_score + sub.a3_score) / 3) * 100) / 100
          : null,
        score20: sub.marks != null ? Math.round(((sub.marks * 0.2)) * 100) / 100 : null,
        score80: sub.exam_score ?? null,
        score100: sub.marks ?? null,
        grade: sub.grade || gc.grade,
        achievementLevel: sub.remark || gc.remark,
        identifier: sub.identifier?.toString() || '1',
        existingId: sub.id,
        status: sub.status,
      };
    }));
  }, [selectedStudent, currentYear?.id, selectedTerm, subjectCards, calculateGrade]);

  useEffect(() => {
    if (selectedStudent && selectedTerm) {
      loadStudentSubmissions();
    }
  }, [selectedStudent, selectedTerm]);

  const updateCardField = useCallback((cardId: string, field: string, value: string) => {
    setSubjectCards(prev => prev.map(card => {
      if (card.id !== cardId) return card;
      const updated = { ...card, [field]: value };

      // Recalculate AVG from A1, A2, A3
      const a1 = parseFloat(field === 'a1' ? value : updated.a1);
      const a2 = parseFloat(field === 'a2' ? value : updated.a2);
      const a3 = parseFloat(field === 'a3' ? value : updated.a3);
      const validScores = [a1, a2, a3].filter(n => !isNaN(n));
      updated.avg = validScores.length > 0 ? Math.round((validScores.reduce((a, b) => a + b, 0) / validScores.length) * 100) / 100 : null;

      // Parse 20% and 80% scores
      const s20 = parseFloat(field === 'score20' ? value : (updated.score20?.toString() || ''));
      const s80 = parseFloat(field === 'score80' ? value : (updated.score80?.toString() || ''));

      if (field === 'score20') updated.score20 = isNaN(s20) ? null : s20;
      if (field === 'score80') updated.score80 = isNaN(s80) ? null : s80;

      // 100% = 20% + 80%
      const final20 = updated.score20 ?? (isNaN(s20) ? null : s20);
      const final80 = updated.score80 ?? (isNaN(s80) ? null : s80);
      if (final20 !== null && final80 !== null) {
        updated.score100 = Math.round((final20 + final80) * 100) / 100;
        const gc = calculateGrade(updated.score100);
        updated.grade = gc.grade;
        updated.achievementLevel = gc.remark;
      } else {
        updated.score100 = null;
        updated.grade = '';
        updated.achievementLevel = '';
      }

      return updated;
    }));

    // Auto-save
    const key = `${cardId}-${selectedStudent}`;
    if (autoSaveTimerRef.current[key]) clearTimeout(autoSaveTimerRef.current[key]);
    autoSaveTimerRef.current[key] = setTimeout(() => {
      autoSaveSingleCard(cardId);
    }, 2000);
  }, [calculateGrade, selectedStudent]);

  const autoSaveSingleCard = useCallback(async (cardId: string) => {
    const card = subjectCards.find(c => c.id === cardId);
    if (!card || !card.subjectId || !selectedStudent || !profile?.id || !currentYear?.id || !selectedTerm) return;
    if (card.status === 'approved') return;

    const a1 = parseFloat(card.a1) || null;
    const a2 = parseFloat(card.a2) || null;
    const a3 = parseFloat(card.a3) || null;
    if (a1 === null && a2 === null && a3 === null && card.score20 === null && card.score80 === null) return;

    const initials = `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase();

    try {
      const record: any = {
        student_id: selectedStudent,
        subject_id: card.subjectId,
        academic_year_id: currentYear.id,
        term: selectedTerm,
        a1_score: a1,
        a2_score: a2,
        a3_score: a3,
        exam_score: card.score80,
        marks: card.score100,
        grade: card.grade || null,
        grade_points: card.score100 !== null ? (calculateGrade(card.score100).gradePoints) : null,
        remark: card.achievementLevel || null,
        identifier: parseInt(card.identifier) || 1,
        teacher_initials: initials,
        submitted_by: profile.id,
        status: 'draft',
      };

      if (card.existingId) {
        await supabase.from('subject_submissions').update(record).eq('id', card.existingId);
      } else {
        const { data } = await supabase.from('subject_submissions').insert(record).select('id').maybeSingle();
        if (data?.id) {
          setSubjectCards(prev => prev.map(c => c.id === card.id ? { ...c, existingId: data.id } : c));
        }
      }
    } catch {
      // silent fail for auto-save
    }
  }, [subjectCards, selectedStudent, profile, currentYear?.id, selectedTerm, calculateGrade]);

  // Submit all marks
  const submitAll = useMutation({
    mutationFn: async () => {
      if (!profile?.id || !currentYear?.id || !selectedStudent || !selectedTerm) throw new Error('Please select class, student, and term');

      const cardsWithSubject = subjectCards.filter(c => c.subjectId);
      if (cardsWithSubject.length === 0) throw new Error('No subjects selected');

      const cardsWithMarks = cardsWithSubject.filter(c =>
        c.status !== 'approved' && (c.a1 || c.a2 || c.a3 || c.score20 !== null || c.score80 !== null)
      );
      if (cardsWithMarks.length === 0) throw new Error('No marks entered for any subject');

      const initials = `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase();
      // Split into updates (existing records) and inserts (new records)
      const updates = cardsWithMarks.filter(c => c.existingId);
      const inserts = cardsWithMarks.filter(c => !c.existingId);

      const buildRecord = (card: typeof cardsWithMarks[0]) => ({
        student_id: selectedStudent,
        subject_id: card.subjectId,
        academic_year_id: currentYear!.id,
        term: selectedTerm,
        a1_score: parseFloat(card.a1) || null,
        a2_score: parseFloat(card.a2) || null,
        a3_score: parseFloat(card.a3) || null,
        exam_score: card.score80,
        marks: card.score100,
        grade: card.grade || null,
        grade_points: card.score100 !== null ? (calculateGrade(card.score100).gradePoints) : null,
        remark: card.achievementLevel || null,
        identifier: parseInt(card.identifier) || 1,
        teacher_initials: initials,
        submitted_by: profile!.id,
        submitted_at: new Date().toISOString(),
        status: 'pending',
      });

      // Update existing records by id, insert new ones via onConflict
      for (const card of updates) {
        const record = { id: card.existingId, ...buildRecord(card) };
        const { error } = await supabase.from('subject_submissions').upsert(record);
        if (error) throw error;
      }

      if (inserts.length > 0) {
        const newRecords = inserts.map(card => buildRecord(card));
        const { error } = await supabase
          .from('subject_submissions')
          .insert(newRecords);
        if (error) throw error;
      }

      return cardsWithMarks.length;
    },
    onSuccess: (count) => {
      toast.success(`${count} subject mark(s) submitted for approval`);
      queryClient.invalidateQueries({ queryKey: ['class-students-marks'] });
      loadStudentSubmissions();
    },
    onError: (error) => toast.error(error.message),
  });

  const addSubjectCard = () => {
    setSubjectCards(prev => [...prev, {
      id: crypto.randomUUID(), subjectId: '', a1: '', a2: '', a3: '',
      avg: null, score20: null, score80: null, score100: null,
      grade: '', achievementLevel: '', identifier: '1',
    }]);
  };

  const removeSubjectCard = (cardId: string) => {
    if (subjectCards.length <= 1) return;
    setSubjectCards(prev => prev.filter(c => c.id !== cardId));
  };

  const handleSubjectChange = (cardId: string, subjectId: string) => {
    setSubjectCards(prev => prev.map(c => c.id === cardId ? {
      ...c, subjectId, a1: '', a2: '', a3: '', avg: null,
      score20: null, score80: null, score100: null, grade: '', achievementLevel: '',
      identifier: '1', existingId: undefined, status: undefined,
    } : c));
    // Load existing data for this student+subject
    if (selectedStudent && currentYear?.id && selectedTerm) {
      setTimeout(async () => {
        const { data: sub } = await supabase
          .from('subject_submissions')
          .select('*')
          .eq('student_id', selectedStudent)
          .eq('subject_id', subjectId)
          .eq('academic_year_id', currentYear!.id)
          .eq('term', selectedTerm)
          .maybeSingle();
        if (sub) {
          const gc = calculateGrade(sub.marks);
          setSubjectCards(prev => prev.map(c => c.id === cardId ? {
            ...c,
            a1: sub.a1_score?.toString() || '',
            a2: sub.a2_score?.toString() || '',
            a3: sub.a3_score?.toString() || '',
            avg: sub.a1_score != null && sub.a2_score != null && sub.a3_score != null
              ? Math.round(((sub.a1_score + sub.a2_score + sub.a3_score) / 3) * 100) / 100
              : null,
            score20: sub.marks != null ? Math.round((sub.marks * 0.2) * 100) / 100 : null,
            score80: sub.exam_score ?? null,
            score100: sub.marks ?? null,
            grade: sub.grade || gc.grade,
            achievementLevel: sub.remark || gc.remark,
            identifier: sub.identifier?.toString() || '1',
            existingId: sub.id,
            status: sub.status,
          } : c));
        }
      }, 100);
    }
  };

  const usedSubjectIds = subjectCards.map(c => c.subjectId).filter(Boolean);
  const teacherInitials = profile ? `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase() : '';

  const filteredStudents = (students || []).filter(s =>
    s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.admissionNo.toLowerCase().includes(studentSearch.toLowerCase())
  ).sort((a, b) => sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));

  return (
    <div className="space-y-6">
      {/* Header */}

      <h1 className="text-2xl font-bold tracking-tight">Mark Submission Form</h1>

      {/* Row 1: Class + Term */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label className="text-xs font-medium">Class (Only Your Assigned Classes)</Label>
          <Select
            value={selectedClass}
            onValueChange={v => {
              setSelectedClass(v);
              setSelectedStudent('');
              setSubjectCards([{
                id: crypto.randomUUID(), subjectId: '', a1: '', a2: '', a3: '',
                avg: null, score20: null, score80: null, score100: null,
                grade: '', achievementLevel: '', identifier: '1',
              }]);
            }}
          >
            <SelectTrigger className="bg-card border-border">
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              {classes?.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium">Term</Label>
          <Select value={selectedTerm} onValueChange={setSelectedTerm}>
            <SelectTrigger className="bg-card border-border">
              <SelectValue placeholder="Select term" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Term 1">Term 1</SelectItem>
              <SelectItem value="Term 2">Term 2</SelectItem>
              <SelectItem value="Term 3">Term 3</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Row 2: Student search + sort + New Subject button */}
      {selectedClass && (
        <>
          <div className="space-y-1">
            <Label className="text-xs font-medium">Student</Label>
            <div className="flex items-center gap-2">
              <Input
                value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
                placeholder="Search student..."
                className="flex-1 bg-card border-border"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortAsc(p => !p)}
                className="shrink-0"
              >
                {sortAsc ? '↑ → Z' : 'Z → ↑'}
              </Button>
              <Button variant="outline" size="sm" onClick={addSubjectCard} className="shrink-0">
                <Plus className="h-4 w-4 mr-1" />
                New Subject
              </Button>
            </div>
          </div>

          {/* Student dropdown */}
          <Select value={selectedStudent} onValueChange={setSelectedStudent}>
            <SelectTrigger className="bg-card border-border">
              <SelectValue placeholder="Select a student" />
            </SelectTrigger>
            <SelectContent>
              {filteredStudents.map(s => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} {s.admissionNo ? `(${s.admissionNo})` : ''}
                </SelectItem>
              ))}
              {filteredStudents.length === 0 && (
                <div className="px-3 py-2 text-sm text-muted-foreground">No students found</div>
              )}
            </SelectContent>
          </Select>
        </>
      )}

      {/* Subject Marks Section */}
      {selectedClass && selectedStudent && selectedTerm && (
        <>
          <h2 className="text-lg font-semibold">Subject Marks</h2>

          {subjectCards.map((card, idx) => {
            const isApproved = card.status === 'approved';
            const subjectObj = subjects?.find(s => s.id === card.subjectId);

            return (
              <Card key={card.id} className="relative border-border">
                <CardContent className="pt-5 pb-5 space-y-4">
                  {/* Card header */}
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">Subject {idx + 1}</h3>
                    {subjectCards.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeSubjectCard(card.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* Subject + Subject Code */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Subject (Only Your Assigned Subjects for This Class)</Label>
                      <Select
                        value={card.subjectId}
                        onValueChange={v => handleSubjectChange(card.id, v)}
                        disabled={isApproved}
                      >
                        <SelectTrigger className="bg-card border-border">
                          <SelectValue placeholder="Select subject" />
                        </SelectTrigger>
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
                    <div className="space-y-1">
                      <Label className="text-xs">Subject Code</Label>
                      <Input
                        value={subjectObj?.code || ''}
                        disabled
                        className="bg-muted border-border"
                        placeholder="Auto-filled"
                      />
                    </div>
                  </div>

                  {card.subjectId && (
                    <>
                      {/* Row: A1, A2, A3, AVG */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">A1 Score (must include decimal)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={card.a1}
                            onChange={e => updateCardField(card.id, 'a1', e.target.value)}
                            disabled={isApproved}
                            placeholder="e.g., 12.5"
                            className="bg-card border-border"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">A2 Score (must include decimal)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={card.a2}
                            onChange={e => updateCardField(card.id, 'a2', e.target.value)}
                            disabled={isApproved}
                            placeholder="e.g., 8.0"
                            className="bg-card border-border"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">A3 Score (must include decimal)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={card.a3}
                            onChange={e => updateCardField(card.id, 'a3', e.target.value)}
                            disabled={isApproved}
                            placeholder="e.g., 0.5"
                            className="bg-card border-border"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">AVG</Label>
                          <Input
                            value={card.avg !== null ? card.avg.toFixed(2) : '0.00'}
                            disabled
                            className="bg-muted border-border font-semibold"
                          />
                        </div>
                      </div>

                      {/* Row: 20% Score, 80% Score, 100% Score, Teacher Initials */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">20% Score</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={card.score20?.toString() || ''}
                            onChange={e => updateCardField(card.id, 'score20', e.target.value)}
                            disabled={isApproved}
                            placeholder="0-100"
                            className="bg-card border-border"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">80% Score</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={card.score80?.toString() || ''}
                            onChange={e => updateCardField(card.id, 'score80', e.target.value)}
                            disabled={isApproved}
                            placeholder="0-100"
                            className="bg-card border-border"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">100% Score</Label>
                          <Input
                            value={card.score100 !== null ? card.score100.toFixed(2) : ''}
                            disabled
                            className="bg-muted border-border font-semibold"
                            placeholder="0-100"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Teacher Initials</Label>
                          <Input
                            value={teacherInitials}
                            disabled
                            className="bg-muted border-border"
                          />
                        </div>
                      </div>

                      {/* Row: Identifier, Grade, Achievement Level */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Identifier</Label>
                          <Select
                            value={card.identifier}
                            onValueChange={v => updateCardField(card.id, 'identifier', v)}
                            disabled={isApproved}
                          >
                            <SelectTrigger className="bg-card border-border">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1 - Basic</SelectItem>
                              <SelectItem value="2">2 - Standard</SelectItem>
                              <SelectItem value="3">3 - Advanced</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Grade (Auto-calculated)</Label>
                          <Input
                            value={card.grade || 'Auto'}
                            disabled
                            className="bg-muted border-border"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Achievement Level (Auto-calculated)</Label>
                          <Input
                            value={card.achievementLevel || 'Auto'}
                            disabled
                            className="bg-muted border-border"
                          />
                        </div>
                      </div>

                      {/* Status badge */}
                      {card.status && (
                        <div className="flex justify-end">
                          <Badge variant={card.status === 'approved' ? 'default' : 'secondary'} className="text-xs">
                            {card.status === 'approved' ? '✓ Approved' : card.status === 'pending' ? '⏳ Pending Approval' : '📝 Draft'}
                          </Badge>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {/* Submit All button */}
          <div className="flex justify-end">
            <Button
              onClick={() => submitAll.mutate()}
              disabled={submitAll.isPending || !subjectCards.some(c => c.subjectId && (c.a1 || c.a2 || c.a3 || c.score20 !== null || c.score80 !== null))}
              size="lg"
            >
              <Send className="h-4 w-4 mr-2" />
              {submitAll.isPending ? 'Submitting...' : 'Submit All Marks'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default MarksSubmission;
