import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download, User, TrendingUp, Award } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ReportCard {
  id: string;
  term: string;
  overall_grade: string;
  overall_percentage: number;
  teacher_comments: string;
  principal_comments: string;
  issued_date: string;
  is_published: boolean;
  academic_year_id: string;
}

interface Student {
  id: string;
  profiles: {
    first_name: string;
    last_name: string;
  };
}

const ReportsGrades = () => {
  const { profile } = useAuth();
  const [children, setChildren] = useState<Student[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [reportCards, setReportCards] = useState<ReportCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChildren();
  }, [profile]);

  useEffect(() => {
    if (selectedChild) {
      fetchReportCards();
    }
  }, [selectedChild]);

  // Real-time subscription for report cards
  useEffect(() => {
    if (!profile?.id) return;

    const reportCardsChannel = supabase
      .channel('report-cards-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'report_cards'
        },
        () => {
          console.log('Report cards changed, refetching data');
          if (selectedChild) {
            fetchReportCards();
          }
        }
      )
      .subscribe();

    const parentRelationshipsChannel = supabase
      .channel('parent-relationships-reports')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'parent_student_relationships',
          filter: `parent_id=eq.${profile.id}`
        },
        () => {
          console.log('Parent relationships changed, refetching children');
          fetchChildren();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(reportCardsChannel);
      supabase.removeChannel(parentRelationshipsChannel);
    };
  }, [profile?.id, selectedChild]);

  const fetchChildren = async () => {
    if (!profile?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('parent_student_relationships')
        .select(`
          student_id,
          students!inner (
            id,
            profiles!inner (
              first_name,
              last_name
            )
          )
        `)
        .eq('parent_id', profile.id);

      if (error) throw error;

      const childrenData = data?.map(rel => rel.students).filter(Boolean) || [];
      setChildren(childrenData as Student[]);
      
      if (childrenData.length > 0 && !selectedChild) {
        setSelectedChild(childrenData[0].id);
      }
    } catch (error) {
      console.error('Error fetching children:', error);
      toast.error('Failed to load children information');
    } finally {
      setLoading(false);
    }
  };

  const fetchReportCards = async () => {
    if (!selectedChild) return;
    
    try {
      const { data, error } = await supabase
        .from('report_cards')
        .select('*')
        .eq('student_id', selectedChild)
        .eq('is_published', true)
        .order('issued_date', { ascending: false });

      if (error) throw error;

      setReportCards(data || []);
    } catch (error) {
      console.error('Error fetching report cards:', error);
      toast.error('Failed to load report cards');
    }
  };

  const getGradeBadgeColor = (grade: string) => {
    if (!grade) return 'secondary';
    
    switch (grade.toUpperCase()) {
      case 'A':
      case 'A+':
        return 'default';
      case 'B':
      case 'B+':
        return 'secondary';
      case 'C':
      case 'C+':
        return 'outline';
      default:
        return 'destructive';
    }
  };

  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 80) return 'text-blue-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const downloadReport = async (reportId: string) => {
    toast.info('Report download feature will be implemented soon');
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-12 bg-muted rounded w-64"></div>
          <div className="grid gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Reports & Grades</h1>
        <p className="text-muted-foreground">View your child's academic performance and report cards</p>
      </div>

      {children.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-xl font-semibold mb-2">No Children Found</p>
            <p className="text-muted-foreground text-center">
              No children are associated with your account.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-6">
            <Select value={selectedChild} onValueChange={setSelectedChild}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select a child" />
              </SelectTrigger>
              <SelectContent>
                {children.map((child) => (
                  <SelectItem key={child.id} value={child.id}>
                    {child.profiles.first_name} {child.profiles.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {reportCards.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-xl font-semibold mb-2">No Reports Available</p>
                <p className="text-muted-foreground text-center">
                  No published report cards are available for the selected child.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {reportCards.map((report) => (
                <Card key={report.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Award className="h-5 w-5" />
                          {report.term} Report Card
                        </CardTitle>
                        <CardDescription>
                          Issued on {new Date(report.issued_date).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <Button
                        onClick={() => downloadReport(report.id)}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Overall Grade:</span>
                          <Badge variant={getGradeBadgeColor(report.overall_grade)}>
                            {report.overall_grade || 'N/A'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Overall Percentage:</span>
                          <span className={`font-bold ${getPerformanceColor(report.overall_percentage)}`}>
                            {report.overall_percentage ? `${report.overall_percentage}%` : 'N/A'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-center">
                        <div className="text-center">
                          <div className={`text-3xl font-bold ${getPerformanceColor(report.overall_percentage)}`}>
                            {report.overall_percentage ? `${report.overall_percentage}%` : 'N/A'}
                          </div>
                          <p className="text-sm text-muted-foreground">Overall Performance</p>
                        </div>
                      </div>
                    </div>

                    {report.teacher_comments && (
                      <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Teacher's Comments</h4>
                        <p className="text-blue-800 dark:text-blue-200">{report.teacher_comments}</p>
                      </div>
                    )}

                    {report.principal_comments && (
                      <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                        <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">Principal's Comments</h4>
                        <p className="text-green-800 dark:text-green-200">{report.principal_comments}</p>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        View Detailed Report
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        Subject Breakdown
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReportsGrades;