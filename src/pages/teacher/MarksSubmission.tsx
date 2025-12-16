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
import { Save, Send, AlertCircle, CheckCircle, ChevronRight, ChevronLeft, Users } from 'lucide-react';

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
  };
}

const MarksSubmission = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('Term 1');
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  
  // Current student form state
  const [marks, setMarks] = useState<string>('');
  const [grade, setGrade] = useState<string>('');
  const [gradePoints, setGradePoints] = useState<string>('');
  const [remark, setRemark] = useState<string>('');

  // Fetch classes where teacher teaches
  const { data: classes } = useQuery({
    queryKey: ['teacher-classes', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch subjects teacher teaches
  const { data: subjects } = useQuery({
    queryKey: ['teacher-subjects', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('id, name, code')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
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

  // Fetch students and existing submissions
  const { data: students, isLoading: loadingStudents } = useQuery({
    queryKey: ['class-students-marks', selectedClass, selectedSubject, selectedTerm, currentYear?.id],
    queryFn: async () => {
      if (!selectedClass || !selectedSubject || !currentYear?.id) return [];

      // Fetch students enrolled in the class
      const { data: classEnrollments, error: enrollError } = await supabase
        .from('student_enrollments')
        .select(`
          student_id,
          students!inner(id, student_id, profile_id, profiles:profile_id(first_name, last_name))
        `)
        .eq('class_id', selectedClass)
        .eq('status', 'active');

      if (enrollError) throw enrollError;

      const classStudentIds = classEnrollments?.map(e => e.student_id) || [];

      // Fetch students enrolled in the selected subject
      const { data: subjectEnrollments, error: subjectEnrollError } = await supabase
        .from('student_subject_enrollments')
        .select('student_id')
        .eq('subject_id', selectedSubject)
        .eq('status', 'active')
        .in('student_id', classStudentIds);

      if (subjectEnrollError) throw subjectEnrollError;

      // Filter to only students who have both class AND subject enrollment
      const subjectStudentIds = new Set(subjectEnrollments?.map(e => e.student_id) || []);
      const enrollments = classEnrollments?.filter(e => subjectStudentIds.has(e.student_id)) || [];

      // Fetch existing submissions
      const studentIds = enrollments.map(e => e.student_id);
      const { data: submissions, error: subError } = await supabase
        .from('subject_submissions')
        .select('*')
        .eq('subject_id', selectedSubject)
        .eq('academic_year_id', currentYear.id)
        .eq('term', selectedTerm)
        .in('student_id', studentIds);

      if (subError) throw subError;

      // Build students array
      const studentList: StudentData[] = enrollments?.map(enrollment => {
        const student = enrollment.students as any;
        const studentProfile = student?.profiles;
        const submission = submissions?.find(s => s.student_id === enrollment.student_id);
        
        return {
          id: enrollment.student_id,
          studentId: enrollment.student_id,
          name: `${studentProfile?.first_name || ''} ${studentProfile?.last_name || ''}`.trim() || 'Unknown',
          admissionNo: student?.student_id || '',
          existingSubmission: submission ? {
            id: submission.id,
            marks: submission.marks,
            grade: submission.grade,
            grade_points: submission.grade_points,
            remark: submission.remark,
            status: submission.status,
          } : undefined,
        };
      }) || [];

      return studentList;
    },
    enabled: !!selectedClass && !!selectedSubject && !!currentYear?.id,
  });

  // Get current student data
  const currentStudent = students?.find(s => s.id === selectedStudent);

  // Load student data when selected
  useEffect(() => {
    if (currentStudent?.existingSubmission) {
      setMarks(currentStudent.existingSubmission.marks?.toString() || '');
      setGrade(currentStudent.existingSubmission.grade || '');
      setGradePoints(currentStudent.existingSubmission.grade_points?.toString() || '');
      setRemark(currentStudent.existingSubmission.remark || '');
    } else {
      setMarks('');
      setGrade('');
      setGradePoints('');
      setRemark('');
    }
  }, [selectedStudent, currentStudent]);

  // Calculate grade from marks
  const calculateGrade = (marksValue: number) => {
    if (!gradingConfig || isNaN(marksValue)) return { grade: '', gradePoints: '', remark: '' };
    
    const config = gradingConfig.find(
      g => marksValue >= g.min_marks && marksValue <= g.max_marks
    );
    
    return config 
      ? { grade: config.grade, gradePoints: config.grade_points.toString(), remark: config.remark || '' }
      : { grade: '', gradePoints: '', remark: '' };
  };

  // Handle marks change with auto grade calculation
  const handleMarksChange = (value: string) => {
    setMarks(value);
    const marksNum = parseFloat(value);
    if (!isNaN(marksNum) && marksNum >= 0 && marksNum <= 100) {
      const result = calculateGrade(marksNum);
      setGrade(result.grade);
      setGradePoints(result.gradePoints);
      if (!remark) setRemark(result.remark);
    }
  };

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
        marks: parseFloat(marks),
        grade,
        grade_points: gradePoints ? parseFloat(gradePoints) : null,
        remark,
        teacher_initials: `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`,
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
        <p className="text-muted-foreground">Enter student marks for approval</p>
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

              {/* Marks Entry Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Marks (0-100)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={marks}
                    onChange={(e) => handleMarksChange(e.target.value)}
                    disabled={!canEdit}
                    placeholder="Enter marks"
                    className="text-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Grade</Label>
                  <div className="h-10 px-3 py-2 border rounded-md bg-muted flex items-center">
                    <Badge variant="outline" className="text-lg">{grade || '-'}</Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Grade Points</Label>
                  <div className="h-10 px-3 py-2 border rounded-md bg-muted flex items-center">
                    {gradePoints || '-'}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Remark</Label>
                  <Input
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    disabled={!canEdit}
                    placeholder="Optional remark"
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
                    disabled={!marks || !canEdit || saveSubmission.isPending}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save Draft
                  </Button>
                  <Button
                    onClick={() => saveSubmission.mutate(true)}
                    disabled={!marks || !canEdit || saveSubmission.isPending}
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
    </div>
  );
};

export default MarksSubmission;
