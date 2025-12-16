import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { Calendar as CalendarIcon, Users, Check, X, Clock, AlertCircle, Lock, Save, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused' | 'left_early';

interface StudentAttendance {
  studentId: string;
  studentName: string;
  status: AttendanceStatus;
  remarks: string;
  existingId?: string;
}

const TeacherAttendance = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSession, setSelectedSession] = useState<string>('full_day');
  const [attendanceData, setAttendanceData] = useState<Map<string, StudentAttendance>>(new Map());
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch teacher's classes
  const { data: classes, isLoading: classesLoading } = useQuery({
    queryKey: ['teacher-classes', profile?.id],
    queryFn: async () => {
      // Get classes where teacher is class teacher
      const { data: classTeacherClasses } = await supabase
        .from('classes')
        .select('id, name')
        .eq('class_teacher_id', profile?.id);

      // Get classes where teacher is section teacher
      const { data: sectionTeacherStreams } = await supabase
        .from('streams')
        .select('class_id, classes(id, name)')
        .eq('section_teacher_id', profile?.id);

      const allClasses = new Map();
      
      classTeacherClasses?.forEach(c => allClasses.set(c.id, c));
      sectionTeacherStreams?.forEach(s => {
        if (s.classes) allClasses.set(s.classes.id, s.classes);
      });

      return Array.from(allClasses.values());
    },
    enabled: !!profile?.id
  });

  // Fetch students for selected class
  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ['class-students-attendance', selectedClass],
    queryFn: async () => {
      const { data } = await supabase
        .from('student_enrollments')
        .select(`
          student_id,
          students!inner (
            id,
            student_id,
            profiles!inner (first_name, last_name)
          )
        `)
        .eq('class_id', selectedClass)
        .eq('status', 'active');

      return data?.map(e => ({
        id: e.students.id,
        studentNumber: e.students.student_id,
        name: `${e.students.profiles.first_name} ${e.students.profiles.last_name}`
      })) || [];
    },
    enabled: !!selectedClass
  });

  // Fetch existing attendance for date/class
  const { data: existingAttendance, isLoading: attendanceLoading } = useQuery({
    queryKey: ['existing-attendance', selectedClass, format(selectedDate, 'yyyy-MM-dd'), selectedSession],
    queryFn: async () => {
      const { data } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('class_id', selectedClass)
        .eq('date', format(selectedDate, 'yyyy-MM-dd'))
        .eq('session', selectedSession);

      return data || [];
    },
    enabled: !!selectedClass
  });

  // Fetch attendance settings
  const { data: settings } = useQuery({
    queryKey: ['attendance-settings'],
    queryFn: async () => {
      const { data } = await supabase
        .from('attendance_settings')
        .select('*')
        .single();
      return data;
    }
  });

  // Fetch holidays
  const { data: holidays } = useQuery({
    queryKey: ['school-calendar', format(selectedDate, 'yyyy-MM')],
    queryFn: async () => {
      const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
      
      const { data } = await supabase
        .from('school_calendar')
        .select('*')
        .gte('date', format(startOfMonth, 'yyyy-MM-dd'))
        .lte('date', format(endOfMonth, 'yyyy-MM-dd'));

      return data || [];
    }
  });

  // Initialize attendance data when students/existing attendance loads
  useEffect(() => {
    if (!students) return;

    const newAttendanceData = new Map<string, StudentAttendance>();
    
    students.forEach(student => {
      const existing = existingAttendance?.find(a => a.student_id === student.id);
      newAttendanceData.set(student.id, {
        studentId: student.id,
        studentName: student.name,
        status: (existing?.status as AttendanceStatus) || 'present',
        remarks: existing?.remarks || '',
        existingId: existing?.id
      });
    });

    setAttendanceData(newAttendanceData);
    setHasChanges(false);
  }, [students, existingAttendance]);

  const updateStudentStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendanceData(prev => {
      const newData = new Map(prev);
      const student = newData.get(studentId);
      if (student) {
        newData.set(studentId, { ...student, status });
      }
      return newData;
    });
    setHasChanges(true);
  };

  const updateStudentRemarks = (studentId: string, remarks: string) => {
    setAttendanceData(prev => {
      const newData = new Map(prev);
      const student = newData.get(studentId);
      if (student) {
        newData.set(studentId, { ...student, remarks });
      }
      return newData;
    });
    setHasChanges(true);
  };

  const markAllAs = (status: AttendanceStatus) => {
    setAttendanceData(prev => {
      const newData = new Map(prev);
      newData.forEach((student, key) => {
        newData.set(key, { ...student, status });
      });
      return newData;
    });
    setHasChanges(true);
  };

  // Save attendance mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const records = Array.from(attendanceData.values()).map(student => ({
        id: student.existingId || undefined,
        student_id: student.studentId,
        class_id: selectedClass,
        date: format(selectedDate, 'yyyy-MM-dd'),
        session: selectedSession,
        status: student.status,
        remarks: student.remarks || null,
        marked_by: profile?.id,
        marked_at: new Date().toISOString(),
        is_locked: false
      }));

      // Upsert records
      for (const record of records) {
        if (record.id) {
          const { error } = await supabase
            .from('attendance_records')
            .update({
              status: record.status,
              remarks: record.remarks,
              last_modified_by: profile?.id,
              last_modified_at: new Date().toISOString()
            })
            .eq('id', record.id);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('attendance_records')
            .insert({
              student_id: record.student_id,
              class_id: record.class_id,
              date: record.date,
              session: record.session,
              status: record.status,
              remarks: record.remarks,
              marked_by: record.marked_by,
              marked_at: record.marked_at,
              is_locked: false
            });

          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      toast.success('Attendance saved successfully');
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['existing-attendance'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to save attendance: ${error.message}`);
    }
  });

  const isHoliday = holidays?.some(h => h.date === format(selectedDate, 'yyyy-MM-dd'));
  const isLocked = existingAttendance?.some(a => a.is_locked);

  const getStatusIcon = (status: AttendanceStatus) => {
    switch (status) {
      case 'present': return <Check className="h-4 w-4" />;
      case 'absent': return <X className="h-4 w-4" />;
      case 'late': return <Clock className="h-4 w-4" />;
      case 'excused': return <AlertCircle className="h-4 w-4" />;
      case 'left_early': return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: AttendanceStatus) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-200';
      case 'absent': return 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-200';
      case 'late': return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-200';
      case 'excused': return 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200';
      case 'left_early': return 'bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-900 dark:text-orange-200';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Mark Attendance</h1>
          <p className="text-muted-foreground">Record daily attendance for your classes</p>
        </div>
        {hasChanges && (
          <Button 
            onClick={() => saveMutation.mutate()} 
            disabled={saveMutation.isPending || isLocked || isHoliday}
          >
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? 'Saving...' : 'Save Attendance'}
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select Class</label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a class" />
                </SelectTrigger>
                <SelectContent>
                  {classes?.map(cls => (
                    <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    disabled={(date) => date > new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Session</label>
              <Select value={selectedSession} onValueChange={setSelectedSession}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_day">Full Day</SelectItem>
                  {settings?.enable_multiple_sessions && (
                    <>
                      <SelectItem value="morning">Morning</SelectItem>
                      <SelectItem value="afternoon">Afternoon</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => markAllAs('present')}
                  disabled={isLocked || isHoliday}
                  className="text-green-600"
                >
                  <CheckCheck className="h-4 w-4 mr-1" />
                  Mark All Present
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Alerts */}
      {isHoliday && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <AlertCircle className="h-5 w-5" />
              <span>This date is marked as a holiday. Attendance cannot be recorded.</span>
            </div>
          </CardContent>
        </Card>
      )}

      {isLocked && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
              <Lock className="h-5 w-5" />
              <span>Attendance for this date is locked. Contact admin to make changes.</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Student List */}
      {selectedClass && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Students ({students?.length || 0})
            </CardTitle>
            <CardDescription>
              Click on status buttons to mark attendance
            </CardDescription>
          </CardHeader>
          <CardContent>
            {studentsLoading || attendanceLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : students && students.length > 0 ? (
              <div className="space-y-3">
                {Array.from(attendanceData.values()).map(student => (
                  <div
                    key={student.studentId}
                    className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg gap-4"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{student.studentName}</p>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {(['present', 'absent', 'late', 'excused', 'left_early'] as AttendanceStatus[]).map(status => (
                        <Button
                          key={status}
                          size="sm"
                          variant={student.status === status ? 'default' : 'outline'}
                          className={cn(
                            "text-xs capitalize",
                            student.status === status && getStatusColor(status)
                          )}
                          onClick={() => updateStudentStatus(student.studentId, status)}
                          disabled={isLocked || isHoliday}
                        >
                          {getStatusIcon(status)}
                          <span className="ml-1 hidden sm:inline">{status.replace('_', ' ')}</span>
                        </Button>
                      ))}
                    </div>

                    <div className="w-full md:w-48">
                      <Input
                        placeholder="Remarks (optional)"
                        value={student.remarks}
                        onChange={(e) => updateStudentRemarks(student.studentId, e.target.value)}
                        disabled={isLocked || isHoliday}
                        className="text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No students found in this class</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!selectedClass && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Select a class to mark attendance</p>
              <p className="text-sm">Choose a class from the dropdown above</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TeacherAttendance;
