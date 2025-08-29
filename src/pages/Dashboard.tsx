import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
// Fixed: Using correct lucide-react icon names
import { 
  GraduationCap, 
  Users, 
  BookOpen, 
  Calendar, 
  DollarSign, 
  BarChart3,
  Settings,
  LogOut,
  User,
  Shield,
  UserCheck,
  Briefcase,
  Library,
  Users2,
  Heart
} from 'lucide-react';

const roleIcons = {
  admin: Shield,
  principal: User,
  head_teacher: UserCheck,
  teacher: GraduationCap,
  bursar: Briefcase,
  librarian: Library,
  student: Users2,
  parent: Heart,
};

const roleColors = {
  admin: 'destructive',
  principal: 'default',
  head_teacher: 'secondary',
  teacher: 'default',
  bursar: 'outline',
  librarian: 'outline',
  student: 'secondary',
  parent: 'outline',
} as const;

const Dashboard = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect based on user role
    if (profile?.role === 'admin') {
      navigate('/admin', { replace: true });
    } else if (profile?.role === 'principal') {
      navigate('/principal', { replace: true });
    } else if (profile?.role === 'head_teacher') {
      navigate('/head-teacher', { replace: true });
    } else if (profile?.role === 'teacher') {
      navigate('/teacher', { replace: true });
    } else if (profile?.role === 'bursar') {
      navigate('/bursar', { replace: true });
    } else if (profile?.role === 'student') {
      navigate('/student', { replace: true });
    }
  }, [profile, navigate]);

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const RoleIcon = roleIcons[profile.role];
  const roleLabel = profile.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

  const getQuickActions = () => {
    switch (profile.role) {
      case 'admin':
        return [
          { icon: Users, label: 'Manage Users', description: 'Add and manage system users', action: '/admin' },
          { icon: Settings, label: 'System Settings', description: 'Configure system preferences' },
          { icon: BarChart3, label: 'Reports', description: 'View system reports and analytics' },
          { icon: Calendar, label: 'Academic Calendar', description: 'Manage school calendar' },
        ];
      case 'principal':
        return [
          { icon: BarChart3, label: 'School Analytics', description: 'View school performance metrics' },
          { icon: Users, label: 'Staff Overview', description: 'Monitor staff performance' },
          { icon: GraduationCap, label: 'Academic Reports', description: 'Review academic progress' },
          { icon: DollarSign, label: 'Financial Summary', description: 'School financial overview' },
        ];
      case 'head_teacher':
        return [
          { icon: GraduationCap, label: 'Academic Oversight', description: 'Monitor academic progress' },
          { icon: Users, label: 'Teacher Management', description: 'Supervise teaching staff' },
          { icon: BookOpen, label: 'Curriculum Planning', description: 'Plan and review curriculum' },
          { icon: Calendar, label: 'Class Schedules', description: 'Manage class timetables' },
        ];
      case 'teacher':
        return [
          { icon: BookOpen, label: 'My Classes', description: 'View and manage your classes' },
          { icon: Users, label: 'Students', description: 'View student information' },
          { icon: Calendar, label: 'Schedule', description: 'View your teaching schedule' },
          { icon: BarChart3, label: 'Gradebook', description: 'Manage grades and assessments' },
        ];
      case 'bursar':
        return [
          { icon: DollarSign, label: 'Fee Management', description: 'Manage student fees and payments' },
          { icon: BarChart3, label: 'Financial Reports', description: 'Generate financial reports' },
          { icon: Users, label: 'Payment Tracking', description: 'Track student payments' },
          { icon: Settings, label: 'Fee Structure', description: 'Configure fee structures' },
        ];
      case 'librarian':
        return [
          { icon: BookOpen, label: 'Book Catalog', description: 'Manage library catalog' },
          { icon: Users, label: 'Book Issues', description: 'Track book borrowing' },
          { icon: Calendar, label: 'Due Dates', description: 'Manage return schedules' },
          { icon: BarChart3, label: 'Library Reports', description: 'View usage statistics' },
        ];
      case 'student':
        return [
          { icon: BookOpen, label: 'My Courses', description: 'View your enrolled courses' },
          { icon: Calendar, label: 'Schedule', description: 'View your class schedule' },
          { icon: BarChart3, label: 'Grades', description: 'View your grades and progress' },
          { icon: Library, label: 'Library', description: 'Browse library resources' },
        ];
      case 'parent':
        return [
          { icon: Users2, label: 'My Children', description: 'View children information' },
          { icon: BarChart3, label: 'Academic Progress', description: 'Track academic progress' },
          { icon: DollarSign, label: 'Fee Payments', description: 'Manage fee payments' },
          { icon: Calendar, label: 'Events', description: 'View school events' },
        ];
      default:
        return [];
    }
  };

  const quickActions = getQuickActions();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile.avatar_url} />
              <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                {profile.first_name[0]}{profile.last_name[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold text-primary">
                Welcome, {profile.first_name} {profile.last_name}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <RoleIcon className="h-4 w-4" />
                <Badge variant={roleColors[profile.role]}>
                  {roleLabel}
                </Badge>
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={signOut} className="gap-2">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {quickActions.map((action, index) => (
            <Card 
              key={index} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => action.action && navigate(action.action)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <action.icon className="h-8 w-8 text-primary" />
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    →
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-lg mb-2">{action.label}</CardTitle>
                <CardDescription>{action.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Schedule</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">5 Events</div>
              <p className="text-xs text-muted-foreground">3 classes, 2 meetings</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">8 pending, 4 in progress</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Notifications</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">7</div>
              <p className="text-xs text-muted-foreground">3 urgent, 4 normal</p>
            </CardContent>
          </Card>
        </div>

        {/* Welcome Message */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Getting Started
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Welcome to School20 - your comprehensive school management system. 
              This is the foundation of your School Management System with role-based access control.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Next Steps:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Explore your role-specific features using the quick actions above</li>
                <li>• Complete your profile information</li>
                <li>• Review system notifications and updates</li>
                <li>• Contact admin for any additional permissions needed</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;