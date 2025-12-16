import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Users, Award, BookOpen, AlertTriangle } from 'lucide-react';

const COLORS = ['#22c55e', '#3b82f6', '#eab308', '#f97316', '#ef4444'];

const ReportAnalytics = () => {
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedTerm, setSelectedTerm] = useState<string>('Term 1');

  // Fetch classes
  const { data: classes } = useQuery({
    queryKey: ['classes-for-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase.from('classes').select('id, name').order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch current academic year
  const { data: currentYear } = useQuery({
    queryKey: ['current-academic-year'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academic_years')
        .select('id, name')
        .eq('is_current', true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch analytics data
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['report-analytics', selectedClass, selectedTerm, currentYear?.id],
    queryFn: async () => {
      if (!currentYear?.id) return null;

      // Fetch all approved submissions
      const { data: submissions, error } = await supabase
        .from('subject_submissions')
        .select(`
          marks,
          grade,
          subject:subjects(name),
          student:students(id)
        `)
        .eq('academic_year_id', currentYear.id)
        .eq('term', selectedTerm)
        .eq('status', 'approved');

      if (error) throw error;

      // Fetch generated reports
      const { data: reports } = await supabase
        .from('generated_reports')
        .select('o_level_division, overall_average, promotion_status')
        .eq('academic_year_id', currentYear.id)
        .eq('term', selectedTerm);

      // Calculate statistics
      const totalSubmissions = submissions?.length || 0;
      const avgMark = submissions?.length 
        ? submissions.reduce((sum, s) => sum + (s.marks || 0), 0) / submissions.length 
        : 0;

      // Grade distribution
      const gradeCount: Record<string, number> = {};
      submissions?.forEach(s => {
        if (s.grade) {
          gradeCount[s.grade] = (gradeCount[s.grade] || 0) + 1;
        }
      });

      const gradeDistribution = Object.entries(gradeCount)
        .map(([grade, count]) => ({ grade, count }))
        .sort((a, b) => a.grade.localeCompare(b.grade));

      // Subject performance
      const subjectStats: Record<string, { total: number; count: number }> = {};
      submissions?.forEach(s => {
        const subjectName = (s.subject as any)?.name || 'Unknown';
        if (!subjectStats[subjectName]) {
          subjectStats[subjectName] = { total: 0, count: 0 };
        }
        subjectStats[subjectName].total += s.marks || 0;
        subjectStats[subjectName].count += 1;
      });

      const subjectPerformance = Object.entries(subjectStats)
        .map(([subject, stats]) => ({
          subject: subject.length > 15 ? subject.substring(0, 15) + '...' : subject,
          average: Math.round(stats.total / stats.count),
        }))
        .sort((a, b) => b.average - a.average)
        .slice(0, 10);

      // Division distribution from reports
      const divisionCount: Record<string, number> = { I: 0, II: 0, III: 0, IV: 0, U: 0 };
      reports?.forEach(r => {
        if (r.o_level_division) {
          divisionCount[r.o_level_division] = (divisionCount[r.o_level_division] || 0) + 1;
        }
      });

      const divisionDistribution = Object.entries(divisionCount)
        .map(([division, count]) => ({ division: `Div ${division}`, count }));

      // Low performers (marks < 50)
      const lowPerformers = submissions?.filter(s => (s.marks || 0) < 50).length || 0;

      return {
        totalSubmissions,
        avgMark: Math.round(avgMark * 10) / 10,
        totalReports: reports?.length || 0,
        gradeDistribution,
        subjectPerformance,
        divisionDistribution,
        lowPerformers,
      };
    },
    enabled: !!currentYear?.id,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-2 gap-6">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-4">
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {classes?.map(cls => (
              <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedTerm} onValueChange={setSelectedTerm}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Term 1">Term 1</SelectItem>
            <SelectItem value="Term 2">Term 2</SelectItem>
            <SelectItem value="Term 3">Term 3</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Submissions</p>
                <p className="text-3xl font-bold">{analyticsData?.totalSubmissions || 0}</p>
              </div>
              <BookOpen className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Average Mark</p>
                <p className="text-3xl font-bold">{analyticsData?.avgMark || 0}%</p>
              </div>
              {(analyticsData?.avgMark || 0) >= 60 ? (
                <TrendingUp className="h-8 w-8 text-green-500" />
              ) : (
                <TrendingDown className="h-8 w-8 text-red-500" />
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Reports Generated</p>
                <p className="text-3xl font-bold">{analyticsData?.totalReports || 0}</p>
              </div>
              <Award className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Low Performers</p>
                <p className="text-3xl font-bold text-red-600">{analyticsData?.lowPerformers || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Grade Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Grade Distribution</CardTitle>
            <CardDescription>Distribution of grades across all subjects</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData?.gradeDistribution || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="grade" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Division Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>O-Level Division Distribution</CardTitle>
            <CardDescription>Distribution of student divisions</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analyticsData?.divisionDistribution || []}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="count"
                  nameKey="division"
                  label={({ division, count }) => `${division}: ${count}`}
                >
                  {analyticsData?.divisionDistribution?.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Subject Performance */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Subject Performance</CardTitle>
            <CardDescription>Average marks by subject (Top 10)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData?.subjectPerformance || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="subject" type="category" width={120} />
                <Tooltip />
                <Bar dataKey="average" fill="hsl(var(--primary))">
                  {analyticsData?.subjectPerformance?.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.average >= 70 ? '#22c55e' : entry.average >= 50 ? '#eab308' : '#ef4444'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReportAnalytics;
