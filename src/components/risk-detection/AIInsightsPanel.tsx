import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, MessageSquare, Loader2 } from 'lucide-react';

interface AIInsightsPanelProps {
  student: {
    students: { profiles: { first_name: string; last_name: string } };
    risk_level: string;
    risk_score: number;
    avg_marks: number | null;
    prev_avg_marks: number | null;
    marks_trend: number | null;
    failing_subjects: number;
    total_subjects: number;
    attendance_rate: number | null;
    insights: string[];
    recommendations: string[];
  };
}

interface AIAnalysis {
  prediction: string;
  strengths: string[];
  concerns: string[];
  interventions: string[];
  parentMessage: string;
}

const AIInsightsPanel = ({ student }: AIInsightsPanelProps) => {
  const { toast } = useToast();
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  const generateInsights = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-risk-insights', {
        body: {
          studentName: `${student.students.profiles.first_name} ${student.students.profiles.last_name}`,
          riskLevel: student.risk_level,
          riskScore: student.risk_score,
          avgMarks: student.avg_marks,
          prevAvgMarks: student.prev_avg_marks,
          marksTrend: student.marks_trend,
          failingSubjects: student.failing_subjects,
          totalSubjects: student.total_subjects,
          attendanceRate: student.attendance_rate,
          insights: student.insights,
          recommendations: student.recommendations,
        },
      });

      if (error) throw error;
      if (data?.error) {
        toast({
          title: 'AI Analysis Error',
          description: data.error,
          variant: 'destructive',
        });
        return;
      }
      setAnalysis(data);
    } catch (err: any) {
      toast({
        title: 'Failed to generate AI insights',
        description: err.message || 'Please try again later',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!analysis) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-6 text-center">
          <Sparkles className="h-8 w-8 mx-auto text-primary mb-3" />
          <h4 className="font-medium mb-2">AI-Powered Predictive Analysis</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Generate intelligent predictions and personalized intervention recommendations
          </p>
          <Button onClick={generateInsights} disabled={loading} className="gap-2">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Generate AI Insights
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> AI Predictive Analysis
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={generateInsights} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
          </Button>
        </div>
        <CardDescription>
          {student.students.profiles.first_name} {student.students.profiles.last_name}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Prediction */}
        <div className="bg-background rounded-lg p-4 border">
          <h4 className="font-medium text-sm flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Performance Prediction
          </h4>
          <p className="text-sm text-muted-foreground">{analysis.prediction}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Strengths */}
          {analysis.strengths.length > 0 && (
            <div>
              <h4 className="font-medium text-sm flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-green-600" /> Identified Strengths
              </h4>
              <ul className="space-y-1">
                {analysis.strengths.map((s, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span> {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Concerns */}
          {analysis.concerns.length > 0 && (
            <div>
              <h4 className="font-medium text-sm flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-destructive" /> Key Concerns
              </h4>
              <ul className="space-y-1">
                {analysis.concerns.map((c, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-destructive mt-0.5">⚠</span> {c}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Interventions */}
        {analysis.interventions.length > 0 && (
          <div>
            <h4 className="font-medium text-sm flex items-center gap-2 mb-2">
              <Lightbulb className="h-4 w-4 text-amber-500" /> Recommended Interventions
            </h4>
            <ol className="space-y-1 list-decimal list-inside">
              {analysis.interventions.map((int, i) => (
                <li key={i} className="text-sm text-muted-foreground">{int}</li>
              ))}
            </ol>
          </div>
        )}

        {/* Parent Message */}
        {analysis.parentMessage && (
          <div className="bg-muted rounded-lg p-4">
            <h4 className="font-medium text-sm flex items-center gap-2 mb-2">
              <MessageSquare className="h-4 w-4 text-primary" /> Suggested Parent Message
            </h4>
            <p className="text-sm italic text-muted-foreground">"{analysis.parentMessage}"</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIInsightsPanel;
