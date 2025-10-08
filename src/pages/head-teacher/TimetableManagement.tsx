import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Calendar, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AddTimetableDialog from '@/components/AddTimetableDialog';
import EditTimetableDialog from '@/components/EditTimetableDialog';

interface TimetableEntry {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  room_number: string;
  subject?: {
    name: string;
  };
  teacher?: {
    first_name: string;
    last_name: string;
  };
  class?: {
    name: string;
  };
}

const TimetableManagement = () => {
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);

  const { toast } = useToast();

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Helper function to convert day number to day name
  const getDayName = (dayNumber: number): string => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return dayNames[dayNumber] || '';
  };

  useEffect(() => {
    fetchTimetableEntries();
  }, []);

  const fetchTimetableEntries = async () => {
    try {
      setLoading(true);
      
      const { data: timetableData, error: timetableError } = await supabase
        .from('timetables')
        .select(`
          id,
          day_of_week,
          start_time,
          end_time,
          room_number,
          class_id,
          subject_id,
          teacher_id,
          subject:subjects(name),
          teacher:profiles!timetables_teacher_id_fkey(first_name, last_name),
          class:classes(name)
        `)
        .order('day_of_week')
        .order('start_time');

      if (timetableError) throw timetableError;

      // Fetch classes for filter
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('id, name')
        .order('name');

      if (classesError) throw classesError;

      setTimetableEntries(timetableData || []);
      setClasses(classesData || []);
    } catch (error: any) {
      console.error('Error fetching timetable entries:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch timetable entries',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (entry: TimetableEntry) => {
    setEditingEntry(entry);
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this schedule entry?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('timetables')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Schedule entry deleted successfully',
      });

      fetchTimetableEntries();
    } catch (error: any) {
      console.error('Error deleting entry:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete schedule entry',
        variant: 'destructive',
      });
    }
  };

  const filteredEntries = timetableEntries.filter(entry => {
    const matchesClass = selectedClass === 'all' || entry.class?.name === selectedClass;
    const matchesDay = selectedDay === 'all' || getDayName(entry.day_of_week) === selectedDay;
    return matchesClass && matchesDay;
  });

  // Extract unique time slots and sort them
  const timeSlots = Array.from(
    new Set(filteredEntries.map(entry => `${entry.start_time}-${entry.end_time}`))
  ).sort();

  // Group entries by time slot and day
  const getEntryForSlotAndDay = (timeSlot: string, day: string): TimetableEntry | undefined => {
    const [startTime, endTime] = timeSlot.split('-');
    return filteredEntries.find(
      entry =>
        entry.start_time === startTime &&
        entry.end_time === endTime &&
        getDayName(entry.day_of_week) === day
    );
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Timetable Management</h1>
          <p className="text-muted-foreground">Manage class schedules and time slots</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Schedule
        </Button>
      </div>

      <AddTimetableDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSuccess={fetchTimetableEntries}
      />

      {editingEntry && (
        <EditTimetableDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          entry={editingEntry}
          onSuccess={fetchTimetableEntries}
        />
      )}

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

      {/* Weekly Timetable Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Timetable</CardTitle>
          <CardDescription>Class schedule overview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40 font-semibold text-base border-r bg-muted/30">Time</TableHead>
                  {days.map(day => (
                    <TableHead key={day} className="text-center font-semibold text-base border-r min-w-[180px] bg-muted/30">
                      {day}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {timeSlots.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
                      <h3 className="mt-2 text-sm font-medium">No schedules found</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Get started by creating a new class schedule.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  timeSlots.map((timeSlot) => {
                    const [startTime, endTime] = timeSlot.split('-');
                    return (
                      <TableRow key={timeSlot} className="border-b">
                        <TableCell className="font-medium text-sm align-top py-4 px-4 border-r bg-muted/20">
                          <div className="text-center">
                            <div className="font-semibold">{startTime}</div>
                            <div className="text-muted-foreground my-1">-</div>
                            <div className="font-semibold">{endTime}</div>
                          </div>
                        </TableCell>
                        {days.map(day => {
                          const entry = getEntryForSlotAndDay(timeSlot, day);
                          return (
                            <TableCell key={day} className="align-top p-3 border-r">
                              {entry ? (
                                <div className="bg-primary/10 p-3 rounded-md h-full min-h-[120px] flex flex-col">
                                  <div className="font-semibold text-sm mb-1.5 text-foreground">
                                    {entry.subject?.name}
                                  </div>
                                  <div className="text-xs text-muted-foreground space-y-1 flex-grow">
                                    <div className="font-medium">{entry.class?.name}</div>
                                    <div>
                                      {entry.teacher?.first_name} {entry.teacher?.last_name}
                                    </div>
                                    {entry.room_number && (
                                      <div className="font-medium">Room {entry.room_number}</div>
                                    )}
                                  </div>
                                  <div className="flex gap-1 mt-2 pt-2 border-t border-border/50">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleEdit(entry)}
                                      className="h-6 w-6"
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDelete(entry.id)}
                                      className="h-6 w-6 text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="h-full min-h-[120px]" />
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TimetableManagement;
