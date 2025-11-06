import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Users, Search, Phone, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface StudentData {
  id: string;
  student_id: string;
  profile: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  date_of_birth: string;
  gender: string;
  enrollment_status: string;
  enrollment: {
    status: string;
    enrollment_date: string;
  };
}

const ClassStudents = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [students, setStudents] = useState<StudentData[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<StudentData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [className, setClassName] = useState('');

  useEffect(() => {
    if (classId) {
      fetchClassStudents();
    }
  }, [classId, profile?.id]);

  useEffect(() => {
    filterStudents();
  }, [searchTerm, students]);

  // Real-time subscription for student enrollment changes
  useEffect(() => {
    if (!classId) return;

    const channel = supabase
      .channel(`class-students-${classId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'student_enrollments',
          filter: `class_id=eq.${classId}`
        },
        (payload) => {
          console.log('Student enrollment changed:', payload);
          // Refetch students when enrollments change
          fetchClassStudents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [classId]);

  const fetchClassStudents = async () => {
    if (!classId || !profile?.id) return;

    try {
      setLoading(true);
      
      // First, get class details
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('name')
        .eq('id', classId)
        .single();

      if (classError) throw classError;
      setClassName(classData?.name || '');

      // Fetch all active students enrolled in this class
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('student_enrollments')
        .select('student_id, enrollment_date, status')
        .eq('class_id', classId)
        .eq('status', 'active');

      if (enrollmentError) {
        console.error('Enrollment error:', enrollmentError);
        throw enrollmentError;
      }

      if (!enrollmentData || enrollmentData.length === 0) {
        console.log('No enrollments found for class:', classId);
        setStudents([]);
        setLoading(false);
        return;
      }

      const studentIds = enrollmentData.map((e: any) => e.student_id);
      console.log('Found student IDs:', studentIds);

      // Fetch students separately to avoid RLS issues
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('id, student_id, date_of_birth, gender, enrollment_status, profile_id')
        .in('id', studentIds);

      if (studentError) {
        console.error('Student error:', studentError);
        throw studentError;
      }

      if (!studentData || studentData.length === 0) {
        console.log('No student data found');
        setStudents([]);
        setLoading(false);
        return;
      }

      // Fetch profiles separately
      const profileIds = studentData.map((s: any) => s.profile_id).filter(Boolean);
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, phone')
        .in('id', profileIds);

      if (profileError) {
        console.error('Profile error:', profileError);
        throw profileError;
      }

      // Create maps for quick lookup
      const enrollmentMap = new Map(
        enrollmentData.map((e: any) => [e.student_id, e])
      );
      const profileMap = new Map(
        profileData?.map((p: any) => [p.id, p]) || []
      );

      // Combine the data
      const formattedStudents = studentData
        .map((student: any) => {
          const enrollment = enrollmentMap.get(student.id);
          const profile = profileMap.get(student.profile_id);

          if (!profile) {
            console.log('No profile found for student:', student.id);
            return null;
          }

          return {
            id: student.id,
            student_id: student.student_id,
            profile: profile,
            date_of_birth: student.date_of_birth,
            gender: student.gender,
            enrollment_status: student.enrollment_status,
            enrollment: {
              status: enrollment?.status || 'active',
              enrollment_date: enrollment?.enrollment_date || new Date().toISOString()
            }
          };
        })
        .filter((s: any) => s !== null);

      console.log('Formatted students:', formattedStudents);
      setStudents(formattedStudents);
      
      // Show success toast when students are loaded
      if (formattedStudents.length > 0) {
        toast({
          title: 'Student list updated',
          description: `Found ${formattedStudents.length} student${formattedStudents.length > 1 ? 's' : ''}`,
        });
      }
    } catch (error: any) {
      console.error('Error fetching class students:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch class students',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterStudents = () => {
    if (!searchTerm.trim()) {
      setFilteredStudents(students);
      return;
    }

    const filtered = students.filter(student =>
      student.profile.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.profile.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.profile.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    setFilteredStudents(filtered);
  };

  const calculateAge = (dateOfBirth: string) => {
    const birth = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      case 'graduated':
        return 'bg-blue-100 text-blue-800';
      case 'transferred':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/teacher/classes')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Classes
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {className} Students
          </h1>
          <p className="text-muted-foreground">
            Students enrolled in this class
          </p>
        </div>
      </div>

      {/* Search and Stats */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Total:</span>
            <span className="font-medium">{students.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-muted-foreground">Active:</span>
            <span className="font-medium">
              {students.filter(s => s.enrollment_status === 'active').length}
            </span>
          </div>
        </div>
      </div>

      {filteredStudents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {searchTerm ? 'No students found' : 'No students enrolled'}
            </h3>
            <p className="text-muted-foreground text-center">
              {searchTerm 
                ? 'Try adjusting your search criteria.' 
                : 'No students have been enrolled in this class yet.'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredStudents.map((student) => (
            <Card key={student.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">
                            {student.profile.first_name} {student.profile.last_name}
                          </h3>
                          <Badge className={getStatusColor(student.enrollment_status)}>
                            {student.enrollment_status}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">Student ID:</span>
                            <div className="font-medium">{student.student_id}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Age:</span>
                            <div className="font-medium">
                              {calculateAge(student.date_of_birth)} years
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Gender:</span>
                            <div className="font-medium capitalize">
                              {student.gender || 'Not specified'}
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Enrolled:</span>
                            <div className="font-medium">
                              {new Date(student.enrollment.enrollment_date).toLocaleDateString()}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-4 mt-3 text-sm">
                          {student.profile.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">{student.profile.email}</span>
                            </div>
                          )}
                          {student.profile.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">{student.profile.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
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

export default ClassStudents;