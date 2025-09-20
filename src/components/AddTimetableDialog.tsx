import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface Class {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
}

interface AddTimetableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const AddTimetableDialog: React.FC<AddTimetableDialogProps> = ({
  open,
  onOpenChange,
  onSuccess
}) => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    class_id: '',
    subject_id: '',
    teacher_id: '',
    day_of_week: '',
    start_time: '',
    end_time: '',
    room_number: ''
  });
  const { toast } = useToast();

  const daysOfWeek = [
    { value: '1', label: 'Monday' },
    { value: '2', label: 'Tuesday' },
    { value: '3', label: 'Wednesday' },
    { value: '4', label: 'Thursday' },
    { value: '5', label: 'Friday' },
    { value: '6', label: 'Saturday' },
    { value: '7', label: 'Sunday' }
  ];

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  const fetchData = async () => {
    try {
      // Fetch classes
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('id, name')
        .order('name');

      if (classError) throw classError;
      setClasses(classData || []);

      // Fetch subjects
      const { data: subjectData, error: subjectError } = await supabase
        .from('subjects')
        .select('id, name, code')
        .eq('is_active', true)
        .order('name');

      if (subjectError) throw subjectError;
      setSubjects(subjectData || []);

      // Fetch teachers
      const { data: teacherData, error: teacherError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('role', 'teacher')
        .eq('is_active', true)
        .order('first_name');

      if (teacherError) throw teacherError;
      setTeachers(teacherData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load form data',
        variant: 'destructive'
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.class_id || !formData.subject_id || !formData.teacher_id || !formData.day_of_week || !formData.start_time || !formData.end_time) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    // Validate time
    if (formData.start_time >= formData.end_time) {
      toast({
        title: 'Error',
        description: 'End time must be after start time',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);

    try {
      // Check for conflicts
      const { data: conflicts } = await supabase
        .from('timetables')
        .select('id')
        .eq('day_of_week', parseInt(formData.day_of_week))
        .eq('teacher_id', formData.teacher_id)
        .lte('start_time', formData.end_time)
        .gte('end_time', formData.start_time);

      if (conflicts && conflicts.length > 0) {
        toast({
          title: 'Error',
          description: 'Teacher has a conflicting schedule at this time',
          variant: 'destructive'
        });
        return;
      }

      const timetableData = {
        class_id: formData.class_id,
        subject_id: formData.subject_id,
        teacher_id: formData.teacher_id,
        day_of_week: parseInt(formData.day_of_week),
        start_time: formData.start_time,
        end_time: formData.end_time,
        room_number: formData.room_number || null
      };

      const { error } = await supabase
        .from('timetables')
        .insert([timetableData]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Schedule added successfully'
      });

      // Reset form
      setFormData({
        class_id: '',
        subject_id: '',
        teacher_id: '',
        day_of_week: '',
        start_time: '',
        end_time: '',
        room_number: ''
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error adding timetable entry:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add schedule',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Schedule</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="class">Class *</Label>
            <Select value={formData.class_id} onValueChange={(value) => setFormData(prev => ({ ...prev, class_id: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Select value={formData.subject_id} onValueChange={(value) => setFormData(prev => ({ ...prev, subject_id: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.code} - {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="teacher">Teacher *</Label>
            <Select value={formData.teacher_id} onValueChange={(value) => setFormData(prev => ({ ...prev, teacher_id: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select teacher" />
              </SelectTrigger>
              <SelectContent>
                {teachers.map((teacher) => (
                  <SelectItem key={teacher.id} value={teacher.id}>
                    {teacher.first_name} {teacher.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="day_of_week">Day of Week *</Label>
            <Select value={formData.day_of_week} onValueChange={(value) => setFormData(prev => ({ ...prev, day_of_week: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select day" />
              </SelectTrigger>
              <SelectContent>
                {daysOfWeek.map((day) => (
                  <SelectItem key={day.value} value={day.value}>
                    {day.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Start Time *</Label>
              <Input
                id="start_time"
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_time">End Time *</Label>
              <Input
                id="end_time"
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="room_number">Room Number</Label>
            <Input
              id="room_number"
              value={formData.room_number}
              onChange={(e) => setFormData(prev => ({ ...prev, room_number: e.target.value }))}
              placeholder="e.g., Room 101, Lab A"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Adding...' : 'Add Schedule'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddTimetableDialog;