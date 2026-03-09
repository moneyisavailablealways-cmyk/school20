import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { FileText, Download, Eye, Printer, Package, RefreshCw, CheckCircle, AlertCircle, Share2, Pencil, Trash2, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import ReportCardPreviewDialog from './ReportCardPreviewDialog';

const ReportGeneration = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedTerm, setSelectedTerm] = useState<string>('Term 1');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [generatingProgress, setGeneratingProgress] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedStream, setSelectedStream] = useState<string>('all');
  const [classTeacherComment, setClassTeacherComment] = useState('');
  const [headTeacherComment, setHeadTeacherComment] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewStudentName, setPreviewStudentName] = useState('');
  const [loadingPreviewId, setLoadingPreviewId] = useState<string | null>(null);

  // Fetch classes with streams
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

  // Fetch streams
  const { data: streams } = useQuery({
    queryKey: ['streams-for-generation'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('streams')
        .select('id, name, class_id')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: academicYears } = useQuery({
    queryKey: ['academic-years-for-generation'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academic_years')
        .select('id, name, is_current')
        .order('is_current', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const currentYear = academicYears?.[0] || null;

  // Fetch students with their submission readiness (supports primary BOT/MOT/EOT)
  const { data: studentsData, isLoading } = useQuery({
    queryKey: ['students-for-generation', selectedClass, selectedStream, selectedTerm, currentYear?.id],
    queryFn: async () => {
      if (!currentYear?.id) return [];

      // Check all term variants: "Term 1", "Term 1 BOT", "Term 1 MOT"
      const termVariants = [selectedTerm, `${selectedTerm} BOT`, `${selectedTerm} MOT`];

      // Find academic year with approved submissions for any of these terms
      const { data: submissionYears } = await supabase
        .from('subject_submissions')
        .select('academic_year_id')
        .in('term', termVariants)
        .eq('status', 'approved')
        .limit(1);

      const targetAcademicYearId = submissionYears?.[0]?.academic_year_id || currentYear.id;

      let query = supabase
        .from('student_enrollments')
        .select(`
          student_id,
          class_id,
          stream_id,
          academic_year_id,
          classes(name, level_id, levels(name)),
          streams(name),
          students!inner(
            id,
            student_id,
            profile_id,
            profiles:profile_id(first_name, last_name)
          )
        `)
        .eq('status', 'active');

      if (selectedClass !== 'all') query = query.eq('class_id', selectedClass);
      if (selectedStream !== 'all') query = query.eq('stream_id', selectedStream);

      const { data: enrollments, error: enrollError } = await query;
      if (enrollError) throw enrollError;

      const filteredEnrollments = enrollments?.filter(e =>
        !e.academic_year_id || e.academic_year_id === targetAcademicYearId || e.academic_year_id === currentYear.id
      ) || [];

      const studentIds = filteredEnrollments.map(e => e.student_id);
      if (studentIds.length === 0) return [];

      // Get all submissions for these students across all term variants
      const { data: submissions } = await supabase
        .from('subject_submissions')
        .select('student_id, subject_id, status, term')
        .eq('academic_year_id', targetAcademicYearId)
        .in('term', termVariants)
        .in('student_id', studentIds);

      // Get existing generated reports
      const { data: reports } = await supabase
        .from('generated_reports')
        .select('student_id, status, verification_code, generated_at, file_url')
        .eq('academic_year_id', targetAcademicYearId)
        .eq('term', selectedTerm)
        .in('student_id', studentIds);

      return filteredEnrollments.map(enrollment => {
        const student = enrollment.students as any;
        const classInfo = enrollment.classes as any;
        const streamInfo = enrollment.streams as any;
        const studentSubmissions = submissions?.filter(s => s.student_id === enrollment.student_id) || [];
        const approvedCount = studentSubmissions.filter(s => s.status === 'approved').length;
        const pendingCount = studentSubmissions.filter(s => s.status === 'pending').length;
        const totalSubmissions = studentSubmissions.length;
        const existingReport = reports?.find(r => r.student_id === enrollment.student_id);

        return {
          studentId: enrollment.student_id,
          admissionNo: student?.student_id || '',
          name: `${student?.profiles?.first_name || ''} ${student?.profiles?.last_name || ''}`.trim(),
          className: classInfo?.name || '',
          streamName: streamInfo?.name || '',
          levelName: classInfo?.levels?.name || '',
          approvedSubjects: approvedCount,
          pendingSubjects: pendingCount,
          totalSubjects: totalSubmissions,
          isReady: approvedCount >= 1,
          reportStatus: existingReport?.status || null,
          reportCode: existingReport?.verification_code || null,
          reportDate: existingReport?.generated_at || null,
          reportUrl: (existingReport as any)?.file_url || null,
        };
      });
    },
    enabled: !!currentYear?.id,
  });

  // Generate reports mutation
  const generateReports = useMutation({
    mutationFn: async (studentIds: string[]) => {
      setIsGenerating(true);
      setGeneratingProgress(0);

      const submissionYears = await supabase
        .from('subject_submissions')
        .select('academic_year_id')
        .eq('term', selectedTerm)
        .eq('status', 'approved')
        .limit(1);

      const targetAcademicYearId = submissionYears?.data?.[0]?.academic_year_id || currentYear?.id;

      for (let i = 0; i < studentIds.length; i++) {
        const studentId = studentIds[i];
        const { data, error } = await supabase.functions.invoke('generate-report-pdf', {
          body: {
            studentId,
            academicYearId: targetAcademicYearId,
            term: selectedTerm,
            generatedBy: profile?.id,
            classTeacherComment: classTeacherComment || undefined,
            headTeacherComment: headTeacherComment || undefined,
          },
        });

        if (error || !data?.success) {
          console.error(`Failed to generate report for ${studentId}:`, error || data?.error);
          toast.error(`Failed to generate report for a student`);
        }

        setGeneratingProgress(Math.round(((i + 1) / studentIds.length) * 100));
      }

      setIsGenerating(false);
    },
    onSuccess: () => {
      toast.success('Reports generated successfully');
      setSelectedStudents([]);
      queryClient.invalidateQueries({ queryKey: ['students-for-generation'] });
      queryClient.invalidateQueries({ queryKey: ['generated-report-cards'] });
    },
    onError: (error) => {
      setIsGenerating(false);
      toast.error(`Failed to generate reports: ${error.message}`);
    },
  });

  const toggleStudent = (studentId: string) => {
    setSelectedStudents(prev =>
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  const selectAllReady = () => {
    const readyIds = studentsData?.filter(s => s.isReady).map(s => s.studentId) || [];
    setSelectedStudents(readyIds);
  };

  // Fetch report data and open preview
  const openPreview = async (student: any) => {
    setLoadingPreviewId(student.studentId);
    try {
      const submissionYears = await supabase
        .from('subject_submissions')
        .select('academic_year_id')
        .eq('term', selectedTerm)
        .eq('status', 'approved')
        .limit(1);
      const targetAcademicYearId = submissionYears?.data?.[0]?.academic_year_id || currentYear?.id;

      // Try to get existing report_data first
      const { data: existing } = await supabase
        .from('generated_reports')
        .select('report_data')
        .eq('student_id', student.studentId)
        .eq('term', selectedTerm)
        .maybeSingle();

      if (existing?.report_data) {
        setPreviewData(existing.report_data);
        setPreviewStudentName(student.name);
        setPreviewOpen(true);
      } else {
        // Regenerate
        const { data, error } = await supabase.functions.invoke('generate-report-pdf', {
          body: {
            studentId: student.studentId,
            academicYearId: targetAcademicYearId,
            term: selectedTerm,
            generatedBy: profile?.id,
          },
        });
        if (error || !data?.success) throw new Error(data?.error || 'Failed to generate');
        setPreviewData(data.reportData);
        setPreviewStudentName(student.name);
        setPreviewOpen(true);
        queryClient.invalidateQueries({ queryKey: ['students-for-generation'] });
      }
    } catch (err: any) {
      toast.error('Failed to load report: ' + err.message);
    } finally {
      setLoadingPreviewId(null);
    }
  };

  const handleShare = (student: any) => {
    if (student.reportCode) {
      navigator.clipboard.writeText(student.reportCode);
      toast.success('Verification code copied to clipboard');
    } else {
      toast.info('Report not yet generated');
    }
  };

  const stats = {
    ready: studentsData?.filter(s => s.isReady).length || 0,
    notReady: studentsData?.filter(s => !s.isReady).length || 0,
    generated: studentsData?.filter(s => s.reportStatus).length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ready to Generate</p>
                <p className="text-3xl font-bold text-primary">{stats.ready}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Not Ready</p>
                <p className="text-3xl font-bold text-foreground">{stats.notReady}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Generated</p>
                <p className="text-3xl font-bold text-foreground">{stats.generated}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Generate Report Cards</CardTitle>
              <CardDescription>Select students and generate PDF report cards</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={selectedClass} onValueChange={(v) => { setSelectedClass(v); setSelectedStream('all'); }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes?.map(cls => (
                    <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedStream} onValueChange={setSelectedStream} disabled={selectedClass === 'all'}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Streams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Streams</SelectItem>
                  {streams
                    ?.filter(s => selectedClass === 'all' || s.class_id === selectedClass)
                    .map(stream => (
                      <SelectItem key={stream.id} value={stream.id}>{stream.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Term 1">Term 1</SelectItem>
                  <SelectItem value="Term 2">Term 2</SelectItem>
                  <SelectItem value="Term 3">Term 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Comment Overrides */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Comment Overrides (Optional)</CardTitle>
          <CardDescription>Override auto-generated comments for all selected reports. Leave blank to use automatic comments.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Class Teacher's Comment</Label>
            <Textarea
              placeholder="Leave blank to auto-generate based on performance..."
              value={classTeacherComment}
              onChange={e => setClassTeacherComment(e.target.value)}
              className="resize-none h-20 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Head Teacher's Comment</Label>
            <Textarea
              placeholder="Leave blank to auto-generate based on performance..."
              value={headTeacherComment}
              onChange={e => setHeadTeacherComment(e.target.value)}
              className="resize-none h-20 text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Students Table + Actions */}
      <Card>
        <CardContent className="pt-4">
          {/* Generation Progress */}
          {isGenerating && (
            <div className="mb-4 p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Generating Reports...</span>
                <span className="text-sm">{generatingProgress}%</span>
              </div>
              <Progress value={generatingProgress} />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <Button variant="outline" onClick={selectAllReady}>
              Select All Ready ({stats.ready})
            </Button>
            {selectedStudents.length > 0 && (
              <>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button disabled={isGenerating}>
                      <FileText className="mr-2 h-4 w-4" />
                      Generate Report Cards ({selectedStudents.length})
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Generate Report Cards?</AlertDialogTitle>
                      <AlertDialogDescription asChild>
                        <div className="space-y-2">
                          <p>You are about to generate report cards for <strong>{selectedStudents.length}</strong> selected student(s) for <strong>{selectedTerm}</strong>.</p>
                          {classTeacherComment && <p>✓ Custom class teacher comment will be applied.</p>}
                          {headTeacherComment && <p>✓ Custom head teacher comment will be applied.</p>}
                          <p className="text-destructive font-medium">⚠ Existing reports for these students will be overwritten.</p>
                        </div>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isGenerating}>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        disabled={isGenerating}
                        onClick={(e) => {
                          e.preventDefault();
                          generateReports.mutate(selectedStudents);
                        }}
                      >
                        {isGenerating ? 'Generating...' : `Generate ${selectedStudents.length} Report(s)`}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={isGenerating}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete ({selectedStudents.length})
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Selected Reports?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the generated report cards for {selectedStudents.length} selected student(s). This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={async () => {
                          const { error } = await supabase
                            .from('generated_reports')
                            .delete()
                            .eq('term', selectedTerm)
                            .in('student_id', selectedStudents);
                          if (error) {
                            toast.error('Failed to delete reports');
                          } else {
                            toast.success(`${selectedStudents.length} report(s) deleted`);
                            setSelectedStudents([]);
                            queryClient.invalidateQueries({ queryKey: ['students-for-generation'] });
                            queryClient.invalidateQueries({ queryKey: ['generated-report-cards'] });
                          }
                        }}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button variant="outline" disabled={isGenerating}>
                  <Package className="mr-2 h-4 w-4" />
                  Download ZIP
                </Button>
              </>
            )}
          </div>

          {/* Students Table */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : studentsData?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No students found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={selectedStudents.length === stats.ready && stats.ready > 0}
                        onCheckedChange={selectAllReady}
                      />
                    </TableHead>
                    <TableHead>Admission No</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Stream</TableHead>
                    <TableHead>Subjects Approved</TableHead>
                    <TableHead>Readiness</TableHead>
                    <TableHead>Report Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentsData?.map(student => {
                    const isLoadingThis = loadingPreviewId === student.studentId;
                    return (
                      <TableRow key={student.studentId}>
                        <TableCell>
                          <Checkbox
                            checked={selectedStudents.includes(student.studentId)}
                            onCheckedChange={() => toggleStudent(student.studentId)}
                            disabled={!student.isReady}
                          />
                        </TableCell>
                        <TableCell className="font-mono">{student.admissionNo}</TableCell>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell>{student.className}</TableCell>
                        <TableCell>{student.streamName || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-primary font-medium">{student.approvedSubjects}</span>
                            {student.pendingSubjects > 0 && (
                              <span className="text-muted-foreground">+{student.pendingSubjects} pending</span>
                            )}
                            <span className="text-muted-foreground">/ {student.totalSubjects}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={student.isReady ? 'default' : 'secondary'}>
                            {student.isReady ? 'Ready' : 'Not Ready'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {student.reportStatus ? (
                            <div>
                              <Badge variant="outline">{student.reportStatus}</Badge>
                              {student.reportDate && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {format(new Date(student.reportDate), 'MMM d, yyyy')}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Not generated</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {/* Preview always available if ready */}
                            {(student.isReady || student.reportStatus) && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                title="Preview"
                                disabled={isLoadingThis || isGenerating}
                                onClick={() => openPreview(student)}
                              >
                                {isLoadingThis
                                  ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                  : <Eye className="h-4 w-4" />}
                              </Button>
                            )}
                            {student.reportStatus && (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  title="Print"
                                  disabled={isLoadingThis || isGenerating}
                                  onClick={() => openPreview(student)}
                                >
                                  <Printer className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  title="Share / Copy Code"
                                  onClick={() => handleShare(student)}
                                >
                                  <Share2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  title="Regenerate"
                                  disabled={isGenerating}
                                  onClick={() => {
                                    toast.info(`Regenerating report for ${student.name}...`);
                                    generateReports.mutate([student.studentId]);
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" title="Delete">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Report Card?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Delete the generated report card for {student.name}? This cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        onClick={async () => {
                                          const { error } = await supabase
                                            .from('generated_reports')
                                            .delete()
                                            .eq('student_id', student.studentId)
                                            .eq('term', selectedTerm);
                                          if (error) {
                                            toast.error('Failed to delete report');
                                          } else {
                                            toast.success(`Report for ${student.name} deleted`);
                                            queryClient.invalidateQueries({ queryKey: ['students-for-generation'] });
                                            queryClient.invalidateQueries({ queryKey: ['generated-report-cards'] });
                                          }
                                        }}
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            )}
                            {student.isReady && !student.reportStatus && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-primary"
                                    title="Generate Report Card"
                                    disabled={isGenerating}
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Generate Report Card?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Generate a report card for <strong>{student.name}</strong> for <strong>{selectedTerm}</strong>?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel disabled={isGenerating}>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      disabled={isGenerating}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        generateReports.mutate([student.studentId]);
                                      }}
                                    >
                                      {isGenerating ? 'Generating...' : 'Generate'}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <ReportCardPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        reportData={previewData}
        studentName={previewStudentName}
      />
    </div>
  );
};

export default ReportGeneration;
