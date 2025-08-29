import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { 
  Users, 
  Calendar, 
  CreditCard, 
  Bell, 
  FileText, 
  UserCheck,
  AlertCircle,
  TrendingUp
} from "lucide-react";

const ParentDashboard = () => {
  const { profile } = useAuth();

  // Fetch parent's children
  const { data: children } = useQuery({
    queryKey: ['parent-children', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parent_student_relationships')
        .select(`
          student_id,
          students (
            id,
            student_id,
            profiles (
              first_name,
              last_name
            )
          )
        `)
        .eq('parent_id', profile?.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id
  });

  // Fetch recent announcements
  const { data: announcements } = useQuery({
    queryKey: ['parent-announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .contains('target_audience', ['all', 'parents'])
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch outstanding fees for children
  const { data: outstandingFees } = useQuery({
    queryKey: ['parent-outstanding-fees', profile?.id],
    queryFn: async () => {
      if (!children?.length) return [];
      
      const studentIds = children.map(child => child.student_id);
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          students (
            profiles (
              first_name,
              last_name
            )
          )
        `)
        .in('student_id', studentIds)
        .neq('status', 'paid')
        .order('due_date', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!children?.length
  });

  // Fetch recent attendance for children
  const { data: recentAttendance } = useQuery({
    queryKey: ['parent-attendance', profile?.id],
    queryFn: async () => {
      if (!children?.length) return [];
      
      const studentIds = children.map(child => child.student_id);
      const { data, error } = await supabase
        .from('attendance_records')
        .select(`
          *,
          students (
            profiles (
              first_name,
              last_name
            )
          )
        `)
        .in('student_id', studentIds)
        .order('date', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    enabled: !!children?.length
  });

  const totalOutstanding = outstandingFees?.reduce((sum, invoice) => sum + Number(invoice.balance_amount), 0) || 0;
  const overdueInvoices = outstandingFees?.filter(invoice => new Date(invoice.due_date) < new Date()) || [];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Parent Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor your {children?.length > 1 ? 'children\'s' : 'child\'s'} progress and manage school-related activities
          </p>
        </div>
        <Button>
          <Bell className="h-4 w-4 mr-2" />
          View All Notifications
        </Button>
      </div>

      {/* Children Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Children</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{children?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Enrolled students
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Fees</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalOutstanding.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {overdueInvoices.length} overdue invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Attendance</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {recentAttendance?.filter(record => record.status === 'present').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Present out of {recentAttendance?.length || 0} recent days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Announcements</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{announcements?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              New messages
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Children List */}
      <Card>
        <CardHeader>
          <CardTitle>My Children</CardTitle>
          <CardDescription>
            Overview of your enrolled children and their current status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {children?.map((child) => (
              <div key={child.student_id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">
                      {child.students?.profiles?.first_name} {child.students?.profiles?.last_name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Student ID: {child.students?.student_id}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Badge variant="secondary">Active</Badge>
                  <Button variant="outline" size="sm">View Details</Button>
                </div>
              </div>
            ))}
            {(!children || children.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                No children enrolled yet.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity & Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recent Announcements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {announcements?.map((announcement) => (
                <div key={announcement.id} className="border-l-2 border-primary pl-4 py-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">{announcement.title}</h4>
                    <Badge 
                      variant={
                        announcement.priority === 'urgent' ? 'destructive' :
                        announcement.priority === 'high' ? 'default' : 'secondary'
                      }
                    >
                      {announcement.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {announcement.content.substring(0, 100)}...
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(announcement.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
              {(!announcements || announcements.length === 0) && (
                <p className="text-muted-foreground text-sm">No recent announcements.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Outstanding Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {outstandingFees?.slice(0, 5).map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <h4 className="font-medium text-sm">
                      {invoice.students?.profiles?.first_name} {invoice.students?.profiles?.last_name}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Invoice #{invoice.invoice_number}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Due: {new Date(invoice.due_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${Number(invoice.balance_amount).toFixed(2)}</p>
                    <Button variant="outline" size="sm">
                      Pay Now
                    </Button>
                  </div>
                </div>
              ))}
              {(!outstandingFees || outstandingFees.length === 0) && (
                <p className="text-muted-foreground text-sm">No outstanding payments.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ParentDashboard;