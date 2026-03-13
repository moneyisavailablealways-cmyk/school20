import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  Wand2, AlertTriangle, CheckCircle, Lock, Unlock, Trash2, Download, RotateCcw, Eye,
} from 'lucide-react';
import {
  generateTimetable, buildTimeSlots, GeneratedEntry, ConflictWarning, SubjectRequirement,
} from './generateTimetable';

const DAYS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const TimetableAutoGenerator = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [generatedEntries, setGeneratedEntries] = useState<GeneratedEntry[]>([]);
  const [warnings, setWarnings] = useState<ConflictWarning[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [showClearDialog, setShowClearDialog] = useState(false);

  // Fetch config
  const { data: config, isLoading: configLoading } = useQuery({
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

  // Fetch subject period configs
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

  // Fetch teacher-subject-class assignments
  const { data: specializations } = useQuery({
    queryKey: ['teacher-specs-for-gen', profile?.school_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teacher_specializations')
        .select(`
          class_id, subject_id, teacher_id,
          classes:class_id(id, name),
          subjects:subject_id(id, name, code),
          teachers:teacher_id(id, profile_id, profiles:profile_id(first_name, last_name))
        `);
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.school_id,
  });

  // Fetch existing locked entries
  const { data: lockedEntries } = useQuery({
    queryKey: ['locked-timetable-entries', profile?.school_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('timetables')
        .select(`
          *, class:classes(name), subject:subjects(name, code),
          teacher:profiles!timetables_teacher_id_fkey(first_name, last_name)
        `)
        .eq('is_locked', true);
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.school_id,
  });

  // Fetch classes for filter
  const { data: classes } = useQuery({
    queryKey: ['classes-for-gen-filter', profile?.school_id],
    queryFn: async () => {
      if (!profile?.school_id) return [];
      const { data, error } = await supabase.from('classes').select('id, name').eq('school_id', profile.school_id).order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.school_id,
  });

  const handleGenerate = () => {
    if (!config || !specializations || !periodConfigs) {
      toast.error('Please save configuration first');
      return;
    }

    const timeSlots = buildTimeSlots(
      config.day_start_time,
      config.periods_per_day,
      config.period_duration,
      config.break_after_period || [],
      config.break_duration || [],
    );

    // Build requirements
    const requirements: SubjectRequirement[] = specializations.map((spec: any) => {
      const periodConfig = periodConfigs.find(
        (pc: any) => pc.class_id === spec.class_id && pc.subject_id === spec.subject_id
      );
      return {
        classId: spec.class_id,
        className: spec.classes?.name || '',
        subjectId: spec.subject_id,
        subjectName: spec.subjects?.name || '',
        subjectCode: spec.subjects?.code || '',
        teacherId: spec.teachers?.profiles?.id || spec.teachers?.profile_id || '',
        teacherName: `${spec.teachers?.profiles?.first_name || ''} ${spec.teachers?.profiles?.last_name || ''}`.trim(),
        periodsPerWeek: periodConfig?.periods_per_week || 3,
      };
    });

    // Convert locked entries to GeneratedEntry format
    const locked: GeneratedEntry[] = (lockedEntries || []).map((e: any) => ({
      classId: e.class_id,
      className: e.class?.name || '',
      subjectId: e.subject_id,
      subjectName: e.subject?.name || '',
      subjectCode: e.subject?.code || '',
      teacherId: e.teacher_id,
      teacherName: `${e.teacher?.first_name || ''} ${e.teacher?.last_name || ''}`.trim(),
      dayOfWeek: e.day_of_week,
      startTime: e.start_time,
      endTime: e.end_time,
      period: 0,
      isLocked: true,
    }));

    const result = generateTimetable({
      schoolDays: config.school_days || [1, 2, 3, 4, 5],
      timeSlots,
      requirements,
      lockedEntries: locked,
    });

    setGeneratedEntries(result.entries);
    setWarnings(result.warnings);
    setHasGenerated(true);

    if (result.success) {
      toast.success(`Generated ${result.entries.length} timetable entries successfully!`);
    } else {
      toast.warning(`Generated with ${result.warnings.length} warning(s). Review conflicts below.`);
    }
  };

  // Save generated timetable to DB
  const saveMutation = useMutation({
    mutationFn: async () => {
      // First remove existing non-locked entries
      await supabase
        .from('timetables')
        .delete()
        .eq('school_id', profile?.school_id)
        .eq('is_locked', false);

      // Insert new entries
      const inserts = generatedEntries.map(e => ({
        class_id: e.classId,
        subject_id: e.subjectId,
        teacher_id: e.teacherId,
        day_of_week: e.dayOfWeek,
        start_time: e.startTime,
        end_time: e.endTime,
        school_id: profile?.school_id,
        is_locked: false,
      }));

      if (inserts.length > 0) {
        const { error } = await supabase.from('timetables').insert(inserts as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Timetable saved to database! All portals updated.');
      queryClient.invalidateQueries({ queryKey: ['locked-timetable-entries'] });
      setHasGenerated(false);
      setGeneratedEntries([]);
    },
    onError: (error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

  // Clear all entries
  const clearMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('timetables')
        .delete()
        .eq('school_id', profile?.school_id)
        .eq('is_locked', false);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('All non-locked timetable entries cleared');
      setShowClearDialog(false);
      queryClient.invalidateQueries({ queryKey: ['locked-timetable-entries'] });
    },
  });

  const filteredEntries = filterClass === 'all'
    ? generatedEntries
    : generatedEntries.filter(e => e.classId === filterClass);

  // Group by day for grid view
  const schoolDays = config?.school_days || [1, 2, 3, 4, 5];
  const timeSlots = config
    ? buildTimeSlots(config.day_start_time, config.periods_per_day, config.period_duration, config.break_after_period || [], config.break_duration || [])
    : [];
  const teachingSlots = timeSlots.filter(s => !s.isBreak);

  if (configLoading) {
    return <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>;
  }

  if (!config) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Wand2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Configuration Found</h3>
          <p className="text-muted-foreground">Please set up the timetable configuration in the "Configuration" tab first.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handleGenerate} size="lg" className="gap-2">
              <Wand2 className="h-4 w-4" />
              {hasGenerated ? 'Regenerate Timetable' : 'Generate Timetable'}
            </Button>

            {hasGenerated && generatedEntries.length > 0 && (
              <>
                <Button onClick={() => saveMutation.mutate()} variant="default" className="gap-2" disabled={saveMutation.isPending}>
                  <CheckCircle className="h-4 w-4" />
                  {saveMutation.isPending ? 'Saving...' : 'Save & Apply'}
                </Button>
                <Button onClick={handleGenerate} variant="outline" className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Regenerate
                </Button>
              </>
            )}

            <Button variant="outline" className="gap-2 text-destructive" onClick={() => setShowClearDialog(true)}>
              <Trash2 className="h-4 w-4" />
              Clear Existing
            </Button>

            <div className="ml-auto flex items-center gap-2">
              <Select value={filterClass} onValueChange={setFilterClass}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Filter class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes?.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant={viewMode === 'grid' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('grid')}>Grid</Button>
              <Button variant={viewMode === 'list' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('list')}>List</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warnings */}
      {warnings.length > 0 && (
        <Card className="border-yellow-500/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="h-5 w-5" />
              Conflicts & Warnings ({warnings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {warnings.map((w, i) => (
                <div key={i} className="p-3 rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm font-medium">{w.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{w.details}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generated Results */}
      {hasGenerated && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Generated Timetable ({filteredEntries.length} entries)
            </CardTitle>
            <CardDescription>Review the generated schedule before saving</CardDescription>
          </CardHeader>
          <CardContent>
            {viewMode === 'grid' ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-32 bg-muted/30 border-r">Time</TableHead>
                      {schoolDays.map(d => (
                        <TableHead key={d} className="text-center min-w-[160px] bg-muted/30 border-r">
                          {DAYS[d]}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teachingSlots.map(slot => (
                      <TableRow key={slot.period}>
                        <TableCell className="font-mono text-xs bg-muted/20 border-r text-center">
                          <div className="font-semibold">P{slot.period}</div>
                          <div>{slot.startTime}-{slot.endTime}</div>
                        </TableCell>
                        {schoolDays.map(day => {
                          const entries = filteredEntries.filter(
                            e => e.dayOfWeek === day && e.startTime === slot.startTime
                          );
                          return (
                            <TableCell key={day} className="p-1.5 border-r align-top">
                              {entries.map((entry, idx) => (
                                <div key={idx} className="bg-primary/10 p-2 rounded-md mb-1 text-xs">
                                  <div className="font-semibold">{entry.subjectCode || entry.subjectName}</div>
                                  <div className="text-muted-foreground">{entry.className}</div>
                                  <div className="text-muted-foreground">{entry.teacherName}</div>
                                </div>
                              ))}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Day</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Teacher</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.map((entry, i) => (
                      <TableRow key={i}>
                        <TableCell><Badge variant="outline">{DAYS[entry.dayOfWeek]}</Badge></TableCell>
                        <TableCell className="font-mono text-sm">{entry.startTime} - {entry.endTime}</TableCell>
                        <TableCell className="font-medium">{entry.className}</TableCell>
                        <TableCell>{entry.subjectCode} - {entry.subjectName}</TableCell>
                        <TableCell>{entry.teacherName}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!hasGenerated && (
        <Card>
          <CardContent className="py-12 text-center">
            <Wand2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Ready to Generate</h3>
            <p className="text-muted-foreground">Click "Generate Timetable" to automatically create an optimized schedule for all classes.</p>
          </CardContent>
        </Card>
      )}

      {/* Clear Dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Timetable Entries?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all non-locked timetable entries from the database. Locked entries will be preserved. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => clearMutation.mutate()}>Clear All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TimetableAutoGenerator;
