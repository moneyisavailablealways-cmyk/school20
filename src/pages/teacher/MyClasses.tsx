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
  level: number;
  max_students: number;
  sections: {
    id: string;
    name: string;
    max_students: number;
    _count?: {
      student_enrollments: number;
    };
  }[];
  _count?: {
    student_enrollments: number;
  };
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
          level,
          max_students,
          sections (
            id,
            name,
            max_students
          )
        `)
        .eq('class_teacher_id', profile.id);

      // Fetch classes where the teacher is assigned as section teacher
      const { data: sectionTeacherData, error: sectionError } = await supabase
        .from('sections')
        .select(`
          id,
          name,
          max_students,
          class_id,
          classes (
            id,
            name,
            level,
            max_students
          )
        `)
        .eq('section_teacher_id', profile.id);

      if (classError || sectionError) {
        throw classError || sectionError;
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

      // Add classes where teacher is section teacher
      sectionTeacherData?.forEach(section => {
        const classId = section.classes.id;
        if (!allClasses.has(classId)) {
          allClasses.set(classId, {
            ...section.classes,
            sections: [],
            teacherRole: 'Section Teacher'
          });
        }
        // Add the specific section
        const existingClass = allClasses.get(classId);
        if (!existingClass.sections.some((s: any) => s.id === section.id)) {
          existingClass.sections.push({
            id: section.id,
            name: section.name,
            max_students: section.max_students
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
          Classes and sections you're assigned to teach
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
                  <Badge variant="secondary">Level {classData.level}</Badge>
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
                    <h4 className="text-sm font-medium mb-2">Sections:</h4>
                    <div className="space-y-1">
                      {classData.sections.map((section) => (
                        <div key={section.id} className="flex items-center justify-between text-sm bg-muted/50 rounded px-2 py-1">
                          <span>{section.name}</span>
                          <span className="text-muted-foreground">
                            Max: {section.max_students}
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