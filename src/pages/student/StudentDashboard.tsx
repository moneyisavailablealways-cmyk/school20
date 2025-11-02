import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Calendar, BarChart3, Library, Clock, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const StudentDashboard = () => {
  const { profile } = useAuth();

  // Fetch student data
  const { data: studentData } = useQuery({
    queryKey: ['student', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('students')
        .select('id')
        .eq('profile_id', profile?.id)
        .single();
      return data;
    },
    enabled: !!profile?.id
  });

  // Fetch enrolled subjects count
  const { data: subjectsCount, isLoading: subjectsLoading } = useQuery({
    queryKey: ['student-subjects-count', studentData?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('student_subject_enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentData?.id)
        .eq('status', 'active');
      return count || 0;
    },
    enabled: !!studentData?.id
  });

  // Fetch today's schedule
  const { data: todaySchedule, isLoading: scheduleLoading } = useQuery({
    queryKey: ['student-today-schedule', studentData?.id],
    queryFn: async () => {
      const { data: enrollmentData } = await supabase
        .from('student_enrollments')
        .select('class_id')
        .eq('student_id', studentData?.id)
        .eq('status', 'active')
        .maybeSingle();

      if (!enrollmentData) return [];

      const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
      const dayOfWeek = today === 0 ? 7 : today; // Convert to 1 = Monday, 7 = Sunday

      const { data: timetableData } = await supabase
        .from('timetables')
        .select(`
          *,
          subjects:subject_id (name)
        `)
        .eq('class_id', enrollmentData.class_id)
        .eq('day_of_week', dayOfWeek)
        .order('start_time');

      if (!timetableData) return [];

      // Fetch teacher details separately
      const enrichedData = await Promise.all(
        timetableData.map(async (item) => {
          if (item.teacher_id) {
            const { data: teacherData } = await supabase
              .from('teachers')
              .select('profile_id, profiles:profile_id(first_name, last_name)')
              .eq('id', item.teacher_id)
              .maybeSingle();
            
            return {
              ...item,
              teachers: teacherData
            };
          }
          return item;
        })
      );

      return enrichedData;
    },
    enabled: !!studentData?.id
  });

  // Fetch recent grades
  const { data: recentGrades, isLoading: gradesLoading } = useQuery({
    queryKey: ['student-recent-grades', studentData?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('report_cards')
        .select('*')
        .eq('student_id', studentData?.id)
        .eq('is_published', true)
        .order('issued_date', { ascending: false })
        .limit(3);
      return data || [];
    },
    enabled: !!studentData?.id
  });

  const formatTime = (timeString: string) => {
    const time = new Date(`2000-01-01T${timeString}`);
    return time.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const quickActions = [
    {
      title: 'View Subjects',
      description: 'See your enrolled subjects',
      icon: BookOpen,
      href: '/student/subjects',
      color: 'text-blue-600',
    },
    {
      title: 'Check Schedule',
      description: 'View your class timetable',
      icon: Calendar,
      href: '/student/schedule',
      color: 'text-green-600',
    },
    {
      title: 'View Grades',
      description: 'Check your academic progress',
      icon: BarChart3,
      href: '/student/grades',
      color: 'text-purple-600',
    },
    {
      title: 'Library',
      description: 'Browse library resources',
      icon: Library,
      href: '/student/library',
      color: 'text-orange-600',
    },
  ];

  const stats = [
    {
      title: 'Enrolled Subjects',
      value: subjectsLoading ? '...' : String(subjectsCount || 0),
      icon: BookOpen,
      color: 'text-blue-600',
    },
    {
      title: 'Today\'s Classes',
      value: scheduleLoading ? '...' : String(todaySchedule?.length || 0),
      icon: Clock,
      color: 'text-green-600',
    },
    {
      title: 'Recent Reports',
      value: gradesLoading ? '...' : String(recentGrades?.length || 0),
      icon: CheckCircle,
      color: 'text-orange-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {profile?.first_name}!</h1>
        <p className="text-muted-foreground">
          Here's your academic overview and today's schedule.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Card key={action.title} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <action.icon className={`h-5 w-5 ${action.color}`} />
                  <CardTitle className="text-lg">{action.title}</CardTitle>
                </div>
                <CardDescription>{action.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link to={action.href}>
                    View
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Today's Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Schedule</CardTitle>
          <CardDescription>Your classes for today</CardDescription>
        </CardHeader>
        <CardContent>
          {scheduleLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : todaySchedule && todaySchedule.length > 0 ? (
            <div className="space-y-3">
              {todaySchedule.map((classItem) => (
                <div
                  key={classItem.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="text-sm font-medium text-primary">
                      {formatTime(classItem.start_time)} - {formatTime(classItem.end_time)}
                    </div>
                    <div>
                      <div className="font-medium">{classItem.subjects?.name}</div>
                      {'teachers' in classItem && classItem.teachers?.profiles && (
                        <div className="text-sm text-muted-foreground">
                          {classItem.teachers.profiles.first_name} {classItem.teachers.profiles.last_name}
                        </div>
                      )}
                    </div>
                  </div>
                  {classItem.room_number && (
                    <div className="text-sm text-muted-foreground">
                      Room {classItem.room_number}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No classes scheduled for today</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Grades */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Report Cards</CardTitle>
          <CardDescription>Your latest assessment results</CardDescription>
        </CardHeader>
        <CardContent>
          {gradesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : recentGrades && recentGrades.length > 0 ? (
            <div className="space-y-3">
              {recentGrades.map((grade) => (
                <div
                  key={grade.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <div className="font-medium">{grade.term}</div>
                    <div className="text-sm text-muted-foreground">
                      Issued: {new Date(grade.issued_date).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    {grade.overall_grade && (
                      <Badge variant="secondary" className="mb-1">
                        Grade: {grade.overall_grade}
                      </Badge>
                    )}
                    {grade.overall_percentage && (
                      <div className="text-sm font-medium">
                        {Number(grade.overall_percentage).toFixed(1)}%
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <Button asChild variant="outline" className="w-full mt-2">
                <Link to="/student/grades">View All Grades</Link>
              </Button>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No report cards available yet</p>
              <p className="text-sm">Your assessment results will appear here</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentDashboard;