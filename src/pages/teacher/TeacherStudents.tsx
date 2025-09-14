import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, Users, GraduationCap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface StudentData {
  id: string;
  student_id: string;
  date_of_birth: string;
  gender: string;
  address: string;
  enrollment_status: string;
  profile_id: string;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  } | null;
  student_enrollments: {
    enrollment_date: string;
    status: string;
    classes: {
      name: string;
      level: number;
    } | null;
  streams: {
    name: string;
  } | null;
  }[];
}

const TeacherStudents = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [students, setStudents] = useState<StudentData[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchMyStudents();
  }, [profile?.id]);

  useEffect(() => {
    filterStudents();
  }, [students, searchTerm]);

  const fetchMyStudents = async () => {
    if (!profile?.id) return;

    try {
      // Get students from classes where teacher is class teacher
      const { data: classStudents, error: classError } = await supabase
        .from('student_enrollments')
        .select(`
          students (
            id,
            student_id,
            date_of_birth,
            gender,
            address,
            enrollment_status,
            profile_id,
            profiles (
              first_name,
              last_name,
              email,
              phone
            )
          ),
          classes (
            name,
            level
          ),
          streams (
            name
          ),
          enrollment_date,
          status
        `)
        .in('class_id', await getTeacherClassIds());

      // Get students from streams where teacher is stream teacher
      const { data: streamStudents, error: streamError } = await supabase
        .from('student_enrollments')
        .select(`
          students (
            id,
            student_id,
            date_of_birth,
            gender,
            address,
            enrollment_status,
            profile_id,
            profiles (
              first_name,
              last_name,
              email,
              phone
            )
          ),
          classes (
            name,
            level
          ),
          streams (
            name
          ),
          enrollment_date,
          status
        `)
        .in('stream_id', await getTeacherStreamIds());

      if (classError || streamError) {
        throw classError || streamError;
      }

      // Combine and deduplicate students
      const allEnrollments = [...(classStudents || []), ...(streamStudents || [])];
      const studentMap = new Map();

      allEnrollments.forEach(enrollment => {
        if (enrollment.students) {
          const studentId = enrollment.students.id;
          if (!studentMap.has(studentId)) {
            studentMap.set(studentId, {
              ...enrollment.students,
              student_enrollments: []
            });
          }
          studentMap.get(studentId).student_enrollments.push({
            enrollment_date: enrollment.enrollment_date,
            status: enrollment.status,
            classes: enrollment.classes,
            streams: enrollment.streams
          });
        }
      });

      setStudents(Array.from(studentMap.values()));
    } catch (error: any) {
      console.error('Error fetching students:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch students',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getTeacherClassIds = async () => {
    const { data } = await supabase
      .from('classes')
      .select('id')
      .eq('class_teacher_id', profile?.id);
    return data?.map(c => c.id) || [];
  };

  const getTeacherStreamIds = async () => {
    const supabaseClient: any = supabase;
    const { data } = await supabaseClient
      .from('streams')
      .select('id')
      .eq('stream_teacher_id', profile?.id);
    return data?.map((s: any) => s.id) || [];
  };

  const filterStudents = () => {
    if (!searchTerm) {
      setFilteredStudents(students);
      return;
    }

    const filtered = students.filter(student => {
      const fullName = `${student.profiles?.first_name || ''} ${student.profiles?.last_name || ''}`.toLowerCase();
      const studentId = student.student_id.toLowerCase();
      const email = student.profiles?.email?.toLowerCase() || '';
      
      return fullName.includes(searchTerm.toLowerCase()) ||
             studentId.includes(searchTerm.toLowerCase()) ||
             email.includes(searchTerm.toLowerCase());
    });

    setFilteredStudents(filtered);
  };

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birth = new Date(dateOfBirth);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Students</h1>
        <p className="text-muted-foreground">
          Students in your assigned classes and streams
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search students by name, ID, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Students</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {students.filter(s => s.enrollment_status === 'active').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Students List */}
      {filteredStudents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Students Found</h3>
            <p className="text-muted-foreground text-center">
              {searchTerm ? 'No students match your search criteria.' : 'No students are assigned to your classes yet.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredStudents.map((student) => (
            <Card key={student.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>
                        {student.profiles?.first_name?.[0]}{student.profiles?.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="space-y-1">
                      <h3 className="font-semibold text-lg">
                        {student.profiles?.first_name} {student.profiles?.last_name}
                      </h3>
                      <p className="text-sm text-muted-foreground">ID: {student.student_id}</p>
                      <p className="text-sm text-muted-foreground">
                        Age: {calculateAge(student.date_of_birth)} • Gender: {student.gender}
                      </p>
                      <p className="text-sm text-muted-foreground">{student.profiles?.email}</p>
                      {student.profiles?.phone && (
                        <p className="text-sm text-muted-foreground">{student.profiles?.phone}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right space-y-2">
                    <Badge variant={student.enrollment_status === 'active' ? 'default' : 'secondary'}>
                      {student.enrollment_status}
                    </Badge>
                    
                    <div className="space-y-1">
                      {student.student_enrollments.map((enrollment, index) => (
                        <div key={index} className="text-sm text-muted-foreground">
                          {enrollment.classes?.name}
                          {enrollment.streams && ` - ${enrollment.streams.name}`}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeacherStudents;