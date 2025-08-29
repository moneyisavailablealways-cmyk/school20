import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, BookOpen, Calendar, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

const TeacherDashboard = () => {
  const { profile } = useAuth();

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

  const stats = [
    {
      title: 'My Classes',
      value: '0', // This would be fetched from the database
      icon: BookOpen,
      color: 'text-blue-600',
    },
    {
      title: 'Total Students',
      value: '0', // This would be fetched from the database
      icon: Users,
      color: 'text-green-600',
    },
    {
      title: 'Today\'s Classes',
      value: '0', // This would be fetched from the database
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