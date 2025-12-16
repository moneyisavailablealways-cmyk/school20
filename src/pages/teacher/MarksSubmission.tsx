import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Save, Send, AlertCircle, CheckCircle } from 'lucide-react';

interface StudentMark {
  studentId: string;
  studentName: string;
  admissionNo: string;
  marks: string;
  grade: string;
  gradePoints: string;
  remark: string;
  existingId?: string;
  status?: string;
}

const MarksSubmission = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('Term 1');
  const [marks, setMarks] = useState<Record<string, StudentMark>>({});
  const [hasChanges, setHasChanges] = useState(false);

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
  const { data: studentsData, isLoading: loadingStudents } = useQuery({
    queryKey: ['class-students-marks', selectedClass, selectedSubject, selectedTerm, currentYear?.id],
    queryFn: async () => {
      if (!selectedClass || !selectedSubject || !currentYear?.id) return null;

      // Fetch enrolled students
      const { data: enrollments, error: enrollError } = await supabase
        .from('student_enrollments')
        .select(`
          student_id,
          students!inner(id, student_id, profile_id, profiles:profile_id(first_name, last_name))
        `)
        .eq('class_id', selectedClass)
        .eq('status', 'active');

      if (enrollError) throw enrollError;

      // Fetch existing submissions
      const studentIds = enrollments?.map(e => e.student_id) || [];
      const { data: submissions, error: subError } = await supabase
        .from('subject_submissions')
        .select('*')
        .eq('subject_id', selectedSubject)
        .eq('academic_year_id', currentYear.id)
        .eq('term', selectedTerm)
        .in('student_id', studentIds);

      if (subError) throw subError;

      // Build marks state
      const initialMarks: Record<string, StudentMark> = {};
      enrollments?.forEach(enrollment => {
        const student = enrollment.students as any;
        const profile = student?.profiles;
        const submission = submissions?.find(s => s.student_id === enrollment.student_id);
        
        initialMarks[enrollment.student_id] = {
          studentId: enrollment.student_id,
          studentName: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Unknown',
          admissionNo: student?.student_id || '',
          marks: submission?.marks?.toString() || '',
          grade: submission?.grade || '',
          gradePoints: submission?.grade_points?.toString() || '',
          remark: submission?.remark || '',
          existingId: submission?.id,
          status: submission?.status,
        };
      });

      setMarks(initialMarks);
      setHasChanges(false);
      return enrollments;
    },
    enabled: !!selectedClass && !!selectedSubject && !!currentYear?.id,
  });

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

  // Update marks for a student
  const updateStudentMark = (studentId: string, field: keyof StudentMark, value: string) => {
    setMarks(prev => {
      const updated = { ...prev };
      updated[studentId] = { ...updated[studentId], [field]: value };
      
      // Auto-calculate grade if marks changed
      if (field === 'marks') {
        const marksNum = parseFloat(value);
        if (!isNaN(marksNum) && marksNum >= 0 && marksNum <= 100) {
          const { grade, gradePoints, remark } = calculateGrade(marksNum);
          updated[studentId].grade = grade;
          updated[studentId].gradePoints = gradePoints;
          if (!updated[studentId].remark) {
            updated[studentId].remark = remark;
          }
        }
      }
      
      return updated;
    });
    setHasChanges(true);
  };

  // Save submissions mutation
  const saveSubmissions = useMutation({
    mutationFn: async (submitForApproval: boolean) => {
      if (!profile?.id || !selectedSubject || !currentYear?.id) {
        throw new Error('Missing required data');
      }

      const submissions = Object.values(marks)
        .filter(m => m.marks !== '')
        .map(m => ({
          id: m.existingId,
          student_id: m.studentId,
          subject_id: selectedSubject,
          academic_year_id: currentYear.id,
          term: selectedTerm,
          marks: parseFloat(m.marks),
          grade: m.grade,
          grade_points: m.gradePoints ? parseFloat(m.gradePoints) : null,
          remark: m.remark,
          teacher_initials: `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`,
          submitted_by: profile.id,
          submitted_at: new Date().toISOString(),
          status: submitForApproval ? 'pending' : 'draft',
        }));

      const { error } = await supabase
        .from('subject_submissions')
        .upsert(submissions, { onConflict: 'student_id,subject_id,academic_year_id,term' });

      if (error) throw error;
    },
    onSuccess: (_, submitForApproval) => {
      toast.success(submitForApproval ? 'Marks submitted for approval' : 'Marks saved as draft');
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['class-students-marks'] });
    },
    onError: (error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

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

  const canEdit = (status?: string) => status !== 'approved';

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
              <Select value={selectedClass} onValueChange={setSelectedClass}>
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
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
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

      {/* Marks Entry Table */}
      {selectedClass && selectedSubject && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Enter Marks</CardTitle>
                <CardDescription>
                  {Object.keys(marks).length} students • Marks auto-calculate grades
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => saveSubmissions.mutate(false)}
                  disabled={!hasChanges || saveSubmissions.isPending}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Draft
                </Button>
                <Button
                  onClick={() => saveSubmissions.mutate(true)}
                  disabled={!hasChanges || saveSubmissions.isPending}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Submit for Approval
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingStudents ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : Object.keys(marks).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No students enrolled in this class
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Admission No</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead className="w-24">Marks</TableHead>
                      <TableHead className="w-20">Grade</TableHead>
                      <TableHead className="w-20">Points</TableHead>
                      <TableHead className="w-48">Remark</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.values(marks).map(student => (
                      <TableRow key={student.studentId}>
                        <TableCell className="font-mono">{student.admissionNo}</TableCell>
                        <TableCell className="font-medium">{student.studentName}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={student.marks}
                            onChange={(e) => updateStudentMark(student.studentId, 'marks', e.target.value)}
                            disabled={!canEdit(student.status)}
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{student.grade || '-'}</Badge>
                        </TableCell>
                        <TableCell>{student.gradePoints || '-'}</TableCell>
                        <TableCell>
                          <Input
                            value={student.remark}
                            onChange={(e) => updateStudentMark(student.studentId, 'remark', e.target.value)}
                            disabled={!canEdit(student.status)}
                            placeholder="Remark"
                          />
                        </TableCell>
                        <TableCell>{getStatusBadge(student.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MarksSubmission;
