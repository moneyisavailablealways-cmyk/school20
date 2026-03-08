import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { FileText, Download, Users } from 'lucide-react';

const ReportGeneration = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedStudent, setSelectedStudent] = useState<string>('all');
  const [classTeacherComment, setClassTeacherComment] = useState('');
  const [headTeacherComment, setHeadTeacherComment] = useState('');
  const [generatingProgress, setGeneratingProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch academic terms
  const { data: terms } = useQuery({
    queryKey: ['academic-terms-generation'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academic_terms')
        .select('id, term_name, term_number, is_current, academic_year_id, academic_years(name)')
        .order('start_date', { ascending: false });
      if (error) throw error;

      // Auto-select the current term
      const currentTerm = data?.find(t => t.is_current);
      if (currentTerm && !selectedTerm) {
        setSelectedTerm(currentTerm.id);
      }

      return data;
    },
  });

  // Fetch classes
  const { data: classes } = useQuery({
    queryKey: ['classes-for-generation'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, level_id, levels(name)')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Derive the academic year ID from the selected term
  const selectedTermData = terms?.find(t => t.id === selectedTerm);
  const selectedAcademicYearId = selectedTermData?.academic_year_id || null;

  // Fetch students based on class filter and the selected term's academic year
  const { data: students } = useQuery({
    queryKey: ['students-for-generation', selectedClass, selectedAcademicYearId],
    queryFn: async () => {
      if (!selectedAcademicYearId) return [];

      // Step 1: Fetch enrollments
      let query = supabase
        .from('student_enrollments')
        .select('student_id, class_id')
        .eq('status', 'active')
        .eq('academic_year_id', selectedAcademicYearId);

      if (selectedClass !== 'all') {
        query = query.eq('class_id', selectedClass);
      }

      const { data: enrollments, error: enrollError } = await query;
      if (enrollError) throw enrollError;
      if (!enrollments || enrollments.length === 0) return [];

      // Step 2: Fetch student records
      const studentIds = [...new Set(enrollments.map(e => e.student_id))];
      const { data: studentRecords, error: studentError } = await supabase
        .from('students')
        .select('id, student_id, profile_id')
        .in('id', studentIds);
      if (studentError) throw studentError;

      // Step 3: Fetch profiles
      const profileIds = studentRecords?.map(s => s.profile_id).filter(Boolean) as string[];
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', profileIds);
      if (profileError) throw profileError;

      // Build lookup maps
      const profileMap = new Map(profiles?.map(p => [p.id, p]));
      const studentMap = new Map(studentRecords?.map(s => [s.id, s]));

      return enrollments.map(enrollment => {
        const student = studentMap.get(enrollment.student_id);
        const prof = student?.profile_id ? profileMap.get(student.profile_id) : null;
        return {
          studentId: enrollment.student_id,
          name: `${prof?.first_name || ''} ${prof?.last_name || ''}`.trim() || 'Unknown',
          admissionNo: student?.student_id || '',
        };
      }).sort((a, b) => a.name.localeCompare(b.name));
    },
    enabled: !!selectedAcademicYearId,
  });

  const termLabel = selectedTermData
    ? `${selectedTermData.term_name} ${(selectedTermData.academic_years as any)?.name || ''}`
    : '';

  const eligibleStudentCount = selectedStudent !== 'all' ? 1 : (students?.length || 0);

  // Generate reports mutation
  const generateReports = useMutation({
    mutationFn: async (studentIds: string[]) => {
      if (!selectedTerm) {
        throw new Error('Please select a term');
      }

      setIsGenerating(true);
      setGeneratingProgress(0);

      const termData = terms?.find(t => t.id === selectedTerm);
      const termName = termData?.term_name || 'Term 1';

      for (let i = 0; i < studentIds.length; i++) {
        const studentId = studentIds[i];

        const { error } = await supabase.functions.invoke('generate-report-pdf', {
          body: {
            studentId,
            academicYearId: selectedAcademicYearId,
            term: termName,
            generatedBy: profile?.id,
            classTeacherComment: classTeacherComment || undefined,
            headTeacherComment: headTeacherComment || undefined,
          },
        });

        if (error) {
          console.error(`Failed to generate report for ${studentId}:`, error);
          toast.error(`Failed to generate report for a student`);
        }

        setGeneratingProgress(Math.round(((i + 1) / studentIds.length) * 100));
      }

      setIsGenerating(false);
    },
    onSuccess: () => {
      toast.success('Reports generated successfully');
      queryClient.invalidateQueries({ queryKey: ['students-for-generation'] });
    },
    onError: (error) => {
      setIsGenerating(false);
      toast.error(`Failed: ${error.message}`);
    },
  });

  const handleGenerateSingle = () => {
    if (selectedStudent === 'all') {
      toast.error('Please select a specific student for individual report generation.');
      return;
    }
    generateReports.mutate([selectedStudent]);
  };

  const handleGenerateBulk = () => {
    const ids = selectedStudent !== 'all'
      ? [selectedStudent]
      : students?.map(s => s.studentId) || [];
    if (ids.length === 0) {
      toast.error('No students found for the selected filters.');
      return;
    }
    generateReports.mutate(ids);
  };

  return (
    <div className="space-y-6">
      {/* Generation Progress */}
      {isGenerating && (
        <div className="p-4 bg-muted rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Generating Reports...</span>
            <span className="text-sm">{generatingProgress}%</span>
          </div>
          <Progress value={generatingProgress} />
        </div>
      )}

      {/* Row 1: Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className="font-semibold">Select Term <span className="text-destructive">*</span></Label>
          <Select value={selectedTerm} onValueChange={setSelectedTerm}>
            <SelectTrigger>
              <SelectValue placeholder="Select term" />
            </SelectTrigger>
            <SelectContent>
              {terms?.map(term => (
                <SelectItem key={term.id} value={term.id}>
                  {term.term_name} {(term.academic_years as any)?.name || ''} {term.is_current ? '(Active)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="font-semibold">Filter by Class (Optional)</Label>
          <Select value={selectedClass} onValueChange={(v) => { setSelectedClass(v); setSelectedStudent('all'); }}>
            <SelectTrigger>
              <SelectValue placeholder="All Classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classes?.map(cls => (
                <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="font-semibold">Individual Student (Optional)</Label>
          <Select value={selectedStudent} onValueChange={setSelectedStudent}>
            <SelectTrigger>
              <SelectValue placeholder="Select student" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Students</SelectItem>
              {students?.map(s => (
                <SelectItem key={s.studentId} value={s.studentId}>
                  {s.name} ({s.admissionNo})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Row 2: Comment Overrides */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="font-semibold">Class Teacher's Comment (Optional Override)</Label>
          <Textarea
            value={classTeacherComment}
            onChange={(e) => setClassTeacherComment(e.target.value)}
            placeholder="Comments will be auto-filled from templates based on student averages. Enter here only to override..."
            rows={3}
          />
          <p className="text-xs text-destructive">Leave empty to use automatic comments from Comment Templates</p>
        </div>

        <div className="space-y-2">
          <Label className="font-semibold">Headteacher's Comment (Optional Override)</Label>
          <Textarea
            value={headTeacherComment}
            onChange={(e) => setHeadTeacherComment(e.target.value)}
            placeholder="Comments will be auto-filled from templates based on student averages. Enter here only to override..."
            rows={3}
          />
          <p className="text-xs text-destructive">Leave empty to use automatic comments from Comment Templates</p>
        </div>
      </div>

      {/* Row 3: Generate Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-2">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start gap-3">
              <FileText className="h-8 w-8 text-muted-foreground mt-0.5" />
              <div>
                <h3 className="text-xl font-bold">Individual Report</h3>
                <p className="text-sm text-muted-foreground">Generate a report card for a single student</p>
              </div>
            </div>
            <Button
              className="w-full"
              size="lg"
              onClick={handleGenerateSingle}
              disabled={isGenerating || !selectedTerm || selectedStudent === 'all'}
            >
              <Download className="mr-2 h-4 w-4" />
              Generate Single Report
            </Button>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start gap-3">
              <Users className="h-8 w-8 text-muted-foreground mt-0.5" />
              <div>
                <h3 className="text-xl font-bold">Bulk Reports</h3>
                <p className="text-sm text-muted-foreground">
                  Generate report cards for {eligibleStudentCount} student(s)
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              size="lg"
              onClick={handleGenerateBulk}
              disabled={isGenerating || !selectedTerm || eligibleStudentCount === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Generate {eligibleStudentCount} Reports
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReportGeneration;
