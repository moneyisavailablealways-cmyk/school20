import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Users,
  GraduationCap,
  Calendar,
  Building,
  BookOpen,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Plus,
} from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  activeEnrollments: number;
  pendingAdmissions: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    activeEnrollments: 0,
    pendingAdmissions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadDashboardStats();
    loadRecentActivities();
    
    // Set up real-time subscription for activities
    const channel = supabase
      .channel('activity-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_log'
        },
        () => {
          loadRecentActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadDashboardStats = async () => {
    try {
      // Get total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get students count
      const { count: totalStudents } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student');

      // Get teachers count
      const { count: totalTeachers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'teacher');

      // Get classes count
      const { count: totalClasses } = await supabase
        .from('classes')
        .select('*', { count: 'exact', head: true });

      // Get active enrollments
      const { count: activeEnrollments } = await supabase
        .from('student_enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      setStats({
        totalUsers: totalUsers || 0,
        totalStudents: totalStudents || 0,
        totalTeachers: totalTeachers || 0,
        totalClasses: totalClasses || 0,
        activeEnrollments: activeEnrollments || 0,
        pendingAdmissions: 0, // TODO: Implement admissions tracking
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard statistics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRecentActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_log')
        .select(`
          *,
          profiles:user_id(first_name, last_name)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentActivities(data || []);
    } catch (error) {
      console.error('Error loading recent activities:', error);
    }
  };

  const handleQuickSetup = () => {
    // Navigate to the settings page for initial setup
    window.location.href = '/admin/settings';
  };

  const quickActions = [
    {
      title: 'Add New User',
      description: 'Create teacher, staff, or admin accounts',
      icon: Users,
      action: () => window.location.href = '/admin/users',
      color: 'text-blue-600',
    },
    {
      title: 'Enroll Student',
      description: 'Add new student to the system',
      icon: GraduationCap,
      action: () => window.location.href = '/admin/students',
      color: 'text-green-600',
    },
    {
      title: 'Enroll Teacher',
      description: 'Add teacher and assign subjects',
      icon: Users,
      action: () => window.location.href = '/admin/add-teacher',
      color: 'text-blue-600',
    },
    {
      title: 'Enroll Parent',
      description: 'Register new parent/guardian',
      icon: Users,
      action: () => window.location.href = '/admin/add-parent',
      color: 'text-indigo-600',
    },
    {
      title: 'Create Class',
      description: 'Set up new classes and sections',
      icon: Building,
      action: () => window.location.href = '/admin/academic',
      color: 'text-purple-600',
    },
    {
      title: 'View Reports',
      description: 'Generate system reports',
      icon: BookOpen,
      action: () => window.location.href = '/admin/reports',
      color: 'text-orange-600',
    },
  ];


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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to School20 Administration Center
          </p>
        </div>
        <Button className="gap-2" onClick={handleQuickSetup}>
          <Plus className="h-4 w-4" />
          Quick Setup
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              All system users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Students</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              Enrolled students
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Teachers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTeachers}</div>
            <p className="text-xs text-muted-foreground">
              Teaching staff
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Classes</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClasses}</div>
            <p className="text-xs text-muted-foreground">
              Active classes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enrollments</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeEnrollments}</div>
            <p className="text-xs text-muted-foreground">
              This academic year
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingAdmissions}</div>
            <p className="text-xs text-muted-foreground">
              Admission requests
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common administrative tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickActions.map((action, index) => (
              <Card
                key={index}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={action.action}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <action.icon className={`h-6 w-6 ${action.color}`} />
                    <h3 className="font-semibold text-sm">{action.title}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {action.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Latest system activities and updates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivities.map((activity, index) => {
              const getActivityIcon = (type: string) => {
                switch (type) {
                  case 'user_created': return CheckCircle;
                  case 'student_enrolled': return GraduationCap;
                  case 'student_status_changed': return Users;
                  case 'role_changed': return AlertCircle;
                  case 'teacher_deleted': return Users;
                  case 'student_deleted': return GraduationCap;
                  case 'parent_deleted': return Users;
                  case 'subject_deleted': return BookOpen;
                  case 'schedule_deleted': return Calendar;
                  default: return Clock;
                }
              };
              
              const getActivityColor = (type: string) => {
                switch (type) {
                  case 'user_created': return 'text-green-500';
                  case 'student_enrolled': return 'text-blue-500';
                  case 'student_status_changed': return 'text-purple-500';
                  case 'role_changed': return 'text-orange-500';
                  case 'teacher_deleted': return 'text-red-500';
                  case 'student_deleted': return 'text-red-500';
                  case 'parent_deleted': return 'text-red-500';
                  case 'subject_deleted': return 'text-red-500';
                  case 'schedule_deleted': return 'text-red-500';
                  default: return 'text-muted-foreground';
                }
              };

              const ActivityIcon = getActivityIcon(activity.activity_type);
              const timeAgo = new Date(activity.created_at).toLocaleString();

              return (
                <div key={index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                  <ActivityIcon className={`h-5 w-5 ${getActivityColor(activity.activity_type)}`} />
                  <div className="flex-1">
                    <p className="text-sm">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">{timeAgo}</p>
                  </div>
                </div>
              );
            })}
            
            {recentActivities.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">No recent activities</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;