import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, User, Plus, Video, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Appointment {
  id: string;
  appointment_date: string;
  duration_minutes: number;
  purpose: string;
  meeting_type: string;
  status: string;
  notes: string;
  teacher_id: string;
  student_id: string;
}

const Appointments = () => {
  const { profile } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppointments();

    // Real-time subscription for appointments
    const appointmentsChannel = supabase
      .channel('appointments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `parent_id=eq.${profile?.id}`
        },
        () => {
          console.log('Appointments changed, refetching data');
          fetchAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(appointmentsChannel);
    };
  }, [profile]);

  const fetchAppointments = async () => {
    if (!profile?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          duration_minutes,
          purpose,
          meeting_type,
          status,
          notes,
          teacher_id,
          student_id
        `)
        .eq('parent_id', profile.id)
        .order('appointment_date', { ascending: true });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Scheduled</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      case 'rescheduled':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Rescheduled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getMeetingTypeIcon = (type: string) => {
    switch (type) {
      case 'virtual':
        return <Video className="h-4 w-4" />;
      case 'in_person':
        return <MapPin className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  };

  const getUpcomingAppointments = () => {
    const now = new Date();
    return appointments.filter(apt => 
      new Date(apt.appointment_date) >= now && apt.status === 'scheduled'
    );
  };

  const getPastAppointments = () => {
    const now = new Date();
    return appointments.filter(apt => 
      new Date(apt.appointment_date) < now || apt.status === 'completed'
    );
  };

  const handleBookAppointment = () => {
    toast.info('Appointment booking feature will be implemented soon');
  };

  const handleReschedule = (appointmentId: string) => {
    toast.info('Rescheduling feature will be implemented soon');
  };

  const handleCancel = (appointmentId: string) => {
    toast.info('Cancellation feature will be implemented soon');
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-12 bg-muted rounded w-48"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const upcomingAppointments = getUpcomingAppointments();
  const pastAppointments = getPastAppointments();

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Appointments</h1>
            <p className="text-muted-foreground">Manage your meetings with teachers and school staff</p>
          </div>
          <Button onClick={handleBookAppointment} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Book Appointment
          </Button>
        </div>
      </div>

      {appointments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-xl font-semibold mb-2">No Appointments</p>
            <p className="text-muted-foreground text-center mb-4">
              You don't have any appointments scheduled. Book a meeting with your child's teachers.
            </p>
            <Button onClick={handleBookAppointment} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Book Your First Appointment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {upcomingAppointments.length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold mb-4">Upcoming Appointments</h2>
              <div className="space-y-4">
                {upcomingAppointments.map((appointment) => {
                  const dateTime = formatDateTime(appointment.appointment_date);
                  return (
                    <Card key={appointment.id} className="border-l-4 border-l-blue-500">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                    <CardTitle className="flex items-center gap-2">
                      {getMeetingTypeIcon(appointment.meeting_type)}
                      Teacher Appointment
                    </CardTitle>
                            <CardDescription>
                              {appointment.purpose}
                            </CardDescription>
                          </div>
                          {getStatusBadge(appointment.status)}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4 md:grid-cols-2 mb-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{dateTime.date}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>{dateTime.time} ({appointment.duration_minutes} minutes)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>Teacher ID: {appointment.teacher_id}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {getMeetingTypeIcon(appointment.meeting_type)}
                            <span className="capitalize">{appointment.meeting_type.replace('_', ' ')}</span>
                          </div>
                        </div>

                        {appointment.notes && (
                          <div className="p-3 bg-muted rounded-lg mb-4">
                            <p className="text-sm">{appointment.notes}</p>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleReschedule(appointment.id)}
                          >
                            Reschedule
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleCancel(appointment.id)}
                          >
                            Cancel
                          </Button>
                          {appointment.meeting_type === 'virtual' && (
                            <Button size="sm">
                              Join Meeting
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {pastAppointments.length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold mb-4">Past Appointments</h2>
              <div className="space-y-4">
                {pastAppointments.map((appointment) => {
                  const dateTime = formatDateTime(appointment.appointment_date);
                  return (
                    <Card key={appointment.id} className="opacity-75">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              {getMeetingTypeIcon(appointment.meeting_type)}
                              Teacher Appointment
                            </CardTitle>
                            <CardDescription>
                              {appointment.purpose}
                            </CardDescription>
                          </div>
                          {getStatusBadge(appointment.status)}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4 md:grid-cols-2 mb-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{dateTime.date}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>{dateTime.time}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>Teacher ID: {appointment.teacher_id}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {getMeetingTypeIcon(appointment.meeting_type)}
                            <span className="capitalize">{appointment.meeting_type.replace('_', ' ')}</span>
                          </div>
                        </div>

                        {appointment.notes && (
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-sm">{appointment.notes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Appointments;