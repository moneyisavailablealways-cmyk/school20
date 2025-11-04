import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Clock, MapPin, User } from 'lucide-react';

const StudentSchedule = () => {
  const { profile } = useAuth();

  const daysOfWeek = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
  ];

  const { data: timetable, isLoading } = useQuery({
    queryKey: ['student-timetable', profile?.id],
    queryFn: async () => {
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('profile_id', profile?.id)
        .single();

      if (studentError || !studentData) {
        console.log('No student record found for profile:', profile?.id);
        return [];
      }

      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('student_enrollments')
        .select('class_id, classes(name)')
        .eq('student_id', studentData.id)
        .eq('status', 'active')
        .single();

      if (enrollmentError || !enrollmentData) {
        console.log('No active enrollment found for student:', studentData.id);
        return [];
      }

      console.log('Student enrolled in class:', enrollmentData.classes?.name);

      const { data, error } = await supabase
        .from('timetables')
        .select(`
          *,
          subjects:subject_id (
            name,
            code
          ),
          teachers:teacher_id (
            profiles (
              first_name,
              last_name
            )
          )
        `)
        .eq('class_id', enrollmentData.class_id)
        .order('day_of_week')
        .order('start_time');

      if (error) {
        console.error('Error fetching timetables:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        console.log('No timetables found for class:', enrollmentData.class_id);
      }
      
      return data || [];
    },
    enabled: !!profile?.id
  });

  const groupedTimetable = React.useMemo(() => {
    if (!timetable) return {};
    
    return timetable.reduce((acc, item) => {
      const day = daysOfWeek[item.day_of_week - 1];
      if (!acc[day]) acc[day] = [];
      acc[day].push(item);
      return acc;
    }, {} as Record<string, any[]>);
  }, [timetable]);

  const formatTime = (timeString: string) => {
    const time = new Date(`2000-01-01T${timeString}`);
    return time.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Schedule</h1>
          <p className="text-muted-foreground mt-2">
            View your weekly class timetable
          </p>
        </div>
        <div className="grid gap-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-24" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[1, 2, 3].map((j) => (
                    <Skeleton key={j} className="h-16 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Schedule</h1>
        <p className="text-muted-foreground mt-2">
          View your weekly class timetable
        </p>
      </div>

      <div className="grid gap-6">
        {daysOfWeek.map((day) => (
          <Card key={day}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {day}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {groupedTimetable[day] && groupedTimetable[day].length > 0 ? (
                <div className="space-y-3">
                  {groupedTimetable[day].map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1">
                        <h4 className="font-semibold">{item.subjects?.name}</h4>
                        {item.subjects?.code && (
                          <p className="text-sm text-muted-foreground">
                            {item.subjects.code}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>
                            {formatTime(item.start_time)} - {formatTime(item.end_time)}
                          </span>
                        </div>
                        
                        {item.room_number && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span>Room {item.room_number}</span>
                          </div>
                        )}
                        
                        {item.teachers?.profiles && (
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            <span>
                              {item.teachers.profiles.first_name} {item.teachers.profiles.last_name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No classes scheduled for {day}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {(!timetable || timetable.length === 0) && (
        <Card>
          <CardContent className="py-8 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Schedule Found</h3>
            <p className="text-muted-foreground mb-2">
              Your class schedule is not available yet.
            </p>
            <p className="text-sm text-muted-foreground">
              Check browser console (F12) for detailed information.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentSchedule;