import { useState, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Send, Plus, X, Trash2, Check, PenTool } from 'lucide-react';
import MySubmissions from '@/components/teacher/MySubmissions';
import SignaturePad from '@/components/report-cards/SignaturePad';
import TypeToSign from '@/components/report-cards/TypeToSign';

// ── Types ────────────────────────────────────────────────────────────────────

interface SubjectRow {
  id: string;            // local key
  subjectId: string;
  marks: string;         // raw marks out of 100
  grade: string;         // auto-calculated
  remarks: string;
  existingId?: string;
  status?: string;
}

interface SectionState {
  rows: SubjectRow[];
  saving: boolean;
}

type SectionKey = 'bot' | 'mot' | 'eot';

const SECTION_LABELS: Record<SectionKey, string> = {
  bot: 'Beginning of Term (BOT)',
  mot: 'Mid Term (MOT)',
  eot: 'End of Term (EOT)',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const emptyRow = (): SubjectRow => ({
  id: crypto.randomUUID(),
  subjectId: '',
  marks: '',
  grade: '',
  remarks: '',
});

const initSections = (): Record<SectionKey, SectionState> => ({
  bot: { rows: [emptyRow()], saving: false },
  mot: { rows: [emptyRow()], saving: false },
  eot: { rows: [emptyRow()], saving: false },
});

// Map section key → term suffix stored in DB
// BOT = "Term 1 BOT", MOT = "Term 1 MOT", EOT = "Term 1"
const buildDbTerm = (term: string, section: SectionKey) => {
  if (section === 'eot') return term;
  return `${term} ${section.toUpperCase()}`;
};

// ── Component ────────────────────────────────────────────────────────────────

const MarksSubmission = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [sortAsc, setSortAsc] = useState(true);
  const [sections, setSections] = useState<Record<SectionKey, SectionState>>(initSections());
  const autoSaveTimers = useRef<Record<string, NodeJS.Timeout>>({});

  // ── Queries ─────────────────────────────────────────────────────────────────

  const { data: teacherRecord } = useQuery({
    queryKey: ['teacher-record', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;
      const { data } = await supabase.from('teachers').select('id').eq('profile_id', profile.id).maybeSingle();
      return data;
    },
    enabled: !!profile?.id,
  });

  const { data: classes } = useQuery({
    queryKey: ['teacher-classes', profile?.id, teacherRecord?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const classIds = new Set<string>();
      const [{ data: ct }, { data: st }, { data: sp }] = await Promise.all([
        supabase.from('classes').select('id').eq('class_teacher_id', profile.id),
        supabase.from('streams').select('class_id').eq('section_teacher_id', profile.id),
        teacherRecord?.id
          ? supabase.from('teacher_specializations').select('class_id').eq('teacher_id', teacherRecord.id).not('class_id', 'is', null)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      (ct || []).forEach((c: any) => classIds.add(c.id));
      (st || []).forEach((s: any) => s.class_id && classIds.add(s.class_id));
      (sp || []).forEach((s: any) => s.class_id && classIds.add(s.class_id));
      if (classIds.size === 0) return [];
      const { data } = await supabase.from('classes').select('id, name, class_teacher_id').in('id', Array.from(classIds)).order('name');
      return data || [];
    },
    enabled: !!profile?.id,
  });

  const isClassTeacher = selectedClass
    ? classes?.find(c => c.id === selectedClass)?.class_teacher_id === profile?.id
    : false;

  const { data: existingSignature, refetch: refetchSignature } = useQuery({
    queryKey: ['teacher-signature', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;
      const { data } = await supabase.from('digital_signatures').select('*').eq('user_id', profile.id).eq('is_active', true).maybeSingle();
      return data;
    },
    enabled: !!profile?.id,
  });

  const { data: subjects } = useQuery({
    queryKey: ['teacher-subjects-for-class', teacherRecord?.id, selectedClass],
    queryFn: async () => {
      if (!teacherRecord?.id || !selectedClass) return [];
      const { data: specs } = await supabase
        .from('teacher_specializations')
        .select('subject_id')
        .eq('teacher_id', teacherRecord.id)
        .eq('class_id', selectedClass)
        .not('subject_id', 'is', null);
      const ids = Array.from(new Set((specs || []).map((s: any) => s.subject_id).filter(Boolean)));
      if (ids.length === 0) return [];
      const { data } = await supabase.from('subjects').select('id, name, code').eq('is_active', true).in('id', ids).order('name');
      return data || [];
    },
    enabled: !!teacherRecord?.id && !!selectedClass,
  });

  const { data: currentYear } = useQuery({
    queryKey: ['current-academic-year'],
    queryFn: async () => {
      const { data } = await supabase.from('academic_years').select('id, name').eq('is_current', true).order('created_at', { ascending: false }).limit(1);
      return data?.[0] || null;
    },
  });

  const { data: gradingConfig } = useQuery({
    queryKey: ['grading-config'],
    queryFn: async () => {
      const { data } = await supabase.from('grading_config').select('*').eq('is_active', true).order('min_marks', { ascending: false });
      return data || [];
    },
  });

  const { data: students } = useQuery({
    queryKey: ['class-students', selectedClass, currentYear?.id],
    queryFn: async () => {
      if (!selectedClass || !currentYear?.id) return [];
      const { data: enrollments } = await supabase
        .from('student_enrollments')
        .select('student_id')
        .eq('class_id', selectedClass)
        .eq('status', 'active')
        .or(`academic_year_id.eq.${currentYear.id},academic_year_id.is.null`);
      const studentIds = (enrollments || []).map(e => e.student_id);
      if (studentIds.length === 0) return [];
      const { data: studentsData } = await supabase.from('students').select('id, student_id, profile_id').in('id', studentIds);
      const profileIds = (studentsData || []).map(s => s.profile_id).filter(Boolean);
      const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name').in('id', profileIds);
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      return (studentsData || []).map(s => {
        const p = profileMap.get(s.profile_id);
        return { id: s.id, admissionNo: s.student_id || '', name: `${p?.first_name || ''} ${p?.last_name || ''}`.trim() || 'Unknown' };
      }).sort((a, b) => a.name.localeCompare(b.name));
    },
    enabled: !!selectedClass && !!currentYear?.id,
  });

  // ── Grade calculation ────────────────────────────────────────────────────────

  const calculateGrade = useCallback((marks: number | null): string => {
    if (marks === null || !gradingConfig?.length) return '';
    const cfg = gradingConfig.find(g => marks >= g.min_marks && marks <= g.max_marks);
    return cfg?.grade || '';
  }, [gradingConfig]);

  // ── Section helpers ──────────────────────────────────────────────────────────

  const updateSection = (key: SectionKey, updater: (prev: SectionState) => SectionState) => {
    setSections(prev => ({ ...prev, [key]: updater(prev[key]) }));
  };

  const addRow = (section: SectionKey) => {
    updateSection(section, s => ({ ...s, rows: [...s.rows, emptyRow()] }));
  };

  const removeRow = (section: SectionKey, rowId: string) => {
    updateSection(section, s => ({
      ...s,
      rows: s.rows.length > 1 ? s.rows.filter(r => r.id !== rowId) : s.rows,
    }));
  };

  const updateRow = (section: SectionKey, rowId: string, field: keyof SubjectRow, value: string) => {
    updateSection(section, s => ({
      ...s,
      rows: s.rows.map(r => {
        if (r.id !== rowId) return r;
        const updated = { ...r, [field]: value };
        if (field === 'marks') {
          const n = parseFloat(value);
          updated.grade = isNaN(n) ? '' : calculateGrade(n);
        }
        return updated;
      }),
    }));

    // Auto-save debounce
    const timerKey = `${section}-${rowId}`;
    if (autoSaveTimers.current[timerKey]) clearTimeout(autoSaveTimers.current[timerKey]);
    autoSaveTimers.current[timerKey] = setTimeout(() => autoSaveRow(section, rowId), 2000);
  };

  const handleSubjectChange = (section: SectionKey, rowId: string, subjectId: string) => {
    updateSection(section, s => ({
      ...s,
      rows: s.rows.map(r => r.id === rowId
        ? { ...r, subjectId, marks: '', grade: '', remarks: '', existingId: undefined, status: undefined }
        : r),
    }));
    // Load existing submission for this subject+student
    if (selectedStudent && currentYear?.id && selectedTerm) {
      const dbTerm = buildDbTerm(selectedTerm, section);
      supabase
        .from('subject_submissions')
        .select('*')
        .eq('student_id', selectedStudent)
        .eq('subject_id', subjectId)
        .eq('academic_year_id', currentYear.id)
        .eq('term', dbTerm)
        .maybeSingle()
        .then(({ data: sub }) => {
          if (!sub) return;
          updateSection(section, s => ({
            ...s,
            rows: s.rows.map(r => r.id === rowId ? {
              ...r,
              marks: sub.marks?.toString() || '',
              grade: sub.grade || '',
              remarks: sub.remark || '',
              existingId: sub.id,
              status: sub.status,
            } : r),
          }));
        });
    }
  };

  // ── Auto-save ────────────────────────────────────────────────────────────────

  const autoSaveRow = useCallback(async (section: SectionKey, rowId: string) => {
    setSections(current => {
      const row = current[section].rows.find(r => r.id === rowId);
      if (!row || !row.subjectId || !selectedStudent || !profile?.id || !currentYear?.id || !selectedTerm) return current;
      if (row.status === 'approved') return current;
      const marks = parseFloat(row.marks);
      if (isNaN(marks)) return current;

      const dbTerm = buildDbTerm(selectedTerm, section);
      const initials = `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase();
      const record: any = {
        student_id: selectedStudent,
        subject_id: row.subjectId,
        academic_year_id: currentYear.id,
        term: dbTerm,
        marks,
        grade: row.grade || null,
        remark: row.remarks || null,
        teacher_initials: initials,
        submitted_by: profile.id,
        status: 'draft',
      };

      if (row.existingId) {
        supabase.from('subject_submissions').update(record).eq('id', row.existingId).then(() => {});
      } else {
        supabase.from('subject_submissions').insert(record).select('id').maybeSingle().then(({ data }) => {
          if (data?.id) {
            setSections(prev => ({
              ...prev,
              [section]: {
                ...prev[section],
                rows: prev[section].rows.map(r => r.id === rowId ? { ...r, existingId: data.id } : r),
              },
            }));
          }
        });
      }
      return current;
    });
  }, [selectedStudent, profile, currentYear?.id, selectedTerm]);

  // ── Save section ─────────────────────────────────────────────────────────────

  const saveSection = async (section: SectionKey) => {
    if (!profile?.id || !currentYear?.id || !selectedStudent || !selectedTerm) {
      toast.error('Please select class, student and term first');
      return;
    }
    const rows = sections[section].rows;
    const validRows = rows.filter(r => r.subjectId && r.marks && r.status !== 'approved');
    if (validRows.length === 0) {
      toast.error('No marks entered to save');
      return;
    }

    updateSection(section, s => ({ ...s, saving: true }));
    const dbTerm = buildDbTerm(selectedTerm, section);
    const initials = `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase();

    try {
      for (const row of validRows) {
        const marks = parseFloat(row.marks);
        const record: any = {
          student_id: selectedStudent,
          subject_id: row.subjectId,
          academic_year_id: currentYear.id,
          term: dbTerm,
          marks: isNaN(marks) ? null : marks,
          grade: row.grade || null,
          remark: row.remarks || null,
          teacher_initials: initials,
          submitted_by: profile.id,
          submitted_at: new Date().toISOString(),
          status: 'pending',
        };

        if (row.existingId) {
          const { error } = await supabase.from('subject_submissions').update(record).eq('id', row.existingId);
          if (error) throw error;
        } else {
          const { data, error } = await supabase.from('subject_submissions').insert(record).select('id').maybeSingle();
          if (error) throw error;
          if (data?.id) {
            updateSection(section, s => ({
              ...s,
              rows: s.rows.map(r => r.id === row.id ? { ...r, existingId: data.id, status: 'pending' } : r),
            }));
          }
        }
      }
      toast.success(`${SECTION_LABELS[section]} marks submitted for approval`);
      queryClient.invalidateQueries({ queryKey: ['class-students-marks'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to save marks');
    } finally {
      updateSection(section, s => ({ ...s, saving: false }));
    }
  };

  // ── Aggregates ───────────────────────────────────────────────────────────────

  const calcAggregate = (rows: SubjectRow[]) => {
    const vals = rows.map(r => parseFloat(r.marks)).filter(n => !isNaN(n));
    if (vals.length === 0) return null;
    return vals.reduce((a, b) => a + b, 0);
  };

  const calcAverage = (rows: SubjectRow[]) => {
    const vals = rows.map(r => parseFloat(r.marks)).filter(n => !isNaN(n));
    if (vals.length === 0) return null;
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
  };

  // ── Derived ──────────────────────────────────────────────────────────────────

  const filteredStudents = (students || [])
    .filter(s =>
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.admissionNo.toLowerCase().includes(studentSearch.toLowerCase())
    )
    .sort((a, b) => sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));

  const teacherInitials = profile
    ? `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase()
    : '';

  const usedSubjectIds = (section: SectionKey) =>
    sections[section].rows.map(r => r.subjectId).filter(Boolean);

  // ── Render helpers ────────────────────────────────────────────────────────────

  const renderBOT = () => {
    const sec = sections.bot;
    const total = calcAggregate(sec.rows);
    const avg = calcAverage(sec.rows);
    const agg = avg !== null ? Math.round(avg) : null;
    const div = avg !== null ? calcDivision(avg) : null;
    return (
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base font-bold">Beginning of Term (BOT) — Examination Results</CardTitle>
            <Button size="sm" variant="outline" onClick={() => addRow('bot')}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Subject
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Header row */}
          <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground border-b pb-1">
            <div className="col-span-4">Subject</div>
            <div className="col-span-3">Marks (100)</div>
            <div className="col-span-2">Grade</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-1"></div>
          </div>

          {sec.rows.map(row => {
            const isApproved = row.status === 'approved';
            return (
              <div key={row.id} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-4">
                  <Select
                    value={row.subjectId}
                    onValueChange={v => handleSubjectChange('bot', row.id, v)}
                    disabled={isApproved}
                  >
                    <SelectTrigger className="h-8 text-xs bg-card border-border">
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects?.filter(s => !usedSubjectIds('bot').includes(s.id) || s.id === row.subjectId).map(s => (
                        <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={row.marks}
                    onChange={e => updateRow('bot', row.id, 'marks', e.target.value)}
                    disabled={isApproved}
                    placeholder="0–100"
                    className="h-8 text-xs bg-card border-border"
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    value={row.grade || '—'}
                    disabled
                    className="h-8 text-xs bg-muted border-border font-semibold"
                  />
                </div>
                <div className="col-span-2">
                  {row.status && (
                    <Badge variant={row.status === 'approved' ? 'default' : 'secondary'} className="text-[10px]">
                      {row.status === 'approved' ? '✓ Approved' : row.status === 'pending' ? '⏳ Pending' : '📝 Draft'}
                    </Badge>
                  )}
                </div>
                <div className="col-span-1 flex justify-end">
                  <Button
                    variant="ghost" size="icon"
                    className="h-7 w-7 text-destructive"
                    disabled={sec.rows.length <= 1 || isApproved}
                    onClick={() => removeRow('bot', row.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}

          {/* Auto-calculated summary */}
          <div className="border-t pt-2 mt-1 grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground">TOTAL (Sum)</p>
              <Input value={total !== null ? total.toString() : '—'} disabled className="h-8 text-xs bg-muted font-bold text-center" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground">AGG (Average)</p>
              <Input value={agg !== null ? agg.toString() : '—'} disabled className="h-8 text-xs bg-muted font-bold text-center" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground">DIV (Division)</p>
              <Input value={div ?? '—'} disabled className="h-8 text-xs bg-muted font-bold text-center" />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button size="sm" onClick={() => saveSection('bot')} disabled={sec.saving}>
              <Send className="h-3.5 w-3.5 mr-1.5" />
              {sec.saving ? 'Saving...' : 'Save BOT Marks'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderMOT = () => {
    const sec = sections.mot;
    const total = calcAggregate(sec.rows);
    const avg = calcAverage(sec.rows);
    const agg = avg !== null ? Math.round(avg) : null;
    const div = avg !== null ? calcDivision(avg) : null;
    return (
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base font-bold">Mid Term (MOT) — Examination Results</CardTitle>
            <Button size="sm" variant="outline" onClick={() => addRow('mot')}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Subject
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Header row */}
          <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground border-b pb-1">
            <div className="col-span-4">Subject</div>
            <div className="col-span-3">Marks (100)</div>
            <div className="col-span-2">Grade</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-1"></div>
          </div>

          {sec.rows.map(row => {
            const isApproved = row.status === 'approved';
            return (
              <div key={row.id} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-4">
                  <Select
                    value={row.subjectId}
                    onValueChange={v => handleSubjectChange('mot', row.id, v)}
                    disabled={isApproved}
                  >
                    <SelectTrigger className="h-8 text-xs bg-card border-border">
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects?.filter(s => !usedSubjectIds('mot').includes(s.id) || s.id === row.subjectId).map(s => (
                        <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={row.marks}
                    onChange={e => updateRow('mot', row.id, 'marks', e.target.value)}
                    disabled={isApproved}
                    placeholder="0–100"
                    className="h-8 text-xs bg-card border-border"
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    value={row.grade || '—'}
                    disabled
                    className="h-8 text-xs bg-muted border-border font-semibold"
                  />
                </div>
                <div className="col-span-2">
                  {row.status && (
                    <Badge variant={row.status === 'approved' ? 'default' : 'secondary'} className="text-[10px]">
                      {row.status === 'approved' ? '✓ Approved' : row.status === 'pending' ? '⏳ Pending' : '📝 Draft'}
                    </Badge>
                  )}
                </div>
                <div className="col-span-1 flex justify-end">
                  <Button
                    variant="ghost" size="icon"
                    className="h-7 w-7 text-destructive"
                    disabled={sec.rows.length <= 1 || isApproved}
                    onClick={() => removeRow('mot', row.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}

          {/* Auto-calculated summary */}
          <div className="border-t pt-2 mt-1 grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground">TOTAL (Sum)</p>
              <Input value={total !== null ? total.toString() : '—'} disabled className="h-8 text-xs bg-muted font-bold text-center" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground">AGG (Average)</p>
              <Input value={agg !== null ? agg.toString() : '—'} disabled className="h-8 text-xs bg-muted font-bold text-center" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground">DIV (Division)</p>
              <Input value={div ?? '—'} disabled className="h-8 text-xs bg-muted font-bold text-center" />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button size="sm" onClick={() => saveSection('mot')} disabled={sec.saving}>
              <Send className="h-3.5 w-3.5 mr-1.5" />
              {sec.saving ? 'Saving...' : 'Save MOT Marks'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderEOT = () => {
    const sec = sections.eot;
    const total = calcAggregate(sec.rows);
    const avg = calcAverage(sec.rows);
    const agg = avg !== null ? Math.round(avg) : null;
    const div = avg !== null ? calcDivision(avg) : null;
    return (
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base font-bold">End of Term (EOT) — Examination Results</CardTitle>
            <Button size="sm" variant="outline" onClick={() => addRow('eot')}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Subject
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Header row */}
          <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground border-b pb-1">
            <div className="col-span-3">Subject</div>
            <div className="col-span-1 text-center">Full Marks</div>
            <div className="col-span-2">Marks Obtained</div>
            <div className="col-span-1 text-center">AGG</div>
            <div className="col-span-2">Remarks</div>
            <div className="col-span-1 text-center">Initials</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-1"></div>
          </div>

          {sec.rows.map(row => {
            const isApproved = row.status === 'approved';
            const marks = parseFloat(row.marks);
            return (
              <div key={row.id} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-3">
                  <Select
                    value={row.subjectId}
                    onValueChange={v => handleSubjectChange('eot', row.id, v)}
                    disabled={isApproved}
                  >
                    <SelectTrigger className="h-8 text-xs bg-card border-border">
                      <SelectValue placeholder="Subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects?.filter(s => !usedSubjectIds('eot').includes(s.id) || s.id === row.subjectId).map(s => (
                        <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-1">
                  <Input value="100" disabled className="h-8 text-xs bg-muted text-center border-border" />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={row.marks}
                    onChange={e => updateRow('eot', row.id, 'marks', e.target.value)}
                    disabled={isApproved}
                    placeholder="0–100"
                    className="h-8 text-xs bg-card border-border"
                  />
                </div>
                <div className="col-span-1">
                  <Input
                    value={row.grade || '—'}
                    disabled
                    className="h-8 text-xs bg-muted border-border font-semibold text-center"
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    value={row.remarks}
                    onChange={e => updateRow('eot', row.id, 'remarks', e.target.value)}
                    disabled={isApproved}
                    placeholder="Remarks"
                    className="h-8 text-xs bg-card border-border"
                  />
                </div>
                <div className="col-span-1">
                  <Input value={teacherInitials} disabled className="h-8 text-xs bg-muted border-border text-center" />
                </div>
                <div className="col-span-1">
                  {row.status && (
                    <Badge variant={row.status === 'approved' ? 'default' : 'secondary'} className="text-[10px] whitespace-nowrap">
                      {row.status === 'approved' ? '✓' : row.status === 'pending' ? '⏳' : '📝'}
                    </Badge>
                  )}
                </div>
                <div className="col-span-1 flex justify-end">
                  <Button
                    variant="ghost" size="icon"
                    className="h-7 w-7 text-destructive"
                    disabled={sec.rows.length <= 1 || isApproved}
                    onClick={() => removeRow('eot', row.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}

          {/* Aggregates */}
          <div className="border-t pt-2 mt-1 grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground">AGG (Aggregate)</p>
              <Input value={agg !== null ? agg.toFixed(1) : '—'} disabled className="h-8 text-xs bg-muted font-bold" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground">AVE (Average)</p>
              <Input value={avg !== null ? avg.toFixed(1) : '—'} disabled className="h-8 text-xs bg-muted font-bold" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground">DIV (Division)</p>
              <Input value={avg !== null ? calcDivision(avg) : '—'} disabled className="h-8 text-xs bg-muted font-bold" />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button size="sm" onClick={() => saveSection('eot')} disabled={sec.saving}>
              <Send className="h-3.5 w-3.5 mr-1.5" />
              {sec.saving ? 'Saving...' : 'Save EOT Marks'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Division calculation for primary (common Ugandan primary scale)
  const calcDivision = (avg: number): string => {
    if (avg >= 85) return 'Div 1';
    if (avg >= 70) return 'Div 2';
    if (avg >= 50) return 'Div 3';
    if (avg >= 35) return 'Div 4';
    return 'Ungraded';
  };

  // ── Main render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Mark Submission Form</h1>

      {/* Row 1: Class + Term */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label className="text-xs font-medium">Class (Only Your Assigned Classes)</Label>
          <Select
            value={selectedClass}
            onValueChange={v => {
              setSelectedClass(v);
              setSelectedStudent('');
              setSections(initSections());
            }}
          >
            <SelectTrigger className="bg-card border-border">
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              {classes?.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium">Term</Label>
          <Select value={selectedTerm} onValueChange={setSelectedTerm}>
            <SelectTrigger className="bg-card border-border">
              <SelectValue placeholder="Select term" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Term 1">Term 1</SelectItem>
              <SelectItem value="Term 2">Term 2</SelectItem>
              <SelectItem value="Term 3">Term 3</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Student selector */}
      {selectedClass && (
        <div className="space-y-2">
          <Label className="text-xs font-medium">Student</Label>
          <div className="flex items-center gap-2 mb-1">
            <Input
              value={studentSearch}
              onChange={e => setStudentSearch(e.target.value)}
              placeholder="Search student..."
              className="flex-1 bg-card border-border"
            />
            <Button variant="outline" size="sm" onClick={() => setSortAsc(p => !p)} className="shrink-0">
              {sortAsc ? 'A → Z' : 'Z → A'}
            </Button>
          </div>
          <Select value={selectedStudent} onValueChange={v => { setSelectedStudent(v); setSections(initSections()); }}>
            <SelectTrigger className="bg-card border-border">
              <SelectValue placeholder="Select a student" />
            </SelectTrigger>
            <SelectContent>
              {filteredStudents.map(s => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}{s.admissionNo ? ` (${s.admissionNo})` : ''}
                </SelectItem>
              ))}
              {filteredStudents.length === 0 && (
                <div className="px-3 py-2 text-sm text-muted-foreground">No students found</div>
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Three-section marks forms */}
      {selectedClass && selectedStudent && selectedTerm && (
        <div className="space-y-6">
          {renderBOT()}
          {renderMOT()}
          {renderEOT()}
        </div>
      )}

      {/* Class Teacher Signature */}
      {isClassTeacher && selectedClass && (
        <ClassTeacherSignature
          profileId={profile!.id}
          schoolId={profile!.school_id}
          existingSignature={existingSignature}
          onSaved={() => refetchSignature()}
        />
      )}

      {/* My Submissions */}
      {selectedTerm && currentYear?.id && profile?.id && (
        <MySubmissions
          teacherId={profile.id}
          currentYearId={currentYear.id}
          selectedTerm={selectedTerm}
        />
      )}
    </div>
  );
};

// ── Class Teacher Signature ───────────────────────────────────────────────────

interface ClassTeacherSignatureProps {
  profileId: string;
  schoolId: string | null;
  existingSignature: any;
  onSaved: () => void;
}

const ClassTeacherSignature = ({ profileId, schoolId, existingSignature, onSaved }: ClassTeacherSignatureProps) => {
  const [signatureTab, setSignatureTab] = useState<string>('draw');
  const [saving, setSaving] = useState(false);

  const saveSignature = async (signatureData: string, signatureType: string, fontFamily?: string) => {
    setSaving(true);
    try {
      await supabase.from('digital_signatures').update({ is_active: false }).eq('user_id', profileId);
      const { error } = await supabase.from('digital_signatures').insert({
        user_id: profileId,
        school_id: schoolId,
        signature_data: signatureData,
        signature_type: signatureType,
        font_family: fontFamily || null,
        is_active: true,
      });
      if (error) throw error;
      toast.success('Signature saved successfully');
      onSaved();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save signature');
    } finally {
      setSaving(false);
    }
  };

  const deleteSignature = async () => {
    if (!existingSignature?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('digital_signatures').delete().eq('id', existingSignature.id);
      if (error) throw error;
      toast.success('Signature removed');
      onSaved();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete signature');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <PenTool className="h-5 w-5" />
          Class Teacher Signature
        </CardTitle>
        <CardDescription>
          As a class teacher, set your digital signature for report cards.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {existingSignature && (
          <div className="space-y-2">
            <Label className="text-xs font-medium">Current Signature</Label>
            <div className="flex items-center gap-4">
              <div className="border rounded-lg p-3 bg-card">
                <img src={existingSignature.signature_data} alt="Current signature" className="max-h-16 w-auto" />
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default" className="gap-1"><Check className="h-3 w-3" />Active</Badge>
                <Badge variant="secondary">{existingSignature.signature_type === 'drawn' ? 'Hand-drawn' : 'Typed'}</Badge>
                <Button variant="outline" size="sm" onClick={deleteSignature} disabled={saving} className="text-destructive hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5 mr-1" />Remove
                </Button>
              </div>
            </div>
          </div>
        )}
        <div className="space-y-2">
          <Label className="text-xs font-medium">{existingSignature ? 'Update Signature' : 'Create Signature'}</Label>
          <Tabs value={signatureTab} onValueChange={setSignatureTab}>
            <TabsList className="grid w-full grid-cols-2 max-w-xs">
              <TabsTrigger value="draw">Draw</TabsTrigger>
              <TabsTrigger value="type">Type</TabsTrigger>
            </TabsList>
            <TabsContent value="draw" className="mt-3">
              <SignaturePad onSave={(data) => saveSignature(data, 'drawn')} />
            </TabsContent>
            <TabsContent value="type" className="mt-3">
              <TypeToSign onSave={(text, fontFamily, imageData) => saveSignature(imageData, 'typed', fontFamily)} />
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
};

export default MarksSubmission;
