import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  GraduationCap,
  Search,
  Filter,
  Edit,
  Phone,
  Mail,
  Calendar,
  Users,
  Trash2,
  BookOpen,
} from 'lucide-react';

interface Teacher {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: string;
  is_active: boolean;
  avatar_url?: string;
  created_at: string;
}

interface TeacherDetails {
  id: string;
  profile_id: string;
  employee_id?: string;
  qualification?: string;
  experience_years?: number;
  joining_date?: string;
  department?: string;
  salary?: number;
  is_class_teacher?: boolean;
}

interface Subject {
  id: string;
  name: string;
  code: string;
  level_id: string;
  sub_level: string | null;
  is_core: boolean;
  is_active: boolean;
  level?: {
    name: string;
  };
}

interface Class {
  id: string;
  name: string;
  level_id?: string;
  class_teacher_id?: string;
}

interface TeacherSpecialization {
  id: string;
  teacher_id: string;
  subject_id: string;
  class_id?: string;
}

const TeacherManagement = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role: 'teacher' as 'teacher' | 'head_teacher',
    is_active: true,
    employee_id: '',
    qualification: '',
    experience_years: 0,
    joining_date: '',
    department: '',
    salary: undefined as number | undefined,
    is_class_teacher: false,
    assigned_class_id: ''
  });
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [subjectClassAssignments, setSubjectClassAssignments] = useState<{ subjectId: string; classIds: string[] }[]>([]);
  const [teacherDetailsId, setTeacherDetailsId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadTeachers();
  }, []);

  const loadTeachers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['teacher', 'head_teacher'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTeachers(data || []);
    } catch (error) {
      console.error('Error loading teachers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load teachers',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = async (teacher: Teacher) => {
    setEditingTeacher(teacher);
    
    // Fetch teacher details
    const { data: teacherDetails } = await supabase
      .from('teachers')
      .select('*')
      .eq('profile_id', teacher.id)
      .single();

    // Fetch teacher specializations
    const { data: specializations } = await supabase
      .from('teacher_specializations')
      .select('*')
      .eq('teacher_id', teacherDetails?.id);

    // Fetch all subjects and classes
    const { data: subjectsData } = await supabase
      .from('subjects')
      .select(`
        *,
        level:levels(name)
      `)
      .eq('is_active', true)
      .order('name');

    const { data: classesData } = await supabase
      .from('classes')
      .select('*')
      .order('name');

    setSubjects(subjectsData || []);
    setClasses(classesData || []);

    // Set selected subjects and class assignments
    if (specializations) {
      const uniqueSubjectIds = [...new Set(specializations.map(s => s.subject_id))];
      setSelectedSubjects(uniqueSubjectIds);

      const assignments = uniqueSubjectIds.map(subjectId => ({
        subjectId,
        classIds: specializations
          .filter(s => s.subject_id === subjectId && s.class_id)
          .map(s => s.class_id!)
      }));
      setSubjectClassAssignments(assignments);
    } else {
      setSelectedSubjects([]);
      setSubjectClassAssignments([]);
    }

    setTeacherDetailsId(teacherDetails?.id || null);
    setEditForm({
      first_name: teacher.first_name,
      last_name: teacher.last_name,
      email: teacher.email,
      phone: teacher.phone || '',
      role: teacher.role as 'teacher' | 'head_teacher',
      is_active: teacher.is_active,
      employee_id: teacherDetails?.employee_id || '',
      qualification: teacherDetails?.qualification || '',
      experience_years: teacherDetails?.experience_years || 0,
      joining_date: teacherDetails?.joining_date || new Date().toISOString().split('T')[0],
      department: teacherDetails?.department || '',
      salary: teacherDetails?.salary,
      is_class_teacher: teacherDetails?.is_class_teacher || false,
      assigned_class_id: classesData?.find(c => c.class_teacher_id === teacher.id)?.id || ''
    });
    setEditDialogOpen(true);
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

  const handleEditSubmit = async () => {
    if (!editingTeacher) return;

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

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: editForm.first_name,
          last_name: editForm.last_name,
          email: editForm.email,
          phone: editForm.phone || null,
          role: editForm.role,
          is_active: editForm.is_active
        })
        .eq('user_id', editingTeacher.user_id);

      if (profileError) throw profileError;

      // Update or insert teacher details
      const teacherDetailsData = {
        profile_id: editingTeacher.id,
        employee_id: editForm.employee_id,
        qualification: editForm.qualification,
        experience_years: editForm.experience_years,
        joining_date: editForm.joining_date,
        department: editForm.department,
        salary: editForm.salary,
        is_class_teacher: editForm.is_class_teacher,
        specialization: selectedSubjects.map(id => subjects.find(s => s.id === id)?.name).join(', ')
      };

      let finalTeacherDetailsId = teacherDetailsId;

      if (teacherDetailsId) {
        const { error: teacherError } = await supabase
          .from('teachers')
          .update(teacherDetailsData)
          .eq('id', teacherDetailsId);

        if (teacherError) throw teacherError;
      } else {
        const { data: newTeacher, error: teacherError } = await supabase
          .from('teachers')
          .insert(teacherDetailsData)
          .select()
          .single();

        if (teacherError) throw teacherError;
        finalTeacherDetailsId = newTeacher.id;
      }

      // Update class teacher assignment
      if (editForm.is_class_teacher && editForm.assigned_class_id) {
        const { error: classError } = await supabase
          .from('classes')
          .update({ class_teacher_id: editingTeacher.id })
          .eq('id', editForm.assigned_class_id);

        if (classError) throw classError;
      } else {
        // Remove class teacher assignment if unchecked
        const { error: classError } = await supabase
          .from('classes')
          .update({ class_teacher_id: null })
          .eq('class_teacher_id', editingTeacher.id);

        if (classError) throw classError;
      }

      // Update teacher specializations
      if (finalTeacherDetailsId) {
        // Delete existing specializations
        const { error: deleteError } = await supabase
          .from('teacher_specializations')
          .delete()
          .eq('teacher_id', finalTeacherDetailsId);

        if (deleteError) throw deleteError;

        // Insert new specializations
        const specializationInserts = [];
        for (const assignment of subjectClassAssignments) {
          if (assignment.classIds.length === 0) {
            specializationInserts.push({
              teacher_id: finalTeacherDetailsId,
              subject_id: assignment.subjectId,
              class_id: null
            });
          } else {
            for (const classId of assignment.classIds) {
              specializationInserts.push({
                teacher_id: finalTeacherDetailsId,
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

          if (specializationError) throw specializationError;
        }
      }

      toast({
        title: 'Success',
        description: 'Teacher updated successfully with all details',
      });

      setEditDialogOpen(false);
      setEditingTeacher(null);
      loadTeachers();
    } catch (error: any) {
      console.error('Error updating teacher:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update teacher',
        variant: 'destructive',
      });
    }
  };

  const deleteTeacher = async (userId: string, teacherName: string) => {
    if (!confirm(`Are you sure you want to delete teacher "${teacherName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Teacher deleted successfully',
      });

      loadTeachers();
    } catch (error: any) {
      console.error('Error deleting teacher:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete teacher',
        variant: 'destructive',
      });
    }
  };

  const filteredTeachers = teachers.filter(teacher => {
    const matchesSearch = 
      teacher.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      teacher.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      teacher.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && teacher.is_active) ||
      (statusFilter === 'inactive' && !teacher.is_active);
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Teacher Management</h1>
          <p className="text-muted-foreground">
            Manage teaching staff and their information
          </p>
        </div>
        <Button className="gap-2" onClick={() => window.location.href = '/admin/add-teacher'}>
          <GraduationCap className="h-4 w-4" />
          Add Teacher
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teachers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Teachers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teachers.filter(t => t.is_active).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Head Teachers</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teachers.filter(t => t.role === 'head_teacher').length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search teachers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={(value: 'all' | 'active' | 'inactive') => setStatusFilter(value)}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Teachers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Teachers ({filteredTeachers.length})
          </CardTitle>
          <CardDescription>
            Teaching staff members and their details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Teacher</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTeachers.map((teacher) => (
                <TableRow key={teacher.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={teacher.avatar_url} />
                        <AvatarFallback>
                          {teacher.first_name[0]}{teacher.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {teacher.first_name} {teacher.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">{teacher.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={teacher.role === 'head_teacher' ? 'default' : 'secondary'}>
                      {teacher.role === 'head_teacher' ? 'Head Teacher' : 'Teacher'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-3 w-3" />
                        {teacher.email}
                      </div>
                      {teacher.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {teacher.phone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={teacher.is_active ? 'default' : 'secondary'}>
                      {teacher.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-3 w-3" />
                      {new Date(teacher.created_at).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEditDialog(teacher)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteTeacher(teacher.user_id, `${teacher.first_name} ${teacher.last_name}`)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredTeachers.length === 0 && (
            <div className="text-center py-8">
              <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No teachers found matching your criteria</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Teacher Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Edit Teacher
            </DialogTitle>
            <DialogDescription>
              Update teacher information including professional details and subject specializations
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[calc(90vh-180px)] pr-4">
            <div className="space-y-6 py-4">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name</Label>
                    <Input
                      id="first_name"
                      value={editForm.first_name}
                      onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input
                      id="last_name"
                      value={editForm.last_name}
                      onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={editForm.role} onValueChange={(value: 'teacher' | 'head_teacher') => setEditForm({ ...editForm, role: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="teacher">Teacher</SelectItem>
                        <SelectItem value="head_teacher">Head Teacher</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={editForm.is_active ? 'active' : 'inactive'} onValueChange={(value) => setEditForm({ ...editForm, is_active: value === 'active' })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Professional Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Professional Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="employee_id">Employee ID</Label>
                    <Input
                      id="employee_id"
                      placeholder="EMP001"
                      value={editForm.employee_id}
                      onChange={(e) => setEditForm({ ...editForm, employee_id: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      placeholder="Science"
                      value={editForm.department}
                      onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="qualification">Qualification</Label>
                  <Input
                    id="qualification"
                    placeholder="M.Sc. Mathematics"
                    value={editForm.qualification}
                    onChange={(e) => setEditForm({ ...editForm, qualification: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="experience_years">Experience (Years)</Label>
                    <Input
                      id="experience_years"
                      type="number"
                      placeholder="5"
                      value={editForm.experience_years}
                      onChange={(e) => setEditForm({ ...editForm, experience_years: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="joining_date">Joining Date</Label>
                    <Input
                      id="joining_date"
                      type="date"
                      value={editForm.joining_date}
                      onChange={(e) => setEditForm({ ...editForm, joining_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salary">Salary (Optional)</Label>
                    <Input
                      id="salary"
                      type="number"
                      placeholder="50000"
                      value={editForm.salary || ''}
                      onChange={(e) => setEditForm({ ...editForm, salary: parseFloat(e.target.value) || undefined })}
                    />
                  </div>
                </div>

                <div className="flex items-start space-x-3 space-y-0">
                  <Checkbox
                    id="is_class_teacher"
                    checked={editForm.is_class_teacher}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, is_class_teacher: !!checked })}
                  />
                  <div className="space-y-1 leading-none">
                    <Label htmlFor="is_class_teacher">Class Teacher</Label>
                    <p className="text-sm text-muted-foreground">
                      Check if this teacher will be assigned as a class teacher
                    </p>
                  </div>
                </div>

                {editForm.is_class_teacher && (
                  <div className="space-y-2">
                    <Label htmlFor="assigned_class_id">Assign to Class</Label>
                    <Select 
                      value={editForm.assigned_class_id} 
                      onValueChange={(value) => setEditForm({ ...editForm, assigned_class_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a class to assign" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes
                          .filter(c => !c.class_teacher_id || c.class_teacher_id === editingTeacher?.id)
                          .map((classItem) => (
                            <SelectItem key={classItem.id} value={classItem.id}>
                              {classItem.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      Select which class this teacher will be responsible for
                    </p>
                  </div>
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
                          {subject.name} ({subject.code}) - {subject.level?.name || 'No Level'}
                        </label>
                      </div>

                      {selectedSubjects.includes(subject.id) && (
                        <div className="ml-6 space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <Users className="h-4 w-4" />
                            Assign to Classes:
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {classes.map((classItem) => (
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
                          {classes.length === 0 && (
                            <p className="text-sm text-muted-foreground ml-6">
                              No classes available
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
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleEditSubmit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherManagement;