import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { CalendarIcon, Check, X, Clock, UserCheck, AlertCircle, Search, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'sick_leave' | 'vacation_leave' | 'half_day' | 'pending_approval';

interface TeacherAttendance {
  teacherId: string;
  status: AttendanceStatus;
  checkInTime?: string;
  checkOutTime?: string;
  lateReason?: string;
  remarks?: string;
}

const statusConfig: Record<AttendanceStatus, { label: string; color: string; icon: React.ReactNode }> = {
  present: { label: 'Present', color: 'bg-green-500', icon: <Check className="h-4 w-4" /> },
  absent: { label: 'Absent', color: 'bg-red-500', icon: <X className="h-4 w-4" /> },
  late: { label: 'Late', color: 'bg-yellow-500', icon: <Clock className="h-4 w-4" /> },
  sick_leave: { label: 'Sick Leave', color: 'bg-blue-500', icon: <AlertCircle className="h-4 w-4" /> },
  vacation_leave: { label: 'Vacation', color: 'bg-purple-500', icon: <CalendarIcon className="h-4 w-4" /> },
  half_day: { label: 'Half Day', color: 'bg-orange-500', icon: <Clock className="h-4 w-4" /> },
  pending_approval: { label: 'Pending', color: 'bg-gray-500', icon: <AlertCircle className="h-4 w-4" /> },
};

const TeacherAttendanceMarking = () => {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [attendanceData, setAttendanceData] = useState<Record<string, TeacherAttendance>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch all teachers
  const { data: teachers, isLoading: loadingTeachers } = useQuery({
    queryKey: ['teachers-for-attendance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, phone')
        .eq('role', 'teacher')
        .eq('is_active', true)
        .order('first_name');
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch existing attendance for the selected date
  const { data: existingAttendance, isLoading: loadingAttendance } = useQuery({
    queryKey: ['teacher-attendance', format(selectedDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teacher_attendance')
        .select('*')
        .eq('date', format(selectedDate, 'yyyy-MM-dd'));
      
      if (error) throw error;
      
      // Initialize attendance data from existing records
      const initialData: Record<string, TeacherAttendance> = {};
      data?.forEach(record => {
        initialData[record.teacher_id] = {
          teacherId: record.teacher_id,
          status: record.status as AttendanceStatus,
          checkInTime: record.check_in_time || undefined,
          checkOutTime: record.check_out_time || undefined,
          lateReason: record.late_reason || undefined,
          remarks: record.remarks || undefined,
        };
      });
      setAttendanceData(initialData);
      setHasChanges(false);
      return data;
    },
    enabled: !!selectedDate,
  });

  // Save attendance mutation
  const saveAttendance = useMutation({
    mutationFn: async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      const records = Object.values(attendanceData).map(att => ({
        teacher_id: att.teacherId,
        date: format(selectedDate, 'yyyy-MM-dd'),
        status: att.status,
        check_in_time: att.checkInTime || null,
        check_out_time: att.checkOutTime || null,
        late_reason: att.lateReason || null,
        remarks: att.remarks || null,
        marked_by: profile.id,
        is_approved: true,
        is_self_marked: false,
      }));

      const { error } = await supabase
        .from('teacher_attendance')
        .upsert(records, { onConflict: 'teacher_id,date' });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Attendance saved successfully');
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['teacher-attendance'] });
    },
    onError: (error) => {
      toast.error(`Failed to save attendance: ${error.message}`);
    },
  });

  const updateTeacherAttendance = (teacherId: string, field: keyof TeacherAttendance, value: string) => {
    setAttendanceData(prev => ({
      ...prev,
      [teacherId]: {
        ...prev[teacherId],
        teacherId,
        [field]: value,
      },
    }));
    setHasChanges(true);
  };

  const markAllPresent = () => {
    if (!teachers) return;
    const newData: Record<string, TeacherAttendance> = {};
    teachers.forEach(teacher => {
      newData[teacher.id] = {
        teacherId: teacher.id,
        status: 'present',
        checkInTime: '08:00',
      };
    });
    setAttendanceData(newData);
    setHasChanges(true);
    toast.success('All teachers marked as present');
  };

  const filteredTeachers = teachers?.filter(teacher => {
    const fullName = `${teacher.first_name} ${teacher.last_name}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  const getAttendanceSummary = () => {
    const summary = { present: 0, absent: 0, late: 0, leave: 0, total: teachers?.length || 0 };
    Object.values(attendanceData).forEach(att => {
      if (att.status === 'present') summary.present++;
      else if (att.status === 'absent') summary.absent++;
      else if (att.status === 'late') summary.late++;
      else summary.leave++;
    });
    return summary;
  };

  const summary = getAttendanceSummary();

  if (loadingTeachers) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Selection & Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Select Date</CardTitle>
          </CardHeader>
          <CardContent>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, 'PPP')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Today's Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between text-sm">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{summary.present}</p>
                <p className="text-muted-foreground">Present</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{summary.absent}</p>
                <p className="text-muted-foreground">Absent</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">{summary.late}</p>
                <p className="text-muted-foreground">Late</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{summary.leave}</p>
                <p className="text-muted-foreground">Leave</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{summary.total}</p>
                <p className="text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search teachers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={markAllPresent}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Mark All Present
          </Button>
          <Button 
            onClick={() => saveAttendance.mutate()} 
            disabled={!hasChanges || saveAttendance.isPending}
          >
            {saveAttendance.isPending ? 'Saving...' : 'Save Attendance'}
          </Button>
        </div>
      </div>

      {/* Teacher List */}
      <Card>
        <CardHeader>
          <CardTitle>Teachers ({filteredTeachers?.length || 0})</CardTitle>
          <CardDescription>Mark attendance for each teacher</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingAttendance ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTeachers?.map(teacher => {
                const attendance = attendanceData[teacher.id];
                const currentStatus = attendance?.status || 'present';

                return (
                  <div
                    key={teacher.id}
                    className="flex flex-col lg:flex-row lg:items-center gap-4 p-4 border rounded-lg bg-card"
                  >
                    {/* Teacher Info */}
                    <div className="flex items-center gap-3 lg:w-1/4">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center text-white",
                        statusConfig[currentStatus].color
                      )}>
                        {teacher.first_name[0]}{teacher.last_name[0]}
                      </div>
                      <div>
                        <p className="font-medium">{teacher.first_name} {teacher.last_name}</p>
                        <p className="text-sm text-muted-foreground">{teacher.email}</p>
                      </div>
                    </div>

                    {/* Status Selection */}
                    <div className="flex flex-wrap gap-2 lg:w-1/3">
                      {(Object.keys(statusConfig) as AttendanceStatus[])
                        .filter(s => s !== 'pending_approval')
                        .map(status => (
                          <Badge
                            key={status}
                            variant={currentStatus === status ? 'default' : 'outline'}
                            className={cn(
                              "cursor-pointer transition-all",
                              currentStatus === status && statusConfig[status].color
                            )}
                            onClick={() => updateTeacherAttendance(teacher.id, 'status', status)}
                          >
                            {statusConfig[status].icon}
                            <span className="ml-1">{statusConfig[status].label}</span>
                          </Badge>
                        ))}
                    </div>

                    {/* Time & Remarks */}
                    <div className="flex flex-col sm:flex-row gap-2 lg:flex-1">
                      <Input
                        type="time"
                        placeholder="Check In"
                        value={attendance?.checkInTime || ''}
                        onChange={(e) => updateTeacherAttendance(teacher.id, 'checkInTime', e.target.value)}
                        className="w-full sm:w-28"
                      />
                      <Input
                        type="time"
                        placeholder="Check Out"
                        value={attendance?.checkOutTime || ''}
                        onChange={(e) => updateTeacherAttendance(teacher.id, 'checkOutTime', e.target.value)}
                        className="w-full sm:w-28"
                      />
                      <Input
                        placeholder="Remarks"
                        value={attendance?.remarks || ''}
                        onChange={(e) => updateTeacherAttendance(teacher.id, 'remarks', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                );
              })}

              {filteredTeachers?.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No teachers found
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherAttendanceMarking;
