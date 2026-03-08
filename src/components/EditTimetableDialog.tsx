import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Class {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface TeacherOption {
  teacher_id: string;
  profile_id: string;
  first_name: string;
  last_name: string;
}

interface TimetableEntry {
  id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room_number: string;
}

interface EditTimetableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  entry: TimetableEntry | null;
}

const EditTimetableDialog: React.FC<EditTimetableDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
  entry
}) => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teacherOptions, setTeacherOptions] = useState<TeacherOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    class_id: '',
    subject_id: '',
    teacher_id: '',
    day_of_week: 1,
    start_time: '',
    end_time: '',
    room_number: ''
  });
  const { toast } = useToast();
  const navigate = useNavigate();

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
    if (open) {
      fetchData();
      if (entry) {
        setFormData({
          class_id: entry.class_id,
          subject_id: entry.subject_id,
          teacher_id: entry.teacher_id,
          day_of_week: entry.day_of_week,
          start_time: entry.start_time,
          end_time: entry.end_time,
          room_number: entry.room_number || ''
        });
      }
    }
  }, [open, entry]);

  useEffect(() => {
    if (formData.class_id && formData.subject_id) {
      fetchTeachersForClassSubject(formData.class_id, formData.subject_id);
    } else {
      setTeacherOptions([]);
      setFormData(prev => ({ ...prev, teacher_id: '' }));
    }
  }, [formData.class_id, formData.subject_id]);

  const fetchData = async () => {
    try {
      const [classesRes, subjectsRes] = await Promise.all([
        supabase.from('classes').select('id, name').order('name'),
        supabase.from('subjects').select('id, name, code').eq('is_active', true).order('name'),
      ]);

      if (classesRes.error) throw classesRes.error;
      if (subjectsRes.error) throw subjectsRes.error;

      setClasses(classesRes.data || []);
      setSubjects(subjectsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
    }
  };

  const fetchTeachersForClassSubject = async (classId: string, subjectId: string) => {
    try {
      const { data, error } = await supabase
        .from('teacher_specializations')
        .select('teacher_id, teachers!inner(id, profile_id, profiles!inner(id, first_name, last_name))')
        .eq('class_id', classId)
        .eq('subject_id', subjectId);

      if (error) throw error;

      const teachers: TeacherOption[] = (data || [])
        .filter((d: any) => d.teachers?.profiles)
        .map((d: any) => ({
          teacher_id: d.teachers.id,
          profile_id: d.teachers.profiles.id,
          first_name: d.teachers.profiles.first_name,
          last_name: d.teachers.profiles.last_name,
        }));

      setTeacherOptions(teachers);

      // Auto-select if only one, or keep existing selection if valid
      if (teachers.length === 1) {
        setFormData(prev => ({ ...prev, teacher_id: teachers[0].profile_id }));
      } else if (teachers.length > 1) {
        const currentValid = teachers.some(t => t.profile_id === formData.teacher_id);
        if (!currentValid) {
          setFormData(prev => ({ ...prev, teacher_id: '' }));
        }
      } else {
        setFormData(prev => ({ ...prev, teacher_id: '' }));
      }
    } catch (error) {
      console.error('Error fetching teachers:', error);
      setTeacherOptions([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.class_id || !formData.subject_id || !formData.teacher_id || !formData.start_time || !formData.end_time) {
      toast({ title: 'Error', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('timetables')
        .update({
          class_id: formData.class_id,
          subject_id: formData.subject_id,
          teacher_id: formData.teacher_id,
          day_of_week: formData.day_of_week,
          start_time: formData.start_time,
          end_time: formData.end_time,
          room_number: formData.room_number || null
        })
        .eq('id', entry?.id);

      if (error) throw error;

      toast({ title: 'Success', description: 'Timetable entry updated successfully' });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error updating timetable entry:', error);
      toast({ title: 'Error', description: error.message || 'Failed to update timetable entry', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const noTeacherFound = formData.class_id && formData.subject_id && teacherOptions.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Schedule</DialogTitle>
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
                  <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
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
                  <SelectItem key={subject.id} value={subject.id}>{subject.code} - {subject.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="teacher">Teacher *</Label>
            {teacherOptions.length > 1 ? (
              <Select value={formData.teacher_id} onValueChange={(value) => setFormData(prev => ({ ...prev, teacher_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select teacher" />
                </SelectTrigger>
                <SelectContent>
                  {teacherOptions.map((t) => (
                    <SelectItem key={t.profile_id} value={t.profile_id}>
                      {t.first_name} {t.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="teacher"
                value={teacherOptions.length === 1 ? `${teacherOptions[0].first_name} ${teacherOptions[0].last_name}` : 'Select class & subject first'}
                readOnly
                className="bg-muted cursor-not-allowed"
              />
            )}
            {noTeacherFound && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-xs text-destructive font-medium">No teacher assigned to this subject for this class. Please assign a teacher first.</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      onOpenChange(false);
                      navigate('/admin/teachers');
                    }}
                  >
                    Assign Teacher
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="day">Day of Week *</Label>
            <Select value={formData.day_of_week.toString()} onValueChange={(value) => setFormData(prev => ({ ...prev, day_of_week: parseInt(value) }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select day" />
              </SelectTrigger>
              <SelectContent>
                {daysOfWeek.map((day) => (
                  <SelectItem key={day.value} value={day.value.toString()}>{day.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Start Time *</Label>
              <Input id="start_time" type="time" value={formData.start_time} onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">End Time *</Label>
              <Input id="end_time" type="time" value={formData.end_time} onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="room_number">Room Number <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input id="room_number" type="text" value={formData.room_number} onChange={(e) => setFormData(prev => ({ ...prev, room_number: e.target.value }))} placeholder="e.g., Room 101, Lab A" />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isLoading || teacherOptions.length === 0}>
              {isLoading ? 'Updating...' : 'Update Schedule'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditTimetableDialog;
