import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BookOpen } from 'lucide-react';

const editTeacherSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  phone: z.string().optional(),
  selectedSubjects: z.array(z.string()),
  classAssignments: z.record(z.string(), z.array(z.string())),
});

type EditTeacherForm = z.infer<typeof editTeacherSchema>;

interface Teacher {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface Class {
  id: string;
  name: string;
  level: number;
}

interface EditTeacherDialogProps {
  teacher: Teacher | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const EditTeacherDialog = ({ teacher, open, onOpenChange, onSuccess }: EditTeacherDialogProps) => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [classAssignments, setClassAssignments] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<EditTeacherForm>({
    resolver: zodResolver(editTeacherSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      selectedSubjects: [],
      classAssignments: {},
    },
  });

  useEffect(() => {
    if (open && teacher) {
      fetchData();
      loadTeacherData();
    }
  }, [open, teacher]);

  const fetchData = async () => {
    try {
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
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch data',
        variant: 'destructive',
      });
    }
  };

  const loadTeacherData = async () => {
    if (!teacher) return;

    try {
      // Load teacher's basic info
      form.reset({
        firstName: teacher.first_name,
        lastName: teacher.last_name,
        phone: teacher.phone || '',
        selectedSubjects: [],
        classAssignments: {},
      });

      // Load teacher's subject specializations
      const { data: specializations, error: specError } = await supabase
        .from('teacher_subject_specializations')
        .select('subject_id')
        .eq('teacher_id', teacher.id);

      if (specError) throw specError;

      const subjectIds = specializations?.map(s => s.subject_id) || [];
      setSelectedSubjects(subjectIds);
      form.setValue('selectedSubjects', subjectIds);

      // Load teacher's class assignments
      const { data: assignments, error: assignError } = await supabase
        .from('teacher_class_assignments')
        .select('subject_id, class_id')
        .eq('teacher_id', teacher.id);

      if (assignError) throw assignError;

      const groupedAssignments: Record<string, string[]> = {};
      assignments?.forEach(assignment => {
        if (!groupedAssignments[assignment.subject_id]) {
          groupedAssignments[assignment.subject_id] = [];
        }
        groupedAssignments[assignment.subject_id].push(assignment.class_id);
      });

      setClassAssignments(groupedAssignments);
      form.setValue('classAssignments', groupedAssignments);
    } catch (error) {
      console.error('Error loading teacher data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load teacher data',
        variant: 'destructive',
      });
    }
  };

  const handleSubjectToggle = (subjectId: string) => {
    const newSelectedSubjects = selectedSubjects.includes(subjectId)
      ? selectedSubjects.filter(id => id !== subjectId)
      : [...selectedSubjects, subjectId];
    
    setSelectedSubjects(newSelectedSubjects);
    form.setValue('selectedSubjects', newSelectedSubjects);

    // Remove class assignments for unselected subjects
    if (!newSelectedSubjects.includes(subjectId)) {
      const newAssignments = { ...classAssignments };
      delete newAssignments[subjectId];
      setClassAssignments(newAssignments);
      form.setValue('classAssignments', newAssignments);
    }
  };

  const handleClassAssignment = (subjectId: string, classId: string) => {
    const currentAssignments = classAssignments[subjectId] || [];
    const newAssignments = currentAssignments.includes(classId)
      ? currentAssignments.filter(id => id !== classId)
      : [...currentAssignments, classId];
    
    const updatedClassAssignments = {
      ...classAssignments,
      [subjectId]: newAssignments,
    };
    
    setClassAssignments(updatedClassAssignments);
    form.setValue('classAssignments', updatedClassAssignments);
  };

  const onSubmit = async (data: EditTeacherForm) => {
    if (!teacher) return;
    
    setLoading(true);
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: data.firstName,
          last_name: data.lastName,
          phone: data.phone,
        })
        .eq('user_id', teacher.user_id);

      if (profileError) throw profileError;

      // Update subject specializations
      await supabase
        .from('teacher_subject_specializations')
        .delete()
        .eq('teacher_id', teacher.id);

      if (data.selectedSubjects.length > 0) {
        const specializations = data.selectedSubjects.map(subjectId => ({
          teacher_id: teacher.id,
          subject_id: subjectId,
        }));

        const { error: specializationError } = await supabase
          .from('teacher_subject_specializations')
          .insert(specializations);

        if (specializationError) throw specializationError;
      }

      // Update class assignments
      await supabase
        .from('teacher_class_assignments')
        .delete()
        .eq('teacher_id', teacher.id);

      const currentAcademicYear = await supabase
        .from('academic_years')
        .select('id')
        .eq('is_current', true)
        .single();

      if (currentAcademicYear.data) {
        const assignments = [];
        for (const [subjectId, classIds] of Object.entries(data.classAssignments)) {
          for (const classId of classIds) {
            assignments.push({
              teacher_id: teacher.id,
              subject_id: subjectId,
              class_id: classId,
              academic_year_id: currentAcademicYear.data.id,
            });
          }
        }

        if (assignments.length > 0) {
          const { error: assignmentError } = await supabase
            .from('teacher_class_assignments')
            .insert(assignments);

          if (assignmentError) throw assignmentError;
        }
      }

      // Log activity
      await supabase.rpc('log_activity', {
        p_activity_type: 'teacher_updated',
        p_description: `Teacher ${data.firstName} ${data.lastName} profile updated`,
        p_metadata: { teacher_id: teacher.id }
      });

      toast({
        title: 'Success',
        description: 'Teacher updated successfully',
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error updating teacher:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update teacher',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Teacher</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Subject Specializations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Subject Specializations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {subjects.map((subject) => (
                    <div key={subject.id} className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={selectedSubjects.includes(subject.id)}
                          onCheckedChange={() => handleSubjectToggle(subject.id)}
                        />
                        <label className="text-sm font-medium">
                          {subject.name}
                          <Badge variant="outline" className="ml-2">
                            {subject.code}
                          </Badge>
                        </label>
                      </div>

                      {selectedSubjects.includes(subject.id) && (
                        <div className="ml-6 space-y-2">
                          <p className="text-xs text-muted-foreground">Assign to classes:</p>
                          <div className="grid grid-cols-2 gap-1">
                            {classes.map((cls) => (
                              <div key={cls.id} className="flex items-center space-x-2">
                                <Checkbox
                                  checked={classAssignments[subject.id]?.includes(cls.id) || false}
                                  onCheckedChange={() => handleClassAssignment(subject.id, cls.id)}
                                />
                                <label className="text-xs">{cls.name}</label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Updating...' : 'Update Teacher'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditTeacherDialog;