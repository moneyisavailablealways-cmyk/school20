import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Calendar, BarChart3, Library, Clock, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const StudentDashboard = () => {
  const { profile } = useAuth();

  const quickActions = [
    {
      title: 'View Courses',
      description: 'See your enrolled courses and subjects',
      icon: BookOpen,
      href: '/student/courses',
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
      title: 'Enrolled Courses',
      value: '6', // This would be fetched from the database
      icon: BookOpen,
      color: 'text-blue-600',
    },
    {
      title: 'Today\'s Classes',
      value: '4', // This would be fetched from the database
      icon: Clock,
      color: 'text-green-600',
    },
    {
      title: 'Assignments Due',
      value: '3', // This would be fetched from the database
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
          <div className="space-y-3">
            {[
              { time: '08:00 - 09:00', subject: 'Mathematics', teacher: 'Mr. Johnson', room: 'Room 101' },
              { time: '09:00 - 10:00', subject: 'English Literature', teacher: 'Ms. Smith', room: 'Room 205' },
              { time: '11:00 - 12:00', subject: 'Physics', teacher: 'Dr. Brown', room: 'Lab 1' },
              { time: '14:00 - 15:00', subject: 'History', teacher: 'Mrs. Davis', room: 'Room 302' },
            ].map((classItem, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <div className="text-sm font-medium text-primary">
                    {classItem.time}
                  </div>
                  <div>
                    <div className="font-medium">{classItem.subject}</div>
                    <div className="text-sm text-muted-foreground">
                      {classItem.teacher}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {classItem.room}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Grades */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Grades</CardTitle>
          <CardDescription>Your latest assessment results</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No recent grades to display</p>
            <p className="text-sm">Your assessment results will appear here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentDashboard;