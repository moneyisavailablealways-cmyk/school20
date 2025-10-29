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
  subject_id?: string;
  subject_name?: string;
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

      // Get teacher record
      const { data: teacherData } = await supabase
        .from('teachers')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      const teacherId = teacherData?.id;

      // Get classes where teacher is the class teacher
      const { data: classTeacherClasses } = await supabase
        .from('classes')
        .select('id, name')
        .eq('class_teacher_id', profile.id);

      // Get streams where teacher is the section teacher
      const { data: sectionTeacherStreams } = await supabase
        .from('streams')
        .select(`
          id,
          name,
          class_id,
          classes!inner (id, name)
        `)
        .eq('section_teacher_id', profile.id);

      // Get subject specializations
      let specializations: any[] = [];
      if (teacherId) {
        const { data: specData } = await supabase
          .from('teacher_specializations')
          .select(`
            class_id,
            subject_id,
            classes!inner (id, name),
            subjects (id, name)
          `)
          .eq('teacher_id', teacherId)
          .not('class_id', 'is', null);
        
        specializations = specData || [];
      }

      // Collect all unique class IDs and build subject map
      const classIds = new Set<string>();
      const classSubjects = new Map<string, any[]>();
      
      (classTeacherClasses || []).forEach(c => {
        classIds.add(c.id);
        if (!classSubjects.has(c.id)) classSubjects.set(c.id, []);
      });
      
      (sectionTeacherStreams || []).forEach(s => {
        classIds.add(s.class_id);
        if (!classSubjects.has(s.class_id)) classSubjects.set(s.class_id, []);
      });
      
      specializations.forEach(s => {
        if (s.class_id) {
          classIds.add(s.class_id);
          if (!classSubjects.has(s.class_id)) {
            classSubjects.set(s.class_id, []);
          }
          classSubjects.get(s.class_id)!.push(s.subjects);
        }
      });

      if (classIds.size === 0) {
        setClassesData([]);
        setLoading(false);
        return;
      }

      // Fetch all student enrollments for these classes
      const { data: enrollments } = await supabase
        .from('student_enrollments')
        .select(`
          student_id,
          class_id,
          stream_id,
          status,
          classes!inner (id, name),
          streams (id, name),
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
        `)
        .in('class_id', Array.from(classIds))
        .eq('status', 'active');

      // For subject teachers, also get subject enrollments
      const studentSubjectMap = new Map<string, Set<string>>();
      if (specializations.length > 0) {
        const subjectIds = specializations.map(s => s.subject_id);
        const { data: subjectEnrollments } = await supabase
          .from('student_subject_enrollments')
          .select('student_id, subject_id')
          .in('subject_id', subjectIds)
          .eq('status', 'active');

        (subjectEnrollments || []).forEach(se => {
          if (!studentSubjectMap.has(se.student_id)) {
            studentSubjectMap.set(se.student_id, new Set());
          }
          studentSubjectMap.get(se.student_id)!.add(se.subject_id);
        });
      }

      // Process and group students by class/stream and subject
      const classMap = new Map<string, any>();

      (enrollments || []).forEach(enrollment => {
        const classId = enrollment.class_id;
        const subjects = classSubjects.get(classId) || [];
        
        // If this is a subject teacher, group by subject
        if (subjects.length > 0) {
          subjects.forEach(subject => {
            const studentSubjects = studentSubjectMap.get(enrollment.student_id);
            
            // Only include student if they're enrolled in this subject
            if (studentSubjects && studentSubjects.has(subject.id)) {
              const key = `${classId}-${subject.id}`;
              
              if (!classMap.has(key)) {
                classMap.set(key, {
                  class_id: classId,
                  class_name: enrollment.classes.name,
                  stream_name: enrollment.streams?.name,
                  subject_id: subject.id,
                  subject_name: subject.name,
                  students: []
                });
              }
              
              classMap.get(key)!.students.push(enrollment.students);
            }
          });
        } else {
          // Class teacher - show all students
          const key = enrollment.stream_id 
            ? `${classId}-${enrollment.stream_id}`
            : classId;

          if (!classMap.has(key)) {
            classMap.set(key, {
              class_id: classId,
              class_name: enrollment.classes.name,
              stream_name: enrollment.streams?.name,
              students: []
            });
          }

          classMap.get(key)!.students.push(enrollment.students);
        }
      });

      setClassesData(Array.from(classMap.values()));

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
              {Array.from(new Set(classesData.filter(c => c.subject_name).map(c => c.subject_name))).length}
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
            <div key={`${classData.class_id}-${classData.subject_id || 'all'}-${index}`} className="space-y-6">
              {/* Class Header */}
              <div className="border-b pb-4">
                <h2 className="text-2xl font-bold text-foreground">
                  {classData.class_name}
                  {classData.stream_name && (
                    <span className="text-lg text-muted-foreground ml-2">
                      • {classData.stream_name}
                    </span>
                  )}
                  {classData.subject_name && (
                    <span className="text-lg text-primary ml-2">
                      • {classData.subject_name}
                    </span>
                  )}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {classData.students.length} student{classData.students.length !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Students List */}
              <div className="space-y-3">
                {classData.students.map((student) => (
                  <Card key={student.id} className="hover:shadow-md transition-all duration-200 hover:scale-[1.01]">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-4">
                        <Avatar className="h-12 w-12 border-2 border-primary/20">
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
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
          ))}
        </div>
      )}
    </div>
  );
};

export default TeacherStudents;