import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, Users, GraduationCap, Mail, Phone, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface StudentProfile {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
}

interface Student {
  id: string;
  student_id: string;
  date_of_birth: string;
  gender: string;
  profiles: StudentProfile;
}

interface ClassData {
  class_id: string;
  class_name: string;
  stream_name?: string;
  students: Student[];
}

const TeacherStudents = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [classesData, setClassesData] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredClassesData, setFilteredClassesData] = useState<ClassData[]>([]);

  useEffect(() => {
    fetchTeacherStudents();
  }, [profile?.id]);

  useEffect(() => {
    filterStudents();
  }, [classesData, searchTerm]);

  const fetchTeacherStudents = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);

      // Get classes where teacher is the class teacher
      const { data: teacherClasses, error: classError } = await supabase
        .from('classes')
        .select(`
          id,
          name,
          student_enrollments!inner (
            student_id,
            students!inner (
              id,
              student_id,
              date_of_birth,
              gender,
              profiles!inner (
                first_name,
                last_name,
                email,
                phone,
                avatar_url
              )
            )
          )
        `)
        .eq('class_teacher_id', profile.id);

      // Get streams where teacher is the section teacher
      const { data: teacherStreams, error: streamError } = await supabase
        .from('streams')
        .select(`
          id,
          name,
          class_id,
          classes!inner (
            id,
            name
          ),
          student_enrollments!inner (
            student_id,
            students!inner (
              id,
              student_id,
              date_of_birth,
              gender,
              profiles!inner (
                first_name,
                last_name,
                email,
                phone,
                avatar_url
              )
            )
          )
        `)
        .eq('section_teacher_id', profile.id);

      if (classError) throw classError;
      if (streamError) throw streamError;

      const processedClassesData: ClassData[] = [];

      // Process classes
      if (teacherClasses) {
        teacherClasses.forEach(classItem => {
          const students = classItem.student_enrollments
            .map(enrollment => enrollment.students)
            .filter(Boolean);

          if (students.length > 0) {
            processedClassesData.push({
              class_id: classItem.id,
              class_name: classItem.name,
              students: students
            });
          }
        });
      }

      // Process streams
      if (teacherStreams) {
        teacherStreams.forEach(streamItem => {
          const students = streamItem.student_enrollments
            .map(enrollment => enrollment.students)
            .filter(Boolean);

          if (students.length > 0) {
            processedClassesData.push({
              class_id: streamItem.classes.id,
              class_name: streamItem.classes.name,
              stream_name: streamItem.name,
              students: students
            });
          }
        });
      }

      setClassesData(processedClassesData);

    } catch (error: any) {
      console.error('Error fetching teacher students:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch students data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterStudents = () => {
    if (!searchTerm.trim()) {
      setFilteredClassesData(classesData);
      return;
    }

    const filtered = classesData.map(classData => ({
      ...classData,
      students: classData.students.filter(student => {
        const fullName = `${student.profiles.first_name} ${student.profiles.last_name}`.toLowerCase();
        const studentId = student.student_id.toLowerCase();
        const email = student.profiles.email.toLowerCase();
        
        return fullName.includes(searchTerm.toLowerCase()) ||
               studentId.includes(searchTerm.toLowerCase()) ||
               email.includes(searchTerm.toLowerCase());
      })
    })).filter(classData => classData.students.length > 0);

    setFilteredClassesData(filtered);
  };

  const getTotalStudents = () => {
    const uniqueStudents = new Set();
    classesData.forEach(classData => {
      classData.students.forEach(student => uniqueStudents.add(student.id));
    });
    return uniqueStudents.size;
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
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Students</h1>
        <p className="text-muted-foreground">
          Students in classes and streams you teach
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
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getTotalStudents()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Classes</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classesData.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subjects</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {classesData.reduce((total, classData) => total + (classData.stream_name ? 2 : 1), 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Classes and Students */}
      {filteredClassesData.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Students Found</h3>
            <p className="text-muted-foreground text-center">
              {searchTerm ? 'No students match your search criteria.' : 'No classes or students are assigned to you yet.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {filteredClassesData.map((classData, index) => (
            <div key={`${classData.class_id}-${index}`} className="space-y-6">
              {/* Class Header */}
              <div className="border-b pb-4">
                <h2 className="text-2xl font-bold text-foreground">
                  {classData.class_name}
                  {classData.stream_name && (
                    <span className="text-lg text-muted-foreground ml-2">
                      • {classData.stream_name}
                    </span>
                  )}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {classData.students.length} student{classData.students.length !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Subjects Section - For demo, we'll show Mathematics and English as common subjects */}
              <div className="grid gap-8 lg:grid-cols-2">
                {/* Mathematics Section */}
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 rounded-lg p-4 border border-blue-200/50 dark:border-blue-800/50">
                    <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">Mathematics</h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      {classData.students.length} student{classData.students.length !== 1 ? 's' : ''}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {classData.students.map((student) => (
                      <Card key={`math-${student.id}`} className="hover:shadow-md transition-all duration-200 hover:scale-[1.02] border-l-4 border-l-blue-500">
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-4">
                            <Avatar className="h-12 w-12 border-2 border-blue-200 dark:border-blue-700">
                              <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 font-semibold">
                                {student.profiles.first_name[0]}{student.profiles.last_name[0]}
                              </AvatarFallback>
                            </Avatar>
                            
                            <div className="flex-1 space-y-1">
                              <h4 className="font-semibold text-foreground">
                                {student.profiles.first_name} {student.profiles.last_name}
                              </h4>
                              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                <span>ID: {student.student_id}</span>
                                <span className="capitalize">{student.gender}</span>
                                <span>Age: {calculateAge(student.date_of_birth)}</span>
                              </div>
                              <div className="flex items-center space-x-2 text-sm">
                                <Mail className="h-3 w-3 text-muted-foreground" />
                                <span className="text-muted-foreground">{student.profiles.email}</span>
                              </div>
                              {student.profiles.phone && (
                                <div className="flex items-center space-x-2 text-sm">
                                  <Phone className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-muted-foreground">{student.profiles.phone}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* English Section */}
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 rounded-lg p-4 border border-green-200/50 dark:border-green-800/50">
                    <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">English</h3>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      {classData.students.length} student{classData.students.length !== 1 ? 's' : ''}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {classData.students.map((student) => (
                      <Card key={`english-${student.id}`} className="hover:shadow-md transition-all duration-200 hover:scale-[1.02] border-l-4 border-l-green-500">
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-4">
                            <Avatar className="h-12 w-12 border-2 border-green-200 dark:border-green-700">
                              <AvatarFallback className="bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100 font-semibold">
                                {student.profiles.first_name[0]}{student.profiles.last_name[0]}
                              </AvatarFallback>
                            </Avatar>
                            
                            <div className="flex-1 space-y-1">
                              <h4 className="font-semibold text-foreground">
                                {student.profiles.first_name} {student.profiles.last_name}
                              </h4>
                              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                <span>ID: {student.student_id}</span>
                                <span className="capitalize">{student.gender}</span>
                                <span>Age: {calculateAge(student.date_of_birth)}</span>
                              </div>
                              <div className="flex items-center space-x-2 text-sm">
                                <Mail className="h-3 w-3 text-muted-foreground" />
                                <span className="text-muted-foreground">{student.profiles.email}</span>
                              </div>
                              {student.profiles.phone && (
                                <div className="flex items-center space-x-2 text-sm">
                                  <Phone className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-muted-foreground">{student.profiles.phone}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeacherStudents;