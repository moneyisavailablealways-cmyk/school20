import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Trophy, TrendingDown, Users, BookOpen } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface SchoolWideAnalyticsProps {
  academicYearId: string;
  term: string;
}

interface ClassPerformance {
  class_name: string;
  avg_marks: number;
  student_count: number;
}

interface SubjectPerformance {
  subject_name: string;
  avg_marks: number;
  student_count: number;
  failing_count: number;
}

interface TeacherPerformance {
  teacher_name: string;
  class_name: string;
  avg_marks: number;
  student_count: number;
  at_risk_count: number;
}

const SchoolWideAnalytics = ({ academicYearId, term }: SchoolWideAnalyticsProps) => {
  const { profile } = useAuth();
  const [classPerformance, setClassPerformance] = useState<ClassPerformance[]>([]);
  const [subjectPerformance, setSubjectPerformance] = useState<SubjectPerformance[]>([]);
  const [teacherPerformance, setTeacherPerformance] = useState<TeacherPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (academicYearId && term && profile?.school_id) {
      fetchAnalytics();
    }
  }, [academicYearId, term, profile?.school_id]);

  const fetchAnalytics = async () => {
    setLoading(true);

    // Fetch all approved submissions for this term
    const { data: submissions } = await supabase
      .from('subject_submissions')
      .select(`
        marks,
        student_id,
        subject_id,
        subjects!inner(name),
        students!inner(
          id,
          student_enrollments!inner(
            class_id,
            classes!inner(name, class_teacher_id)
          )
        )
      `)
      .eq('academic_year_id', academicYearId)
      .eq('term', term)
      .eq('status', 'approved');

    if (!submissions) {
      setLoading(false);
      return;
    }

    // Calculate class performance
    const classMap = new Map<string, { total: number; count: number }>();
    const subjectMap = new Map<string, { total: number; count: number; failing: number }>();
    const teacherClassMap = new Map<string, { teacherId: string; className: string; total: number; count: number; atRisk: number }>();

    submissions.forEach((sub: any) => {
      const enrollment = sub.students?.student_enrollments?.[0];
      if (!enrollment) return;

      const className = enrollment.classes?.name;
      const subjectName = sub.subjects?.name;
      const teacherId = enrollment.classes?.class_teacher_id;

      // Class
      if (className) {
        const existing = classMap.get(className) || { total: 0, count: 0 };
        existing.total += sub.marks;
        existing.count += 1;
        classMap.set(className, existing);
      }

      // Subject
      if (subjectName) {
        const existing = subjectMap.get(subjectName) || { total: 0, count: 0, failing: 0 };
        existing.total += sub.marks;
        existing.count += 1;
        if (sub.marks < 40) existing.failing += 1;
        subjectMap.set(subjectName, existing);
      }

      // Teacher + class
      if (teacherId && className) {
        const key = `${teacherId}_${className}`;
        const existing = teacherClassMap.get(key) || { teacherId, className, total: 0, count: 0, atRisk: 0 };
        existing.total += sub.marks;
        existing.count += 1;
        if (sub.marks < 40) existing.atRisk += 1;
        teacherClassMap.set(key, existing);
      }
    });

    // Format class data
    const classData = Array.from(classMap.entries())
      .map(([name, d]) => ({
        class_name: name,
        avg_marks: Math.round((d.total / d.count) * 10) / 10,
        student_count: d.count,
      }))
      .sort((a, b) => b.avg_marks - a.avg_marks);
    setClassPerformance(classData);

    // Format subject data
    const subjectData = Array.from(subjectMap.entries())
      .map(([name, d]) => ({
        subject_name: name,
        avg_marks: Math.round((d.total / d.count) * 10) / 10,
        student_count: d.count,
        failing_count: d.failing,
      }))
      .sort((a, b) => b.avg_marks - a.avg_marks);
    setSubjectPerformance(subjectData);

    // Fetch teacher names
    const teacherIds = [...new Set(Array.from(teacherClassMap.values()).map(t => t.teacherId).filter(Boolean))];
    let teacherNames: Record<string, string> = {};
    if (teacherIds.length > 0) {
      const { data: teachers } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', teacherIds);
      if (teachers) {
        teachers.forEach(t => {
          teacherNames[t.id] = `${t.first_name} ${t.last_name}`;
        });
      }
    }

    const teacherData = Array.from(teacherClassMap.values())
      .map(d => ({
        teacher_name: teacherNames[d.teacherId] || 'Unassigned',
        class_name: d.className,
        avg_marks: Math.round((d.total / d.count) * 10) / 10,
        student_count: d.count,
        at_risk_count: d.atRisk,
      }))
      .sort((a, b) => b.avg_marks - a.avg_marks);
    setTeacherPerformance(teacherData);

    setLoading(false);
  };

  const getBarColor = (value: number) => {
    if (value >= 70) return 'hsl(142, 76%, 36%)';
    if (value >= 50) return 'hsl(48, 96%, 53%)';
    if (value >= 40) return 'hsl(25, 95%, 53%)';
    return 'hsl(0, 84%, 60%)';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">Loading school analytics...</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Performing Classes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" /> Class Performance Rankings
          </CardTitle>
          <CardDescription>Average marks by class for {term}</CardDescription>
        </CardHeader>
        <CardContent>
          {classPerformance.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={classPerformance} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="class_name" type="category" width={120} />
                <Tooltip formatter={(value: number) => [`${value}%`, 'Average']} />
                <Bar dataKey="avg_marks" radius={[0, 4, 4, 0]}>
                  {classPerformance.map((entry, i) => (
                    <Cell key={i} fill={getBarColor(entry.avg_marks)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground py-8">No class data available</p>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Subject Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" /> Subject Performance
            </CardTitle>
            <CardDescription>Average marks and failure rates</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead className="text-right">Avg</TableHead>
                  <TableHead className="text-right">Failing</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjectPerformance.map((s, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{s.subject_name}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={s.avg_marks >= 50 ? 'secondary' : 'destructive'}>
                        {s.avg_marks}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {s.failing_count > 0 ? (
                        <span className="text-destructive font-medium">{s.failing_count}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Teacher Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> Teacher-Class Performance
            </CardTitle>
            <CardDescription>Class teacher averages and at-risk students</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead className="text-right">Avg</TableHead>
                  <TableHead className="text-right">At Risk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teacherPerformance.map((t, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{t.teacher_name}</TableCell>
                    <TableCell>{t.class_name}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={t.avg_marks >= 50 ? 'secondary' : 'destructive'}>
                        {t.avg_marks}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {t.at_risk_count > 0 ? (
                        <span className="text-destructive font-medium">{t.at_risk_count}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Overall Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">School Academic Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-foreground">{classPerformance.length}</p>
              <p className="text-sm text-muted-foreground">Active Classes</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-foreground">{subjectPerformance.length}</p>
              <p className="text-sm text-muted-foreground">Subjects Assessed</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-foreground">
                {classPerformance.length > 0 ? Math.round(classPerformance.reduce((s, c) => s + c.avg_marks, 0) / classPerformance.length) : 0}%
              </p>
              <p className="text-sm text-muted-foreground">School Average</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-destructive">
                {subjectPerformance.reduce((s, sub) => s + sub.failing_count, 0)}
              </p>
              <p className="text-sm text-muted-foreground">Total Failing Scores</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SchoolWideAnalytics;
