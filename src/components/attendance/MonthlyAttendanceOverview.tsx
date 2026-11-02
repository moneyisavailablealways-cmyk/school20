import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { addMonths, format } from 'date-fns';
import { BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { dailyCounts } from '@/lib/attendance/monthly';
import { fetchAttendanceRange } from './attendanceData';

const config = {
  present: { label: 'Present', color: 'hsl(var(--attendance-present-fg))' },
  absent: { label: 'Absent', color: 'hsl(var(--attendance-absent-fg))' },
  late: { label: 'Late', color: 'hsl(var(--attendance-late-fg))' },
};

/** Daily present/absent/late chart from real attendance records for the logged-in school. */
export default function MonthlyAttendanceOverview({ classId, initialMonth }: { classId?: string; initialMonth?: Date }) {
  const { profile } = useAuth();
  const schoolId = profile?.school_id;
  const [month, setMonth] = useState(() => { const d = initialMonth || new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const start = format(month, 'yyyy-MM-dd');
  const end = format(new Date(month.getFullYear(), month.getMonth() + 1, 0), 'yyyy-MM-dd');
  const q = useQuery({
    queryKey: ['attendance-month', 'student', schoolId, start, classId || 'all', 'chart'], enabled: !!schoolId,
    queryFn: () => fetchAttendanceRange('student', schoolId!, start, end, { classId }),
  });
  const data = useMemo(() => {
    const counts = dailyCounts(q.data || []);
    return Object.keys(counts).sort().map(d => ({ day: format(new Date(`${d}T00:00:00`), 'd MMM'), ...counts[d] }));
  }, [q.data]);
  const totals = data.reduce((a, d) => ({ present: a.present + d.present, absent: a.absent + d.absent, late: a.late + d.late }), { present: 0, absent: 0, late: 0 });
  const total = totals.present + totals.absent + totals.late;

  return <Card>
    <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
      <div>
        <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />Monthly Attendance Overview</CardTitle>
        <CardDescription>{format(month, 'MMMM yyyy')}{total ? ` · ${Math.round(((totals.present + totals.late) / total) * 100)}% attendance rate` : ''}</CardDescription>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" aria-label="Previous month" onClick={() => setMonth(m => addMonths(m, -1))}><ChevronLeft className="h-4 w-4" /></Button>
        <Button variant="outline" size="icon" aria-label="Next month" onClick={() => setMonth(m => addMonths(m, 1))}><ChevronRight className="h-4 w-4" /></Button>
      </div>
    </CardHeader>
    <CardContent>
      {q.error ? <p role="alert" className="text-destructive">Chart could not be loaded: {(q.error as Error).message}</p>
        : q.isPending ? <Skeleton className="h-64 w-full" />
        : !data.length ? <p className="py-12 text-center text-muted-foreground">No attendance recorded in {format(month, 'MMMM yyyy')}.</p>
        : <ChartContainer config={config} className="h-64 w-full sm:h-80">
          <BarChart data={data}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} fontSize={11} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="present" fill="var(--color-present)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="absent" fill="var(--color-absent)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="late" fill="var(--color-late)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ChartContainer>}
    </CardContent>
  </Card>;
}
