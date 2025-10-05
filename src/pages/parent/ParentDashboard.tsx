import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Student {
  id: string;
  student_id: string;
  profile: {
    first_name: string;
    last_name: string;
  };
  enrollment?: {
    classes?: { name: string };
    streams?: { name: string };
    status?: string;
  } | null;
}

interface Announcement {
  id: string;
  title: string;
  created_at: string;
  priority: string;
}

interface Payment {
  id: string;
  student_id: string;
  invoice_id: string;
  amount: number;
  status: string;
  invoices: {
    due_date: string;
    description?: string;
    invoice_number: string;
  };
}

const ParentDashboard = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [children, setChildren] = useState<Student[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [upcomingPayments, setUpcomingPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    childrenCount: 0,
    avgAttendance: 0,
    pendingFees: 0,
    newUpdates: 0
  });

  useEffect(() => {
    if (profile?.id) {
      fetchDashboardData();
      setupRealTimeSubscriptions();
    }
  }, [profile]);

  const fetchDashboardData = async () => {
    if (!profile?.id) return;
    
    try {
      console.log('Fetching dashboard data for parent profile ID:', profile.id);
      
      // Fetch children relationships - use profile.id directly as parent_id
      const { data: childrenData, error: childrenError } = await supabase
        .from('parent_student_relationships')
        .select('student_id, relationship_type')
        .eq('parent_id', profile.id);

      if (childrenError) {
        console.error('Error fetching children:', childrenError);
        throw childrenError;
      }

      console.log('Children data found:', childrenData?.length || 0);
      
      // Fetch detailed student information
      const studentsData = await Promise.all(
        (childrenData || []).map(async (rel) => {
          const { data: studentData } = await supabase
            .from('students')
            .select('*')
            .eq('id', rel.student_id)
            .single();

          if (!studentData) return null;

          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', studentData.profile_id)
            .maybeSingle();

          if (profileError) {
            console.error('Error fetching profile for student:', studentData.student_id, profileError);
          }

          const { data: enrollmentData, error: enrollmentError } = await supabase
            .from('student_enrollments')
            .select(`
              status,
              classes (name),
              streams (name)
            `)
            .eq('student_id', studentData.id)
            .eq('status', 'active')
            .order('enrollment_date', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (enrollmentError) {
            console.error('Error fetching enrollment for student:', studentData.student_id, enrollmentError);
          }

          console.log('Student data:', {
            student_id: studentData.student_id,
            profile: profileData,
            enrollment: enrollmentData
          });

          return {
            ...studentData,
            profile: profileData || { first_name: 'Unknown', last_name: 'Student' },
            enrollment: enrollmentData || null
          };
        })
      );

      const validStudents = studentsData.filter(Boolean);
      setChildren(validStudents as Student[]);

      // Fetch announcements (using or for array column)
      const { data: announcementsData, error: announcementsError } = await supabase
        .from('announcements')
        .select('id, title, created_at, priority')
        .eq('is_active', true)
        .or('target_audience.cs.{all},target_audience.cs.{parents}')
        .order('created_at', { ascending: false })
        .limit(3);

      if (announcementsError) throw announcementsError;
      setAnnouncements(announcementsData || []);

      // Fetch upcoming payments for all children
      if (studentsData.length > 0) {
        const studentIds = studentsData.map(student => student.id);
        
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('invoices')
          .select(`
            id,
            invoice_number,
            student_id,
            total_amount,
            balance_amount,
            due_date,
            status
          `)
          .in('student_id', studentIds)
          .in('status', ['pending', 'partially_paid'])
          .order('due_date', { ascending: true })
          .limit(5);

        if (paymentsError) throw paymentsError;
        
        // Calculate stats
        const totalPendingFees = paymentsData?.reduce((sum, payment) => sum + Number(payment.balance_amount), 0) || 0;
        
        // Calculate average attendance (mock for now - would need attendance_records table)
        const avgAttendance = 94; // This would be calculated from real attendance data
        
        setStats({
          childrenCount: validStudents.length,
          avgAttendance,
          pendingFees: totalPendingFees,
          newUpdates: announcementsData?.length || 0
        });

        // Transform payments data
        const transformedPayments = paymentsData?.map(payment => ({
          id: payment.id,
          student_id: payment.student_id,
          invoice_id: payment.id,
          amount: Number(payment.balance_amount),
          status: payment.status,
          invoices: {
            due_date: payment.due_date,
            description: `Invoice ${payment.invoice_number}`,
            invoice_number: payment.invoice_number
          }
        })) || [];

        setUpcomingPayments(transformedPayments);
      }
      
      console.log('Dashboard data loaded successfully');
      toast.success('Dashboard loaded successfully');

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const setupRealTimeSubscriptions = () => {
    // Subscribe to parent-student relationships changes
    const relationshipsChannel = supabase
      .channel('parent-relationships-dashboard')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'parent_student_relationships',
          filter: `parent_id=eq.${profile?.id}`
        },
        () => fetchDashboardData()
      )
      .subscribe();

    // Subscribe to announcements changes
    const announcementsChannel = supabase
      .channel('announcements-dashboard')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'announcements'
        },
        () => fetchDashboardData()
      )
      .subscribe();

    // Subscribe to invoices changes
    const invoicesChannel = supabase
      .channel('invoices-dashboard')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invoices'
        },
        () => fetchDashboardData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(relationshipsChannel);
      supabase.removeChannel(announcementsChannel);
      supabase.removeChannel(invoicesChannel);
    };
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

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
            <div className="text-2xl font-bold">{stats.childrenCount}</div>
            <p className="text-xs text-muted-foreground">Active students</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Attendance</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgAttendance}%</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Fees</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.pendingFees.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Due this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Updates</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.newUpdates}</div>
            <p className="text-xs text-muted-foreground">Recent announcements</p>
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
            {children.length === 0 ? (
              <div className="text-center py-6">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No children assigned to your account</p>
                <p className="text-sm text-muted-foreground">Contact the school administration</p>
              </div>
            ) : (
              children.map((child) => (
                <div key={child.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">
                        {child.profile.first_name} {child.profile.last_name}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {child.enrollment?.classes?.name && child.enrollment?.streams?.name
                          ? `${child.enrollment.classes.name} - ${child.enrollment.streams.name}`
                          : child.enrollment?.classes?.name || 'No class assigned'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="default">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                    <p className="text-sm text-muted-foreground mt-1">ID: {child.student_id}</p>
                  </div>
                </div>
              ))
            )}
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => navigate('/parent/children')}
            >
              View All Children
            </Button>
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
            {announcements.length === 0 ? (
              <div className="text-center py-6">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No announcements available</p>
              </div>
            ) : (
              announcements.map((announcement) => (
                <div key={announcement.id} className="flex items-start justify-between p-3 rounded-lg border">
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">{announcement.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {new Date(announcement.created_at).toLocaleDateString()}
                    </p>
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
              ))
            )}
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => navigate('/parent/announcements')}
            >
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
            {upcomingPayments.length === 0 ? (
              <div className="text-center py-6">
                <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No pending payments</p>
              </div>
            ) : (
              upcomingPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <h4 className="font-medium text-foreground">{payment.invoices.description}</h4>
                    <p className="text-sm text-muted-foreground">
                      Due: {new Date(payment.invoices.due_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-foreground">${payment.amount.toFixed(2)}</p>
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
              ))
            )}
            <Button 
              className="w-full"
              onClick={() => navigate('/parent/payments')}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              View All Payments
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
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate('/parent/appointments')}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Book Parent-Teacher Meeting
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate('/parent/reports')}
            >
              <FileText className="mr-2 h-4 w-4" />
              Download Report Cards
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate('/parent/announcements')}
            >
              <Bell className="mr-2 h-4 w-4" />
              View All Announcements
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate('/parent/payments')}
            >
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