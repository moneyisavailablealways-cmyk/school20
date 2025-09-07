import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import QuickSetupDialog from '@/components/QuickSetupDialog';
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
  Heart,
  UserPlus,
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
  const [isQuickSetupOpen, setIsQuickSetupOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadDashboardStats();
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

  const quickActions = [
    {
      title: 'Add New User',
      description: 'Create teacher, staff, or admin accounts',
      icon: Users,
      action: () => window.location.href = '/admin/users',
      color: 'text-blue-600',
    },
    {
      title: 'Enroll Teacher',
      description: 'Add new teacher to the system',
      icon: GraduationCap,
      action: () => window.location.href = '/admin/add-teacher',
      color: 'text-blue-600',
    },
    {
      title: 'Enroll Parent',
      description: 'Add new parent account',
      icon: Heart,
      action: () => window.location.href = '/admin/add-parent',
      color: 'text-pink-600',
    },
    {
      title: 'Enroll Student',
      description: 'Add new student to the system',
      icon: UserPlus,
      action: () => window.location.href = '/admin/students',
      color: 'text-green-600',
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

  const recentActivities = [
    {
      type: 'user_created',
      message: 'New teacher account created for John Smith',
      time: '2 hours ago',
      icon: CheckCircle,
      color: 'text-green-500',
    },
    {
      type: 'student_enrolled',
      message: '5 new students enrolled in Grade 3',
      time: '4 hours ago',
      icon: GraduationCap,
      color: 'text-blue-500',
    },
    {
      type: 'class_created',
      message: 'New section added: Grade 2-C',
      time: '1 day ago',
      icon: Building,
      color: 'text-purple-500',
    },
    {
      type: 'pending',
      message: '3 admission applications pending review',
      time: '2 days ago',
      icon: Clock,
      color: 'text-orange-500',
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
        <Button className="gap-2" onClick={() => setIsQuickSetupOpen(true)}>
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
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                <activity.icon className={`h-5 w-5 ${activity.color}`} />
                <div className="flex-1">
                  <p className="text-sm">{activity.message}</p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <QuickSetupDialog 
        open={isQuickSetupOpen} 
        onOpenChange={setIsQuickSetupOpen} 
      />
    </div>
  );
};

export default AdminDashboard;