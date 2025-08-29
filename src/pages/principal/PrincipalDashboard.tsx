import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  GraduationCap, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  BarChart3
} from 'lucide-react';
import { Link } from 'react-router-dom';

const PrincipalDashboard = () => {
  const { profile } = useAuth();

  const schoolMetrics = [
    {
      title: 'Total Enrollment',
      value: '1,247',
      change: '+5.2%',
      trend: 'up',
      icon: Users,
      color: 'text-blue-600',
    },
    {
      title: 'Average Attendance',
      value: '94.5%',
      change: '+2.1%',
      trend: 'up',
      icon: Calendar,
      color: 'text-green-600',
    },
    {
      title: 'Academic Performance',
      value: '87.3%',
      change: '+1.8%',
      trend: 'up',
      icon: GraduationCap,
      color: 'text-purple-600',
    },
    {
      title: 'Budget Utilization',
      value: '78.2%',
      change: '+3.4%',
      trend: 'up',
      icon: DollarSign,
      color: 'text-orange-600',
    },
  ];

  const pendingApprovals = [
    {
      type: 'Report Cards',
      count: 12,
      priority: 'high',
      dueDate: 'Tomorrow',
    },
    {
      type: 'Policy Updates',
      count: 3,
      priority: 'medium',
      dueDate: 'This Week',
    },
    {
      type: 'Budget Requests',
      count: 8,
      priority: 'low',
      dueDate: 'Next Week',
    },
    {
      type: 'Staff Evaluations',
      count: 5,
      priority: 'medium',
      dueDate: 'This Month',
    },
  ];

  const quickActions = [
    {
      title: 'Review Approvals',
      description: 'Pending items requiring your approval',
      icon: CheckCircle,
      href: '/principal/approvals',
      color: 'text-green-600',
      badge: '23',
    },
    {
      title: 'Performance Analytics',
      description: 'View detailed school performance metrics',
      icon: BarChart3,
      href: '/principal/performance',
      color: 'text-blue-600',
    },
    {
      title: 'Generate Reports',
      description: 'Create compliance and government reports',
      icon: FileText,
      href: '/principal/compliance',
      color: 'text-purple-600',
    },
    {
      title: 'Policy Management',
      description: 'Review and approve school policies',
      icon: FileText,
      href: '/principal/policies',
      color: 'text-orange-600',
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

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome, Principal {profile?.last_name}</h1>
        <p className="text-muted-foreground">
          School leadership overview and key performance indicators
        </p>
      </div>

      {/* School Metrics */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">School Performance</h2>
        <div className="grid gap-4 md:grid-cols-4">
          {schoolMetrics.map((metric) => (
            <Card key={metric.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
                <metric.icon className={`h-4 w-4 ${metric.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-green-600">{metric.change}</span>
                  <span>from last month</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
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
          <h2 className="text-2xl font-semibold mb-4">Pending Approvals</h2>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-orange-600" />
                <span>Items Requiring Action</span>
              </CardTitle>
              <CardDescription>Review and approve pending requests</CardDescription>
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
                      <div className="text-sm text-muted-foreground">Due: {approval.dueDate}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{approval.count}</Badge>
                    <Button size="sm" variant="outline">Review</Button>
                  </div>
                </div>
              ))}
              
              <div className="pt-3 border-t">
                <Button asChild className="w-full">
                  <Link to="/principal/approvals">View All Approvals</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle>Recent School Activities</CardTitle>
          <CardDescription>Latest updates and activities across the school</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { time: '2 hours ago', activity: 'Approved new student admission policy', type: 'Policy' },
              { time: '4 hours ago', activity: 'Reviewed Grade 12 report cards', type: 'Academics' },
              { time: 'Yesterday', activity: 'Signed off on quarterly budget report', type: 'Finance' },
              { time: '2 days ago', activity: 'Approved teacher evaluation forms', type: 'HR' },
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div>
                  <div className="font-medium">{item.activity}</div>
                  <div className="text-sm text-muted-foreground">{item.time}</div>
                </div>
                <Badge variant="outline">{item.type}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrincipalDashboard;