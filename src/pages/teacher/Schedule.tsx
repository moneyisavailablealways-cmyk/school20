import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface TimetableEntry {
  id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room_number: string;
  class?: {
    name: string;
  };
  subject?: {
    name: string;
    code: string;
  };
}

interface DaySchedule {
  day: string;
  classes: {
    time: string;
    subject: string;
    class: string;
    room: string;
  }[];
}

const Schedule = () => {
  const [scheduleData, setScheduleData] = useState<DaySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const { toast } = useToast();

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  useEffect(() => {
    if (profile) {
      fetchTeacherSchedule();
    }
  }, [profile]);

  const fetchTeacherSchedule = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('timetables')
        .select(`
          *,
          class:classes!timetables_class_id_fkey(
            name
          ),
          subject:subjects!timetables_subject_id_fkey(
            name,
            code
          )
        `)
        .eq('teacher_id', profile?.id)
        .order('day_of_week')
        .order('start_time');

      if (error) {
        console.error('Error fetching schedule:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch your schedule',
          variant: 'destructive',
        });
        return;
      }

      // Group entries by day
      const groupedByDay = daysOfWeek.map((dayName, index) => {
        const dayNumber = index + 1; // Monday = 1, Tuesday = 2, etc.
        const dayEntries = (data || []).filter(entry => entry.day_of_week === dayNumber);
        
        return {
          day: dayName,
          classes: dayEntries.map(entry => ({
            time: `${formatTime(entry.start_time)} - ${formatTime(entry.end_time)}`,
            subject: entry.subject?.name || 'Unknown Subject',
            class: entry.class?.name || 'Unknown Class',
            room: entry.room_number || 'No Room',
          })),
        };
      });

      setScheduleData(groupedByDay);
    } catch (error: any) {
      console.error('Error fetching schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch your schedule',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Schedule</h1>
        <p className="text-muted-foreground">
          Your weekly teaching schedule
        </p>
      </div>

      {/* Schedule Overview */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Classes This Week</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {scheduleData.reduce((total, day) => total + day.classes.length, 0)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Teaching Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {scheduleData.reduce((total, day) => total + day.classes.length, 0)} hrs
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Schedule */}
      <div className="grid gap-4">
        {scheduleData.map((daySchedule) => (
          <Card key={daySchedule.day}>
            <CardHeader>
              <CardTitle className="text-lg">{daySchedule.day}</CardTitle>
              <CardDescription>
                {daySchedule.classes.length} classes scheduled
              </CardDescription>
            </CardHeader>
            <CardContent>
              {daySchedule.classes.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No classes scheduled</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {daySchedule.classes.map((classItem, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="text-sm font-medium text-primary">
                          {classItem.time}
                        </div>
                        <div>
                          <div className="font-medium">{classItem.subject}</div>
                          <div className="text-sm text-muted-foreground">
                            {classItem.class}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {classItem.room}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Note */}
      {scheduleData.every(day => day.classes.length === 0) && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                No classes are currently scheduled. Please contact your administrator if this seems incorrect.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Schedule;