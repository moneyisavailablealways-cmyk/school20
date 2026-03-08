import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Clock, Sun, GraduationCap } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';

interface TermCountdownWidgetProps {
  schoolId: string;
  schoolName?: string;
  compact?: boolean;
}

const TermCountdownWidget = ({ schoolId, schoolName, compact = false }: TermCountdownWidgetProps) => {
  const { data: termData, isLoading } = useQuery({
    queryKey: ['current-term', schoolId],
    queryFn: async () => {
      // Get current term
      const { data, error } = await supabase
        .from('academic_terms')
        .select('*, academic_years(name)')
        .eq('school_id', schoolId)
        .eq('is_current', true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!schoolId,
    refetchInterval: 60000, // refresh every minute
  });

  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ['upcoming-events', schoolId],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('school_events')
        .select('*')
        .eq('school_id', schoolId)
        .gte('start_date', today)
        .order('start_date')
        .limit(3);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!schoolId,
  });

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6"><div className="h-24 bg-muted rounded" /></CardContent>
      </Card>
    );
  }

  if (!termData) {
    // Check if we're in holiday mode by getting the latest completed term
    return (
      <Card className="border-2 border-dashed border-muted-foreground/20">
        <CardContent className="p-6 text-center">
          <Sun className="h-10 w-10 mx-auto mb-3 text-[hsl(var(--school-orange))]" />
          <h3 className="text-lg font-bold text-foreground">No Active Term</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {schoolName ? `${schoolName} — ` : ''}Configure a current term in Academic Calendar settings.
          </p>
        </CardContent>
      </Card>
    );
  }

  const today = new Date();
  const startDate = parseISO(termData.start_date);
  const endDate = parseISO(termData.end_date);
  const totalDays = differenceInDays(endDate, startDate) + 1;
  const daysPassed = Math.max(0, Math.min(differenceInDays(today, startDate) + 1, totalDays));
  const daysRemaining = Math.max(0, differenceInDays(endDate, today));
  const progressPct = Math.round((daysPassed / totalDays) * 100);

  const isHoliday = today > endDate;
  const holidayEnd = termData.holiday_end_date ? parseISO(termData.holiday_end_date) : null;
  const reopenDate = termData.opening_day ? parseISO(termData.opening_day) : null;
  const reopenDays = reopenDate ? Math.max(0, differenceInDays(reopenDate, today)) : null;

  if (isHoliday) {
    return (
      <Card className="bg-gradient-to-br from-[hsl(var(--school-orange)/0.1)] to-[hsl(var(--school-green)/0.1)] border-[hsl(var(--school-orange)/0.3)]">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-full bg-[hsl(var(--school-orange)/0.2)]">
              <Sun className="h-6 w-6 text-[hsl(var(--school-orange))]" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-foreground">School Holiday in Progress</h3>
              <p className="text-sm text-muted-foreground">{schoolName || 'School'}</p>
            </div>
          </div>
          {reopenDate && (
            <div className="mt-4 p-3 rounded-lg bg-background/70">
              <p className="text-sm text-muted-foreground">School Reopens In</p>
              <p className="text-3xl font-bold text-primary">{reopenDays} <span className="text-base font-normal">days</span></p>
              <p className="text-sm text-muted-foreground mt-1">Opening Date: {format(reopenDate, 'EEEE, MMMM d, yyyy')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">{termData.term_name}</span>
            </div>
            <Badge variant="outline" className="text-xs">{daysRemaining}d left</Badge>
          </div>
          <Progress value={progressPct} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            Closes {format(endDate, 'MMM d, yyyy')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left: Term Info */}
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Term</p>
              <h3 className="text-xl font-bold text-foreground">{termData.term_name}</h3>
              <p className="text-sm text-muted-foreground">{schoolName || 'School'} • {termData.academic_years?.name}</p>
            </div>
          </div>

          {/* Center: Countdown */}
          <div className="text-center px-6 py-3 rounded-xl bg-background/80">
            <p className="text-sm text-muted-foreground">Days Remaining</p>
            <p className="text-4xl font-bold text-primary">{daysRemaining}</p>
            <p className="text-xs text-muted-foreground">Closing: {format(endDate, 'MMM d, yyyy')}</p>
          </div>

          {/* Right: Progress */}
          <div className="min-w-[200px]">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Term Progress</span>
              <span className="font-semibold text-foreground">{progressPct}%</span>
            </div>
            <Progress value={progressPct} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{daysPassed} days passed</span>
              <span>{totalDays} total</span>
            </div>
          </div>
        </div>

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <div className="mt-4 pt-4 border-t border-primary/10">
            <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <Clock className="h-3 w-3" /> Upcoming Events
            </p>
            <div className="flex flex-wrap gap-2">
              {upcomingEvents.map((event: any) => (
                <Badge key={event.id} variant="secondary" className="text-xs">
                  {event.title} — {format(parseISO(event.start_date), 'MMM d')}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TermCountdownWidget;
