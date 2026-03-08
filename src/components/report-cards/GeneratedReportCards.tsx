import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Eye, Pencil, Printer, Download, Share2, Trash2, FileText, Search } from 'lucide-react';
import ReportCardPreviewDialog from './ReportCardPreviewDialog';

const GeneratedReportCards = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [termFilter, setTermFilter] = useState('all');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewStudentName, setPreviewStudentName] = useState('');

  // Fetch generated reports with student info
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['generated-report-cards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('generated_reports')
        .select(`
          *,
          students!generated_reports_student_id_fkey (
            id, student_id,
            profile_id,
            profiles:profile_id ( first_name, last_name )
          ),
          academic_years:academic_year_id ( name )
        `)
        .order('generated_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch class info for students
  const { data: enrollments = [] } = useQuery({
    queryKey: ['report-enrollments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_enrollments')
        .select(`
          student_id,
          classes:class_id ( name ),
          streams:stream_id ( name )
        `)
        .eq('status', 'active');
      if (error) throw error;
      return data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('generated_reports').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Report card deleted');
      queryClient.invalidateQueries({ queryKey: ['generated-report-cards'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const getStudentClass = (studentId: string) => {
    const enrollment = enrollments.find((e: any) => e.student_id === studentId);
    if (!enrollment) return 'N/A';
    const className = (enrollment as any).classes?.name || '';
    const streamName = (enrollment as any).streams?.name || '';
    return streamName ? `${className} ${streamName}` : className;
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'finalized': return 'bg-green-100 text-green-800 border-green-200';
      case 'draft': return 'bg-muted text-muted-foreground';
      case 'ready': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStudentName = (report: any) => {
    return report.students?.profiles
      ? `${report.students.profiles.first_name} ${report.students.profiles.last_name}`
      : 'Unknown';
  };

  const handlePreview = (report: any) => {
    const reportData = (report as any).report_data;
    if (reportData) {
      setPreviewData(reportData);
      setPreviewStudentName(getStudentName(report));
      setPreviewOpen(true);
    } else {
      toast.info('No report data available. Please regenerate the report from the Generate tab.');
    }
  };

  const handlePrint = (report: any) => {
    const reportData = (report as any).report_data;
    if (reportData) {
      setPreviewData(reportData);
      setPreviewStudentName(getStudentName(report));
      setPreviewOpen(true);
      toast.info('Use the Print button in the preview dialog.');
    } else {
      toast.info('No report data available. Please regenerate the report.');
    }
  };

  const handleDownload = (report: any) => {
    const reportData = (report as any).report_data;
    if (reportData) {
      setPreviewData(reportData);
      setPreviewStudentName(getStudentName(report));
      setPreviewOpen(true);
      toast.info('Use the Download button in the preview dialog to save as PDF.');
    } else {
      toast.info('No report data available. Please regenerate the report.');
    }
  };

  const handleShare = async (report: any) => {
    const studentName = getStudentName(report);
    const text = `Report Card for ${studentName} - ${report.term}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: text, text, url: window.location.href });
      } catch { /* cancelled */ }
    } else if (report.verification_code) {
      await navigator.clipboard.writeText(report.verification_code);
      toast.success('Verification code copied to clipboard: ' + report.verification_code);
    } else {
      toast.info('Share not available');
    }
  };

  const handleEdit = (report: any) => {
    toast.info(`To edit this report, go to the Generate tab and regenerate the report for ${getStudentName(report)}.`);
  };

  // Get unique terms for filter
  const terms = [...new Set(reports.map((r: any) => r.term))].filter(Boolean);

  const filtered = reports.filter((r: any) => {
    const name = r.students?.profiles
      ? `${r.students.profiles.first_name} ${r.students.profiles.last_name}`.toLowerCase()
      : '';
    const studentNum = r.students?.student_id?.toLowerCase() || '';
    const matchSearch = !search || name.includes(search.toLowerCase()) || studentNum.includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchTerm = termFilter === 'all' || r.term === termFilter;
    return matchSearch && matchStatus && matchTerm;
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generated Report Cards
          </CardTitle>
          <Badge variant="outline" className="gap-1">
            <FileText className="h-3 w-3" />
            {filtered.length} total
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search by student name or number..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Select value={termFilter} onValueChange={setTermFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Terms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Terms</SelectItem>
                {terms.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="finalized">Finalized</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-12 rounded bg-muted animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No generated report cards found</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Student Number</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Term</TableHead>
                    <TableHead>Average</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Generated</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((report: any) => {
                    const studentName = getStudentName(report);
                    const studentNumber = report.students?.student_id || 'N/A';

                    return (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">{studentName}</TableCell>
                        <TableCell>{studentNumber}</TableCell>
                        <TableCell>{getStudentClass(report.student_id)}</TableCell>
                        <TableCell>{report.term}</TableCell>
                        <TableCell>{report.overall_average ? `${report.overall_average}%` : 'N/A'}</TableCell>
                        <TableCell className="font-semibold">{report.overall_grade || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getStatusColor(report.status)}>
                            {report.status || 'draft'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {report.generated_at
                            ? format(new Date(report.generated_at), 'MMM dd, yyyy')
                            : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Preview" onClick={() => handlePreview(report)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit" onClick={() => handleEdit(report)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Print" onClick={() => handlePrint(report)}>
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Download" onClick={() => handleDownload(report)}>
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Share" onClick={() => handleShare(report)}>
                              <Share2 className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="Delete">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Report Card?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete this generated report card. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => deleteMutation.mutate(report.id)}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
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

export default GeneratedReportCards;
