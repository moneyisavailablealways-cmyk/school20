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
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { FileText, Download, Eye, Printer, Package, RefreshCw, CheckCircle, AlertCircle, Share2, Pencil } from 'lucide-react';
import { format } from 'date-fns';

const ReportGeneration = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedTerm, setSelectedTerm] = useState<string>('Term 1');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [generatingProgress, setGeneratingProgress] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedStream, setSelectedStream] = useState<string>('all');

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

  // Fetch all academic years to find the right one
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

  // Fetch students with their submission readiness
  const { data: studentsData, isLoading } = useQuery({
    queryKey: ['students-for-generation', selectedClass, selectedStream, selectedTerm, currentYear?.id],
    queryFn: async () => {
      if (!currentYear?.id) return [];

      // First, find which academic_year_id has approved submissions for the selected term
      const { data: submissionYears } = await supabase
        .from('subject_submissions')
        .select('academic_year_id')
        .eq('term', selectedTerm)
        .eq('status', 'approved')
        .limit(1);

      const targetAcademicYearId = submissionYears?.[0]?.academic_year_id || currentYear.id;

      // Get enrollments - handle both null and matching academic_year_id
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

      if (selectedClass !== 'all') {
        query = query.eq('class_id', selectedClass);
      }

      if (selectedStream !== 'all') {
        query = query.eq('stream_id', selectedStream);
      }

      const { data: enrollments, error: enrollError } = await query;
      if (enrollError) throw enrollError;

      // Filter enrollments: include those with matching academic_year_id OR null academic_year_id
      const filteredEnrollments = enrollments?.filter(e => 
        !e.academic_year_id || e.academic_year_id === targetAcademicYearId || e.academic_year_id === currentYear.id
      ) || [];

      const studentIds = filteredEnrollments.map(e => e.student_id);
      if (studentIds.length === 0) return [];

      // Get all submissions for these students (approved + pending)
      const { data: submissions } = await supabase
        .from('subject_submissions')
        .select('student_id, subject_id, status')
        .eq('academic_year_id', targetAcademicYearId)
        .eq('term', selectedTerm)
        .in('student_id', studentIds);

      // Get existing generated reports
      const { data: reports } = await supabase
        .from('generated_reports')
        .select('student_id, status, verification_code, generated_at, file_url')
        .eq('academic_year_id', targetAcademicYearId)
        .eq('term', selectedTerm)
        .in('student_id', studentIds);

      // Build student readiness data
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
          isReady: approvedCount >= 1, // At least 1 approved subject
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
          },
        });

        if (error) {
          console.error(`Failed to generate report for ${studentId}:`, error);
          toast.error(`Failed to generate report for student`);
        }

        setGeneratingProgress(Math.round(((i + 1) / studentIds.length) * 100));
      }

      setIsGenerating(false);
    },
    onSuccess: () => {
      toast.success('Reports generated successfully');
      setSelectedStudents([]);
      queryClient.invalidateQueries({ queryKey: ['students-for-generation'] });
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

  const handlePreview = (student: any) => {
    if (student.reportUrl) {
      window.open(student.reportUrl, '_blank');
    } else {
      toast.info('Report preview not available yet');
    }
  };

  const handleDownload = (student: any) => {
    if (student.reportUrl) {
      const link = document.createElement('a');
      link.href = student.reportUrl;
      link.download = `report-${student.admissionNo || student.studentId}.pdf`;
      link.click();
    } else {
      toast.info('Report not available for download');
    }
  };

  const handlePrint = (student: any) => {
    if (student.reportUrl) {
      const printWindow = window.open(student.reportUrl, '_blank');
      printWindow?.addEventListener('load', () => {
        printWindow.print();
      });
    } else {
      toast.info('Report not available for printing');
    }
  };

  const handleShare = (student: any) => {
    if (navigator.share && student.reportUrl) {
      navigator.share({
        title: `Report Card - ${student.name}`,
        text: `Report card for ${student.name}`,
        url: student.reportUrl,
      }).catch(() => {});
    } else if (student.reportCode) {
      navigator.clipboard.writeText(student.reportCode);
      toast.success('Verification code copied to clipboard');
    } else {
      toast.info('Nothing to share yet');
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
                <p className="text-3xl font-bold text-green-600">{stats.ready}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Not Ready</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.notReady}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Generated</p>
                <p className="text-3xl font-bold text-blue-600">{stats.generated}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Actions */}
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
              <Select
                value={selectedStream}
                onValueChange={setSelectedStream}
                disabled={selectedClass === 'all'}
              >
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
        <CardContent>
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
          <div className="flex gap-2 mb-4">
            <Button variant="outline" onClick={selectAllReady}>
              Select All Ready ({stats.ready})
            </Button>
            {selectedStudents.length > 0 && (
              <>
                <Button
                  onClick={() => generateReports.mutate(selectedStudents)}
                  disabled={isGenerating}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Generate ({selectedStudents.length})
                </Button>
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
                  {studentsData?.map(student => (
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
                          <span className="text-green-600 font-medium">{student.approvedSubjects}</span>
                          {student.pendingSubjects > 0 && (
                            <span className="text-yellow-600">+{student.pendingSubjects} pending</span>
                          )}
                          <span className="text-muted-foreground">/ {student.totalSubjects}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={student.isReady ? 'bg-green-500' : 'bg-yellow-500'}>
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
                          {student.reportStatus && (
                            <>
                              <Button size="icon" variant="ghost" className="h-8 w-8" title="Preview" onClick={() => handlePreview(student)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8" title="Download" onClick={() => handleDownload(student)}>
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8" title="Print" onClick={() => handlePrint(student)}>
                                <Printer className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8" title="Share" onClick={() => handleShare(student)}>
                                <Share2 className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8" title="Edit" onClick={() => {
                                toast.info('Edit functionality - regenerate the report after making changes');
                              }}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {student.isReady && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              title={student.reportStatus ? 'Regenerate' : 'Generate'}
                              onClick={() => generateReports.mutate([student.studentId])}
                              disabled={isGenerating}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportGeneration;
