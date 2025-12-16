import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear } from 'date-fns';
import { Download, FileSpreadsheet, Calendar, Filter } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface TeacherAttendanceReportsProps {
  isTeacherView?: boolean;
}

const statusLabels: Record<string, string> = {
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  sick_leave: 'Sick Leave',
  vacation_leave: 'Vacation',
  half_day: 'Half Day',
  pending_approval: 'Pending',
};

const statusColors: Record<string, string> = {
  present: 'bg-green-500',
  absent: 'bg-red-500',
  late: 'bg-yellow-500',
  sick_leave: 'bg-blue-500',
  vacation_leave: 'bg-purple-500',
  half_day: 'bg-orange-500',
  pending_approval: 'bg-gray-400',
};

const TeacherAttendanceReports = ({ isTeacherView = false }: TeacherAttendanceReportsProps) => {
  const { profile } = useAuth();
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'year' | 'custom'>('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(isTeacherView ? profile?.id || '' : 'all');

  const getDateRange = () => {
    const now = new Date();
    switch (dateRange) {
      case 'week':
        return { start: startOfWeek(now), end: endOfWeek(now) };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'year':
        return { start: startOfYear(now), end: endOfYear(now) };
      case 'custom':
        return {
          start: customStartDate ? new Date(customStartDate) : startOfMonth(now),
          end: customEndDate ? new Date(customEndDate) : endOfMonth(now),
        };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  // Fetch teachers
  const { data: teachers } = useQuery({
    queryKey: ['teachers-for-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .eq('role', 'teacher')
        .eq('is_active', true)
        .order('first_name');
      
      if (error) throw error;
      return data;
    },
    enabled: !isTeacherView,
  });

  // Fetch attendance data
  const { data: attendanceData, isLoading } = useQuery({
    queryKey: ['teacher-attendance-reports', dateRange, customStartDate, customEndDate, selectedTeacherId],
    queryFn: async () => {
      const { start, end } = getDateRange();
      
      let query = supabase
        .from('teacher_attendance')
        .select(`
          *,
          teacher:profiles!teacher_attendance_teacher_id_fkey(first_name, last_name, email)
        `)
        .gte('date', format(start, 'yyyy-MM-dd'))
        .lte('date', format(end, 'yyyy-MM-dd'))
        .order('date', { ascending: false });

      if (isTeacherView && profile?.id) {
        query = query.eq('teacher_id', profile.id);
      } else if (selectedTeacherId && selectedTeacherId !== 'all') {
        query = query.eq('teacher_id', selectedTeacherId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Calculate summary statistics
  const getSummary = () => {
    if (!attendanceData) return [];

    const teacherSummaries: Record<string, {
      name: string;
      email: string;
      present: number;
      absent: number;
      late: number;
      leave: number;
      total: number;
      attendanceRate: number;
    }> = {};

    attendanceData.forEach(record => {
      const teacherId = record.teacher_id;
      if (!teacherSummaries[teacherId]) {
        teacherSummaries[teacherId] = {
          name: `${record.teacher?.first_name || ''} ${record.teacher?.last_name || ''}`,
          email: record.teacher?.email || '',
          present: 0,
          absent: 0,
          late: 0,
          leave: 0,
          total: 0,
          attendanceRate: 0,
        };
      }

      teacherSummaries[teacherId].total++;
      if (record.status === 'present') teacherSummaries[teacherId].present++;
      else if (record.status === 'absent') teacherSummaries[teacherId].absent++;
      else if (record.status === 'late') teacherSummaries[teacherId].late++;
      else teacherSummaries[teacherId].leave++;
    });

    // Calculate attendance rate
    Object.values(teacherSummaries).forEach(summary => {
      summary.attendanceRate = summary.total > 0
        ? Math.round(((summary.present + summary.late) / summary.total) * 100)
        : 0;
    });

    return Object.values(teacherSummaries).sort((a, b) => b.attendanceRate - a.attendanceRate);
  };

  const summaryData = getSummary();

  // Export to CSV
  const exportToCSV = () => {
    if (!attendanceData || attendanceData.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = ['Date', 'Teacher', 'Email', 'Status', 'Check In', 'Check Out', 'Remarks'];
    const rows = attendanceData.map(record => [
      format(new Date(record.date), 'yyyy-MM-dd'),
      `${record.teacher?.first_name || ''} ${record.teacher?.last_name || ''}`,
      record.teacher?.email || '',
      statusLabels[record.status] || record.status,
      record.check_in_time || '',
      record.check_out_time || '',
      record.remarks || '',
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `teacher-attendance-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported successfully');
  };

  const { start, end } = getDateRange();

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Date Range</Label>
              <Select value={dateRange} onValueChange={(v) => setDateRange(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dateRange === 'custom' && (
              <>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              </>
            )}

            {!isTeacherView && (
              <div className="space-y-2">
                <Label>Teacher</Label>
                <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                  <SelectTrigger>
                    <SelectValue placeholder="All teachers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Teachers</SelectItem>
                    {teachers?.map(teacher => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.first_name} {teacher.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              <Calendar className="inline h-4 w-4 mr-1" />
              {format(start, 'MMM d, yyyy')} - {format(end, 'MMM d, yyyy')}
            </p>
            <Button onClick={exportToCSV} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      {!isTeacherView && (
        <Card>
          <CardHeader>
            <CardTitle>Attendance Summary</CardTitle>
            <CardDescription>Overview by teacher for the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : summaryData.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No attendance data for this period</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Teacher</TableHead>
                      <TableHead className="text-center">Present</TableHead>
                      <TableHead className="text-center">Late</TableHead>
                      <TableHead className="text-center">Absent</TableHead>
                      <TableHead className="text-center">Leave</TableHead>
                      <TableHead className="text-center">Total Days</TableHead>
                      <TableHead className="text-center">Attendance Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summaryData.map((summary, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{summary.name}</p>
                            <p className="text-sm text-muted-foreground">{summary.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-green-500">{summary.present}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-yellow-500">{summary.late}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-red-500">{summary.absent}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-blue-500">{summary.leave}</Badge>
                        </TableCell>
                        <TableCell className="text-center">{summary.total}</TableCell>
                        <TableCell className="text-center">
                          <span className={`font-bold ${summary.attendanceRate >= 90 ? 'text-green-600' : summary.attendanceRate >= 75 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {summary.attendanceRate}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Detailed Records */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Records</CardTitle>
          <CardDescription>Individual attendance records</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : attendanceData?.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No records found</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    {!isTeacherView && <TableHead>Teacher</TableHead>}
                    <TableHead>Status</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceData?.map(record => (
                    <TableRow key={record.id}>
                      <TableCell>{format(new Date(record.date), 'MMM d, yyyy')}</TableCell>
                      {!isTeacherView && (
                        <TableCell>
                          {record.teacher?.first_name} {record.teacher?.last_name}
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge className={statusColors[record.status]}>
                          {statusLabels[record.status] || record.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{record.check_in_time || '-'}</TableCell>
                      <TableCell>{record.check_out_time || '-'}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {record.remarks || '-'}
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

export default TeacherAttendanceReports;
