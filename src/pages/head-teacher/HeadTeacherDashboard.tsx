import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  FileCheck, 
  AlertTriangle, 
  Calendar, 
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle,
  BookOpen,
  UserCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';

const HeadTeacherDashboard = () => {
  const { profile } = useAuth();

  const academicMetrics = [
    {
      title: 'Teachers Supervised',
      value: '24',
      change: '+2',
      icon: Users,
      color: 'text-blue-600',
    },
    {
      title: 'Pending Mark Approvals',
      value: '18',
      change: '-5',
      icon: FileCheck,
      color: 'text-orange-600',
    },
    {
      title: 'Discipline Cases',
      value: '7',
      change: '+3',
      icon: AlertTriangle,
      color: 'text-red-600',
    },
    {
      title: 'Classes Monitored',
      value: '45',
      change: '0',
      icon: BookOpen,
      color: 'text-green-600',
    },
  ];

  const pendingApprovals = [
    {
      type: 'Grade 10 Mathematics - Quiz Results',
      teacher: 'Mr. Johnson',
      dueDate: 'Today',
      priority: 'high',
    },
    {
      type: 'Grade 11 English - Essay Grades',
      teacher: 'Ms. Smith',
      dueDate: 'Tomorrow',
      priority: 'medium',
    },
    {
      type: 'Grade 9 Science - Lab Reports',
      teacher: 'Dr. Brown',
      dueDate: 'This Week',
      priority: 'low',
    },
  ];

  const recentActivities = [
    {
      time: '2 hours ago',
      activity: 'Approved Grade 12 Physics final exam marks',
      teacher: 'Dr. Wilson',
      type: 'Approval',
    },
    {
      time: '4 hours ago',
      activity: 'Reviewed lesson plans for Mathematics department',
      teacher: 'Mr. Johnson, Ms. Davis',
      type: 'Review',
    },
    {
      time: 'Yesterday',
      activity: 'Updated Class 10B timetable allocation',
      teacher: 'Multiple teachers',
      type: 'Timetable',
    },
    {
      time: '2 days ago',
      activity: 'Resolved discipline case - Student misconduct',
      teacher: 'Mrs. Thompson',
      type: 'Discipline',
    },
  ];

  const quickActions = [
    {
      title: 'Review Mark Approvals',
      description: 'Approve pending marks from teachers',
      icon: FileCheck,
      href: '/head-teacher/marks',
      color: 'text-orange-600',
      badge: '18',
    },
    {
      title: 'Teacher Supervision',
      description: 'Monitor teacher performance and lesson plans',
      icon: Users,
      href: '/head-teacher/supervision',
      color: 'text-blue-600',
    },
    {
      title: 'Discipline Management',
      description: 'Handle student discipline records',
      icon: AlertTriangle,
      href: '/head-teacher/discipline',
      color: 'text-red-600',
      badge: '7',
    },
    {
      title: 'Academic Reports',
      description: 'Generate performance reports by class/subject',
      icon: BarChart3,
      href: '/head-teacher/reports',
      color: 'text-green-600',
    },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getActivityTypeColor = (type: string) => {
    switch (type) {
      case 'Approval': return 'text-green-600 bg-green-50';
      case 'Review': return 'text-blue-600 bg-blue-50';
      case 'Timetable': return 'text-purple-600 bg-purple-50';
      case 'Discipline': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome, Head Teacher {profile?.last_name}</h1>
        <p className="text-muted-foreground">
          Academic supervision overview and staff management dashboard
        </p>
      </div>

      {/* Academic Metrics */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Academic Overview</h2>
        <div className="grid gap-4 md:grid-cols-4">
          {academicMetrics.map((metric) => (
            <Card key={metric.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
                <metric.icon className={`h-4 w-4 ${metric.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                  {metric.change !== '0' && (
                    <>
                      <TrendingUp className={`h-3 w-3 ${metric.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`} />
                      <span className={metric.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}>
                        {metric.change} from last week
                      </span>
                    </>
                  )}
                  {metric.change === '0' && (
                    <span className="text-muted-foreground">No change</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            {quickActions.map((action) => (
              <Card key={action.title} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <action.icon className={`h-5 w-5 ${action.color}`} />
                      <div>
                        <h3 className="font-medium">{action.title}</h3>
                        <p className="text-sm text-muted-foreground">{action.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {action.badge && (
                        <Badge variant="secondary">{action.badge}</Badge>
                      )}
                      <Button asChild variant="outline" size="sm">
                        <Link to={action.href}>View</Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Pending Approvals */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Pending Mark Approvals</h2>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-orange-600" />
                <span>Awaiting Your Review</span>
              </CardTitle>
              <CardDescription>Teacher submissions requiring approval</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingApprovals.map((approval, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(approval.priority)}`}>
                      {approval.priority.toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium">{approval.type}</div>
                      <div className="text-sm text-muted-foreground">
                        Teacher: {approval.teacher} • Due: {approval.dueDate}
                      </div>
                    </div>
                  </div>
                  <Button size="sm" variant="outline">Review</Button>
                </div>
              ))}
              
              <div className="pt-3 border-t">
                <Button asChild className="w-full">
                  <Link to="/head-teacher/marks">View All Pending Approvals</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activities</CardTitle>
          <CardDescription>Your latest academic supervision activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="text-sm text-muted-foreground min-w-[80px]">
                    {activity.time}
                  </div>
                  <div>
                    <div className="font-medium">{activity.activity}</div>
                    <div className="text-sm text-muted-foreground">
                      {activity.teacher}
                    </div>
                  </div>
                </div>
                <Badge className={`text-xs px-2 py-1 ${getActivityTypeColor(activity.type)}`}>
                  {activity.type}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HeadTeacherDashboard;