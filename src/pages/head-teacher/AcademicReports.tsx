import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, TrendingUp, Users, Calendar, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ReportCard {
  id: string;
  student_id: string;
  term: string;
  overall_grade: string;
  overall_percentage: number;
  is_published: boolean;
  issued_date: string;
  teacher_comments: string;
  principal_comments: string;
  student?: {
    student_id: string;
    profile?: {
      first_name: string;
      last_name: string;
    };
  };
}

interface ClassStats {
  class_name: string;
  total_students: number;
  average_grade: number;
  published_reports: number;
}

const AcademicReports = () => {
  const [reportCards, setReportCards] = useState<ReportCard[]>([]);
  const [classStats, setClassStats] = useState<ClassStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTerm, setSelectedTerm] = useState('Term 1');
  const { toast } = useToast();

  const terms = ['Term 1', 'Term 2', 'Term 3'];

  useEffect(() => {
    fetchReportCards();
    fetchClassStatistics();
  }, [selectedTerm]);

  const fetchReportCards = async () => {
    try {
      const { data, error } = await supabase
        .from('report_cards')
        .select(`
          *,
          student:students!report_cards_student_id_fkey(
            student_id,
            profile:profiles!students_profile_id_fkey(
              first_name,
              last_name
            )
          )
        `)
        .eq('term', selectedTerm)
        .order('issued_date', { ascending: false });

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch report cards"
        });
        return;
      }

      setReportCards(data || []);
    } catch (error) {
      console.error('Error fetching report cards:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchClassStatistics = async () => {
    try {
      // This would need to be implemented with proper joins to classes
      // For now, we'll show placeholder data
      setClassStats([
        { class_name: 'Grade 1A', total_students: 25, average_grade: 85.5, published_reports: 23 },
        { class_name: 'Grade 1B', total_students: 28, average_grade: 82.3, published_reports: 25 },
        { class_name: 'Grade 2A', total_students: 24, average_grade: 88.1, published_reports: 22 },
      ]);
    } catch (error) {
      console.error('Error fetching class statistics:', error);
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade?.toUpperCase()) {
      case 'A':
        return 'default';
      case 'B':
        return 'secondary';
      case 'C':
        return 'outline';
      case 'D':
      case 'F':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Academic Reports</h1>
          <p className="text-muted-foreground">Monitor student academic performance and generate reports</p>
        </div>
        <Button>
          <Download className="h-4 w-4 mr-2" />
          Export Reports
        </Button>
      </div>

      <Tabs defaultValue="reports" className="space-y-4">
        <TabsList>
          <TabsTrigger value="reports">Student Reports</TabsTrigger>
          <TabsTrigger value="analytics">Class Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-4">
          <div className="flex space-x-2">
            {terms.map((term) => (
              <Button
                key={term}
                variant={selectedTerm === term ? "default" : "outline"}
                onClick={() => setSelectedTerm(term)}
              >
                {term}
              </Button>
            ))}
          </div>

          <div className="grid gap-4">
            {reportCards.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center p-8">
                  <div className="text-center">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Reports Found</h3>
                    <p className="text-muted-foreground">
                      No report cards have been created for {selectedTerm} yet.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              reportCards.map((report) => (
                <Card key={report.id}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="flex items-center space-x-2">
                          <span>
                            {report.student?.profile?.first_name} {report.student?.profile?.last_name}
                          </span>
                          <Badge variant={getGradeColor(report.overall_grade)}>
                            {report.overall_grade}
                          </Badge>
                          <Badge variant="outline">
                            {report.overall_percentage}%
                          </Badge>
                        </CardTitle>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {new Date(report.issued_date).toLocaleDateString()}
                          </div>
                          <Badge variant={report.is_published ? "default" : "secondary"}>
                            {report.is_published ? "Published" : "Draft"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {report.teacher_comments && (
                        <div>
                          <p className="text-sm font-medium">Teacher Comments:</p>
                          <p className="text-sm text-muted-foreground">{report.teacher_comments}</p>
                        </div>
                      )}
                      {report.principal_comments && (
                        <div>
                          <p className="text-sm font-medium">Principal Comments:</p>
                          <p className="text-sm text-muted-foreground">{report.principal_comments}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end space-x-2 mt-4">
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                      {!report.is_published && (
                        <Button size="sm">
                          Publish
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {classStats.map((stat, index) => (
              <Card key={index}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    {stat.class_name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Total Students:</span>
                      <span className="font-medium">{stat.total_students}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Average Grade:</span>
                      <span className="font-medium flex items-center">
                        <TrendingUp className="h-4 w-4 mr-1" />
                        {stat.average_grade}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Published Reports:</span>
                      <span className="font-medium">{stat.published_reports}/{stat.total_students}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AcademicReports;