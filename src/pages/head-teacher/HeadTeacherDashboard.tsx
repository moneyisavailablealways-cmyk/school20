import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow } from 'date-fns';

interface DashboardMetrics {
  teachersCount: number;
  pendingApprovals: number;
  disciplineCases: number;
  classesCount: number;
}

interface PendingApproval {
  id: string;
  subject_name: string;
  class_name: string;
  teacher_name: string;
  submitted_at: string;
  student_count: number;
}

interface RecentActivity {
  id: string;
  activity_type: string;
  description: string;
  created_at: string;
}

const HeadTeacherDashboard = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    teachersCount: 0,
    pendingApprovals: 0,
    disciplineCases: 0,
    classesCount: 0,
  });
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch teachers count
      const { count: teachersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'teacher')
        .eq('is_active', true);

      // Fetch pending mark approvals count
      const { count: pendingCount } = await supabase
        .from('subject_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Fetch discipline cases (behavior notes) from current month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const { count: disciplineCount } = await supabase
        .from('behavior_notes')
        .select('*', { count: 'exact', head: true })
        .gte('date', startOfMonth.toISOString().split('T')[0]);

      // Fetch classes count
      const { count: classesCount } = await supabase
        .from('classes')
        .select('*', { count: 'exact', head: true });

      setMetrics({
        teachersCount: teachersCount || 0,
        pendingApprovals: pendingCount || 0,
        disciplineCases: disciplineCount || 0,
        classesCount: classesCount || 0,
      });

      // Fetch pending approvals details
      const { data: submissions } = await supabase
        .from('subject_submissions')
        .select(`
          id,
          submitted_at,
          subject_id,
          submitted_by
        `)
        .eq('status', 'pending')
        .order('submitted_at', { ascending: false })
        .limit(20);

      if (submissions && submissions.length > 0) {
        // Get unique subject IDs and teacher IDs
        const subjectIds = [...new Set(submissions.map(s => s.subject_id))];
        const teacherIds = [...new Set(submissions.map(s => s.submitted_by))];

        // Fetch subjects with level_id
        const { data: subjects } = await supabase
          .from('subjects')
          .select('id, name, level_id')
          .in('id', subjectIds);

        // Fetch teachers
        const { data: teachers } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', teacherIds);

        // Get level IDs from subjects for display
        const levelIds = [...new Set(subjects?.map(s => s.level_id).filter(Boolean) || [])];
        
        // Fetch levels
        const { data: levels } = await supabase
          .from('levels')
          .select('id, name')
          .in('id', levelIds);

        // Map data
        const subjectMap = new Map(subjects?.map(s => [s.id, s]) || []);
        const teacherMap = new Map(teachers?.map(t => [t.id, t]) || []);
        const levelMap = new Map(levels?.map(l => [l.id, l]) || []);

        // Group submissions by subject to get count
        const submissionsBySubject = new Map<string, any[]>();
        submissions.forEach(s => {
          const key = s.subject_id;
          if (!submissionsBySubject.has(key)) {
            submissionsBySubject.set(key, []);
          }
          submissionsBySubject.get(key)!.push(s);
        });

        const approvalsList: PendingApproval[] = [];
        submissionsBySubject.forEach((subs, subjectId) => {
          const subject = subjectMap.get(subjectId);
          const teacher = teacherMap.get(subs[0].submitted_by);
          const levelInfo = subject?.level_id ? levelMap.get(subject.level_id) : null;

          approvalsList.push({
            id: subs[0].id,
            subject_name: subject?.name || 'Unknown Subject',
            class_name: levelInfo?.name || 'Unknown Level',
            teacher_name: teacher ? `${teacher.first_name} ${teacher.last_name}` : 'Unknown Teacher',
            submitted_at: subs[0].submitted_at,
            student_count: subs.length,
          });
        });

        setPendingApprovals(approvalsList.slice(0, 3));
      }

      // Fetch recent activities
      const { data: activities } = await supabase
        .from('activity_log')
        .select('id, activity_type, description, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentActivities(activities || []);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const academicMetrics = [
    {
      title: 'Teachers Supervised',
      value: metrics.teachersCount.toString(),
      icon: Users,
      color: 'text-blue-600',
    },
    {
      title: 'Pending Mark Approvals',
      value: metrics.pendingApprovals.toString(),
      icon: FileCheck,
      color: 'text-orange-600',
    },
    {
      title: 'Discipline Cases',
      value: metrics.disciplineCases.toString(),
      icon: AlertTriangle,
      color: 'text-red-600',
    },
    {
      title: 'Classes Monitored',
      value: metrics.classesCount.toString(),
      icon: BookOpen,
      color: 'text-green-600',
    },
  ];

  const quickActions = [
    {
      title: 'Review Mark Approvals',
      description: 'Approve pending marks from teachers',
      icon: FileCheck,
      href: '/head-teacher/marks',
      color: 'text-orange-600',
      badge: metrics.pendingApprovals > 0 ? metrics.pendingApprovals.toString() : undefined,
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
      badge: metrics.disciplineCases > 0 ? metrics.disciplineCases.toString() : undefined,
    },
    {
      title: 'Academic Reports',
      description: 'Generate performance reports by class/subject',
      icon: BarChart3,
      href: '/head-teacher/reports',
      color: 'text-green-600',
    },
  ];

  const getActivityTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'approval': return 'text-green-600 bg-green-50';
      case 'review': return 'text-blue-600 bg-blue-50';
      case 'timetable': return 'text-purple-600 bg-purple-50';
      case 'discipline': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

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
              {pendingApprovals.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No pending approvals
                </div>
              ) : (
                pendingApprovals.map((approval) => (
                  <div key={approval.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <div className="font-medium">{approval.subject_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {approval.class_name} • {approval.teacher_name} • {approval.student_count} students
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Submitted {formatDistanceToNow(new Date(approval.submitted_at), { addSuffix: true })}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <Link to="/head-teacher/marks">Review</Link>
                    </Button>
                  </div>
                ))
              )}
              
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
          <CardDescription>Latest system activities</CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivities.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No recent activities
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="text-sm text-muted-foreground min-w-[100px]">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </div>
                    <div>
                      <div className="font-medium">{activity.description}</div>
                    </div>
                  </div>
                  <Badge className={`text-xs px-2 py-1 ${getActivityTypeColor(activity.activity_type)}`}>
                    {activity.activity_type}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HeadTeacherDashboard;
