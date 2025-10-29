import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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

  useEffect(() => {
    fetchTeacherStudents();
  }, [profile?.id]);

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

  // Group classes data by class for better UI organization
  const groupedByClass = classesData.reduce((acc, item) => {
    const classKey = item.class_id;
    if (!acc[classKey]) {
      acc[classKey] = {
        className: item.class_name,
        streamName: item.stream_name,
        subjects: []
      };
    }
    
    acc[classKey].subjects.push({
      subjectId: item.subject_id || 'all',
      subjectName: item.subject_name || 'All Students',
      students: item.students
    });
    
    return acc;
  }, {} as Record<string, any>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground">My Students</h1>
      </div>

      {/* Classes and Students */}
      {Object.keys(groupedByClass).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-muted-foreground text-center text-lg">
              No classes or students are assigned to you yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-12">
          {Object.entries(groupedByClass).map(([classId, classInfo]: [string, any]) => (
            <div key={classId} className="space-y-6">
              {/* Class Header */}
              <h2 className="text-3xl font-bold text-foreground">
                {classInfo.className}
                {classInfo.streamName && (
                  <span className="text-muted-foreground"> • {classInfo.streamName}</span>
                )}
              </h2>

              {/* Subject Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {classInfo.subjects.map((subject: any) => (
                  <Card key={subject.subjectId} className="overflow-hidden">
                    <div className="p-6 space-y-4">
                      {/* Subject Title */}
                      <h3 className="text-2xl font-bold text-foreground mb-6">
                        {subject.subjectName}
                      </h3>

                      {/* Students in this subject */}
                      <div className="space-y-4">
                        {subject.students.map((student: Student) => (
                          <div key={student.id} className="flex items-center space-x-4">
                            <Avatar className="h-14 w-14">
                              <AvatarFallback className="bg-muted text-foreground font-semibold text-lg">
                                {student.profiles.first_name[0]}{student.profiles.last_name[0]}
                              </AvatarFallback>
                            </Avatar>
                            
                            <div className="flex-1">
                              <h4 className="font-semibold text-lg text-foreground">
                                {student.profiles.first_name} {student.profiles.last_name}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {student.profiles.email}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
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