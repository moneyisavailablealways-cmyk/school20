import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Calendar, Clock, MapPin } from 'lucide-react';

interface EnrollmentData {
  id: string;
  status: string;
  class_name: string;
  stream_name: string | null;
}

interface SubjectData {
  id: string;
  subject_id: string;
  subject_name: string;
  subject_code: string;
  subject_description: string;
  is_core: boolean;
  level_name: string | null;
  sub_level: string | null;
  teacher_first_name: string | null;
  teacher_last_name: string | null;
  workload_hours: number;
}

const StudentSubjects = () => {
  const { profile } = useAuth();

  // Fetch student enrollment data
  const { data: enrollments, isLoading: enrollmentsLoading } = useQuery({
    queryKey: ['student-enrollments', profile?.id],
    queryFn: async (): Promise<EnrollmentData[]> => {
      if (!profile?.id) return [];

      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (studentError || !studentData) {
        console.error('Student not found:', studentError);
        return [];
      }

      const { data, error } = await supabase
        .from('student_enrollments')
        .select(`
          id,
          status,
          classes!inner(name),
          streams(name)
        `)
        .eq('student_id', studentData.id)
        .eq('status', 'active');

      if (error) {
        console.error('Error fetching enrollments:', error);
        return [];
      }

      return (data || []).map((e: any) => ({
        id: e.id,
        status: e.status,
        class_name: e.classes?.name || 'Unknown',
        stream_name: e.streams?.name || null
      }));
    },
    enabled: !!profile?.id
  });

  // Fetch student subjects using a more direct SQL approach
  const { data: subjects, isLoading: subjectsLoading } = useQuery({
    queryKey: ['student-subjects', profile?.id],
    queryFn: async (): Promise<SubjectData[]> => {
      if (!profile?.id) return [];

      // First get the student ID
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (studentError || !studentData) {
        console.error('Student not found:', studentError);
        return [];
      }

      // Get class_id for teacher lookup
      const { data: enrollmentData } = await supabase
        .from('student_enrollments')
        .select('class_id')
        .eq('student_id', studentData.id)
        .eq('status', 'active')
        .maybeSingle();

      const classId = enrollmentData?.class_id;

      // Fetch all subject enrollments for this student
      const { data: subjectEnrollments, error: subjectsError } = await supabase
        .from('student_subject_enrollments')
        .select('id, subject_id')
        .eq('student_id', studentData.id)
        .eq('status', 'active');

      if (subjectsError || !subjectEnrollments) {
        console.error('Error fetching subject enrollments:', subjectsError);
        return [];
      }

      // Fetch details for each subject
      const subjectDetails = await Promise.all(
        subjectEnrollments.map(async (enrollment) => {
          // Get subject info
          const { data: subject } = await supabase
            .from('subjects')
            .select('name, code, description, is_core, level_id, sub_level')
            .eq('id', enrollment.subject_id)
            .single();

          // Get level name
          let levelName = null;
          if (subject?.level_id) {
            const { data: level } = await supabase
              .from('levels')
              .select('name')
              .eq('id', subject.level_id)
              .maybeSingle();
            levelName = level?.name || null;
          }

          // Get teacher info if class_id is available
          let teacherFirstName = null;
          let teacherLastName = null;
          let workloadHours = 0;

          if (classId) {
            const { data: teacherEnrollment } = await supabase
              .from('teacher_enrollments')
              .select('teacher_id, workload_hours')
              .eq('subject_id', enrollment.subject_id)
              .eq('class_id', classId)
              .eq('status', 'active')
              .maybeSingle();

            if (teacherEnrollment) {
              workloadHours = teacherEnrollment.workload_hours || 0;

              const { data: teacher } = await supabase
                .from('teachers')
                .select('profile_id')
                .eq('id', teacherEnrollment.teacher_id)
                .maybeSingle();

              if (teacher?.profile_id) {
                const { data: teacherProfile } = await supabase
                  .from('profiles')
                  .select('first_name, last_name')
                  .eq('id', teacher.profile_id)
                  .maybeSingle();

                if (teacherProfile) {
                  teacherFirstName = teacherProfile.first_name;
                  teacherLastName = teacherProfile.last_name;
                }
              }
            }
          }

          return {
            id: enrollment.id,
            subject_id: enrollment.subject_id,
            subject_name: subject?.name || 'Unknown',
            subject_code: subject?.code || '',
            subject_description: subject?.description || '',
            is_core: subject?.is_core || false,
            level_name: levelName,
            sub_level: subject?.sub_level || null,
            teacher_first_name: teacherFirstName,
            teacher_last_name: teacherLastName,
            workload_hours: workloadHours
          };
        })
      );

      return subjectDetails;
    },
    enabled: !!profile?.id
  });

  if (enrollmentsLoading || subjectsLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Subjects</h1>
          <p className="text-muted-foreground mt-2">
            View your enrolled subjects and teachers
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Subjects</h1>
        <p className="text-muted-foreground mt-2">
          View your enrolled subjects and teachers
        </p>
      </div>

      {enrollments && enrollments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Current Enrollment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Class:</strong> {enrollments[0]?.class_name}</p>
              {enrollments[0]?.stream_name && (
                <p><strong>Stream:</strong> {enrollments[0].stream_name}</p>
              )}
              <Badge variant="secondary">
                {enrollments[0]?.status}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {subjects?.map((subject) => (
          <Card key={subject.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{subject.subject_name}</span>
                {subject.is_core && (
                  <Badge variant="default">Core</Badge>
                )}
              </CardTitle>
              {subject.subject_code && (
                <p className="text-sm text-muted-foreground">
                  {subject.subject_code}
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {subject.subject_description && (
                <p className="text-sm">{subject.subject_description}</p>
              )}
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {subject.level_name || 'No Level'} 
                    {subject.sub_level && ` - ${subject.sub_level}`}
                  </span>
                </div>
                
                {subject.teacher_first_name && subject.teacher_last_name && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {subject.teacher_first_name} {subject.teacher_last_name}
                    </span>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {subject.workload_hours} hours/week
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(!subjects || subjects.length === 0) && (
        <Card>
          <CardContent className="py-8 text-center">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Subjects Found</h3>
            <p className="text-muted-foreground">
              You are not currently enrolled in any subjects. Please contact your administrator.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentSubjects;