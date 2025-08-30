import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { BarChart3, FileText, TrendingUp, Award } from 'lucide-react';

const StudentGrades = () => {
  const { profile } = useAuth();

  const { data: reportCards, isLoading } = useQuery({
    queryKey: ['student-report-cards', profile?.id],
    queryFn: async () => {
      const { data: studentData } = await supabase
        .from('students')
        .select('id')
        .eq('profile_id', profile?.id)
        .single();

      if (!studentData) return [];

      const { data, error } = await supabase
        .from('report_cards')
        .select('*')
        .eq('student_id', studentData.id)
        .eq('is_published', true)
        .order('issued_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id
  });

  const getGradeBadgeVariant = (grade: string) => {
    const upperGrade = grade?.toUpperCase();
    if (upperGrade === 'A' || upperGrade === 'A+') return 'default';
    if (upperGrade === 'B' || upperGrade === 'B+') return 'secondary';
    if (upperGrade === 'C' || upperGrade === 'C+') return 'outline';
    return 'destructive';
  };

  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 65) return 'text-blue-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Grades</h1>
          <p className="text-muted-foreground mt-2">
            View your academic performance and report cards
          </p>
        </div>
        <div className="grid gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-1/4" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-20 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Grades</h1>
        <p className="text-muted-foreground mt-2">
          View your academic performance and report cards
        </p>
      </div>

      {reportCards && reportCards.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">Latest Grade</span>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold">
                  {reportCards[0]?.overall_grade || 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {reportCards[0]?.term} Report
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">Latest Percentage</span>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold">
                  {reportCards[0]?.overall_percentage ? `${reportCards[0].overall_percentage}%` : 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Overall Performance
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">Total Reports</span>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold">{reportCards.length}</div>
                <p className="text-xs text-muted-foreground">
                  Published Reports
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="space-y-4">
        {reportCards?.map((report) => (
          <Card key={report.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {report.term} Report Card
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Issued: {new Date(report.issued_date).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  {report.overall_grade && (
                    <Badge variant={getGradeBadgeVariant(report.overall_grade)} className="mb-2">
                      Grade: {report.overall_grade}
                    </Badge>
                  )}
                  {report.overall_percentage && (
                    <div className={`text-lg font-bold ${getPerformanceColor(report.overall_percentage)}`}>
                      {report.overall_percentage}%
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {report.overall_percentage && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Overall Performance</span>
                    <span className="font-medium">{report.overall_percentage}%</span>
                  </div>
                  <Progress 
                    value={report.overall_percentage} 
                    className="h-2"
                  />
                </div>
              )}

              {report.teacher_comments && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Teacher's Comments</h4>
                  <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                    {report.teacher_comments}
                  </p>
                </div>
              )}

              {report.principal_comments && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Principal's Comments</h4>
                  <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                    {report.principal_comments}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {(!reportCards || reportCards.length === 0) && (
        <Card>
          <CardContent className="py-8 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Grades Available</h3>
            <p className="text-muted-foreground">
              Your report cards will appear here once they are published by your teachers.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentGrades;