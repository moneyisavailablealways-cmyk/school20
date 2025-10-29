import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Eye, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

interface StreamData {
  id: string;
  name: string;
  max_students: number;
  class_id: string;
}

interface SubjectData {
  id: string;
  name: string;
}

interface ClassData {
  id: string;
  name: string;
  max_students: number;
  sections?: StreamData[];
  subjects?: SubjectData[];
  studentCount?: number;
}

const MyClasses = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [classes, setClasses] = useState<(ClassData & { teacherRole: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyClasses();
  }, [profile?.id]);

  const fetchMyClasses = async () => {
    if (!profile?.id) return;

    try {
      const results: any[] = [];

      // Get teacher record
      const { data: teacherData } = await supabase
        .from('teachers')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      const teacherId = teacherData?.id;

      // Query 1: Classes where user is class teacher
      const { data: classData } = await supabase
        .from('classes')
        .select('id, name, max_students')
        .eq('class_teacher_id', profile.id);

      // Query 2: Streams where user is stream teacher
      const { data: streamData } = await supabase
        .from('streams')
        .select('id, name, max_students, class_id')
        .eq('section_teacher_id', profile.id);

      // Query 3: Subject specializations
      let specializations: any[] = [];
      if (teacherId) {
        const { data: specData } = await supabase
          .from('teacher_specializations')
          .select(`
            class_id,
            subject_id,
            classes!inner (id, name, max_students),
            subjects (id, name)
          `)
          .eq('teacher_id', teacherId)
          .not('class_id', 'is', null);
        
        specializations = specData || [];
      }

      // Add class teacher classes
      for (const cls of classData || []) {
        const { count: studentCount } = await supabase
          .from('student_enrollments')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', cls.id)
          .eq('status', 'active');

        results.push({
          id: cls.id,
          name: cls.name,
          max_students: cls.max_students,
          sections: [],
          subjects: [],
          studentCount: studentCount || 0,
          teacherRole: 'Class Teacher'
        });
      }

      // Add stream teacher classes
      for (const stream of streamData || []) {
        let existing = results.find(r => r.id === stream.class_id);
        if (!existing) {
          // Get class details
          const { data: classDetails } = await supabase
            .from('classes')
            .select('id, name, max_students')
            .eq('id', stream.class_id)
            .single();
          
          if (classDetails) {
            const { count: studentCount } = await supabase
              .from('student_enrollments')
              .select('*', { count: 'exact', head: true })
              .eq('stream_id', stream.id)
              .eq('status', 'active');

            existing = {
              id: classDetails.id,
              name: classDetails.name,
              max_students: classDetails.max_students,
              sections: [stream],
              subjects: [],
              studentCount: studentCount || 0,
              teacherRole: 'Stream Teacher'
            };
            results.push(existing);
          }
        } else {
          existing.sections.push(stream);
        }
      }

      // Add subject-based classes
      const subjectClassMap = new Map<string, any>();
      for (const spec of specializations) {
        const classId = spec.class_id;
        
        if (!subjectClassMap.has(classId)) {
          // Check if already added as class/stream teacher
          let existing = results.find(r => r.id === classId);
          
          if (!existing) {
            const { count: studentCount } = await supabase
              .from('student_subject_enrollments')
              .select('*', { count: 'exact', head: true })
              .eq('subject_id', spec.subject_id)
              .eq('status', 'active');

            existing = {
              id: spec.classes.id,
              name: spec.classes.name,
              max_students: spec.classes.max_students,
              sections: [],
              subjects: [{ id: spec.subjects.id, name: spec.subjects.name }],
              studentCount: studentCount || 0,
              teacherRole: 'Subject Teacher'
            };
            results.push(existing);
            subjectClassMap.set(classId, existing);
          } else {
            // Add subject to existing class
            if (!existing.subjects) existing.subjects = [];
            existing.subjects.push({ id: spec.subjects.id, name: spec.subjects.name });
            if (existing.teacherRole === 'Class Teacher') {
              existing.teacherRole = 'Class & Subject Teacher';
            }
          }
        } else {
          // Add subject to existing entry in map
          const existingEntry = subjectClassMap.get(classId);
          existingEntry.subjects.push({ id: spec.subjects.id, name: spec.subjects.name });
        }
      }

      setClasses(results);
    } catch (error: any) {
      console.error('Error fetching classes:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch your classes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Classes</h1>
        <p className="text-muted-foreground">
          Classes and streams you're assigned to teach
        </p>
      </div>

      {classes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Classes Assigned</h3>
            <p className="text-muted-foreground text-center">
              You haven't been assigned to any classes yet. Contact your administrator
              to get assigned to classes.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((classData) => (
            <Card key={classData.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{classData.name}</CardTitle>
                  <Badge variant="secondary">Class</Badge>
                </div>
                <CardDescription>
                  {classData.teacherRole}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Students:</span>
                  <span className="font-medium">{classData.studentCount || 0}</span>
                </div>

                {classData.subjects && classData.subjects.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Subjects:</h4>
                    <div className="flex flex-wrap gap-1">
                      {classData.subjects.map((subject) => (
                        <Badge key={subject.id} variant="outline" className="text-xs">
                          {subject.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {classData.sections && classData.sections.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Streams:</h4>
                    <div className="space-y-1">
                      {classData.sections.map((stream) => (
                        <div key={stream.id} className="flex items-center justify-between text-sm bg-muted/50 rounded px-2 py-1">
                          <span>{stream.name}</span>
                          <span className="text-muted-foreground">
                            Max: {stream.max_students}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <Link to="/teacher/students">
                      <Users className="h-4 w-4 mr-1" />
                      Students
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/teacher/classes/${classData.id}`}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyClasses;