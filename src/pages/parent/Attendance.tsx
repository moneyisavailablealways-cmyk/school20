import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, User, TrendingUp, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  remarks: string | null;
  student_id: string;
  students: {
    profiles: {
      first_name: string;
      last_name: string;
    };
  };
}

interface Student {
  id: string;
  profiles: {
    first_name: string;
    last_name: string;
  };
}

const Attendance = () => {
  const { profile } = useAuth();
  const [children, setChildren] = useState<Student[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [attendanceStats, setAttendanceStats] = useState({
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    lateDays: 0,
    percentage: 0
  });

  useEffect(() => {
    fetchChildren();
  }, [profile]);

  useEffect(() => {
    if (selectedChild) {
      fetchAttendanceRecords();
    }
  }, [selectedChild]);

  // Real-time subscription for attendance records
  useEffect(() => {
    if (!profile?.id) return;

    const attendanceChannel = supabase
      .channel('attendance-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance_records'
        },
        () => {
          console.log('Attendance records changed, refetching data');
          if (selectedChild) {
            fetchAttendanceRecords();
          }
        }
      )
      .subscribe();

    const parentRelationshipsChannel = supabase
      .channel('parent-relationships-attendance')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'parent_student_relationships',
          filter: `parent_id=eq.${profile.id}`
        },
        () => {
          console.log('Parent relationships changed, refetching children');
          fetchChildren();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(attendanceChannel);
      supabase.removeChannel(parentRelationshipsChannel);
    };
  }, [profile?.id, selectedChild]);

  const fetchChildren = async () => {
    if (!profile?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('parent_student_relationships')
        .select(`
          student_id,
          students!inner (
            id,
            profiles!inner (
              first_name,
              last_name
            )
          )
        `)
        .eq('parent_id', profile.id);

      if (error) throw error;

      const childrenData = data?.map(rel => rel.students).filter(Boolean) || [];
      setChildren(childrenData as Student[]);
      
      if (childrenData.length > 0 && !selectedChild) {
        setSelectedChild(childrenData[0].id);
      }
    } catch (error) {
      console.error('Error fetching children:', error);
      toast.error('Failed to load children information');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceRecords = async () => {
    if (!selectedChild) return;
    
    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .select(`
          id,
          date,
          status,
          remarks,
          student_id,
          students!inner (
            profiles!inner (
              first_name,
              last_name
            )
          )
        `)
        .eq('student_id', selectedChild)
        .order('date', { ascending: false })
        .limit(50);

      if (error) throw error;

      setAttendanceRecords(data || []);
      calculateAttendanceStats(data || []);
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      toast.error('Failed to load attendance records');
    }
  };

  const calculateAttendanceStats = (records: AttendanceRecord[]) => {
    const totalDays = records.length;
    const presentDays = records.filter(r => r.status === 'present').length;
    const absentDays = records.filter(r => r.status === 'absent').length;
    const lateDays = records.filter(r => r.status === 'late').length;
    const percentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

    setAttendanceStats({
      totalDays,
      presentDays,
      absentDays,
      lateDays,
      percentage
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Present</Badge>;
      case 'absent':
        return <Badge variant="destructive">Absent</Badge>;
      case 'late':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Late</Badge>;
      case 'excused':
        return <Badge variant="outline">Excused</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Attendance Records</h1>
        <p className="text-muted-foreground">Track your child's attendance and punctuality</p>
      </div>

      {children.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-xl font-semibold mb-2">No Children Found</p>
            <p className="text-muted-foreground text-center">
              No children are associated with your account.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-6">
            <Select value={selectedChild} onValueChange={setSelectedChild}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select a child" />
              </SelectTrigger>
              <SelectContent>
                {children.map((child) => (
                  <SelectItem key={child.id} value={child.id}>
                    {child.profiles.first_name} {child.profiles.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Days</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{attendanceStats.totalDays}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Present</CardTitle>
                <Clock className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{attendanceStats.presentDays}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Absent</CardTitle>
                <AlertCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{attendanceStats.absentDays}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{attendanceStats.percentage}%</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Attendance Records</CardTitle>
              <CardDescription>
                Last 50 attendance records for the selected child
              </CardDescription>
            </CardHeader>
            <CardContent>
              {attendanceRecords.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No attendance records found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {attendanceRecords.map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {new Date(record.date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                          {record.remarks && (
                            <p className="text-sm text-muted-foreground">{record.remarks}</p>
                          )}
                        </div>
                      </div>
                      {getStatusBadge(record.status)}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default Attendance;