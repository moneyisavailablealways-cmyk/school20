import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Calendar, Clock, Edit, Trash2, Users, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TimetableEntry {
  id: string;
  day: string;
  time_slot: string;
  subject: string;
  teacher: string;
  class: string;
  room: string;
  duration: number;
}

interface TimeSlot {
  id: string;
  start_time: string;
  end_time: string;
  duration: number;
}

const Timetable = () => {
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedDay, setSelectedDay] = useState<string>('all');
  const [isNewEntryDialogOpen, setIsNewEntryDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);

  const [entryForm, setEntryForm] = useState({
    day: '',
    time_slot: '',
    subject: '',
    teacher: '',
    class: '',
    room: '',
    duration: '45',
  });

  const { toast } = useToast();

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch classes
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('*')
        .order('level', { ascending: true });
      
      if (classError) throw classError;
      setClasses(classData || []);

      // Fetch subjects
      const { data: subjectData, error: subjectError } = await supabase
        .from('subjects')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });
      
      if (subjectError) throw subjectError;
      setSubjects(subjectData || []);

      // Fetch teachers
      const { data: teacherData, error: teacherError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('role', ['teacher', 'head_teacher'])
        .eq('is_active', true)
        .order('first_name', { ascending: true });
      
      if (teacherError) throw teacherError;
      setTeachers(teacherData || []);
      
      // Mock time slots for now
      const mockTimeSlots: TimeSlot[] = [
        { id: '1', start_time: '08:00', end_time: '08:45', duration: 45 },
        { id: '2', start_time: '08:45', end_time: '09:30', duration: 45 },
        { id: '3', start_time: '09:45', end_time: '10:30', duration: 45 },
        { id: '4', start_time: '10:30', end_time: '11:15', duration: 45 },
        { id: '5', start_time: '11:30', end_time: '12:15', duration: 45 },
        { id: '6', start_time: '13:00', end_time: '13:45', duration: 45 },
        { id: '7', start_time: '13:45', end_time: '14:30', duration: 45 },
        { id: '8', start_time: '14:30', end_time: '15:15', duration: 45 },
      ];

      setTimeSlots(mockTimeSlots);
      setTimetableEntries([]);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch timetable data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const newEntry: TimetableEntry = {
        id: Date.now().toString(),
        ...entryForm,
        duration: parseInt(entryForm.duration),
      };

      if (editingEntry) {
        setTimetableEntries(prev => 
          prev.map(entry => entry.id === editingEntry.id ? { ...newEntry, id: editingEntry.id } : entry)
        );
        toast({
          title: 'Success',
          description: 'Timetable entry updated successfully',
        });
      } else {
        setTimetableEntries(prev => [newEntry, ...prev]);
        toast({
          title: 'Success',
          description: 'Timetable entry added successfully',
        });
      }
      
      setEntryForm({
        day: '',
        time_slot: '',
        subject: '',
        teacher: '',
        class: '',
        room: '',
        duration: '45',
      });
      
      setIsNewEntryDialogOpen(false);
      setEditingEntry(null);
    } catch (error: any) {
      console.error('Error saving entry:', error);
      toast({
        title: 'Error',
        description: 'Failed to save timetable entry',
        variant: 'destructive',
      });
    }
  };

  const handleEditEntry = (entry: TimetableEntry) => {
    setEditingEntry(entry);
    setEntryForm({
      day: entry.day,
      time_slot: entry.time_slot,
      subject: entry.subject,
      teacher: entry.teacher,
      class: entry.class,
      room: entry.room,
      duration: entry.duration.toString(),
    });
    setIsNewEntryDialogOpen(true);
  };

  const handleDeleteEntry = async (id: string) => {
    if (!confirm('Are you sure you want to delete this schedule entry?')) {
      return;
    }

    try {
      setTimetableEntries(prev => prev.filter(entry => entry.id !== id));
      
      // Log activity
      await supabase.rpc('log_activity', {
        p_activity_type: 'schedule_deleted',
        p_description: 'Schedule entry deleted from timetable',
        p_metadata: { schedule_id: id }
      });

      toast({
        title: 'Success',
        description: 'Timetable entry deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting entry:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete timetable entry',
        variant: 'destructive',
      });
    }
  };

  const filteredEntries = timetableEntries.filter(entry => {
    const matchesClass = selectedClass === 'all' || entry.class === selectedClass;
    const matchesDay = selectedDay === 'all' || entry.day === selectedDay;
    return matchesClass && matchesDay;
  });

  // Group entries by day and time for grid view
  const groupedEntries = days.reduce((acc, day) => {
    acc[day] = filteredEntries.filter(entry => entry.day === day).sort((a, b) => {
      const timeA = a.time_slot.split(' - ')[0];
      const timeB = b.time_slot.split(' - ')[0];
      return timeA.localeCompare(timeB);
    });
    return acc;
  }, {} as Record<string, TimetableEntry[]>);

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
          <h1 className="text-3xl font-bold">Timetable Management</h1>
          <p className="text-muted-foreground">Manage class schedules and time slots</p>
        </div>
        <Dialog open={isNewEntryDialogOpen} onOpenChange={setIsNewEntryDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingEntry(null);
              setEntryForm({
                day: '',
                time_slot: '',
                subject: '',
                teacher: '',
                class: '',
                room: '',
                duration: '45',
              });
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingEntry ? 'Edit Schedule' : 'Add New Schedule'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitEntry} className="space-y-4">
              <div>
                <Label htmlFor="day">Day</Label>
                <Select value={entryForm.day} onValueChange={(value) => setEntryForm(prev => ({ ...prev, day: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    {days.map((day) => (
                      <SelectItem key={day} value={day}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="time_slot">Time Slot</Label>
                <Select value={entryForm.time_slot} onValueChange={(value) => setEntryForm(prev => ({ ...prev, time_slot: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select time slot" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((slot) => (
                      <SelectItem key={slot.id} value={`${slot.start_time} - ${slot.end_time}`}>
                        {slot.start_time} - {slot.end_time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="class">Class</Label>
                <Select value={entryForm.class} onValueChange={(value) => setEntryForm(prev => ({ ...prev, class: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.name}>{cls.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="subject">Subject</Label>
                <Select value={entryForm.subject} onValueChange={(value) => setEntryForm(prev => ({ ...prev, subject: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.name}>{subject.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="teacher">Teacher</Label>
                <Select value={entryForm.teacher} onValueChange={(value) => setEntryForm(prev => ({ ...prev, teacher: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map((teacher) => (
                      <SelectItem key={teacher.id} value={`${teacher.first_name} ${teacher.last_name}`}>
                        {teacher.first_name} {teacher.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="room">Room</Label>
                <Input
                  id="room"
                  value={entryForm.room}
                  onChange={(e) => setEntryForm(prev => ({ ...prev, room: e.target.value }))}
                  placeholder="e.g., Room 101, Lab 1"
                  required
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsNewEntryDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingEntry ? 'Update' : 'Add'} Schedule
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Schedules</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{timetableEntries.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Classes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{new Set(timetableEntries.map(e => e.class)).size}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subjects</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{new Set(timetableEntries.map(e => e.subject)).size}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.name}>{cls.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedDay} onValueChange={setSelectedDay}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by day" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Days</SelectItem>
                {days.map((day) => (
                  <SelectItem key={day} value={day}>{day}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Timetable Grid View */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Timetable</CardTitle>
          <CardDescription>Class schedule overview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="grid grid-cols-6 gap-2 min-w-[800px]">
              <div className="font-semibold p-2 border rounded">Time</div>
              {days.map(day => (
                <div key={day} className="font-semibold p-2 border rounded text-center">
                  {day}
                </div>
              ))}
              
              {timeSlots.map(slot => (
                <React.Fragment key={slot.id}>
                  <div className="p-2 border rounded text-sm font-medium">
                    {slot.start_time}<br />-<br />{slot.end_time}
                  </div>
                  {days.map(day => {
                    const entry = groupedEntries[day]?.find(e => 
                      e.time_slot === `${slot.start_time} - ${slot.end_time}`
                    );
                    
                    return (
                      <div key={`${day}-${slot.id}`} className="p-2 border rounded min-h-[80px]">
                        {entry && (
                          <div className="bg-primary/10 p-2 rounded text-xs">
                            <div className="font-medium">{entry.subject}</div>
                            <div className="text-muted-foreground">{entry.class}</div>
                            <div className="text-muted-foreground">{entry.teacher}</div>
                            <div className="text-muted-foreground">{entry.room}</div>
                            <div className="flex space-x-1 mt-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditEntry(entry)}
                                className="h-6 w-6 p-0"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteEntry(entry.id)}
                                className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule List */}
      <Card>
        <CardHeader>
          <CardTitle>Schedule List</CardTitle>
          <CardDescription>All scheduled classes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Day</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <Badge variant="outline">{entry.day}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {entry.time_slot}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{entry.class}</TableCell>
                    <TableCell>{entry.subject}</TableCell>
                    <TableCell>{entry.teacher}</TableCell>
                    <TableCell>{entry.room}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditEntry(entry)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteEntry(entry.id)}
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
          
          {filteredEntries.length === 0 && (
            <div className="text-center py-8">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium">No schedules found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Get started by creating a new class schedule.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Timetable;