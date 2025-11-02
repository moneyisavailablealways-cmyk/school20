import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Calendar, Clock, MapPin } from 'lucide-react';

const StudentSubjects = () => {
  const { profile } = useAuth();

  const { data: enrollments, isLoading } = useQuery({
    queryKey: ['student-enrollments', profile?.id],
    queryFn: async () => {
      const { data: studentData } = await supabase
        .from('students')
        .select('id')
        .eq('profile_id', profile?.id)
        .single();

      if (!studentData) return [];

      const { data, error } = await supabase
        .from('student_enrollments')
        .select(`
          *,
          classes:class_id (
            name
          ),
          streams:stream_id (
            name
          )
        `)
        .eq('student_id', studentData.id)
        .eq('status', 'active');

      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id
  });

  const { data: subjects, isLoading: subjectsLoading } = useQuery({
    queryKey: ['student-subjects', profile?.id],
    queryFn: async () => {
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('profile_id', profile?.id)
        .single();

      if (studentError || !studentData) {
        console.log('No student record found for profile:', profile?.id);
        return [];
      }

      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('student_enrollments')
        .select('class_id, student_id')
        .eq('student_id', studentData.id)
        .eq('status', 'active')
        .maybeSingle();

      if (enrollmentError || !enrollmentData) {
        console.log('No active enrollment found for student:', studentData.id);
        return [];
      }

      // Fetch subjects the student is actually enrolled in
      const { data: subjectEnrollments, error } = await supabase
        .from('student_subject_enrollments')
        .select(`
          *,
          subjects:subject_id (
            name,
            code,
            description,
            is_core,
            level_id,
            sub_level
          )
        `)
        .eq('student_id', enrollmentData.student_id)
        .eq('status', 'active');

      if (error) throw error;

      // Enrich with level names and teacher details
      const enrichedPromises = (subjectEnrollments || []).map(async (enrollment) => {
        // Get level name
        let levelName = null;
        if (enrollment.subjects?.level_id) {
          const { data: levelData } = await supabase
            .from('levels')
            .select('name')
            .eq('id', enrollment.subjects.level_id)
            .single();
          levelName = levelData?.name;
        }

        // Get teacher for this subject in the student's class
        const { data: teacherEnrollment } = await supabase
          .from('teacher_enrollments')
          .select('teacher_id, workload_hours')
          .eq('subject_id', enrollment.subject_id)
          .eq('class_id', enrollmentData.class_id)
          .eq('status', 'active')
          .maybeSingle();

        let teacherInfo = null;
        if (teacherEnrollment?.teacher_id) {
          const { data: teacherData } = await supabase
            .from('teachers')
            .select(`
              profile_id,
              profiles:profile_id (
                first_name,
                last_name
              )
            `)
            .eq('id', teacherEnrollment.teacher_id)
            .maybeSingle();
          
          teacherInfo = teacherData;
        }

        return {
          ...enrollment,
          subjects: {
            ...enrollment.subjects,
            level: levelName ? { name: levelName } : null
          },
          teachers: teacherInfo,
          workload_hours: teacherEnrollment?.workload_hours || 0
        };
      });

      const enrichedData = await Promise.all(enrichedPromises);
      return enrichedData;
    },
    enabled: !!profile?.id
  });

  if (isLoading || subjectsLoading) {
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
              <p><strong>Class:</strong> {enrollments[0]?.classes?.name}</p>
              {enrollments[0]?.streams && (
                <p><strong>Stream:</strong> {enrollments[0].streams.name}</p>
              )}
              <Badge variant="secondary">
                {enrollments[0]?.status}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {subjects?.map((enrollment) => (
          <Card key={enrollment.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{enrollment.subjects?.name}</span>
                {enrollment.subjects?.is_core && (
                  <Badge variant="default">Core</Badge>
                )}
              </CardTitle>
              {enrollment.subjects?.code && (
                <p className="text-sm text-muted-foreground">
                  {enrollment.subjects.code}
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {enrollment.subjects?.description && (
                <p className="text-sm">{enrollment.subjects.description}</p>
              )}
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {enrollment.subjects?.level?.name || 'No Level'} 
                    {enrollment.subjects?.sub_level && ` - ${enrollment.subjects.sub_level}`}
                  </span>
                </div>
                
                {enrollment.teachers?.profiles && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {enrollment.teachers.profiles.first_name} {enrollment.teachers.profiles.last_name}
                    </span>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {enrollment.workload_hours || 0} hours/week
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
            <p className="text-muted-foreground mb-2">
              You are not currently enrolled in any subjects.
            </p>
            <p className="text-sm text-muted-foreground">
              Check browser console (F12) for detailed information.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentSubjects;