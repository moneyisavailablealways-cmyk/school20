import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Save, Send, AlertCircle, CheckCircle, ChevronRight, ChevronLeft, Users, Calculator } from 'lucide-react';

interface StudentData {
  id: string;
  studentId: string;
  name: string;
  admissionNo: string;
  existingSubmission?: {
    id: string;
    marks: number | null;
    grade: string | null;
    grade_points: number | null;
    remark: string | null;
    status: string;
    a1_score: number | null;
    a2_score: number | null;
    a3_score: number | null;
    exam_score: number | null;
    identifier: number | null;
  };
}

const MarksSubmission = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('Term 1');
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  
  // Assessment scores (A1, A2, A3 are out of 3.0)
  const [a1Score, setA1Score] = useState<string>('');
  const [a2Score, setA2Score] = useState<string>('');
  const [a3Score, setA3Score] = useState<string>('');
  const [examScore, setExamScore] = useState<string>(''); // Out of 100
  const [identifier, setIdentifier] = useState<string>('2');
  
  // Calculated values
  const [avgScore, setAvgScore] = useState<number | null>(null);
  const [ca20, setCa20] = useState<number | null>(null);
  const [exam80, setExam80] = useState<number | null>(null);
  const [total100, setTotal100] = useState<number | null>(null);
  const [grade, setGrade] = useState<string>('');
  const [gradePoints, setGradePoints] = useState<string>('');
  const [remark, setRemark] = useState<string>('');

  // Fetch teacher record (used for specializations)
  const { data: teacherRecord } = useQuery({
    queryKey: ['teacher-record', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;
      const { data, error } = await supabase
        .from('teachers')
        .select('id')
        .eq('profile_id', profile.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  // Fetch classes assigned to this teacher (class teacher, section teacher, or specialization)
  const { data: classes } = useQuery({
    queryKey: ['teacher-classes', profile?.id, teacherRecord?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      const classIds = new Set<string>();

      const [{ data: classTeacherClasses }, { data: sectionTeacherStreams }, { data: specializations }] = await Promise.all([
        supabase.from('classes').select('id, name').eq('class_teacher_id', profile.id),
        supabase.from('streams').select('class_id').eq('section_teacher_id', profile.id),
        teacherRecord?.id
          ? supabase
              .from('teacher_specializations')
              .select('class_id')
              .eq('teacher_id', teacherRecord.id)
              .not('class_id', 'is', null)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      (classTeacherClasses || []).forEach((c: any) => classIds.add(c.id));
      (sectionTeacherStreams || []).forEach((s: any) => s.class_id && classIds.add(s.class_id));
      (specializations || []).forEach((sp: any) => sp.class_id && classIds.add(sp.class_id));

      if (classIds.size === 0) return [];

      const { data: classDetails, error } = await supabase
        .from('classes')
        .select('id, name')
        .in('id', Array.from(classIds))
        .order('name');

      if (error) throw error;
      return classDetails || [];
    },
    enabled: !!profile?.id,
  });

  // Fetch subjects assigned to this teacher (from specializations)
  const { data: subjects } = useQuery({
    queryKey: ['teacher-subjects', teacherRecord?.id],
    queryFn: async () => {
      if (!teacherRecord?.id) return [];

      const { data: specializations, error: specError } = await supabase
        .from('teacher_specializations')
        .select('subject_id')
        .eq('teacher_id', teacherRecord.id)
        .not('subject_id', 'is', null);

      if (specError) throw specError;

      const subjectIds = Array.from(new Set((specializations || []).map((s: any) => s.subject_id).filter(Boolean)));
      if (subjectIds.length === 0) return [];

      const { data, error } = await supabase
        .from('subjects')
        .select('id, name, code')
        .eq('is_active', true)
        .in('id', subjectIds)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!teacherRecord?.id,
  });
  // Fetch current academic year
  const { data: currentYear } = useQuery({
    queryKey: ['current-academic-year'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academic_years')
        .select('id, name')
        .eq('is_current', true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch grading config
  const { data: gradingConfig } = useQuery({
    queryKey: ['grading-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('grading_config')
        .select('*')
        .eq('is_active', true)
        .order('min_marks', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch students and existing submissions using sequential pattern to avoid RLS join issues
  const { data: students, isLoading: loadingStudents } = useQuery({
    queryKey: ['class-students-marks', selectedClass, selectedSubject, selectedTerm, currentYear?.id],
    queryFn: async () => {
      if (!selectedClass || !selectedSubject || !currentYear?.id) return [];

      // Step 1: Fetch student IDs enrolled in the class
      // NOTE: Some existing data may have academic_year_id = NULL; include both to avoid empty dropdowns.
      const { data: classEnrollments, error: enrollError } = await supabase
        .from('student_enrollments')
        .select('student_id')
        .eq('class_id', selectedClass)
        .eq('status', 'active')
        .or(`academic_year_id.eq.${currentYear.id},academic_year_id.is.null`);

      if (enrollError) throw enrollError;
      if (!classEnrollments || classEnrollments.length === 0) return [];

      const classStudentIds = classEnrollments.map((e) => e.student_id);

      // Step 2: Fetch students enrolled in the selected subject (filter by class students)
      // NOTE: Include academic_year_id NULL rows as well for legacy/older data.
      const { data: subjectEnrollments, error: subjectEnrollError } = await supabase
        .from('student_subject_enrollments')
        .select('student_id')
        .eq('subject_id', selectedSubject)
        .eq('status', 'active')
        .in('student_id', classStudentIds)
        .or(`academic_year_id.eq.${currentYear.id},academic_year_id.is.null`);

      if (subjectEnrollError) throw subjectEnrollError;
      if (!subjectEnrollments || subjectEnrollments.length === 0) return [];

      // Get student IDs that have BOTH class AND subject enrollment
      const validStudentIds = subjectEnrollments.map(e => e.student_id);

      // Step 3: Fetch student details separately
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, student_id, profile_id')
        .in('id', validStudentIds);

      if (studentsError) throw studentsError;
      if (!studentsData || studentsData.length === 0) return [];

      // Step 4: Fetch profiles separately
      const profileIds = studentsData.map(s => s.profile_id).filter(Boolean);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', profileIds);

      if (profilesError) throw profilesError;

      // Create profile lookup map
      const profileMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      // Step 5: Fetch existing submissions
      const { data: submissions, error: subError } = await supabase
        .from('subject_submissions')
        .select('*')
        .eq('subject_id', selectedSubject)
        .eq('academic_year_id', currentYear.id)
        .eq('term', selectedTerm)
        .in('student_id', validStudentIds);

      if (subError) throw subError;

      // Build students array
      const studentList: StudentData[] = studentsData.map(student => {
        const profile = profileMap.get(student.profile_id);
        const submission = submissions?.find(s => s.student_id === student.id);
        
        return {
          id: student.id,
          studentId: student.id,
          name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Unknown',
          admissionNo: student.student_id || '',
          existingSubmission: submission ? {
            id: submission.id,
            marks: submission.marks,
            grade: submission.grade,
            grade_points: submission.grade_points,
            remark: submission.remark,
            status: submission.status,
            a1_score: submission.a1_score,
            a2_score: submission.a2_score,
            a3_score: submission.a3_score,
            exam_score: submission.exam_score,
            identifier: submission.identifier,
          } : undefined,
        };
      });

      return studentList;
    },
    enabled: !!selectedClass && !!selectedSubject && !!currentYear?.id,
  });

  // Get current student data
  const currentStudent = students?.find(s => s.id === selectedStudent);

  // Load student data when selected
  useEffect(() => {
    if (currentStudent?.existingSubmission) {
      const sub = currentStudent.existingSubmission;
      setA1Score(sub.a1_score?.toString() || '');
      setA2Score(sub.a2_score?.toString() || '');
      setA3Score(sub.a3_score?.toString() || '');
      setExamScore(sub.exam_score?.toString() || '');
      setIdentifier(sub.identifier?.toString() || '2');
      setGrade(sub.grade || '');
      setGradePoints(sub.grade_points?.toString() || '');
      setRemark(sub.remark || '');
    } else {
      setA1Score('');
      setA2Score('');
      setA3Score('');
      setExamScore('');
      setIdentifier('2');
      setGrade('');
      setGradePoints('');
      setRemark('');
    }
  }, [selectedStudent, currentStudent]);

  // Calculate derived values when scores change
  useEffect(() => {
    const a1 = parseFloat(a1Score) || null;
    const a2 = parseFloat(a2Score) || null;
    const a3 = parseFloat(a3Score) || null;
    const exam = parseFloat(examScore) || null;

    // Calculate average of available assessment scores
    const validScores = [a1, a2, a3].filter(s => s !== null) as number[];
    const avg = validScores.length > 0 ? validScores.reduce((a, b) => a + b, 0) / validScores.length : null;
    setAvgScore(avg !== null ? Math.round(avg * 10) / 10 : null);

    // Calculate 20% from CA (avg is out of 3, so avg/3 * 20)
    const caScore = avg !== null ? (avg / 3) * 20 : null;
    setCa20(caScore !== null ? Math.round(caScore * 10) / 10 : null);

    // Calculate 80% from exam
    const examContribution = exam !== null ? (exam / 100) * 80 : null;
    setExam80(examContribution !== null ? Math.round(examContribution * 10) / 10 : null);

    // Calculate total
    const total = (caScore !== null && examContribution !== null) ? caScore + examContribution : null;
    setTotal100(total !== null ? Math.round(total * 10) / 10 : null);

    // Determine grade
    if (total !== null && gradingConfig) {
      const config = gradingConfig.find(g => total >= g.min_marks && total <= g.max_marks);
      if (config) {
        setGrade(config.grade);
        setGradePoints(config.grade_points.toString());
        if (!remark) setRemark(config.remark || '');
      }
    }
  }, [a1Score, a2Score, a3Score, examScore, gradingConfig, remark]);

  // Save submission mutation
  const saveSubmission = useMutation({
    mutationFn: async (submitForApproval: boolean) => {
      if (!profile?.id || !selectedSubject || !currentYear?.id || !selectedStudent) {
        throw new Error('Missing required data');
      }

      const submission = {
        id: currentStudent?.existingSubmission?.id,
        student_id: selectedStudent,
        subject_id: selectedSubject,
        academic_year_id: currentYear.id,
        term: selectedTerm,
        a1_score: a1Score ? parseFloat(a1Score) : null,
        a2_score: a2Score ? parseFloat(a2Score) : null,
        a3_score: a3Score ? parseFloat(a3Score) : null,
        exam_score: examScore ? parseFloat(examScore) : null,
        marks: total100,
        grade,
        grade_points: gradePoints ? parseFloat(gradePoints) : null,
        remark,
        identifier: parseInt(identifier) || 2,
        teacher_initials: `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase(),
        submitted_by: profile.id,
        submitted_at: new Date().toISOString(),
        status: submitForApproval ? 'pending' : 'draft',
      };

      const { error } = await supabase
        .from('subject_submissions')
        .upsert(submission, { onConflict: 'student_id,subject_id,academic_year_id,term' });

      if (error) throw error;
      return submitForApproval;
    },
    onSuccess: (submitForApproval) => {
      toast.success(submitForApproval ? 'Marks submitted for approval' : 'Marks saved as draft');
      queryClient.invalidateQueries({ queryKey: ['class-students-marks'] });
      
      // Auto-navigate to next student after submit
      if (submitForApproval) {
        setTimeout(() => navigateStudent('next'), 500);
      }
    },
    onError: (error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

  // Navigate to next/previous student
  const navigateStudent = (direction: 'next' | 'prev') => {
    if (!students || students.length === 0) return;
    const currentIndex = students.findIndex(s => s.id === selectedStudent);
    let newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (newIndex >= students.length) newIndex = 0;
    if (newIndex < 0) newIndex = students.length - 1;
    setSelectedStudent(students[newIndex].id);
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500">Pending</Badge>;
      default:
        return <Badge variant="outline">Draft</Badge>;
    }
  };

  const canEdit = currentStudent?.existingSubmission?.status !== 'approved';
  const currentIndex = students?.findIndex(s => s.id === selectedStudent) ?? -1;
  const completedCount = students?.filter(s => s.existingSubmission).length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Submit Marks</h1>
        <p className="text-muted-foreground">Enter student assessment and exam scores</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Select Class & Subject</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Class</Label>
              <Select value={selectedClass} onValueChange={(v) => { setSelectedClass(v); setSelectedStudent(''); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes?.map(cls => (
                    <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={selectedSubject} onValueChange={(v) => { setSelectedSubject(v); setSelectedStudent(''); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects?.map(sub => (
                    <SelectItem key={sub.id} value={sub.id}>
                      {sub.code ? `${sub.code} - ` : ''}{sub.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Term</Label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Term 1">Term 1</SelectItem>
                  <SelectItem value="Term 2">Term 2</SelectItem>
                  <SelectItem value="Term 3">Term 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Academic Year</Label>
              <Input value={currentYear?.name || 'Not set'} disabled />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Student Selection & Marks Entry */}
      {selectedClass && selectedSubject && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Select Student
                </CardTitle>
                <CardDescription>
                  {completedCount}/{students?.length || 0} students completed
                </CardDescription>
              </div>
              <div className="w-full md:w-72">
                <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a student" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingStudents ? (
                      <div className="p-2"><Skeleton className="h-8 w-full" /></div>
                    ) : students?.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">No students enrolled</div>
                    ) : (
                      students?.map(student => (
                        <SelectItem key={student.id} value={student.id}>
                          <div className="flex items-center gap-2">
                            <span>{student.admissionNo} - {student.name}</span>
                            {student.existingSubmission && (
                              <CheckCircle className="h-3 w-3 text-green-500" />
                            )}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          
          {selectedStudent && currentStudent && (
            <CardContent className="space-y-6">
              {/* Student Info Header */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-semibold text-lg">{currentStudent.name}</p>
                  <p className="text-sm text-muted-foreground">Admission No: {currentStudent.admissionNo}</p>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(currentStudent.existingSubmission?.status)}
                  <span className="text-sm text-muted-foreground">
                    ({currentIndex + 1} of {students?.length})
                  </span>
                </div>
              </div>

              {/* Assessment Scores */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Assessment Scores (A1, A2, A3 out of 3.0)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                  <div className="space-y-2">
                    <Label>A1</Label>
                    <Input
                      type="number"
                      min="0"
                      max="3"
                      step="0.1"
                      value={a1Score}
                      onChange={(e) => setA1Score(e.target.value)}
                      disabled={!canEdit}
                      placeholder="0-3"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>A2</Label>
                    <Input
                      type="number"
                      min="0"
                      max="3"
                      step="0.1"
                      value={a2Score}
                      onChange={(e) => setA2Score(e.target.value)}
                      disabled={!canEdit}
                      placeholder="0-3"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>A3</Label>
                    <Input
                      type="number"
                      min="0"
                      max="3"
                      step="0.1"
                      value={a3Score}
                      onChange={(e) => setA3Score(e.target.value)}
                      disabled={!canEdit}
                      placeholder="0-3"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>AVG</Label>
                    <div className="h-10 px-3 py-2 border rounded-md bg-muted flex items-center font-medium">
                      {avgScore !== null ? avgScore.toFixed(1) : '-'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>20% (CA)</Label>
                    <div className="h-10 px-3 py-2 border rounded-md bg-muted flex items-center font-medium">
                      {ca20 !== null ? ca20.toFixed(1) : '-'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Exam (0-100)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={examScore}
                      onChange={(e) => setExamScore(e.target.value)}
                      disabled={!canEdit}
                      placeholder="0-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>80% (Exam)</Label>
                    <div className="h-10 px-3 py-2 border rounded-md bg-muted flex items-center font-medium">
                      {exam80 !== null ? exam80.toFixed(1) : '-'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Calculated Results */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Total (100%)</Label>
                  <p className="text-2xl font-bold">{total100 !== null ? total100.toFixed(1) : '-'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Grade</Label>
                  <Badge variant="outline" className="text-xl px-3 py-1">{grade || '-'}</Badge>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Identifier</Label>
                  <Select value={identifier} onValueChange={setIdentifier} disabled={!canEdit}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs text-muted-foreground">Remark</Label>
                  <Input
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    disabled={!canEdit}
                    placeholder="e.g., Satisfactory, Outstanding..."
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between flex-wrap gap-4 pt-4 border-t">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => navigateStudent('prev')}
                    disabled={!students || students.length <= 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigateStudent('next')}
                    disabled={!students || students.length <= 1}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => saveSubmission.mutate(false)}
                    disabled={!canEdit || saveSubmission.isPending}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save Draft
                  </Button>
                  <Button
                    onClick={() => saveSubmission.mutate(true)}
                    disabled={total100 === null || !canEdit || saveSubmission.isPending}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Submit & Next
                  </Button>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Grading Key */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Grading Key & Identifier Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-muted-foreground mb-2">Grade Boundaries</p>
              <div className="flex flex-wrap gap-2">
                {gradingConfig?.map(gc => (
                  <Badge key={gc.id} variant="outline" className="text-xs">
                    {gc.grade}: {gc.min_marks}-{gc.max_marks}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Identifier Legend</p>
              <div className="space-y-1 text-xs">
                <p><strong>1 - Basic:</strong> 0.9-1.49 - Few LOs achieved</p>
                <p><strong>2 - Moderate:</strong> 1.5-2.49 - Many LOs achieved</p>
                <p><strong>3 - Outstanding:</strong> 2.5-3.0 - Most/all LOs achieved</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MarksSubmission;