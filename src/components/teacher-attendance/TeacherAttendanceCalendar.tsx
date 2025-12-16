import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, getDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Check, X, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'sick_leave' | 'vacation_leave' | 'half_day' | 'pending_approval';

const statusColors: Record<AttendanceStatus, string> = {
  present: 'bg-green-500',
  absent: 'bg-red-500',
  late: 'bg-yellow-500',
  sick_leave: 'bg-blue-500',
  vacation_leave: 'bg-purple-500',
  half_day: 'bg-orange-500',
  pending_approval: 'bg-gray-400',
};

const statusLabels: Record<AttendanceStatus, string> = {
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  sick_leave: 'Sick Leave',
  vacation_leave: 'Vacation',
  half_day: 'Half Day',
  pending_approval: 'Pending',
};

interface TeacherAttendanceCalendarProps {
  isTeacherView?: boolean;
}

const TeacherAttendanceCalendar = ({ isTeacherView = false }: TeacherAttendanceCalendarProps) => {
  const { profile } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(isTeacherView ? profile?.id || '' : 'all');

  // Fetch teachers list (for admin/head teacher view)
  const { data: teachers } = useQuery({
    queryKey: ['teachers-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('role', 'teacher')
        .eq('is_active', true)
        .order('first_name');
      
      if (error) throw error;
      return data;
    },
    enabled: !isTeacherView,
  });

  // Fetch attendance for the month
  const { data: attendanceRecords, isLoading } = useQuery({
    queryKey: ['teacher-attendance-calendar', format(currentMonth, 'yyyy-MM'), selectedTeacherId],
    queryFn: async () => {
      const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

      let query = supabase
        .from('teacher_attendance')
        .select('*, teacher:profiles!teacher_attendance_teacher_id_fkey(first_name, last_name)')
        .gte('date', monthStart)
        .lte('date', monthEnd);

      if (isTeacherView && profile?.id) {
        query = query.eq('teacher_id', profile.id);
      } else if (selectedTeacherId && selectedTeacherId !== 'all') {
        query = query.eq('teacher_id', selectedTeacherId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: isTeacherView ? !!profile?.id : true,
  });

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const getAttendanceForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return attendanceRecords?.filter(r => r.date === dateStr) || [];
  };

  const previousMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Calculate statistics
  const stats = useMemo(() => {
    if (!attendanceRecords) return { present: 0, absent: 0, late: 0, leave: 0 };
    return attendanceRecords.reduce((acc, record) => {
      if (record.status === 'present') acc.present++;
      else if (record.status === 'absent') acc.absent++;
      else if (record.status === 'late') acc.late++;
      else acc.leave++;
      return acc;
    }, { present: 0, absent: 0, late: 0, leave: 0 });
  }, [attendanceRecords]);

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const firstDayOfMonth = getDay(startOfMonth(currentMonth));

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{stats.present}</p>
              <p className="text-sm text-muted-foreground">Present Days</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-red-600">{stats.absent}</p>
              <p className="text-sm text-muted-foreground">Absent Days</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-600">{stats.late}</p>
              <p className="text-sm text-muted-foreground">Late Days</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">{stats.leave}</p>
              <p className="text-sm text-muted-foreground">Leave Days</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Attendance Calendar</CardTitle>
              <CardDescription>View attendance history</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              {!isTeacherView && (
                <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select teacher" />
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
              )}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={previousMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-medium min-w-[140px] text-center">
                  {format(currentMonth, 'MMMM yyyy')}
                </span>
                <Button variant="outline" size="icon" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <>
              {/* Legend */}
              <div className="flex flex-wrap gap-3 mb-6">
                {Object.entries(statusLabels).map(([status, label]) => (
                  <div key={status} className="flex items-center gap-1.5">
                    <div className={cn("w-3 h-3 rounded-full", statusColors[status as AttendanceStatus])} />
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Week day headers */}
                {weekDays.map(day => (
                  <div key={day} className="text-center font-medium text-muted-foreground py-2 text-sm">
                    {day}
                  </div>
                ))}

                {/* Empty cells for days before the first of the month */}
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}

                {/* Calendar days */}
                {days.map(day => {
                  const dayAttendance = getAttendanceForDay(day);
                  const isWeekend = getDay(day) === 0 || getDay(day) === 6;

                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        "aspect-square p-1 border rounded-lg flex flex-col items-center justify-start gap-1",
                        isToday(day) && "border-primary border-2",
                        isWeekend && "bg-muted/50"
                      )}
                    >
                      <span className={cn(
                        "text-sm font-medium",
                        isWeekend && "text-muted-foreground"
                      )}>
                        {format(day, 'd')}
                      </span>
                      <div className="flex flex-wrap justify-center gap-0.5">
                        {dayAttendance.slice(0, 4).map((record, i) => (
                          <div
                            key={record.id}
                          className={cn(
                              "w-2 h-2 rounded-full",
                              statusColors[record.status as AttendanceStatus]
                            )}
                            title={`${(record as any).teacher?.first_name} ${(record as any).teacher?.last_name}: ${statusLabels[record.status as AttendanceStatus]}`}
                          />
                        ))}
                        {dayAttendance.length > 4 && (
                          <span className="text-xs text-muted-foreground">+{dayAttendance.length - 4}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherAttendanceCalendar;
