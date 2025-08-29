import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Calendar, 
  FileText, 
  CreditCard, 
  Bell, 
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';

const ParentDashboard = () => {
  // Mock data - replace with real data from Supabase
  const children = [
    {
      id: '1',
      name: 'Emma Johnson',
      class: 'Grade 7A',
      attendance: '95%',
      lastAttendance: '2024-01-15',
      status: 'present'
    },
    {
      id: '2', 
      name: 'James Johnson',
      class: 'Grade 5B',
      attendance: '92%',
      lastAttendance: '2024-01-15',
      status: 'present'
    }
  ];

  const recentAnnouncements = [
    {
      id: '1',
      title: 'Parent-Teacher Meeting Schedule',
      date: '2024-01-15',
      priority: 'high'
    },
    {
      id: '2',
      title: 'School Fees Due Reminder', 
      date: '2024-01-14',
      priority: 'urgent'
    },
    {
      id: '3',
      title: 'Sports Day Information',
      date: '2024-01-13', 
      priority: 'normal'
    }
  ];

  const upcomingPayments = [
    {
      id: '1',
      description: 'School Fees - Term 2',
      amount: '$450.00',
      dueDate: '2024-01-30',
      status: 'pending'
    },
    {
      id: '2',
      description: 'Library Fine',
      amount: '$15.00', 
      dueDate: '2024-01-20',
      status: 'overdue'
    }
  ];

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Welcome Back!</h2>
        <p className="text-muted-foreground">
          Stay updated on your children's academic progress and school activities.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Children</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{children.length}</div>
            <p className="text-xs text-muted-foreground">Active students</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Attendance</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">94%</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Fees</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$465</div>
            <p className="text-xs text-muted-foreground">Due this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Updates</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Unread announcements</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Children Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              My Children
            </CardTitle>
            <CardDescription>Quick overview of your children's status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {children.map((child) => (
              <div key={child.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">{child.name}</h4>
                    <p className="text-sm text-muted-foreground">{child.class}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={child.status === 'present' ? 'default' : 'secondary'}>
                    {child.status === 'present' ? (
                      <CheckCircle className="w-3 h-3 mr-1" />
                    ) : (
                      <AlertCircle className="w-3 h-3 mr-1" />
                    )}
                    {child.status}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-1">{child.attendance} attendance</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Announcements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Recent Announcements
            </CardTitle>
            <CardDescription>Stay updated with school news</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentAnnouncements.map((announcement) => (
              <div key={announcement.id} className="flex items-start justify-between p-3 rounded-lg border">
                <div className="flex-1">
                  <h4 className="font-medium text-foreground">{announcement.title}</h4>
                  <p className="text-sm text-muted-foreground">{announcement.date}</p>
                </div>
                <Badge 
                  variant={
                    announcement.priority === 'urgent' ? 'destructive' :
                    announcement.priority === 'high' ? 'default' : 'secondary'
                  }
                >
                  {announcement.priority}
                </Badge>
              </div>
            ))}
            <Button variant="outline" className="w-full">
              View All Announcements
            </Button>
          </CardContent>
        </Card>

        {/* Upcoming Payments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Upcoming Payments
            </CardTitle>
            <CardDescription>Manage your payment obligations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingPayments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <h4 className="font-medium text-foreground">{payment.description}</h4>
                  <p className="text-sm text-muted-foreground">Due: {payment.dueDate}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-foreground">{payment.amount}</p>
                  <Badge variant={payment.status === 'overdue' ? 'destructive' : 'default'}>
                    {payment.status === 'overdue' ? (
                      <AlertCircle className="w-3 h-3 mr-1" />
                    ) : (
                      <Clock className="w-3 h-3 mr-1" />
                    )}
                    {payment.status}
                  </Badge>
                </div>
              </div>
            ))}
            <Button className="w-full">
              <CreditCard className="mr-2 h-4 w-4" />
              Pay Now
            </Button>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks you can perform</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              <Calendar className="mr-2 h-4 w-4" />
              Book Parent-Teacher Meeting
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <FileText className="mr-2 h-4 w-4" />
              Download Report Cards
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Bell className="mr-2 h-4 w-4" />
              View All Announcements
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <CreditCard className="mr-2 h-4 w-4" />
              Payment History
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ParentDashboard;