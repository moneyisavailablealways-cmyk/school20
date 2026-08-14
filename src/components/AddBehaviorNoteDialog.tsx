import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useToast } from '@/hooks/use-toast';
import { useTerminology } from '@/hooks/useTerminology';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Student {
  id: string;
  student_id: string;
  class_id?: string | null;
  class_name?: string | null;
  profile?: {
    first_name: string;
    last_name: string;
  };
}

interface AddBehaviorNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const AddBehaviorNoteDialog: React.FC<AddBehaviorNoteDialogProps> = ({
  open,
  onOpenChange,
  onSuccess
}) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [studentPickerOpen, setStudentPickerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    student_id: '',
    date: new Date().toISOString().split('T')[0],
    category: '',
    note_type: '',
    description: '',
    is_private: false
  });
  const { toast } = useToast();
  const { profile } = useAuth();
  const terminology = useTerminology();
  const studentLabel = terminology.Student;

  const categories = [
    { value: 'disciplinary', label: 'Disciplinary' },
    { value: 'positive', label: 'Positive' },
    { value: 'academic', label: 'Academic' },
    { value: 'behavioral', label: 'Behavioral' }
  ];

  const noteTypes = [
    { value: 'positive', label: 'Positive' },
    { value: 'neutral', label: 'Neutral' },
    { value: 'negative', label: 'Negative' }
  ];

  useEffect(() => {
    if (open) {
      fetchClasses();
      fetchStudents();
    }
  }, [open, profile?.school_id]);

  const fetchClasses = async () => {
    if (!profile?.school_id) return;
    const { data, error } = await supabase
      .from('classes')
      .select('id, name')
      .eq('school_id', profile.school_id)
      .order('name');
    if (error) {
      console.error('Error fetching classes:', error);
      return;
    }
    setClasses(data || []);
  };

  const fetchStudents = async () => {
    try {
      let query = supabase
        .from('students')
        .select(`
          id,
          student_id,
          profile:profiles!students_profile_id_fkey(
            first_name,
            last_name
          ),
          enrollments:student_enrollments(
            class_id,
            status,
            classes(name)
          )
        `)
        .eq('enrollment_status', 'active')
        .order('student_id');

      if (profile?.school_id) {
        query = query.eq('school_id', profile.school_id);
      }

      const { data, error } = await query;

      if (error) throw error;

      const mapped: Student[] = (data || []).map((s: any) => {
        const active = (s.enrollments || []).find((e: any) => e.status === 'active') || (s.enrollments || [])[0];
        return {
          id: s.id,
          student_id: s.student_id,
          profile: s.profile,
          class_id: active?.class_id ?? null,
          class_name: active?.classes?.name ?? null,
        };
      });

      setStudents(mapped);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast({
        title: 'Error',
        description: `Failed to load ${studentLabel.toLowerCase()}s`,
        variant: 'destructive'
      });
    }
  };

  const filteredStudents = useMemo(() => {
    if (selectedClass === 'all') return students;
    return students.filter((s) => s.class_id === selectedClass);
  }, [students, selectedClass]);

  const selectedStudent = students.find((s) => s.id === formData.student_id);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.student_id || !formData.category || !formData.note_type || !formData.description) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);

    try {
      // Get current user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      const noteData = {
        student_id: formData.student_id,
        date: formData.date,
        category: formData.category,
        note_type: formData.note_type,
        description: formData.description,
        recorded_by: profile?.id,
        is_private: formData.is_private
      };

      const { error } = await supabase
        .from('behavior_notes')
        .insert([noteData]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Behavior note added successfully'
      });

      // Reset form
      setFormData({
        student_id: '',
        date: new Date().toISOString().split('T')[0],
        category: '',
        note_type: '',
        description: '',
        is_private: false
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error adding behavior note:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add behavior note',
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
          <DialogTitle>Add Behavior Record</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="student">Student *</Label>
            <Select value={formData.student_id} onValueChange={(value) => setFormData(prev => ({ ...prev, student_id: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select student" />
              </SelectTrigger>
              <SelectContent>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.profile?.first_name} {student.profile?.last_name} ({student.student_id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date *</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note_type">Note Type *</Label>
            <Select value={formData.note_type} onValueChange={(value) => setFormData(prev => ({ ...prev, note_type: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select note type" />
              </SelectTrigger>
              <SelectContent>
                {noteTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter detailed description of the behavior/incident..."
              rows={4}
              required
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_private"
              checked={formData.is_private}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_private: checked }))}
            />
            <Label htmlFor="is_private">Private note (not visible to parents)</Label>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Adding...' : 'Add Record'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddBehaviorNoteDialog;