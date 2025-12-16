import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarIcon, TrendingUp, Check, X, Clock, AlertCircle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';

const StudentAttendance = () => {
  const { profile } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());

  // Fetch student data
  const { data: studentData } = useQuery({
    queryKey: ['student', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('students')
        .select('id')
        .eq('profile_id', profile?.id)
        .single();
      return data;
    },
    enabled: !!profile?.id
  });

  // Fetch attendance records for selected month
  const { data: attendanceRecords, isLoading } = useQuery({
    queryKey: ['student-attendance', studentData?.id, format(selectedMonth, 'yyyy-MM')],
    queryFn: async () => {
      const start = startOfMonth(selectedMonth);
      const end = endOfMonth(selectedMonth);
      
      const { data } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('student_id', studentData?.id)
        .gte('date', format(start, 'yyyy-MM-dd'))
        .lte('date', format(end, 'yyyy-MM-dd'))
        .order('date', { ascending: false });

      return data || [];
    },
    enabled: !!studentData?.id
  });

  // Calculate stats
  const stats = React.useMemo(() => {
    if (!attendanceRecords) return { present: 0, absent: 0, late: 0, excused: 0, total: 0, percentage: 0 };
    
    const present = attendanceRecords.filter(r => r.status === 'present').length;
    const absent = attendanceRecords.filter(r => r.status === 'absent').length;
    const late = attendanceRecords.filter(r => r.status === 'late').length;
    const excused = attendanceRecords.filter(r => r.status === 'excused').length;
    const total = attendanceRecords.length;
    const percentage = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

    return { present, absent, late, excused, total, percentage };
  }, [attendanceRecords]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Present</Badge>;
      case 'absent':
        return <Badge variant="destructive">Absent</Badge>;
      case 'late':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Late</Badge>;
      case 'excused':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Excused</Badge>;
      case 'left_early':
        return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">Left Early</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getDayModifiers = () => {
    if (!attendanceRecords) return {};
    
    const modifiers: Record<string, Date[]> = {
      present: [],
      absent: [],
      late: [],
      excused: []
    };

    attendanceRecords.forEach(record => {
      const date = new Date(record.date);
      if (modifiers[record.status]) {
        modifiers[record.status].push(date);
      }
    });

    return modifiers;
  };

  const modifiers = getDayModifiers();

  const modifiersStyles = {
    present: { backgroundColor: '#dcfce7', borderRadius: '50%' },
    absent: { backgroundColor: '#fee2e2', borderRadius: '50%' },
    late: { backgroundColor: '#fef3c7', borderRadius: '50%' },
    excused: { backgroundColor: '#dbeafe', borderRadius: '50%' }
  };

  // Generate month options
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return date;
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Attendance</h1>
        <p className="text-muted-foreground">View your attendance records and statistics</p>
      </div>

      {/* Month Selector */}
      <div className="flex items-center gap-4">
        <Select 
          value={format(selectedMonth, 'yyyy-MM')} 
          onValueChange={(val) => setSelectedMonth(new Date(val + '-01'))}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map(date => (
              <SelectItem key={format(date, 'yyyy-MM')} value={format(date, 'yyyy-MM')}>
                {format(date, 'MMMM yyyy')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Days</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present</CardTitle>
            <Check className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.present}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Absent</CardTitle>
            <X className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Late</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.late}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.percentage}%</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Calendar View */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Calendar</CardTitle>
            <CardDescription>Visual overview of your attendance</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Calendar
              mode="single"
              month={selectedMonth}
              onMonthChange={setSelectedMonth}
              modifiers={modifiers}
              modifiersStyles={modifiersStyles}
              className="rounded-md border"
            />
          </CardContent>
          <CardContent className="pt-0">
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-200" />
                <span>Present</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-200" />
                <span>Absent</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-yellow-200" />
                <span>Late</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-200" />
                <span>Excused</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Records */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Records</CardTitle>
            <CardDescription>Detailed list of attendance for {format(selectedMonth, 'MMMM yyyy')}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : attendanceRecords && attendanceRecords.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {attendanceRecords.map(record => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {new Date(record.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                      {record.remarks && (
                        <p className="text-sm text-muted-foreground">{record.remarks}</p>
                      )}
                    </div>
                    {getStatusBadge(record.status)}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No attendance records for this month</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentAttendance;
