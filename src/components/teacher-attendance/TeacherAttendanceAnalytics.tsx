import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { TrendingUp, TrendingDown, AlertTriangle, Users, Clock, Calendar } from 'lucide-react';

const COLORS = ['#22c55e', '#ef4444', '#eab308', '#3b82f6', '#a855f7', '#f97316'];

const TeacherAttendanceAnalytics = () => {
  // Fetch attendance data for the past 6 months
  const { data: attendanceData, isLoading } = useQuery({
    queryKey: ['teacher-attendance-analytics'],
    queryFn: async () => {
      const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5));
      const { data, error } = await supabase
        .from('teacher_attendance')
        .select(`
          *,
          teacher:profiles!teacher_attendance_teacher_id_fkey(first_name, last_name, email)
        `)
        .gte('date', format(sixMonthsAgo, 'yyyy-MM-dd'))
        .order('date');

      if (error) throw error;
      return data;
    },
  });

  // Fetch total teachers count
  const { data: teachersCount } = useQuery({
    queryKey: ['teachers-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'teacher')
        .eq('is_active', true);

      if (error) throw error;
      return count || 0;
    },
  });

  // Calculate analytics data
  const analytics = useMemo(() => {
    if (!attendanceData) return null;

    // Overall statistics
    const statusCounts = attendanceData.reduce((acc, record) => {
      acc[record.status] = (acc[record.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const total = attendanceData.length;
    const presentCount = (statusCounts['present'] || 0) + (statusCounts['late'] || 0);
    const overallAttendanceRate = total > 0 ? Math.round((presentCount / total) * 100) : 0;

    // Monthly trend data
    const sixMonthsAgo = subMonths(new Date(), 5);
    const months = eachMonthOfInterval({ start: startOfMonth(sixMonthsAgo), end: endOfMonth(new Date()) });
    
    const monthlyData = months.map(month => {
      const monthStart = format(startOfMonth(month), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(month), 'yyyy-MM-dd');
      const monthRecords = attendanceData.filter(r => r.date >= monthStart && r.date <= monthEnd);
      const monthPresent = monthRecords.filter(r => r.status === 'present' || r.status === 'late').length;
      
      return {
        month: format(month, 'MMM'),
        total: monthRecords.length,
        present: monthPresent,
        absent: monthRecords.filter(r => r.status === 'absent').length,
        late: monthRecords.filter(r => r.status === 'late').length,
        leave: monthRecords.filter(r => ['sick_leave', 'vacation_leave', 'half_day'].includes(r.status)).length,
        rate: monthRecords.length > 0 ? Math.round((monthPresent / monthRecords.length) * 100) : 0,
      };
    });

    // Pie chart data
    const pieData = [
      { name: 'Present', value: statusCounts['present'] || 0, color: '#22c55e' },
      { name: 'Absent', value: statusCounts['absent'] || 0, color: '#ef4444' },
      { name: 'Late', value: statusCounts['late'] || 0, color: '#eab308' },
      { name: 'Sick Leave', value: statusCounts['sick_leave'] || 0, color: '#3b82f6' },
      { name: 'Vacation', value: statusCounts['vacation_leave'] || 0, color: '#a855f7' },
      { name: 'Half Day', value: statusCounts['half_day'] || 0, color: '#f97316' },
    ].filter(d => d.value > 0);

    // Teacher-wise analysis
    const teacherStats: Record<string, { name: string; present: number; total: number; lateCount: number }> = {};
    attendanceData.forEach(record => {
      const id = record.teacher_id;
      if (!teacherStats[id]) {
        teacherStats[id] = {
          name: `${record.teacher?.first_name || ''} ${record.teacher?.last_name || ''}`,
          present: 0,
          total: 0,
          lateCount: 0,
        };
      }
      teacherStats[id].total++;
      if (record.status === 'present' || record.status === 'late') teacherStats[id].present++;
      if (record.status === 'late') teacherStats[id].lateCount++;
    });

    // Find chronic absentees (attendance rate < 80%)
    const chronicAbsentees = Object.values(teacherStats)
      .filter(t => t.total > 0 && (t.present / t.total) < 0.8)
      .sort((a, b) => (a.present / a.total) - (b.present / b.total));

    // Frequently late teachers
    const frequentlyLate = Object.values(teacherStats)
      .filter(t => t.lateCount > 3)
      .sort((a, b) => b.lateCount - a.lateCount)
      .slice(0, 5);

    return {
      overallAttendanceRate,
      statusCounts,
      total,
      monthlyData,
      pieData,
      chronicAbsentees,
      frequentlyLate,
    };
  }, [attendanceData]);

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        <Skeleton className="h-80 w-full md:col-span-2" />
        <Skeleton className="h-80 w-full md:col-span-2" />
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overall Attendance</p>
                <p className="text-3xl font-bold">{analytics.overallAttendanceRate}%</p>
              </div>
              <div className={`p-3 rounded-full ${analytics.overallAttendanceRate >= 90 ? 'bg-green-100' : analytics.overallAttendanceRate >= 75 ? 'bg-yellow-100' : 'bg-red-100'}`}>
                {analytics.overallAttendanceRate >= 90 ? (
                  <TrendingUp className="h-6 w-6 text-green-600" />
                ) : (
                  <TrendingDown className="h-6 w-6 text-red-600" />
                )}
              </div>
            </div>
            <Progress value={analytics.overallAttendanceRate} className="mt-3" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Teachers</p>
                <p className="text-3xl font-bold">{teachersCount}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">Active staff members</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Chronic Absentees</p>
                <p className="text-3xl font-bold text-red-600">{analytics.chronicAbsentees.length}</p>
              </div>
              <div className="p-3 rounded-full bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">&lt;80% attendance rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Late Arrivals</p>
                <p className="text-3xl font-bold text-yellow-600">{analytics.statusCounts['late'] || 0}</p>
              </div>
              <div className="p-3 rounded-full bg-yellow-100">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">Past 6 months</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Attendance Trend</CardTitle>
            <CardDescription>Attendance rate over the past 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value: number) => [`${value}%`, 'Attendance Rate']} />
                <Line 
                  type="monotone" 
                  dataKey="rate" 
                  stroke="#22c55e" 
                  strokeWidth={2}
                  dot={{ fill: '#22c55e' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Distribution</CardTitle>
            <CardDescription>Breakdown by status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {analytics.pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Breakdown Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Breakdown</CardTitle>
          <CardDescription>Detailed attendance by month</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="present" name="Present" fill="#22c55e" />
              <Bar dataKey="late" name="Late" fill="#eab308" />
              <Bar dataKey="absent" name="Absent" fill="#ef4444" />
              <Bar dataKey="leave" name="Leave" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Alerts Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Chronic Absentees */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Chronic Absentees
            </CardTitle>
            <CardDescription>Teachers with attendance rate below 80%</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.chronicAbsentees.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No chronic absentees found</p>
            ) : (
              <div className="space-y-3">
                {analytics.chronicAbsentees.slice(0, 5).map((teacher, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <span className="font-medium">{teacher.name}</span>
                    <Badge variant="destructive">
                      {Math.round((teacher.present / teacher.total) * 100)}% attendance
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Frequently Late */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              Frequently Late
            </CardTitle>
            <CardDescription>Teachers with frequent late arrivals</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.frequentlyLate.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No frequent late arrivals</p>
            ) : (
              <div className="space-y-3">
                {analytics.frequentlyLate.map((teacher, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <span className="font-medium">{teacher.name}</span>
                    <Badge className="bg-yellow-500">
                      {teacher.lateCount} late days
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TeacherAttendanceAnalytics;
