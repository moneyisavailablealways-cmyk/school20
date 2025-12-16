import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, User, Video, MapPin, Phone, Check, X, Send, Inbox } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface AppointmentRequest {
  id: string;
  title: string;
  message: string | null;
  appointment_date: string;
  duration_minutes: number;
  meeting_type: string;
  sender_id: string;
  sender_role: string;
  status: string;
  created_at: string;
  sender?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface AppointmentRecipient {
  id: string;
  appointment_id: string;
  recipient_id: string;
  recipient_role: string;
  status: string;
  response_date: string | null;
  response_notes: string | null;
  recipient?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface ReceivedAppointment extends AppointmentRequest {
  recipient_status: string;
  recipient_record_id: string;
}

const roleLabels: Record<string, string> = {
  teacher: 'Teacher',
  parent: 'Parent',
  student: 'Student',
  head_teacher: 'Head Teacher',
  principal: 'Principal',
  bursar: 'Bursar',
  librarian: 'Librarian',
  admin: 'Admin',
};

export interface AppointmentsListHandle {
  refetch: () => void;
}

const AppointmentsList = forwardRef<AppointmentsListHandle>((_, ref) => {
  const { profile } = useAuth();
  const [sentAppointments, setSentAppointments] = useState<AppointmentRequest[]>([]);
  const [receivedAppointments, setReceivedAppointments] = useState<ReceivedAppointment[]>([]);
  const [sentRecipients, setSentRecipients] = useState<Record<string, AppointmentRecipient[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('received');

  useImperativeHandle(ref, () => ({
    refetch: fetchAppointments
  }));

  useEffect(() => {
    if (profile?.id) {
      fetchAppointments();
      setupRealtime();
    }
  }, [profile?.id]);

  const setupRealtime = () => {
    const channel = supabase
      .channel('appointments-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointment_requests' },
        () => fetchAppointments()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointment_recipients' },
        () => fetchAppointments()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchAppointments = async () => {
    if (!profile?.id) return;
    setLoading(true);

    try {
      // Fetch sent appointments
      const { data: sentData, error: sentError } = await supabase
        .from('appointment_requests')
        .select('*')
        .eq('sender_id', profile.id)
        .order('appointment_date', { ascending: true });

      if (sentError) throw sentError;
      setSentAppointments(sentData || []);

      // Fetch recipients for sent appointments
      if (sentData && sentData.length > 0) {
        const appointmentIds = sentData.map(a => a.id);
        const { data: recipientsData, error: recipientsError } = await supabase
          .from('appointment_recipients')
          .select('*')
          .in('appointment_id', appointmentIds);

        if (recipientsError) throw recipientsError;

        // Fetch recipient profiles
        if (recipientsData && recipientsData.length > 0) {
          const recipientIds = [...new Set(recipientsData.map(r => r.recipient_id))];
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email')
            .in('id', recipientIds);

          const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
          
          const recipientsWithProfiles = recipientsData.map(r => ({
            ...r,
            recipient: profilesMap.get(r.recipient_id),
          }));

          const groupedRecipients: Record<string, AppointmentRecipient[]> = {};
          recipientsWithProfiles.forEach(r => {
            if (!groupedRecipients[r.appointment_id]) {
              groupedRecipients[r.appointment_id] = [];
            }
            groupedRecipients[r.appointment_id].push(r);
          });
          setSentRecipients(groupedRecipients);
        }
      }

      // Fetch received appointments (where user is a recipient)
      const { data: recipientRecords, error: recipientError } = await supabase
        .from('appointment_recipients')
        .select('*')
        .eq('recipient_id', profile.id);

      if (recipientError) throw recipientError;

      if (recipientRecords && recipientRecords.length > 0) {
        const appointmentIds = recipientRecords.map(r => r.appointment_id);
        const { data: appointmentsData, error: appointmentsError } = await supabase
          .from('appointment_requests')
          .select('*')
          .in('id', appointmentIds)
          .order('appointment_date', { ascending: true });

        if (appointmentsError) throw appointmentsError;

        // Fetch sender profiles
        if (appointmentsData && appointmentsData.length > 0) {
          const senderIds = [...new Set(appointmentsData.map(a => a.sender_id))];
          const { data: sendersData } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email')
            .in('id', senderIds);

          const sendersMap = new Map(sendersData?.map(s => [s.id, s]) || []);
          const recipientMap = new Map(recipientRecords.map(r => [r.appointment_id, r]));

          const receivedWithDetails = appointmentsData.map(a => ({
            ...a,
            sender: sendersMap.get(a.sender_id),
            recipient_status: recipientMap.get(a.id)?.status || 'pending',
            recipient_record_id: recipientMap.get(a.id)?.id || '',
          }));

          setReceivedAppointments(receivedWithDetails);
        }
      } else {
        setReceivedAppointments([]);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (recipientRecordId: string, newStatus: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('appointment_recipients')
        .update({
          status: newStatus,
          response_date: new Date().toISOString(),
        })
        .eq('id', recipientRecordId);

      if (error) throw error;

      toast.success(`Appointment ${newStatus}`);
      fetchAppointments();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'read':
        return <Badge variant="outline">Read</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getMeetingTypeIcon = (type: string) => {
    switch (type) {
      case 'virtual':
        return <Video className="h-4 w-4" />;
      case 'phone':
        return <Phone className="h-4 w-4" />;
      default:
        return <MapPin className="h-4 w-4" />;
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  };

  const isUpcoming = (dateString: string) => new Date(dateString) >= new Date();

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-muted rounded animate-pulse" />
        ))}
      </div>
    );
  }

  const pendingReceivedCount = receivedAppointments.filter(a => a.recipient_status === 'pending').length;

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="mb-4">
        <TabsTrigger value="received" className="flex items-center gap-2">
          <Inbox className="h-4 w-4" />
          Received
          {pendingReceivedCount > 0 && (
            <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
              {pendingReceivedCount}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="sent" className="flex items-center gap-2">
          <Send className="h-4 w-4" />
          Sent
        </TabsTrigger>
      </TabsList>

      <TabsContent value="received" className="space-y-4">
        {receivedAppointments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-xl font-semibold mb-2">No Received Appointments</p>
              <p className="text-muted-foreground text-center">
                You haven't received any appointment requests yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          receivedAppointments.map((appointment) => {
            const dateTime = formatDateTime(appointment.appointment_date);
            const upcoming = isUpcoming(appointment.appointment_date);
            
            return (
              <Card 
                key={appointment.id} 
                className={`border-l-4 ${
                  appointment.recipient_status === 'pending' 
                    ? 'border-l-yellow-500' 
                    : appointment.recipient_status === 'approved'
                    ? 'border-l-green-500'
                    : 'border-l-muted'
                } ${!upcoming ? 'opacity-75' : ''}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {getMeetingTypeIcon(appointment.meeting_type)}
                        {appointment.title}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <User className="h-3 w-3" />
                        From: {appointment.sender?.first_name} {appointment.sender?.last_name}
                        <span className="text-xs">({roleLabels[appointment.sender_role] || appointment.sender_role})</span>
                      </CardDescription>
                    </div>
                    {getStatusBadge(appointment.recipient_status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3 mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{dateTime.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{dateTime.time} ({appointment.duration_minutes} min)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getMeetingTypeIcon(appointment.meeting_type)}
                      <span className="text-sm capitalize">{appointment.meeting_type.replace('_', ' ')}</span>
                    </div>
                  </div>

                  {appointment.message && (
                    <div className="p-3 bg-muted rounded-lg mb-4">
                      <p className="text-sm">{appointment.message}</p>
                    </div>
                  )}

                  {appointment.recipient_status === 'pending' && upcoming && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleUpdateStatus(appointment.recipient_record_id, 'approved')}
                        className="flex items-center gap-1"
                      >
                        <Check className="h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateStatus(appointment.recipient_record_id, 'rejected')}
                        className="flex items-center gap-1"
                      >
                        <X className="h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </TabsContent>

      <TabsContent value="sent" className="space-y-4">
        {sentAppointments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Send className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-xl font-semibold mb-2">No Sent Appointments</p>
              <p className="text-muted-foreground text-center">
                You haven't sent any appointment requests yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          sentAppointments.map((appointment) => {
            const dateTime = formatDateTime(appointment.appointment_date);
            const upcoming = isUpcoming(appointment.appointment_date);
            const recipients = sentRecipients[appointment.id] || [];
            
            return (
              <Card 
                key={appointment.id} 
                className={`border-l-4 border-l-primary ${!upcoming ? 'opacity-75' : ''}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {getMeetingTypeIcon(appointment.meeting_type)}
                        {appointment.title}
                      </CardTitle>
                      <CardDescription>
                        Sent on {new Date(appointment.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <Badge variant="outline">
                      {recipients.length} recipient(s)
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3 mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{dateTime.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{dateTime.time} ({appointment.duration_minutes} min)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getMeetingTypeIcon(appointment.meeting_type)}
                      <span className="text-sm capitalize">{appointment.meeting_type.replace('_', ' ')}</span>
                    </div>
                  </div>

                  {appointment.message && (
                    <div className="p-3 bg-muted rounded-lg mb-4">
                      <p className="text-sm">{appointment.message}</p>
                    </div>
                  )}

                  {/* Recipients status */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Recipients:</p>
                    <div className="flex flex-wrap gap-2">
                      {recipients.map(r => (
                        <div key={r.id} className="flex items-center gap-2 text-sm border rounded-lg px-2 py-1">
                          <span>{r.recipient?.first_name} {r.recipient?.last_name}</span>
                          {getStatusBadge(r.status)}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </TabsContent>
    </Tabs>
  );
});

AppointmentsList.displayName = 'AppointmentsList';

export default AppointmentsList;
