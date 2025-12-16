import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Calendar, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Recipient {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

interface CreateAppointmentDialogProps {
  onSuccess?: () => void;
}

const roleLabels: Record<string, string> = {
  teacher: 'Teacher',
  parent: 'Parent',
  student: 'Student',
  head_teacher: 'Head Teacher',
  principal: 'Principal',
  bursar: 'Bursar',
  librarian: 'Librarian',
};

const CreateAppointmentDialog: React.FC<CreateAppointmentDialogProps> = ({ onSuccess }) => {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [filterRole, setFilterRole] = useState<string>('all');
  
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    appointment_date: '',
    appointment_time: '',
    duration_minutes: '30',
    meeting_type: 'in_person',
  });

  useEffect(() => {
    if (open) {
      fetchRecipients();
    }
  }, [open, filterRole]);

  const fetchRecipients = async () => {
    try {
      let query = supabase
        .from('profiles')
        .select('id, first_name, last_name, email, role')
        .eq('is_active', true)
        .neq('id', profile?.id || ''); // Exclude self

      if (filterRole !== 'all') {
        query = query.eq('role', filterRole as 'admin' | 'bursar' | 'head_teacher' | 'librarian' | 'parent' | 'principal' | 'student' | 'teacher');
      }

      const { data, error } = await query.order('first_name');

      if (error) throw error;
      setRecipients(data || []);
    } catch (error) {
      console.error('Error fetching recipients:', error);
    }
  };

  const handleRecipientToggle = (recipientId: string) => {
    setSelectedRecipients(prev =>
      prev.includes(recipientId)
        ? prev.filter(id => id !== recipientId)
        : [...prev, recipientId]
    );
  };

  const handleSelectAll = () => {
    if (selectedRecipients.length === recipients.length) {
      setSelectedRecipients([]);
    } else {
      setSelectedRecipients(recipients.map(r => r.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('[Appointments] Starting appointment creation...');
    console.log('[Appointments] Sender ID:', profile?.id);
    console.log('[Appointments] Sender Role:', profile?.role);
    console.log('[Appointments] Selected Recipients:', selectedRecipients);
    
    // Validation with specific error messages
    if (!profile?.id || !profile?.role) {
      const errorMsg = 'User profile not found. Please log in again.';
      console.error('[Appointments] Error:', errorMsg);
      toast.error(errorMsg);
      return;
    }

    if (selectedRecipients.length === 0) {
      const errorMsg = 'Missing required field: Please select at least one recipient.';
      console.error('[Appointments] Error:', errorMsg);
      toast.error(errorMsg);
      return;
    }

    if (!formData.title.trim()) {
      const errorMsg = 'Missing required field: Title is required.';
      console.error('[Appointments] Error:', errorMsg);
      toast.error(errorMsg);
      return;
    }

    if (!formData.appointment_date || !formData.appointment_time) {
      const errorMsg = 'Missing required field: Date and time are required.';
      console.error('[Appointments] Error:', errorMsg);
      toast.error(errorMsg);
      return;
    }

    // Validate date is not in the past
    const appointmentDateTime = new Date(`${formData.appointment_date}T${formData.appointment_time}`);
    if (appointmentDateTime < new Date()) {
      const errorMsg = 'Appointment date and time cannot be in the past.';
      console.error('[Appointments] Error:', errorMsg);
      toast.error(errorMsg);
      return;
    }

    setLoading(true);

    try {
      const appointmentDate = appointmentDateTime.toISOString();
      
      console.log('[Appointments] Inserting appointment request...');
      console.log('[Appointments] Appointment data:', {
        title: formData.title.trim(),
        appointment_date: appointmentDate,
        duration_minutes: parseInt(formData.duration_minutes),
        meeting_type: formData.meeting_type,
        sender_id: profile.id,
        sender_role: profile.role,
        status: 'pending',
      });

      // Create the appointment request
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointment_requests')
        .insert({
          title: formData.title.trim(),
          message: formData.message.trim() || null,
          appointment_date: appointmentDate,
          duration_minutes: parseInt(formData.duration_minutes),
          meeting_type: formData.meeting_type,
          sender_id: profile.id,
          sender_role: profile.role,
          status: 'pending',
        })
        .select()
        .single();

      if (appointmentError) {
        console.error('[Appointments] Database error creating appointment:', appointmentError);
        
        // Provide specific error messages based on error code
        let userMessage = 'Failed to create appointment: ';
        if (appointmentError.code === '42501') {
          userMessage += 'Permission denied. RLS policy may be blocking the insert.';
        } else if (appointmentError.code === '23502') {
          userMessage += 'Missing required field in database.';
        } else if (appointmentError.code === '42P17') {
          userMessage += 'Database policy configuration error. Please contact support.';
        } else {
          userMessage += appointmentError.message || 'Unknown database error.';
        }
        
        toast.error(userMessage);
        return;
      }

      console.log('[Appointments] Appointment created successfully:', appointment.id);
      console.log('[Appointments] Adding recipients...');

      // Add recipients
      const recipientRecords = selectedRecipients.map(recipientId => {
        const recipient = recipients.find(r => r.id === recipientId);
        return {
          appointment_id: appointment.id,
          recipient_id: recipientId,
          recipient_role: recipient?.role || 'unknown',
          status: 'pending',
        };
      });

      console.log('[Appointments] Recipient records to insert:', recipientRecords);

      const { error: recipientsError } = await supabase
        .from('appointment_recipients')
        .insert(recipientRecords);

      if (recipientsError) {
        console.error('[Appointments] Database error adding recipients:', recipientsError);
        
        let userMessage = 'Appointment created but failed to add recipients: ';
        if (recipientsError.code === '42501') {
          userMessage += 'Permission denied for adding recipients.';
        } else if (recipientsError.code === '23503') {
          userMessage += 'Invalid recipient reference.';
        } else {
          userMessage += recipientsError.message || 'Unknown error.';
        }
        
        toast.error(userMessage);
        return;
      }

      console.log('[Appointments] Recipients added successfully');
      console.log('[Appointments] Appointment creation completed successfully');
      
      toast.success(`Appointment request sent to ${selectedRecipients.length} recipient(s)`);
      setOpen(false);
      resetForm();
      onSuccess?.();
    } catch (error: any) {
      console.error('[Appointments] Unexpected error:', error);
      
      const errorMessage = error?.message || 'An unexpected error occurred';
      toast.error(`Failed to create appointment: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      message: '',
      appointment_date: '',
      appointment_time: '',
      duration_minutes: '30',
      meeting_type: 'in_person',
    });
    setSelectedRecipients([]);
    setFilterRole('all');
  };

  // Admin cannot create appointments
  if (profile?.role === 'admin') {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Appointment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Create Appointment Request
          </DialogTitle>
          <DialogDescription>
            Request a meeting with staff members or other users
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4 pb-4">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Meeting title or purpose"
                  required
                />
              </div>

              {/* Message */}
              <div className="space-y-2">
                <Label htmlFor="message">Message / Details</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Additional details about the meeting..."
                  rows={3}
                />
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.appointment_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, appointment_date: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Time *</Label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.appointment_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, appointment_time: e.target.value }))}
                    required
                  />
                </div>
              </div>

              {/* Duration & Meeting Type */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration</Label>
                  <Select
                    value={formData.duration_minutes}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, duration_minutes: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="90">1.5 hours</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meetingType">Meeting Type</Label>
                  <Select
                    value={formData.meeting_type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, meeting_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_person">In Person</SelectItem>
                      <SelectItem value="virtual">Virtual</SelectItem>
                      <SelectItem value="phone">Phone Call</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Recipients Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Select Recipients *
                  </Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                      disabled={recipients.length === 0}
                    >
                      {selectedRecipients.length === recipients.length && recipients.length > 0 ? 'Deselect All' : 'Select All'}
                    </Button>
                    <Select value={filterRole} onValueChange={setFilterRole}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Filter by role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="teacher">Teachers</SelectItem>
                        <SelectItem value="parent">Parents</SelectItem>
                        <SelectItem value="head_teacher">Head Teachers</SelectItem>
                        <SelectItem value="principal">Principals</SelectItem>
                        <SelectItem value="bursar">Bursars</SelectItem>
                        <SelectItem value="librarian">Librarians</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="border rounded-lg p-2 max-h-48 overflow-y-auto">
                  {recipients.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No recipients found
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {recipients.map((recipient) => (
                        <label
                          key={recipient.id}
                          className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedRecipients.includes(recipient.id)}
                            onCheckedChange={() => handleRecipientToggle(recipient.id)}
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              {recipient.first_name} {recipient.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {roleLabels[recipient.role] || recipient.role} • {recipient.email}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                {selectedRecipients.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {selectedRecipients.length} recipient(s) selected
                  </p>
                )}
              </div>
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Sending...' : 'Send Request'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateAppointmentDialog;
