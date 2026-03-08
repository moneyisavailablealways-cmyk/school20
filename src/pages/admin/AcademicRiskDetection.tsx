import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  AlertTriangle,
  Brain,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
  ShieldAlert,
  Users,
  BookOpen,
  ArrowDown,
  ArrowUp,
  Minus,
  Info,
  Lightbulb,
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface RiskAssessment {
  id: string;
  student_id: string;
  risk_level: string;
  risk_score: number;
  avg_marks: number | null;
  prev_avg_marks: number | null;
  marks_trend: number | null;
  failing_subjects: number;
  below_average_subjects: number;
  total_subjects: number;
  attendance_rate: number | null;
  insights: string[];
  recommendations: string[];
  assessed_at: string;
  students: {
    student_id: string;
    profiles: {
      first_name: string;
      last_name: string;
    };
  };
}

const RISK_COLORS: Record<string, string> = {
  low: 'hsl(142, 76%, 36%)',
  medium: 'hsl(48, 96%, 53%)',
  high: 'hsl(25, 95%, 53%)',
  critical: 'hsl(0, 84%, 60%)',
};

const RISK_BADGES: Record<string, { label: string; icon: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  low: { label: '🟢 Low Risk', icon: '🟢', variant: 'secondary' },
  medium: { label: '🟡 Medium Risk', icon: '🟡', variant: 'outline' },
  high: { label: '🟠 High Risk', icon: '🟠', variant: 'default' },
  critical: { label: '🔴 Critical Risk', icon: '🔴', variant: 'destructive' },
};

interface AcademicRiskDetectionProps {
  viewMode?: 'admin' | 'teacher' | 'head_teacher';
}

const AcademicRiskDetection = ({ viewMode = 'admin' }: AcademicRiskDetectionProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [assessments, setAssessments] = useState<RiskAssessment[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('Term 1');
  const [prevTerm, setPrevTerm] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [selectedStudent, setSelectedStudent] = useState<RiskAssessment | null>(null);

  useEffect(() => {
    fetchAcademicYears();
  }, [profile]);

  useEffect(() => {
    if (selectedYear && selectedTerm) {
      fetchAssessments();
    }
  }, [selectedYear, selectedTerm]);

  const fetchAcademicYears = async () => {
    if (!profile?.school_id) return;
    const { data } = await supabase
      .from('academic_years')
      .select('*')
      .eq('school_id', profile.school_id)
      .order('start_date', { ascending: false });
    if (data) {
      setAcademicYears(data);
      const current = data.find((y: any) => y.is_current);
      if (current) setSelectedYear(current.id);
      else if (data.length > 0) setSelectedYear(data[0].id);
    }
  };

  const fetchAssessments = async () => {
    if (!profile?.school_id || !selectedYear) return;
    setLoading(true);

    let studentIds: string[] | null = null;

    // For teacher view, get only students in teacher's classes
    if (viewMode === 'teacher' && profile?.id) {
      const { data: classes } = await supabase
        .from('classes')
        .select('id')
        .or(`class_teacher_id.eq.${profile.id}`);
      
      const classIds = classes?.map(c => c.id) || [];

      // Also check streams where teacher is section teacher
      const { data: streams } = await supabase
        .from('streams')
        .select('class_id')
        .eq('section_teacher_id', profile.id);
      
      const streamClassIds = streams?.map(s => s.class_id) || [];
      const allClassIds = [...new Set([...classIds, ...streamClassIds])];

      if (allClassIds.length > 0) {
        const { data: enrollments } = await supabase
          .from('student_enrollments')
          .select('student_id')
          .in('class_id', allClassIds)
          .eq('status', 'active');
        studentIds = enrollments?.map(e => e.student_id) || [];
      } else {
        studentIds = [];
      }
    }

    let query = supabase
      .from('student_risk_assessments')
      .select(`
        *,
        students!inner(student_id, profiles!inner(first_name, last_name))
      `)
      .eq('school_id', profile.school_id)
      .eq('academic_year_id', selectedYear)
      .eq('term', selectedTerm)
      .order('risk_score', { ascending: false });

    if (studentIds !== null && studentIds.length > 0) {
      query = query.in('student_id', studentIds);
    } else if (studentIds !== null && studentIds.length === 0) {
      setAssessments([]);
      setLoading(false);
      return;
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching assessments:', error);
    } else {
      setAssessments((data as any) || []);
    }
    setLoading(false);
  };

  const runAnalysis = async () => {
    if (!profile?.school_id || !selectedYear) return;
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.rpc('calculate_student_risk', {
        p_school_id: profile.school_id,
        p_academic_year_id: selectedYear,
        p_term: selectedTerm,
        p_prev_term: prevTerm,
      });
      if (error) throw error;
      toast({
        title: 'Analysis Complete',
        description: `Risk assessment calculated for ${data} students.`,
      });
      fetchAssessments();
    } catch (err: any) {
      toast({
        title: 'Analysis Failed',
        description: err.message,
        variant: 'destructive',
      });
    }
    setAnalyzing(false);
  };

  const filteredAssessments = assessments.filter((a) => {
    const name = `${a.students.profiles.first_name} ${a.students.profiles.last_name}`.toLowerCase();
    const matchesSearch = name.includes(searchQuery.toLowerCase());
    const matchesRisk = filterRisk === 'all' || a.risk_level === filterRisk;
    return matchesSearch && matchesRisk;
  });

  // Stats
  const riskCounts = {
    low: assessments.filter((a) => a.risk_level === 'low').length,
    medium: assessments.filter((a) => a.risk_level === 'medium').length,
    high: assessments.filter((a) => a.risk_level === 'high').length,
    critical: assessments.filter((a) => a.risk_level === 'critical').length,
  };

  const pieData = [
    { name: 'Low Risk', value: riskCounts.low, color: RISK_COLORS.low },
    { name: 'Medium Risk', value: riskCounts.medium, color: RISK_COLORS.medium },
    { name: 'High Risk', value: riskCounts.high, color: RISK_COLORS.high },
    { name: 'Critical Risk', value: riskCounts.critical, color: RISK_COLORS.critical },
  ].filter((d) => d.value > 0);

  const avgScoreByRisk = ['low', 'medium', 'high', 'critical']
    .map((level) => {
      const items = assessments.filter((a) => a.risk_level === level);
      const avg = items.length > 0 ? items.reduce((s, a) => s + (a.avg_marks || 0), 0) / items.length : 0;
      return { name: level.charAt(0).toUpperCase() + level.slice(1), avg: Math.round(avg * 10) / 10, fill: RISK_COLORS[level] };
    })
    .filter((d) => d.avg > 0);

  const TrendIcon = ({ trend }: { trend: number | null }) => {
    if (trend === null) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (trend > 0) return <ArrowUp className="h-4 w-4 text-green-600" />;
    if (trend < 0) return <ArrowDown className="h-4 w-4 text-destructive" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Brain className="h-7 w-7 text-primary" />
            {viewMode === 'teacher' ? 'My Students - Academic Risk' : 'Academic Risk Detection'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {viewMode === 'teacher'
              ? 'View at-risk students in your classes'
              : 'AI-powered analysis to identify at-risk students before they fail'}
          </p>
        </div>
        {viewMode === 'admin' && (
          <Button onClick={runAnalysis} disabled={analyzing || !selectedYear} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${analyzing ? 'animate-spin' : ''}`} />
            {analyzing ? 'Analyzing...' : 'Run Analysis'}
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger>
                <SelectValue placeholder="Academic Year" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((y) => (
                  <SelectItem key={y.id} value={y.id}>
                    {y.name} {y.is_current ? '(Current)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedTerm} onValueChange={setSelectedTerm}>
              <SelectTrigger>
                <SelectValue placeholder="Term" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Term 1">Term 1</SelectItem>
                <SelectItem value="Term 2">Term 2</SelectItem>
                <SelectItem value="Term 3">Term 3</SelectItem>
              </SelectContent>
            </Select>

            <Select value={prevTerm || 'none'} onValueChange={(v) => setPrevTerm(v === 'none' ? null : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Compare with" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No comparison</SelectItem>
                <SelectItem value="Term 1">Term 1</SelectItem>
                <SelectItem value="Term 2">Term 2</SelectItem>
                <SelectItem value="Term 3">Term 3</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterRisk} onValueChange={setFilterRisk}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by risk" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk Levels</SelectItem>
                <SelectItem value="critical">🔴 Critical</SelectItem>
                <SelectItem value="high">🟠 High</SelectItem>
                <SelectItem value="medium">🟡 Medium</SelectItem>
                <SelectItem value="low">🟢 Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4" style={{ borderLeftColor: RISK_COLORS.critical }}>
          <CardHeader className="pb-2">
            <CardDescription>Critical Risk</CardDescription>
            <CardTitle className="text-3xl">{riskCounts.critical}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Immediate action needed</p>
          </CardContent>
        </Card>
        <Card className="border-l-4" style={{ borderLeftColor: RISK_COLORS.high }}>
          <CardHeader className="pb-2">
            <CardDescription>High Risk</CardDescription>
            <CardTitle className="text-3xl">{riskCounts.high}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Intervention recommended</p>
          </CardContent>
        </Card>
        <Card className="border-l-4" style={{ borderLeftColor: RISK_COLORS.medium }}>
          <CardHeader className="pb-2">
            <CardDescription>Medium Risk</CardDescription>
            <CardTitle className="text-3xl">{riskCounts.medium}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Monitor closely</p>
          </CardContent>
        </Card>
        <Card className="border-l-4" style={{ borderLeftColor: RISK_COLORS.low }}>
          <CardHeader className="pb-2">
            <CardDescription>Low Risk</CardDescription>
            <CardTitle className="text-3xl">{riskCounts.low}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Performing well</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="students" className="space-y-4">
        <TabsList>
          <TabsTrigger value="students">
            <Users className="h-4 w-4 mr-2" /> At-Risk Students
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <TrendingDown className="h-4 w-4 mr-2" /> Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {loading ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">Loading assessments...</CardContent>
            </Card>
          ) : filteredAssessments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ShieldAlert className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg">No Risk Assessments Found</h3>
                <p className="text-muted-foreground mt-2">
                  Click "Run Analysis" to analyze student performance and detect academic risks.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {/* Student Detail Panel */}
              {selectedStudent && (
                <Card className="border-2 border-primary">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {selectedStudent.students.profiles.first_name} {selectedStudent.students.profiles.last_name}
                      </CardTitle>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedStudent(null)}>
                        Close
                      </Button>
                    </div>
                    <CardDescription>Detailed risk assessment</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Risk Score</p>
                        <p className="text-2xl font-bold">{selectedStudent.risk_score}/100</p>
                        <Progress value={selectedStudent.risk_score} className="mt-1" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Average Marks</p>
                        <p className="text-2xl font-bold">{selectedStudent.avg_marks ?? 'N/A'}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Trend</p>
                        <div className="flex items-center gap-1">
                          <TrendIcon trend={selectedStudent.marks_trend} />
                          <p className="text-2xl font-bold">
                            {selectedStudent.marks_trend !== null ? `${selectedStudent.marks_trend > 0 ? '+' : ''}${selectedStudent.marks_trend}` : 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Attendance</p>
                        <p className="text-2xl font-bold">{selectedStudent.attendance_rate ?? 'N/A'}%</p>
                      </div>
                    </div>

                    {selectedStudent.insights.length > 0 && (
                      <div>
                        <h4 className="font-medium flex items-center gap-2 mb-2">
                          <Info className="h-4 w-4 text-primary" /> Insights
                        </h4>
                        <ul className="space-y-1">
                          {selectedStudent.insights.map((insight, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-primary mt-0.5">•</span> {insight}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedStudent.recommendations.length > 0 && (
                      <div>
                        <h4 className="font-medium flex items-center gap-2 mb-2">
                          <Lightbulb className="h-4 w-4 text-amber-500" /> Recommendations
                        </h4>
                        <ul className="space-y-1">
                          {selectedStudent.recommendations.map((rec, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-amber-500 mt-0.5">→</span> {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Student Table */}
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Risk Level</TableHead>
                        <TableHead className="text-right">Score</TableHead>
                        <TableHead className="text-right">Avg Marks</TableHead>
                        <TableHead className="text-right">Trend</TableHead>
                        <TableHead className="text-right">Failing</TableHead>
                        <TableHead className="text-right">Attendance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAssessments.map((a) => {
                        const badge = RISK_BADGES[a.risk_level] || RISK_BADGES.low;
                        return (
                          <TableRow
                            key={a.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => setSelectedStudent(a)}
                          >
                            <TableCell className="font-medium">
                              {a.students.profiles.first_name} {a.students.profiles.last_name}
                            </TableCell>
                            <TableCell>
                              <Badge variant={badge.variant}>{badge.label}</Badge>
                            </TableCell>
                            <TableCell className="text-right">{a.risk_score}</TableCell>
                            <TableCell className="text-right">{a.avg_marks ?? '-'}%</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <TrendIcon trend={a.marks_trend} />
                                <span>{a.marks_trend !== null ? `${a.marks_trend > 0 ? '+' : ''}${a.marks_trend}` : '-'}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {a.failing_subjects > 0 ? (
                                <span className="text-destructive font-medium">{a.failing_subjects}/{a.total_subjects}</span>
                              ) : (
                                <span className="text-muted-foreground">0/{a.total_subjects}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">{a.attendance_rate ?? '-'}%</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Risk Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Risk Distribution</CardTitle>
                <CardDescription>Students by risk category</CardDescription>
              </CardHeader>
              <CardContent>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Average Marks by Risk Level */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Average Marks by Risk Level</CardTitle>
                <CardDescription>Performance comparison across risk categories</CardDescription>
              </CardHeader>
              <CardContent>
                {avgScoreByRisk.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={avgScoreByRisk}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip formatter={(value: number) => [`${value}%`, 'Avg Marks']} />
                      <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                        {avgScoreByRisk.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Summary Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Key Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-foreground">{assessments.length}</p>
                  <p className="text-sm text-muted-foreground">Students Analyzed</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-destructive">{riskCounts.critical + riskCounts.high}</p>
                  <p className="text-sm text-muted-foreground">Need Intervention</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-foreground">
                    {assessments.length > 0
                      ? Math.round(assessments.reduce((s, a) => s + (a.avg_marks || 0), 0) / assessments.length)
                      : 0}%
                  </p>
                  <p className="text-sm text-muted-foreground">School Average</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-foreground">
                    {assessments.length > 0
                      ? Math.round(
                          (assessments.filter((a) => a.marks_trend !== null && a.marks_trend < 0).length /
                            assessments.length) *
                            100
                        )
                      : 0}%
                  </p>
                  <p className="text-sm text-muted-foreground">Declining Students</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AcademicRiskDetection;
