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
  const [autoTeacher, setAutoTeacher] = useState<Teacher | null>(null);
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

  // Auto-fill teacher when class and subject are both selected
  useEffect(() => {
    if (formData.class_id && formData.subject_id) {
      fetchTeacherForClassSubject(formData.class_id, formData.subject_id);
    } else {
      setAutoTeacher(null);
      setFormData(prev => ({ ...prev, teacher_id: '' }));
    }
  }, [formData.class_id, formData.subject_id]);

  const fetchData = async () => {
    try {
      const [{ data: classData, error: classError }, { data: subjectData, error: subjectError }] = await Promise.all([
        supabase.from('classes').select('id, name').order('name'),
        supabase.from('subjects').select('id, name, code').eq('is_active', true).order('name'),
      ]);

      if (classError) throw classError;
      if (subjectError) throw subjectError;

      setClasses(classData || []);
      setSubjects(subjectData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load form data',
        variant: 'destructive'
      });
    }
  };

  const fetchTeacherForClassSubject = async (classId: string, subjectId: string) => {
    try {
      const { data, error } = await supabase
        .from('teacher_enrollments')
        .select('teacher_id, teacher:profiles!fk_teacher_enrollments_teacher_id(id, first_name, last_name)')
        .eq('class_id', classId)
        .eq('subject_id', subjectId)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data?.teacher && !Array.isArray(data.teacher)) {
        const teacher = data.teacher as Teacher;
        setAutoTeacher(teacher);
        setFormData(prev => ({ ...prev, teacher_id: teacher.id }));
      } else {
        setAutoTeacher(null);
        setFormData(prev => ({ ...prev, teacher_id: '' }));
        if (formData.class_id && formData.subject_id) {
          toast({
            title: 'No teacher assigned',
            description: 'No teacher is assigned to this class and subject combination. Please assign a teacher first.',
            variant: 'destructive'
          });
        }
      }
    } catch (error) {
      console.error('Error fetching teacher:', error);
      setAutoTeacher(null);
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
        setIsLoading(false);
        return;
      }

      const { error } = await supabase
        .from('timetables')
        .insert([{
          class_id: formData.class_id,
          subject_id: formData.subject_id,
          teacher_id: formData.teacher_id,
          day_of_week: parseInt(formData.day_of_week),
          start_time: formData.start_time,
          end_time: formData.end_time,
          room_number: formData.room_number || null
        }]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Schedule added successfully'
      });

      setFormData({
        class_id: '',
        subject_id: '',
        teacher_id: '',
        day_of_week: '',
        start_time: '',
        end_time: '',
        room_number: ''
      });
      setAutoTeacher(null);

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
            <Input
              id="teacher"
              value={autoTeacher ? `${autoTeacher.first_name} ${autoTeacher.last_name}` : 'Select class & subject first'}
              readOnly
              className="bg-muted cursor-not-allowed"
            />
            {formData.class_id && formData.subject_id && !autoTeacher && (
              <p className="text-xs text-destructive">No teacher assigned to this class/subject combination.</p>
            )}
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
            <Label htmlFor="room_number">Room Number <span className="text-muted-foreground text-xs">(optional)</span></Label>
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
            <Button type="submit" disabled={isLoading || !autoTeacher}>
              {isLoading ? 'Adding...' : 'Add Schedule'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddTimetableDialog;
