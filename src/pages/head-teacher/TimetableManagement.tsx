import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Users, Plus } from 'lucide-react';
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
  teacher?: {
    first_name: string;
    last_name: string;
  };
}

const TimetableManagement = () => {
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(1); // Monday
  const { toast } = useToast();

  const daysOfWeek = [
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
    { value: 7, label: 'Sunday' }
  ];

  useEffect(() => {
    fetchTimetableEntries();
  }, [selectedDay]);

  const fetchTimetableEntries = async () => {
    try {
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
          ),
          teacher:profiles!timetables_teacher_id_fkey(
            first_name,
            last_name
          )
        `)
        .eq('day_of_week', selectedDay)
        .order('start_time');

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch timetable entries"
        });
        return;
      }

      setTimetableEntries(data || []);
    } catch (error) {
      console.error('Error fetching timetable:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Timetable Management</h1>
          <p className="text-muted-foreground">Manage class schedules and time slots</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Schedule
        </Button>
      </div>

      <div className="flex space-x-2 overflow-x-auto pb-2">
        {daysOfWeek.map((day) => (
          <Button
            key={day.value}
            variant={selectedDay === day.value ? "default" : "outline"}
            onClick={() => setSelectedDay(day.value)}
            className="min-w-fit"
          >
            {day.label}
          </Button>
        ))}
      </div>

      <div className="grid gap-4">
        {timetableEntries.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center p-8">
              <div className="text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Classes Scheduled</h3>
                <p className="text-muted-foreground">
                  No classes are scheduled for {daysOfWeek.find(d => d.value === selectedDay)?.label}.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          timetableEntries.map((entry) => (
            <Card key={entry.id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center space-x-2">
                      <Badge variant="outline">{entry.subject?.code}</Badge>
                      <span>{entry.subject?.name}</span>
                    </CardTitle>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        Class {entry.class?.name}
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {formatTime(entry.start_time)} - {formatTime(entry.end_time)}
                      </div>
                      {entry.room_number && (
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          Room {entry.room_number}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="font-medium">Teacher: </span>
                    {entry.teacher?.first_name} {entry.teacher?.last_name}
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                    <Button variant="outline" size="sm">
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default TimetableManagement;