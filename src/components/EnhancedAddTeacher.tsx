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
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GraduationCap, ArrowLeft, Users, BookOpen } from 'lucide-react';
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
  selectedSubjects: z.array(z.string()).min(1, 'At least one subject must be selected'),
  classAssignments: z.record(z.string(), z.array(z.string())),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type AddTeacherForm = z.infer<typeof addTeacherSchema>;

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

const EnhancedAddTeacher = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [classAssignments, setClassAssignments] = useState<Record<string, string[]>>({});
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
      selectedSubjects: [],
      classAssignments: {},
    },
  });

  useEffect(() => {
    fetchData();
  }, []);

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

  const createTeacher = async (data: AddTeacherForm) => {
    setIsSubmitting(true);
    try {
      // Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
            role: data.role,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: authData.user.id,
          first_name: data.firstName,
          last_name: data.lastName,
          email: data.email,
          phone: data.phone,
          role: data.role,
        });

      if (profileError) throw profileError;

      // Get the profile ID
      const { data: profileData, error: profileFetchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', authData.user.id)
        .single();

      if (profileFetchError || !profileData) throw new Error('Failed to get profile');

      // Create teacher record
      const { error: teacherError } = await supabase
        .from('teachers')
        .insert({
          profile_id: profileData.id,
          employee_id: data.employeeId,
          qualification: data.qualification,
          experience_years: data.experienceYears,
          joining_date: data.joiningDate,
          department: data.department,
          salary: data.salary,
          is_class_teacher: data.isClassTeacher,
        });

      if (teacherError) throw teacherError;

      // Assign class teacher if selected
      if (data.isClassTeacher && data.assignedClassId) {
        const { error: classError } = await supabase
          .from('classes')
          .update({ class_teacher_id: profileData.id })
          .eq('id', data.assignedClassId);

        if (classError) throw classError;
      }

      // Add subject specializations
      if (data.selectedSubjects.length > 0) {
        const specializations = data.selectedSubjects.map(subjectId => ({
          teacher_id: profileData.id,
          subject_id: subjectId,
        }));

        const { error: specializationError } = await supabase
          .from('teacher_subject_specializations')
          .insert(specializations);

        if (specializationError) throw specializationError;
      }

      // Add class assignments
      const currentAcademicYear = await supabase
        .from('academic_years')
        .select('id')
        .eq('is_current', true)
        .single();

      if (currentAcademicYear.data) {
        const assignments = [];
        for (const [subjectId, classIds] of Object.entries(data.classAssignments)) {
          for (const classId of (classIds as string[])) {
            assignments.push({
              teacher_id: profileData.id,
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

      toast({
        title: 'Success',
        description: 'Teacher account created successfully',
      });

      navigate('/admin/teachers');
    } catch (error: any) {
      console.error('Error creating teacher:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create teacher account',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/admin/teachers')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Teachers
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Add New Teacher</h1>
          <p className="text-muted-foreground">
            Create teacher account with subject specializations and class assignments
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(createTeacher)} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Personal details and account information</CardDescription>
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
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
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

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
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
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Professional Information */}
          <Card>
            <CardHeader>
              <CardTitle>Professional Information</CardTitle>
              <CardDescription>Employment details and qualifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
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

                <FormField
                  control={form.control}
                  name="employeeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employee ID</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="qualification"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Qualification</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="experienceYears"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Experience (Years)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
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
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                          min="0"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Class Teacher Assignment */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="isClassTeacher"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Assign as Class Teacher</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Make this teacher responsible for a specific class
                        </p>
                      </div>
                    </FormItem>
                  )}
                />

                {form.watch('isClassTeacher') && (
                  <FormField
                    control={form.control}
                    name="assignedClassId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assigned Class</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select class" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                      {classes.map((cls) => (
                                <SelectItem key={cls.id} value={cls.id}>
                                  {cls.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
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
              <CardDescription>
                Select subjects this teacher specializes in and assign classes
              </CardDescription>
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

              <FormField
                control={form.control}
                name="selectedSubjects"
                render={() => (
                  <FormItem>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/admin/teachers')}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Teacher Account'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
};

export default EnhancedAddTeacher;