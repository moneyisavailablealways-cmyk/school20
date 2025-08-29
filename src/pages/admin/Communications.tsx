import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Plus, 
  Send, 
  MessageCircle, 
  Megaphone, 
  Mail, 
  Bell, 
  Users, 
  Calendar,
  Eye,
  Edit,
  Trash2,
  Search,
  Filter
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Announcement {
  id: string;
  title: string;
  content: string;
  target_audience: string[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
  published_date: string;
  expiry_date?: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
}

interface Message {
  id: string;
  subject: string;
  content: string;
  recipients: string[];
  sent_date: string;
  sent_by: string;
  message_type: 'email' | 'sms' | 'notification';
  status: 'draft' | 'sent' | 'scheduled';
  read_count: number;
  total_recipients: number;
}

const Communications = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('announcements');
  const [isAnnouncementDialogOpen, setIsAnnouncementDialogOpen] = useState(false);
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [announcementForm, setAnnouncementForm] = useState<{
    title: string;
    content: string;
    target_audience: string[];
    priority: 'low' | 'normal' | 'high' | 'urgent';
    expiry_date: string;
  }>({
    title: '',
    content: '',
    target_audience: [],
    priority: 'normal',
    expiry_date: '',
  });

  const [messageForm, setMessageForm] = useState({
    subject: '',
    content: '',
    recipients: [] as string[],
    message_type: 'email' as const,
    schedule_date: '',
  });

  const { toast } = useToast();

  const audienceOptions = [
    { value: 'all', label: 'All Users' },
    { value: 'students', label: 'Students' },
    { value: 'parents', label: 'Parents' },
    { value: 'teachers', label: 'Teachers' },
    { value: 'staff', label: 'Staff' },
  ];

  const priorityColors = {
    low: 'bg-gray-100 text-gray-800',
    normal: 'bg-blue-100 text-blue-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800',
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch announcements
      const { data: announcementsData, error: announcementsError } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (announcementsError) {
        console.error('Error fetching announcements:', announcementsError);
      }

      // Mock messages data (since we don't have a messages table yet)
      const mockMessages: Message[] = [
        {
          id: '1',
          subject: 'Parent-Teacher Conference Reminder',
          content: 'Dear parents, this is a reminder about the upcoming parent-teacher conference...',
          recipients: ['parents'],
          sent_date: '2024-01-25',
          sent_by: 'Admin User',
          message_type: 'email',
          status: 'sent',
          read_count: 45,
          total_recipients: 60,
        },
        {
          id: '2',
          subject: 'School Sports Day',
          content: 'All students are invited to participate in the annual sports day...',
          recipients: ['students', 'parents'],
          sent_date: '2024-01-20',
          sent_by: 'Sports Coordinator',
          message_type: 'notification',
          status: 'sent',
          read_count: 120,
          total_recipients: 150,
        },
      ];

      setAnnouncements((announcementsData as Announcement[]) || []);
      setMessages(mockMessages);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch communications data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const newAnnouncement = {
        title: announcementForm.title,
        content: announcementForm.content,
        target_audience: announcementForm.target_audience,
        priority: announcementForm.priority,
        expiry_date: announcementForm.expiry_date || null,
        is_active: true,
      };

      if (selectedAnnouncement) {
        const { data, error } = await supabase
          .from('announcements')
          .update(newAnnouncement)
          .eq('id', selectedAnnouncement.id)
          .select()
          .single();

        if (error) throw error;

        setAnnouncements(prev => 
          prev.map(ann => ann.id === selectedAnnouncement.id ? (data as Announcement) : ann)
        );

        toast({
          title: 'Success',
          description: 'Announcement updated successfully',
        });
      } else {
        const { data, error } = await supabase
          .from('announcements')
          .insert([newAnnouncement])
          .select()
          .single();

        if (error) throw error;

        setAnnouncements(prev => [(data as Announcement), ...prev]);

        toast({
          title: 'Success',
          description: 'Announcement created successfully',
        });
      }
      
      setAnnouncementForm({
        title: '',
        content: '',
        target_audience: [],
        priority: 'normal',
        expiry_date: '',
      });
      
      setIsAnnouncementDialogOpen(false);
      setSelectedAnnouncement(null);
    } catch (error: any) {
      console.error('Error saving announcement:', error);
      toast({
        title: 'Error',
        description: 'Failed to save announcement',
        variant: 'destructive',
      });
    }
  };

  const handleSubmitMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const newMessage: Message = {
        id: Date.now().toString(),
        subject: messageForm.subject,
        content: messageForm.content,
        recipients: messageForm.recipients,
        message_type: messageForm.message_type,
        sent_date: messageForm.schedule_date || new Date().toISOString().split('T')[0],
        sent_by: 'Current User',
        status: messageForm.schedule_date ? 'scheduled' : 'sent',
        read_count: 0,
        total_recipients: messageForm.recipients.length * 50, // Mock calculation
      };

      setMessages(prev => [newMessage, ...prev]);
      
      setMessageForm({
        subject: '',
        content: '',
        recipients: [],
        message_type: 'email',
        schedule_date: '',
      });
      
      setIsMessageDialogOpen(false);
      
      toast({
        title: 'Success',
        description: messageForm.schedule_date ? 'Message scheduled successfully' : 'Message sent successfully',
      });
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    }
  };

  const handleEditAnnouncement = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setAnnouncementForm({
      title: announcement.title,
      content: announcement.content,
      target_audience: announcement.target_audience,
      priority: announcement.priority,
      expiry_date: announcement.expiry_date || '',
    });
    setIsAnnouncementDialogOpen(true);
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAnnouncements(prev => prev.filter(ann => ann.id !== id));
      
      toast({
        title: 'Success',
        description: 'Announcement deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting announcement:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete announcement',
        variant: 'destructive',
      });
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colorClass = priorityColors[priority as keyof typeof priorityColors] || priorityColors.normal;
    return (
      <Badge className={colorClass}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-100 text-green-800">Sent</Badge>;
      case 'scheduled':
        return <Badge className="bg-blue-100 text-blue-800">Scheduled</Badge>;
      case 'draft':
        return <Badge className="bg-gray-100 text-gray-800">Draft</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleAudienceChange = (audience: string, checked: boolean) => {
    if (checked) {
      setAnnouncementForm(prev => ({
        ...prev,
        target_audience: [...prev.target_audience, audience]
      }));
    } else {
      setAnnouncementForm(prev => ({
        ...prev,
        target_audience: prev.target_audience.filter(a => a !== audience)
      }));
    }
  };

  const handleRecipientsChange = (recipient: string, checked: boolean) => {
    if (checked) {
      setMessageForm(prev => ({
        ...prev,
        recipients: [...prev.recipients, recipient]
      }));
    } else {
      setMessageForm(prev => ({
        ...prev,
        recipients: prev.recipients.filter(r => r !== recipient)
      }));
    }
  };

  const filteredAnnouncements = announcements.filter(ann =>
    ann.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ann.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMessages = messages.filter(msg =>
    msg.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    msg.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Communications</h1>
          <p className="text-muted-foreground">Manage announcements and messages</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
        </TabsList>

        <TabsContent value="announcements" className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search announcements..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Dialog open={isAnnouncementDialogOpen} onOpenChange={setIsAnnouncementDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setSelectedAnnouncement(null);
                  setAnnouncementForm({
                    title: '',
                    content: '',
                    target_audience: [],
                    priority: 'normal',
                    expiry_date: '',
                  });
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Announcement
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {selectedAnnouncement ? 'Edit Announcement' : 'New Announcement'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmitAnnouncement} className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={announcementForm.title}
                      onChange={(e) => setAnnouncementForm(prev => ({ ...prev, title: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="content">Content</Label>
                    <Textarea
                      id="content"
                      value={announcementForm.content}
                      onChange={(e) => setAnnouncementForm(prev => ({ ...prev, content: e.target.value }))}
                      rows={4}
                      required
                    />
                  </div>

                  <div>
                    <Label>Target Audience</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {audienceOptions.map((option) => (
                        <div key={option.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={option.value}
                            checked={announcementForm.target_audience.includes(option.value)}
                            onCheckedChange={(checked) => 
                              handleAudienceChange(option.value, checked as boolean)
                            }
                          />
                          <Label htmlFor={option.value} className="text-sm">
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="priority">Priority</Label>
                      <Select 
                        value={announcementForm.priority} 
                        onValueChange={(value: 'low' | 'normal' | 'high' | 'urgent') => setAnnouncementForm(prev => ({ ...prev, priority: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="expiry_date">Expiry Date (Optional)</Label>
                      <Input
                        id="expiry_date"
                        type="date"
                        value={announcementForm.expiry_date}
                        onChange={(e) => setAnnouncementForm(prev => ({ ...prev, expiry_date: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsAnnouncementDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {selectedAnnouncement ? 'Update' : 'Publish'} Announcement
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Active Announcements</CardTitle>
              <CardDescription>Manage school-wide announcements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Target Audience</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Published Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAnnouncements.map((announcement) => (
                      <TableRow key={announcement.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{announcement.title}</p>
                            <p className="text-sm text-muted-foreground truncate max-w-xs">
                              {announcement.content}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {announcement.target_audience.map((audience) => (
                              <Badge key={audience} variant="outline" className="text-xs">
                                {audienceOptions.find(opt => opt.value === audience)?.label || audience}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>{getPriorityBadge(announcement.priority)}</TableCell>
                        <TableCell>
                          {announcement.published_date 
                            ? format(new Date(announcement.published_date), 'MMM dd, yyyy')
                            : 'Not published'
                          }
                        </TableCell>
                        <TableCell>
                          <Badge className={announcement.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {announcement.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditAnnouncement(announcement)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteAnnouncement(announcement.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {filteredAnnouncements.length === 0 && (
                <div className="text-center py-8">
                  <Megaphone className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-medium">No announcements found</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {searchTerm 
                      ? 'Try adjusting your search criteria.'
                      : 'Get started by creating your first announcement.'
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages" className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search messages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Message
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Send New Message</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmitMessage} className="space-y-4">
                  <div>
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      value={messageForm.subject}
                      onChange={(e) => setMessageForm(prev => ({ ...prev, subject: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="content">Message Content</Label>
                    <Textarea
                      id="content"
                      value={messageForm.content}
                      onChange={(e) => setMessageForm(prev => ({ ...prev, content: e.target.value }))}
                      rows={5}
                      required
                    />
                  </div>

                  <div>
                    <Label>Recipients</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {audienceOptions.slice(1).map((option) => (
                        <div key={option.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`msg-${option.value}`}
                            checked={messageForm.recipients.includes(option.value)}
                            onCheckedChange={(checked) => 
                              handleRecipientsChange(option.value, checked as boolean)
                            }
                          />
                          <Label htmlFor={`msg-${option.value}`} className="text-sm">
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="message_type">Message Type</Label>
                      <Select 
                        value={messageForm.message_type} 
                        onValueChange={(value: any) => setMessageForm(prev => ({ ...prev, message_type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="sms">SMS</SelectItem>
                          <SelectItem value="notification">In-App Notification</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="schedule_date">Schedule Date (Optional)</Label>
                      <Input
                        id="schedule_date"
                        type="datetime-local"
                        value={messageForm.schedule_date}
                        onChange={(e) => setMessageForm(prev => ({ ...prev, schedule_date: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsMessageDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      <Send className="h-4 w-4 mr-2" />
                      {messageForm.schedule_date ? 'Schedule' : 'Send'} Message
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Message History</CardTitle>
              <CardDescription>View sent and scheduled messages</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Recipients</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Sent Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Engagement</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMessages.map((message) => (
                      <TableRow key={message.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{message.subject}</p>
                            <p className="text-sm text-muted-foreground truncate max-w-xs">
                              {message.content}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {message.recipients.map((recipient) => (
                              <Badge key={recipient} variant="outline" className="text-xs">
                                {audienceOptions.find(opt => opt.value === recipient)?.label || recipient}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            {message.message_type === 'email' && <Mail className="h-4 w-4" />}
                            {message.message_type === 'sms' && <MessageCircle className="h-4 w-4" />}
                            {message.message_type === 'notification' && <Bell className="h-4 w-4" />}
                            <span className="capitalize">{message.message_type}</span>
                          </div>
                        </TableCell>
                        <TableCell>{format(new Date(message.sent_date), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>{getStatusBadge(message.status)}</TableCell>
                        <TableCell>
                          {message.status === 'sent' && (
                            <div className="text-sm">
                              <p>{message.read_count}/{message.total_recipients} read</p>
                              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                <div 
                                  className="bg-primary h-1.5 rounded-full" 
                                  style={{ width: `${(message.read_count / message.total_recipients) * 100}%` }}
                                ></div>
                              </div>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {filteredMessages.length === 0 && (
                <div className="text-center py-8">
                  <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-medium">No messages found</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {searchTerm 
                      ? 'Try adjusting your search criteria.'
                      : 'Get started by sending your first message.'
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Communications;