import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, Download, FileText, TrendingUp, Users, GraduationCap, Calendar,
  DollarSign, BookOpen, Award, Activity
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const Reports = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedDateRange, setSelectedDateRange] = useState('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const schoolId = profile?.school_id;

  // Real-time stats scoped to school
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['reports-stats', schoolId],
    queryFn: async () => {
      if (!schoolId) throw new Error('No school');

      const [studentsRes, teachersRes, classesRes, attendanceRes, invoicesRes, libraryRes] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('school_id', schoolId).eq('role', 'teacher'),
        supabase.from('classes').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
        // Attendance rate this month
        supabase.from('attendance_records').select('status').eq('school_id', schoolId)
          .gte('date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]),
        // Fee collection
        supabase.from('invoices').select('total_amount, paid_amount').eq('school_id', schoolId),
        // Library active borrowers
        supabase.from('library_transactions').select('borrower_id', { count: 'exact', head: true })
          .eq('school_id', schoolId).is('return_date', null),
      ]);

      const totalStudents = studentsRes.count || 0;
      const totalTeachers = teachersRes.count || 0;
      const totalClasses = classesRes.count || 0;

      // Calculate attendance rate
      const attendanceRecords = attendanceRes.data || [];
      const totalAttendance = attendanceRecords.length;
      const presentCount = attendanceRecords.filter(r => r.status === 'present').length;
      const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 1000) / 10 : 0;

      // Calculate fee collection percentage
      const invoices = invoicesRes.data || [];
      const totalFees = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
      const totalPaid = invoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);
      const feeCollection = totalFees > 0 ? Math.round((totalPaid / totalFees) * 1000) / 10 : 0;

      const activeBorrowers = libraryRes.count || 0;
      const libraryUsage = totalStudents > 0 ? Math.round((activeBorrowers / totalStudents) * 1000) / 10 : 0;

      return { totalStudents, totalTeachers, totalClasses, attendanceRate, feeCollection, libraryUsage };
    },
    enabled: !!schoolId,
  });

  // Generated reports scoped to school
  const { data: reports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ['generated-reports-history', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data, error } = await supabase
        .from('generated_reports')
        .select('id, student_id, term, status, generated_at, generated_by, file_url, overall_average, overall_grade, students(first_name, last_name)')
        .eq('school_id', schoolId)
        .order('generated_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId,
  });

  const loading = statsLoading || reportsLoading;

  const reportTypes = [
    { value: 'student_report', label: 'Student Report', icon: GraduationCap },
    { value: 'attendance_report', label: 'Attendance Report', icon: Calendar },
    { value: 'financial_report', label: 'Financial Report', icon: DollarSign },
    { value: 'academic_report', label: 'Academic Performance', icon: Award },
    { value: 'teacher_report', label: 'Teacher Report', icon: Users },
    { value: 'library_report', label: 'Library Usage', icon: BookOpen },
  ];

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'finalized':
        return <Badge className="bg-green-100 text-green-800">Finalized</Badge>;
      case 'draft':
        return <Badge className="bg-yellow-100 text-yellow-800">Draft</Badge>;
      case 'approved':
        return <Badge className="bg-blue-100 text-blue-800">Approved</Badge>;
      default:
        return <Badge variant="secondary">{status || 'Unknown'}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const s = stats || { totalStudents: 0, totalTeachers: 0, totalClasses: 0, attendanceRate: 0, feeCollection: 0, libraryUsage: 0 };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">Generate and view school performance reports</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="generate">Generate Reports</TabsTrigger>
          <TabsTrigger value="history">Report History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{s.totalStudents}</div>
                <p className="text-xs text-muted-foreground">Enrolled students</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Teachers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{s.totalTeachers}</div>
                <p className="text-xs text-muted-foreground">
                  <Activity className="inline h-3 w-3 mr-1" />
                  Active staff members
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Classes</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{s.totalClasses}</div>
                <p className="text-xs text-muted-foreground">Across all grades</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{s.attendanceRate}%</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="inline h-3 w-3 mr-1" />
                  This month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Fee Collection</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{s.feeCollection}%</div>
                <p className="text-xs text-muted-foreground">Current term collection</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Library Usage</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{s.libraryUsage}%</div>
                <p className="text-xs text-muted-foreground">Active borrowers</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Quick Report Generation</CardTitle>
              <CardDescription>Generate commonly requested reports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reportTypes.map((reportType) => {
                  const Icon = reportType.icon;
                  return (
                    <Card key={reportType.value} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3">
                          <Icon className="h-8 w-8 text-primary" />
                          <div className="flex-1">
                            <h3 className="font-medium">{reportType.label}</h3>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2"
                              onClick={() => {
                                toast({ title: 'Info', description: `Use the Report Cards module to generate ${reportType.label}s` });
                              }}
                            >
                              Generate
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="generate" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Generate Custom Report</CardTitle>
              <CardDescription>Create detailed reports with custom parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="report_type">Report Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select report type" />
                    </SelectTrigger>
                    <SelectContent>
                      {reportTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center space-x-2">
                            <type.icon className="h-4 w-4" />
                            <span>{type.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="date_range">Date Range</Label>
                  <Select value={selectedDateRange} onValueChange={setSelectedDateRange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select date range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                      <SelectItem value="quarter">This Quarter</SelectItem>
                      <SelectItem value="year">This Year</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedDateRange === 'custom' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input id="start_date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="end_date">End Date</Label>
                    <Input id="end_date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={() => toast({ title: 'Info', description: 'Use the Report Cards module to generate reports' })}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Report History</CardTitle>
              <CardDescription>View previously generated report cards for your school</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Term</TableHead>
                      <TableHead>Average</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Generated Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report: any) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">
                          {report.students?.first_name} {report.students?.last_name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{report.term}</Badge>
                        </TableCell>
                        <TableCell>{report.overall_average ? `${report.overall_average}%` : '-'}</TableCell>
                        <TableCell>{report.overall_grade || '-'}</TableCell>
                        <TableCell>
                          {report.generated_at ? format(new Date(report.generated_at), 'MMM dd, yyyy') : '-'}
                        </TableCell>
                        <TableCell>{getStatusBadge(report.status)}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!report.file_url}
                            onClick={() => {
                              if (report.file_url) window.open(report.file_url, '_blank');
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {reports.length === 0 && (
                <div className="text-center py-8">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-medium">No reports generated yet</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Generate report cards from the Report Cards module.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
