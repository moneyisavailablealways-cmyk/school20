import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GraduationCap, ArrowLeft, BookOpen, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const addTeacherSchema = z.object({
  // Profile fields
  email: z.string().email('Please enter a valid email address'),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  phone: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Please confirm your password'),
  role: z.enum(['teacher', 'head_teacher']),
  
  // Teacher-specific fields
  employeeId: z.string().min(1, 'Employee ID is required'),
  qualification: z.string().min(1, 'Qualification is required'),
  experienceYears: z.number().min(0, 'Experience years must be 0 or more'),
  joiningDate: z.string().min(1, 'Joining date is required'),
  department: z.string().min(1, 'Department is required'),
  salary: z.number().optional(),
  isClassTeacher: z.boolean().optional(),
  assignedClassId: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type AddTeacherForm = z.infer<typeof addTeacherSchema>;

interface Subject {
  id: string;
  name: string;
  code: string;
  level: number;
}

interface Class {
  id: string;
  name: string;
  level: number;
  class_teacher_id?: string;
  max_students?: number;
  academic_year_id?: string;
  created_at?: string;
  updated_at?: string;
}

interface SubjectClassAssignment {
  subjectId: string;
  classIds: string[];
}

const AddTeacher = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [subjectClassAssignments, setSubjectClassAssignments] = useState<SubjectClassAssignment[]>([]);
  const [isClassTeacher, setIsClassTeacher] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const form = useForm<AddTeacherForm>({
    resolver: zodResolver(addTeacherSchema),
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      phone: '',
      password: '',
      confirmPassword: '',
      role: 'teacher',
      employeeId: '',
      qualification: '',
      experienceYears: 0,
      joiningDate: new Date().toISOString().split('T')[0],
      department: '',
      salary: undefined,
      isClassTeacher: false,
      assignedClassId: '',
    },
  });

  useEffect(() => {
    fetchSubjectsAndClasses();
  }, []);

  const fetchSubjectsAndClasses = async () => {
    try {
      // Fetch subjects
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (subjectsError) throw subjectsError;
      setSubjects(subjectsData || []);

      // Fetch all classes
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('*')
        .order('level', { ascending: true });

      if (classesError) throw classesError;
      setClasses(classesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch subjects and classes',
        variant: 'destructive',
      });
    }
  };

  const handleSubjectToggle = (subjectId: string, checked: boolean) => {
    if (checked) {
      setSelectedSubjects(prev => [...prev, subjectId]);
      setSubjectClassAssignments(prev => [...prev, { subjectId, classIds: [] }]);
    } else {
      setSelectedSubjects(prev => prev.filter(id => id !== subjectId));
      setSubjectClassAssignments(prev => prev.filter(assignment => assignment.subjectId !== subjectId));
    }
  };

  const handleClassToggle = (subjectId: string, classId: string, checked: boolean) => {
    setSubjectClassAssignments(prev => 
      prev.map(assignment => {
        if (assignment.subjectId === subjectId) {
          return {
            ...assignment,
            classIds: checked 
              ? [...assignment.classIds, classId]
              : assignment.classIds.filter(id => id !== classId)
          };
        }
        return assignment;
      })
    );
  };

  const createTeacher = async (data: AddTeacherForm) => {
    setIsSubmitting(true);
    try {
      // Validate at least one subject is selected
      if (selectedSubjects.length === 0) {
        toast({
          title: 'Error',
          description: 'Please select at least one subject specialization',
          variant: 'destructive',
        });
        return;
      }

      // Get the current user's session
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('No valid session found');
      }

      // Call our edge function to create the user with teacher details
      const response = await fetch('/functions/v1/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          role: data.role,
          teacherDetails: {
            employeeId: data.employeeId,
            specialization: selectedSubjects.map(id => subjects.find(s => s.id === id)?.name).join(', '),
            qualification: data.qualification,
            experienceYears: data.experienceYears,
            joiningDate: data.joiningDate,
            department: data.department,
            salary: data.salary,
            isClassTeacher: data.isClassTeacher,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create teacher');
      }

      const teacherId = result.teacher_id;

      // Insert teacher specializations
      const specializationInserts = [];
      
      for (const assignment of subjectClassAssignments) {
        if (assignment.classIds.length === 0) {
          // Subject selected but no classes - insert with null class_id
          specializationInserts.push({
            teacher_id: teacherId,
            subject_id: assignment.subjectId,
            class_id: null
          });
        } else {
          // Insert for each selected class
          for (const classId of assignment.classIds) {
            specializationInserts.push({
              teacher_id: teacherId,
              subject_id: assignment.subjectId,
              class_id: classId
            });
          }
        }
      }

      if (specializationInserts.length > 0) {
        const { error: specializationError } = await supabase
          .from('teacher_specializations')
          .insert(specializationInserts);

        if (specializationError) {
          console.error('Error inserting teacher specializations:', specializationError);
          toast({
            title: 'Warning',
            description: 'Teacher created but specializations assignment failed',
            variant: 'destructive',
          });
        }
      }

      // If teacher is assigned as class teacher, update the class
      if (data.isClassTeacher && data.assignedClassId && result.teacher_profile_id) {
        const { error: classUpdateError } = await supabase
          .from('classes')
          .update({ class_teacher_id: result.teacher_profile_id })
          .eq('id', data.assignedClassId);

        if (classUpdateError) {
          console.error('Error assigning class to teacher:', classUpdateError);
          toast({
            title: 'Warning',
            description: 'Teacher created but class assignment failed',
            variant: 'destructive',
          });
        }
      }

      toast({
        title: 'Success',
        description: 'Teacher created successfully with specializations',
      });

      // Reset form and navigate
      form.reset();
      setSelectedSubjects([]);
      setSubjectClassAssignments([]);
      setIsClassTeacher(false);
      navigate('/admin/teachers');
    } catch (error: any) {
      console.error('Error creating teacher:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create teacher',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAvailableClassesForAssignment = () => {
    return classes.filter(classItem => !classItem.class_teacher_id);
  };

  const getSubjectName = (subjectId: string) => {
    return subjects.find(s => s.id === subjectId)?.name || 'Unknown Subject';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/admin/teachers')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Add New Teacher</h1>
          <p className="text-muted-foreground">
            Create a new teacher account with detailed information and subject specializations
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Teacher Information
          </CardTitle>
          <CardDescription>
            Enter the teacher's basic and professional details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(createTeacher)} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} />
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
                          <Input placeholder="Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="john.doe@school.edu" type="email" {...field} />
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
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+1234567890" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter password" type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input placeholder="Confirm password" type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select teacher role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="teacher">Teacher</SelectItem>
                          <SelectItem value="head_teacher">Head Teacher</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Professional Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Professional Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="employeeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Employee ID</FormLabel>
                        <FormControl>
                          <Input placeholder="EMP001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department</FormLabel>
                        <FormControl>
                          <Input placeholder="Science" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="qualification"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Qualification</FormLabel>
                      <FormControl>
                        <Input placeholder="M.Sc. Mathematics" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="experienceYears"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Experience (Years)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="5" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="joiningDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Joining Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="salary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Salary (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="50000" 
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="isClassTeacher"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            setIsClassTeacher(!!checked);
                          }}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Class Teacher</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Check if this teacher will be assigned as a class teacher
                        </p>
                      </div>
                    </FormItem>
                  )}
                />

                {isClassTeacher && (
                  <FormField
                    control={form.control}
                    name="assignedClassId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assign to Class</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a class to assign" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {getAvailableClassesForAssignment().map((classItem) => (
                              <SelectItem key={classItem.id} value={classItem.id}>
                                {classItem.name} (Level {classItem.level})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground">
                          Select which class this teacher will be responsible for
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {/* Subject Specializations */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Subject Specializations</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Select the subjects this teacher specializes in and assign them to specific classes
                </p>
                
                <div className="space-y-4">
                  {subjects.map((subject) => (
                    <div key={subject.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id={`subject-${subject.id}`}
                          checked={selectedSubjects.includes(subject.id)}
                          onCheckedChange={(checked) => handleSubjectToggle(subject.id, !!checked)}
                        />
                        <label 
                          htmlFor={`subject-${subject.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {subject.name} ({subject.code}) - Level {subject.level}
                        </label>
                      </div>

                      {selectedSubjects.includes(subject.id) && (
                        <div className="ml-6 space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <Users className="h-4 w-4" />
                            Assign to Classes:
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                            {classes
                              .filter(c => c.level === subject.level)
                              .map((classItem) => (
                                <div key={classItem.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`class-${subject.id}-${classItem.id}`}
                                    checked={
                                      subjectClassAssignments
                                        .find(a => a.subjectId === subject.id)
                                        ?.classIds.includes(classItem.id) || false
                                    }
                                    onCheckedChange={(checked) => 
                                      handleClassToggle(subject.id, classItem.id, !!checked)
                                    }
                                  />
                                  <label 
                                    htmlFor={`class-${subject.id}-${classItem.id}`}
                                    className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                  >
                                    {classItem.name}
                                  </label>
                                </div>
                              ))}
                          </div>
                          {classes.filter(c => c.level === subject.level).length === 0 && (
                            <p className="text-sm text-muted-foreground ml-6">
                              No classes available for Level {subject.level}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {selectedSubjects.length === 0 && (
                  <p className="text-sm text-destructive">
                    Please select at least one subject specialization
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/admin/teachers')}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Teacher'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddTeacher;