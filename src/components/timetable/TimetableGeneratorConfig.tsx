import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Settings, Save, Clock, BookOpen } from 'lucide-react';

interface TimetableGeneratorConfigProps {
  onConfigReady: (configId: string) => void;
}

const DAYS = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const TimetableGeneratorConfig = ({ onConfigReady }: TimetableGeneratorConfigProps) => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const [schoolDays, setSchoolDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [periodDuration, setPeriodDuration] = useState(40);
  const [dayStartTime, setDayStartTime] = useState('08:00');
  const [periodsPerDay, setPeriodsPerDay] = useState(8);
  const [breakAfterPeriod, setBreakAfterPeriod] = useState('2,5');
  const [breakDuration, setBreakDuration] = useState('30,60');

  // Fetch existing config
  const { data: existingConfig, isLoading: configLoading } = useQuery({
    queryKey: ['timetable-gen-config', profile?.school_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('timetable_generation_config')
        .select('*')
        .eq('school_id', profile?.school_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.school_id,
  });

  // Fetch classes with subjects from teacher_specializations
  const { data: classSubjects, isLoading: csLoading } = useQuery({
    queryKey: ['class-subject-requirements', profile?.school_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teacher_specializations')
        .select(`
          class_id,
          subject_id,
          teacher_id,
          classes:class_id(id, name),
          subjects:subject_id(id, name, code),
          teachers:teacher_id(id, profile_id, profiles:profile_id(first_name, last_name))
        `)
        .order('class_id');
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.school_id,
  });

  // Fetch existing subject period configs
  const { data: periodConfigs } = useQuery({
    queryKey: ['subject-period-configs', profile?.school_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subject_period_config')
        .select('*');
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.school_id,
  });

  // Local state for period-per-subject editing
  const [periodValues, setPeriodValues] = useState<Record<string, number>>({});

  useEffect(() => {
    if (existingConfig) {
      setSchoolDays(existingConfig.school_days || [1, 2, 3, 4, 5]);
      setPeriodDuration(existingConfig.period_duration || 40);
      setDayStartTime(existingConfig.day_start_time || '08:00');
      setPeriodsPerDay(existingConfig.periods_per_day || 8);
      setBreakAfterPeriod((existingConfig.break_after_period || [2, 5]).join(','));
      setBreakDuration((existingConfig.break_duration || [30, 60]).join(','));
    }
  }, [existingConfig]);

  useEffect(() => {
    if (periodConfigs && classSubjects) {
      const vals: Record<string, number> = {};
      periodConfigs.forEach(pc => {
        vals[`${pc.class_id}_${pc.subject_id}`] = pc.periods_per_week;
      });
      // Default 3 for unset
      classSubjects.forEach((cs: any) => {
        const key = `${cs.class_id}_${cs.subject_id}`;
        if (!(key in vals)) vals[key] = 3;
      });
      setPeriodValues(vals);
    }
  }, [periodConfigs, classSubjects]);

  const toggleDay = (day: number) => {
    setSchoolDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  // Save config
  const saveConfigMutation = useMutation({
    mutationFn: async () => {
      const configData = {
        school_id: profile?.school_id,
        school_days: schoolDays,
        period_duration: periodDuration,
        day_start_time: dayStartTime,
        periods_per_day: periodsPerDay,
        break_after_period: breakAfterPeriod.split(',').map(Number).filter(n => !isNaN(n)),
        break_duration: breakDuration.split(',').map(Number).filter(n => !isNaN(n)),
      };

      if (existingConfig?.id) {
        const { error } = await supabase
          .from('timetable_generation_config')
          .update(configData as any)
          .eq('id', existingConfig.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('timetable_generation_config')
          .insert(configData as any);
        if (error) throw error;
      }

      // Save period configs
      const uniqueEntries = new Map<string, any>();
      for (const [key, periods] of Object.entries(periodValues)) {
        const [classId, subjectId] = key.split('_');
        uniqueEntries.set(key, {
          school_id: profile?.school_id,
          class_id: classId,
          subject_id: subjectId,
          periods_per_week: periods,
        });
      }

      const entries = Array.from(uniqueEntries.values());
      if (entries.length > 0) {
        // Delete existing and reinsert
        await supabase
          .from('subject_period_config')
          .delete()
          .eq('school_id', profile?.school_id);

        const { error } = await supabase
          .from('subject_period_config')
          .insert(entries as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Timetable configuration saved');
      queryClient.invalidateQueries({ queryKey: ['timetable-gen-config'] });
      queryClient.invalidateQueries({ queryKey: ['subject-period-configs'] });
      if (existingConfig?.id) onConfigReady(existingConfig.id);
    },
    onError: (error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

  // Group class-subjects by class
  const grouped = (classSubjects || []).reduce((acc: Record<string, any[]>, cs: any) => {
    const className = cs.classes?.name || 'Unknown';
    if (!acc[className]) acc[className] = [];
    acc[className].push(cs);
    return acc;
  }, {});

  if (configLoading || csLoading) {
    return <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>;
  }

  return (
    <div className="space-y-6">
      {/* School Schedule Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            School Schedule Settings
          </CardTitle>
          <CardDescription>Configure your school's daily schedule structure</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* School Days */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">School Days</Label>
            <div className="flex flex-wrap gap-3">
              {DAYS.map(day => (
                <label key={day.value} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={schoolDays.includes(day.value)}
                    onCheckedChange={() => toggleDay(day.value)}
                  />
                  <span className="text-sm">{day.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Day Start Time</Label>
              <Input type="time" value={dayStartTime} onChange={e => setDayStartTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Period Duration (min)</Label>
              <Input type="number" min={20} max={90} value={periodDuration} onChange={e => setPeriodDuration(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Periods Per Day</Label>
              <Input type="number" min={4} max={12} value={periodsPerDay} onChange={e => setPeriodsPerDay(Number(e.target.value))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Break After Period # (comma-separated)</Label>
              <Input value={breakAfterPeriod} onChange={e => setBreakAfterPeriod(e.target.value)} placeholder="e.g., 2,5" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Break Duration in min (comma-separated)</Label>
              <Input value={breakDuration} onChange={e => setBreakDuration(e.target.value)} placeholder="e.g., 30,60" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subject Periods Per Week */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Periods Per Subject Per Week
          </CardTitle>
          <CardDescription>Set how many periods each subject should have per week for each class</CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(grouped).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No teacher-subject-class assignments found.</p>
              <p className="text-sm mt-1">Please assign teachers to subjects in Teacher Management first.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([className, subjects]) => (
                <div key={className}>
                  <h4 className="font-semibold mb-2">{className}</h4>
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Subject</TableHead>
                          <TableHead>Teacher</TableHead>
                          <TableHead className="w-32">Periods/Week</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(subjects as any[]).map((cs: any) => {
                          const key = `${cs.class_id}_${cs.subject_id}`;
                          return (
                            <TableRow key={key}>
                              <TableCell>
                                <Badge variant="outline">{cs.subjects?.code}</Badge> {cs.subjects?.name}
                              </TableCell>
                              <TableCell className="text-sm">
                                {cs.teachers?.profiles?.first_name} {cs.teachers?.profiles?.last_name}
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min={1}
                                  max={periodsPerDay * schoolDays.length}
                                  value={periodValues[key] || 3}
                                  onChange={e => setPeriodValues(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                                  className="w-20 h-8"
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Time Slots Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Daily Time Slots Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {(() => {
              let time = dayStartTime;
              const breakPeriods = breakAfterPeriod.split(',').map(Number);
              const breakDurations = breakDuration.split(',').map(Number);
              const slots: JSX.Element[] = [];
              let periodNum = 0;

              for (let i = 0; i < periodsPerDay; i++) {
                const bIdx = breakPeriods.indexOf(periodNum);
                if (bIdx !== -1 && periodNum > 0) {
                  const bd = breakDurations[bIdx] || 30;
                  const [h, m] = time.split(':').map(Number);
                  const endMin = h * 60 + m + bd;
                  const endTime = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;
                  slots.push(
                    <Badge key={`break-${i}`} variant="secondary" className="text-xs px-3 py-1">
                      ☕ Break {time} - {endTime}
                    </Badge>
                  );
                  time = endTime;
                }

                periodNum++;
                const [h, m] = time.split(':').map(Number);
                const endMin = h * 60 + m + periodDuration;
                const endTime = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;

                slots.push(
                  <Badge key={`period-${i}`} variant="outline" className="text-xs px-3 py-1">
                    P{periodNum}: {time} - {endTime}
                  </Badge>
                );
                time = endTime;
              }
              return slots;
            })()}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => saveConfigMutation.mutate()}
          disabled={saveConfigMutation.isPending || schoolDays.length === 0}
          size="lg"
        >
          <Save className="h-4 w-4 mr-2" />
          {saveConfigMutation.isPending ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>
    </div>
  );
};

export default TimetableGeneratorConfig;
