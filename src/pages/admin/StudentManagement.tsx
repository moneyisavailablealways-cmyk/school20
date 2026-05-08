import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { UserPlus, Search, Eye, Edit, Trash2, GraduationCap, Calendar, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import StudentForm from './StudentForm';

interface Student {
  id: string;
  student_id: string;
  admission_number: string | null;
  date_of_birth: string;
  admission_date: string;
  gender: string | null;
  address: string | null;
  enrollment_status: string;
  profile_id: string;
}

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
}

interface Enrollment {
  student_id: string;
  class_id: string;
  stream_id: string | null;
  status: string;
}

interface ClassInfo {
  id: string;
  name: string;
}

interface StreamInfo {
  id: string;
  name: string;
}

interface ParentRelationship {
  student_id: string;
  parent_id: string;
  relationship_type: string;
}

const StudentManagement = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [enrollments, setEnrollments] = useState<Map<string, Enrollment>>(new Map());
  const [classes, setClasses] = useState<Map<string, ClassInfo>>(new Map());
  const [streams, setStreams] = useState<Map<string, StreamInfo>>(new Map());
  const [parentRelationships, setParentRelationships] = useState<Map<string, ParentRelationship>>(new Map());
  const [parentProfiles, setParentProfiles] = useState<Map<string, Profile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);

      // Fetch students
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: false });

      if (studentsError) throw studentsError;
      setStudents(studentsData || []);

      if (!studentsData || studentsData.length === 0) {
        setLoading(false);
        return;
      }

      const studentIds = studentsData.map(s => s.id);
      const profileIds = studentsData.map(s => s.profile_id);

      // Fetch profiles for students
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', profileIds);

      if (profilesError) throw profilesError;
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      setProfiles(profilesMap);

      // Fetch enrollments
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from('student_enrollments')
        .select('*')
        .in('student_id', studentIds)
        .eq('status', 'active');

      if (enrollmentsError) throw enrollmentsError;
      const enrollmentsMap = new Map(enrollmentsData?.map(e => [e.student_id, e]) || []);
      setEnrollments(enrollmentsMap);

      // Fetch classes
      const classIds = [...new Set(enrollmentsData?.map(e => e.class_id).filter(Boolean) || [])];
      if (classIds.length > 0) {
        const { data: classesData, error: classesError } = await supabase
          .from('classes')
          .select('id, name')
          .in('id', classIds);

        if (classesError) throw classesError;
        const classesMap = new Map(classesData?.map(c => [c.id, c]) || []);
        setClasses(classesMap);
      }

      // Fetch streams
      const streamIds = [...new Set(enrollmentsData?.map(e => e.stream_id).filter(Boolean) || [])];
      if (streamIds.length > 0) {
        const { data: streamsData, error: streamsError } = await supabase
          .from('streams')
          .select('id, name')
          .in('id', streamIds);

        if (streamsError) throw streamsError;
        const streamsMap = new Map(streamsData?.map(s => [s.id, s]) || []);
        setStreams(streamsMap);
      }

      // Fetch parent relationships
      const { data: relationshipsData, error: relationshipsError } = await supabase
        .from('parent_student_relationships')
        .select('*')
        .in('student_id', studentIds);

      if (relationshipsError) throw relationshipsError;
      const relationshipsMap = new Map(relationshipsData?.map(r => [r.student_id, r]) || []);
      setParentRelationships(relationshipsMap);

      // Fetch parent profiles
      const parentIds = [...new Set(relationshipsData?.map(r => r.parent_id).filter(Boolean) || [])];
      if (parentIds.length > 0) {
        const { data: parentProfilesData, error: parentProfilesError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', parentIds);

        if (parentProfilesError) throw parentProfilesError;
        const parentProfilesMap = new Map(parentProfilesData?.map(p => [p.id, p]) || []);
        setParentProfiles(parentProfilesMap);
      }

    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch student data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const profile = profiles.get(student.profile_id);
    
    const matchesSearch = searchTerm === '' || 
      profile?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.admission_number?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || student.enrollment_status === statusFilter;

    const enrollment = enrollments.get(student.id);
    const matchesClass = classFilter === 'all' || enrollment?.class_id === classFilter;

    return matchesSearch && matchesStatus && matchesClass;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-accent text-accent-foreground';
      case 'inactive': return 'bg-muted text-muted-foreground';
      case 'graduated': return 'bg-primary text-primary-foreground';
      case 'transferred': return 'bg-secondary text-secondary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birth = new Date(dateOfBirth);
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    return monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate()) ? age - 1 : age;
  };

  const deleteStudent = async (studentId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to delete student "${studentName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', studentId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Student deleted successfully',
      });

      fetchAllData();
    } catch (error: any) {
      console.error('Error deleting student:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete student',
        variant: 'destructive',
      });
    }
  };

  const handleStudentSaved = () => {
    fetchAllData();
    setIsDialogOpen(false);
    setSelectedStudent(null);
  };

  const handleEditStudent = (student: Student) => {
    const profile = profiles.get(student.profile_id);
    const enrollment = enrollments.get(student.id);
    const parentRel = parentRelationships.get(student.id);
    
    setSelectedStudent({
      ...student,
      profile,
      enrollment,
      parentRelationship: parentRel
    });
    setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading students...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Student Management</h1>
          <p className="text-muted-foreground">
            Manage student records, enrollments, and relationships
          </p>
        </div>
        <Button onClick={() => { setSelectedStudent(null); setIsDialogOpen(true); }}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add New Student
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Students</CardTitle>
            <div className="h-4 w-4 rounded-full bg-accent"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {students.filter(s => s.enrollment_status === 'active').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Admissions</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {students.filter(s => {
                const admissionDate = new Date(s.admission_date);
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                return admissionDate >= thirtyDaysAgo;
              }).length}
            </div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {students.filter(s => !profiles.get(s.profile_id)).length}
            </div>
            <p className="text-xs text-muted-foreground">Missing info</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Students</CardTitle>
          <CardDescription>
            View and manage all student records with complete relationship tracking
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, ID, or admission number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="graduated">Graduated</SelectItem>
                <SelectItem value="transferred">Transferred</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Class & Stream</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Parent/Guardian</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Admission</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      <p className="text-muted-foreground">No students found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((student) => {
                    const profile = profiles.get(student.profile_id);
                    const enrollment = enrollments.get(student.id);
                    const classInfo = enrollment ? classes.get(enrollment.class_id) : null;
                    const streamInfo = enrollment?.stream_id ? streams.get(enrollment.stream_id) : null;
                    const parentRel = parentRelationships.get(student.id);
                    const parentProfile = parentRel ? parentProfiles.get(parentRel.parent_id) : null;
                    const age = calculateAge(student.date_of_birth);
                    
                    return (
                      <TableRow key={student.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={profile?.avatar_url || undefined} />
                              <AvatarFallback>
                                {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">
                                {profile?.first_name} {profile?.last_name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {profile?.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-mono text-sm">{student.student_id}</div>
                          {student.admission_number && (
                            <div className="text-xs text-muted-foreground">
                              Adm: {student.admission_number}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {classInfo ? (
                            <div>
                              <div className="font-medium">{classInfo.name}</div>
                              {streamInfo && (
                                <div className="text-sm text-muted-foreground">
                                  {streamInfo.name}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Not enrolled</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {profile?.phone || 'Not provided'}
                        </TableCell>
                        <TableCell>{age} yrs</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(student.enrollment_status)}>
                            {student.enrollment_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {parentProfile ? (
                            <div>
                              <div className="font-medium text-sm">
                                {parentProfile.first_name} {parentProfile.last_name}
                              </div>
                              {parentRel && (
                                <div className="text-xs text-muted-foreground capitalize">
                                  {parentRel.relationship_type}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Not assigned</span>
                          )}
                        </TableCell>
                        <TableCell className="capitalize">{student.gender || 'N/A'}</TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(student.admission_date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditStudent(student)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteStudent(
                                student.id,
                                `${profile?.first_name} ${profile?.last_name}`
                              )}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Student Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedStudent ? 'Edit Student' : 'Add New Student'}
            </DialogTitle>
          </DialogHeader>
          <StudentForm
            student={selectedStudent}
            onSuccess={handleStudentSaved}
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentManagement;
