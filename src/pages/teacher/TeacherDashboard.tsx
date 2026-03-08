import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, BookOpen, Calendar, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

const TeacherDashboard = () => {
  const { profile } = useAuth();
  const [stats, setStats] = React.useState({
    totalClasses: 0,
    totalStudents: 0,
    todaysClasses: 0,
  });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetchTeacherStats();
  }, [profile?.id]);

  const fetchTeacherStats = async () => {
    if (!profile?.id) return;

    try {
      // Get teacher record
      const { data: teacherData } = await supabase
        .from('teachers')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (!teacherData) {
        setLoading(false);
        return;
      }

      const teacherId = teacherData.id;

      // Count classes where user is class teacher
      const { count: classTeacherCount } = await supabase
        .from('classes')
        .select('*', { count: 'exact', head: true })
        .eq('class_teacher_id', profile.id);

      // Count streams where user is stream teacher
      const { count: streamTeacherCount } = await supabase
        .from('streams')
        .select('*', { count: 'exact', head: true })
        .eq('section_teacher_id', profile.id);

      // Count unique classes from subject specializations
      const { data: specializations } = await supabase
        .from('teacher_specializations')
        .select('class_id')
        .eq('teacher_id', teacherId)
        .not('class_id', 'is', null);

      const uniqueClassIds = new Set(specializations?.map(s => s.class_id) || []);
      const subjectClassCount = uniqueClassIds.size;

      const totalClasses = (classTeacherCount || 0) + (streamTeacherCount || 0) + subjectClassCount;

      // Get all class IDs teacher is involved with
      const allClassIds = new Set<string>();
      
      const { data: classTeacherClasses } = await supabase
        .from('classes')
        .select('id')
        .eq('class_teacher_id', profile.id);
      
      classTeacherClasses?.forEach(c => allClassIds.add(c.id));

      const { data: streamClasses } = await supabase
        .from('streams')
        .select('class_id')
        .eq('section_teacher_id', profile.id);
      
      streamClasses?.forEach(s => allClassIds.add(s.class_id));

      specializations?.forEach(s => s.class_id && allClassIds.add(s.class_id));

      // Count unique students across all these classes
      if (allClassIds.size > 0) {
        const { data: enrollments } = await supabase
          .from('student_enrollments')
          .select('student_id')
          .in('class_id', Array.from(allClassIds))
          .eq('status', 'active');

        const uniqueStudents = new Set(enrollments?.map(e => e.student_id) || []);
        
        setStats({
          totalClasses,
          totalStudents: uniqueStudents.size,
          todaysClasses: 0, // Would need timetable data
        });
      } else {
        setStats({
          totalClasses,
          totalStudents: 0,
          todaysClasses: 0,
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      title: 'View My Classes',
      description: 'Manage your assigned classes and sections',
      icon: BookOpen,
      href: '/teacher/classes',
      color: 'text-blue-600',
    },
    {
      title: 'View Students',
      description: 'See all students in your classes',
      icon: Users,
      href: '/teacher/students',
      color: 'text-green-600',
    },
    {
      title: 'Schedule',
      description: 'View your teaching schedule',
      icon: Calendar,
      href: '/teacher/schedule',
      color: 'text-purple-600',
    },
  ];

  const statsCards = [
    {
      title: 'My Classes',
      value: loading ? '...' : stats.totalClasses.toString(),
      icon: BookOpen,
      color: 'text-blue-600',
    },
    {
      title: 'Total Students',
      value: loading ? '...' : stats.totalStudents.toString(),
      icon: Users,
      color: 'text-green-600',
    },
    {
      title: 'Today\'s Classes',
      value: loading ? '...' : stats.todaysClasses.toString(),
      icon: Clock,
      color: 'text-orange-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {profile?.first_name}!</h1>
        <p className="text-muted-foreground">
          Here's what's happening with your classes today.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {statsCards.map((stat) => (
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
        <div className="grid gap-4 md:grid-cols-3">
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
                    Get Started
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest classroom activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No recent activity to display</p>
            <p className="text-sm">Your classroom activities will appear here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherDashboard;