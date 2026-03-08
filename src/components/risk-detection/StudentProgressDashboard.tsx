import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { TrendingUp, TrendingDown, Minus, Target, Award, AlertTriangle } from 'lucide-react';

interface StudentProgressDashboardProps {
  studentId: string;
  academicYearId: string;
  studentName: string;
}

interface SubjectScore {
  subject_name: string;
  term: string;
  marks: number;
}

const StudentProgressDashboard = ({ studentId, academicYearId, studentName }: StudentProgressDashboardProps) => {
  const { profile } = useAuth();
  const [subjectScores, setSubjectScores] = useState<SubjectScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubjectScores();
  }, [studentId, academicYearId]);

  const fetchSubjectScores = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('subject_submissions')
      .select(`
        marks,
        term,
        subjects!inner(name)
      `)
      .eq('student_id', studentId)
      .eq('academic_year_id', academicYearId)
      .eq('status', 'approved')
      .order('term');

    if (!error && data) {
      setSubjectScores(data.map((d: any) => ({
        subject_name: d.subjects.name,
        term: d.term,
        marks: d.marks,
      })));
    }
    setLoading(false);
  };

  // Build trend data: subjects across terms
  const subjects = [...new Set(subjectScores.map(s => s.subject_name))];
  const terms = [...new Set(subjectScores.map(s => s.term))].sort();

  const trendData = terms.map(term => {
    const row: any = { term };
    subjects.forEach(subj => {
      const score = subjectScores.find(s => s.term === term && s.subject_name === subj);
      row[subj] = score?.marks ?? null;
    });
    return row;
  });

  // Calculate strengths and weaknesses from latest term
  const latestTerm = terms[terms.length - 1];
  const latestScores = subjectScores
    .filter(s => s.term === latestTerm)
    .sort((a, b) => b.marks - a.marks);

  const strengths = latestScores.slice(0, 3);
  const weaknesses = latestScores.slice(-3).reverse();

  // Radar chart data for latest term
  const radarData = latestScores.map(s => ({
    subject: s.subject_name.length > 10 ? s.subject_name.substring(0, 10) + '...' : s.subject_name,
    marks: s.marks,
    fullMark: 100,
  }));

  // Calculate per-subject trends
  const subjectTrends = subjects.map(subj => {
    const scores = subjectScores.filter(s => s.subject_name === subj).sort((a, b) => a.term.localeCompare(b.term));
    const latest = scores[scores.length - 1]?.marks ?? 0;
    const prev = scores.length > 1 ? scores[scores.length - 2]?.marks : null;
    const trend = prev !== null ? latest - prev : null;
    return { subject: subj, latest, prev, trend };
  });

  const CHART_COLORS = [
    'hsl(var(--primary))',
    'hsl(142, 76%, 36%)',
    'hsl(25, 95%, 53%)',
    'hsl(262, 83%, 58%)',
    'hsl(48, 96%, 53%)',
    'hsl(0, 84%, 60%)',
    'hsl(199, 89%, 48%)',
    'hsl(330, 81%, 60%)',
  ];

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">Loading student progress...</CardContent>
      </Card>
    );
  }

  if (subjectScores.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No approved subject scores found for this student.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Target className="h-5 w-5 text-primary" />
        Progress Dashboard: {studentName}
      </h3>

      {/* Subject Performance Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Subject Performance Trends</CardTitle>
          <CardDescription>Marks across terms for each subject</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="term" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              {subjects.map((subj, i) => (
                <Line
                  key={subj}
                  type="monotone"
                  dataKey={subj}
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Strength Radar */}
        {radarData.length > 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Subject Competency Map</CardTitle>
              <CardDescription>Latest term performance overview</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" className="text-xs" />
                  <PolarRadiusAxis domain={[0, 100]} />
                  <Radar
                    name="Marks"
                    dataKey="marks"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.3}
                  />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Strengths & Weaknesses */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Strengths & Weaknesses</CardTitle>
            <CardDescription>Based on {latestTerm} results</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-medium flex items-center gap-1 mb-2">
                <Award className="h-4 w-4 text-green-600" /> Top Subjects
              </h4>
              <div className="space-y-1">
                {strengths.map((s, i) => (
                  <div key={i} className="flex justify-between items-center text-sm">
                    <span>{s.subject_name}</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">{s.marks}%</Badge>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium flex items-center gap-1 mb-2">
                <AlertTriangle className="h-4 w-4 text-destructive" /> Needs Improvement
              </h4>
              <div className="space-y-1">
                {weaknesses.map((s, i) => (
                  <div key={i} className="flex justify-between items-center text-sm">
                    <span>{s.subject_name}</span>
                    <Badge variant="secondary" className={s.marks < 40 ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}>{s.marks}%</Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-Subject Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Subject Trend Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {subjectTrends.map((st, i) => (
              <div key={i} className="border rounded-lg p-3 space-y-1">
                <p className="text-sm font-medium truncate" title={st.subject}>{st.subject}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold">{st.latest}%</span>
                  {st.trend !== null && (
                    <div className="flex items-center gap-1 text-sm">
                      {st.trend > 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : st.trend < 0 ? (
                        <TrendingDown className="h-4 w-4 text-destructive" />
                      ) : (
                        <Minus className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className={st.trend > 0 ? 'text-green-600' : st.trend < 0 ? 'text-destructive' : 'text-muted-foreground'}>
                        {st.trend > 0 ? '+' : ''}{st.trend}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentProgressDashboard;
