import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Eye, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

interface ClassData {
  id: string;
  name: string;
  max_students: number;
  sections?: {
    id: string;
    name: string;
    max_students: number;
  }[];
}

const MyClasses = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyClasses();
  }, [profile?.id]);

  const fetchMyClasses = async () => {
    if (!profile?.id) return;

    try {
      // Fetch classes where the teacher is assigned as class teacher
      const { data: classTeacherData, error: classError } = await supabase
        .from('classes')
        .select(`
          id,
          name,
          max_students,
          levels (name),
          streams (
            id,
            name,
            max_students
          )
        `)
        .eq('class_teacher_id', profile.id);

      // Fetch streams where the teacher is assigned as stream teacher
      const { data: streamTeacherData, error: streamError } = await supabase
        .from('streams')
        .select('id, name, max_students, class_id')
        .eq('stream_teacher_id', profile.id);

      // Get class details for streams separately
      const classIds = streamTeacherData?.map(s => s.class_id) || [];
      let streamClasses: any[] = [];
      
      if (classIds.length > 0) {
        const { data: streamClassData } = await supabase
          .from('classes')
          .select('id, name, max_students')
          .in('id', classIds);
        streamClasses = streamClassData || [];
      }

      if (classError || streamError) {
        throw classError || streamError;
      }

      // Combine and deduplicate classes
      const allClasses = new Map();

      // Add classes where teacher is class teacher
      classTeacherData?.forEach(cls => {
        allClasses.set(cls.id, {
          ...cls,
          teacherRole: 'Class Teacher'
        });
      });

      // Add classes where teacher is stream teacher
      streamTeacherData?.forEach(stream => {
        const classData = streamClasses.find(c => c.id === stream.class_id);
        if (!classData) return;
        
        const classId = classData.id;
        if (!allClasses.has(classId)) {
          allClasses.set(classId, {
            ...classData,
            sections: [],
            teacherRole: 'Stream Teacher'
          });
        }
        // Add the specific stream
        const existingClass = allClasses.get(classId);
        if (!existingClass.sections.some((s: any) => s.id === stream.id)) {
          existingClass.sections.push({
            id: stream.id,
            name: stream.name,
            max_students: stream.max_students
          });
        }
      });

      setClasses(Array.from(allClasses.values()));
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
                  <Badge variant="secondary">{(classData as any).levels?.name || 'No Level'}</Badge>
                </div>
                <CardDescription>
                  {(classData as any).teacherRole}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Max Students:</span>
                  <span className="font-medium">{classData.max_students}</span>
                </div>

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
                    <Link to={`/teacher/classes/${classData.id}/students`}>
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