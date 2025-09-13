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

interface ClassData {
  id: string;
  name: string;
  max_students: number;
  sections?: StreamData[];
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

      // Use any to avoid complex TypeScript inference
      const supabaseClient: any = supabase;

      // Query 1: Classes where user is class teacher
      const classResponse = await supabaseClient
        .from('classes')
        .select('id, name, max_students')
        .eq('class_teacher_id', profile.id);

      const classData = classResponse.data || [];

      // Query 2: Streams where user is stream teacher
      const streamResponse = await supabaseClient
        .from('streams')
        .select('id, name, max_students, class_id')
        .eq('stream_teacher_id', profile.id);
      
      const streamData = streamResponse.data || [];

      // Add class teacher classes
      for (const cls of classData) {
        results.push({
          id: cls.id,
          name: cls.name,
          max_students: cls.max_students,
          sections: [],
          teacherRole: 'Class Teacher'
        });
      }

      // Add stream teacher classes
      for (const stream of streamData) {
        const existing = results.find(r => r.id === stream.class_id);
        if (!existing) {
          // Get class details
          const classDetailsResponse = await supabaseClient
            .from('classes')
            .select('id, name, max_students')
            .eq('id', stream.class_id)
            .single();
          
          const classDetails = classDetailsResponse.data;
          
          if (classDetails) {
            results.push({
              id: classDetails.id,
              name: classDetails.name,
              max_students: classDetails.max_students,
              sections: [stream],
              teacherRole: 'Stream Teacher'
            });
          }
        } else {
          existing.sections.push(stream);
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