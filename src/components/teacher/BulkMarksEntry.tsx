import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Save, Loader2, Table as TableIcon } from 'lucide-react';

type SectionKey = 'bot' | 'mot' | 'eot';

interface BulkMarksEntryProps {
  /** Restrict the assessment section selector. Defaults to all three. */
  defaultSection?: SectionKey;
}

interface StudentRow {
  id: string;
  name: string;
  admissionNo: string;
}

interface Submission {
  id?: string;
  marks: string;
  grade: string;
  status?: string;
}

const SECTION_LABEL: Record<SectionKey, string> = {
  bot: 'Beginning of Term (BOT)',
  mot: 'Mid Term (MOT)',
  eot: 'End of Term (EOT)',
};

const buildDbTerm = (term: string, section: SectionKey) =>
  section === 'eot' ? term : `${term} ${section.toUpperCase()}`;

const BulkMarksEntry = ({ defaultSection = 'eot' }: BulkMarksEntryProps) => {
  const { profile } = useAuth();
  const [classId, setClassId] = useState('');
  const [term, setTerm] = useState('Term 1');
  const [section, setSection] = useState<SectionKey>(defaultSection);
  const [saving, setSaving] = useState(false);
  // grid[studentId][subjectId] = Submission
  const [grid, setGrid] = useState<Record<string, Record<string, Submission>>>({});
  const gridRef = useRef(grid);
  gridRef.current = grid;

  // Teacher record
  const { data: teacherRecord } = useQuery({
    queryKey: ['bulk-teacher-record', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;
      const { data } = await supabase.from('teachers').select('id').eq('profile_id', profile.id).maybeSingle();
      return data;
    },
    enabled: !!profile?.id,
  });

  // Classes (assigned to this teacher OR class-teacher of)
  const { data: classes } = useQuery({
    queryKey: ['bulk-teacher-classes', profile?.id, teacherRecord?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const ids = new Set<string>();
      const [{ data: ct }, { data: sp }] = await Promise.all([
        supabase.from('classes').select('id').eq('class_teacher_id', profile.id),
        teacherRecord?.id
          ? supabase.from('teacher_specializations').select('class_id').eq('teacher_id', teacherRecord.id).not('class_id', 'is', null)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      (ct || []).forEach((c: any) => ids.add(c.id));
      (sp || []).forEach((s: any) => s.class_id && ids.add(s.class_id));
      if (!ids.size) return [];
      const { data } = await supabase.from('classes').select('id, name').in('id', Array.from(ids)).order('name');
      return data || [];
    },
    enabled: !!profile?.id,
  });

  // Subjects taught by this teacher in selected class
  const { data: subjects } = useQuery({
    queryKey: ['bulk-subjects', teacherRecord?.id, classId],
    queryFn: async () => {
      if (!teacherRecord?.id || !classId) return [];
      const { data: specs } = await supabase
        .from('teacher_specializations')
        .select('subject_id')
        .eq('teacher_id', teacherRecord.id)
        .eq('class_id', classId)
        .not('subject_id', 'is', null);
      const ids = Array.from(new Set((specs || []).map((s: any) => s.subject_id).filter(Boolean)));
      if (!ids.length) return [];
      const { data } = await supabase.from('subjects').select('id, name, code').eq('is_active', true).in('id', ids).order('name');
      return data || [];
    },
    enabled: !!teacherRecord?.id && !!classId,
  });

  const { data: currentYear } = useQuery({
    queryKey: ['bulk-current-year'],
    queryFn: async () => {
      const { data } = await supabase.from('academic_years').select('id').eq('is_current', true).limit(1);
      return data?.[0] || null;
    },
  });

  const { data: gradingConfig } = useQuery({
    queryKey: ['bulk-grading-config'],
    queryFn: async () => {
      const { data } = await supabase.from('grading_config').select('*').eq('is_active', true).order('min_marks', { ascending: false });
      return data || [];
    },
  });

  const { data: students } = useQuery<StudentRow[]>({
    queryKey: ['bulk-students', classId, currentYear?.id],
    queryFn: async () => {
      if (!classId || !currentYear?.id) return [];
      const { data: enrollments } = await supabase
        .from('student_enrollments')
        .select('student_id')
        .eq('class_id', classId)
        .eq('status', 'active')
        .or(`academic_year_id.eq.${currentYear.id},academic_year_id.is.null`);
      const sids = (enrollments || []).map(e => e.student_id);
      if (!sids.length) return [];
      const { data: sd } = await supabase.from('students').select('id, student_id, profile_id').in('id', sids);
      const pids = (sd || []).map(s => s.profile_id).filter(Boolean);
      const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name').in('id', pids);
      const pmap = new Map((profiles || []).map(p => [p.id, p]));
      return (sd || [])
        .map(s => {
          const p = pmap.get(s.profile_id);
          return {
            id: s.id,
            admissionNo: s.student_id || '',
            name: `${p?.first_name || ''} ${p?.last_name || ''}`.trim() || 'Unknown',
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
    },
    enabled: !!classId && !!currentYear?.id,
  });

  const calculateGrade = useCallback(
    (m: number | null) => {
      if (m === null || !gradingConfig?.length) return '';
      return gradingConfig.find(g => m >= g.min_marks && m <= g.max_marks)?.grade || '';
    },
    [gradingConfig]
  );

  // Load existing submissions whenever class/term/section/year changes
  useEffect(() => {
    const load = async () => {
      if (!classId || !currentYear?.id || !students?.length || !subjects?.length) {
        setGrid({});
        return;
      }
      const dbTerm = buildDbTerm(term, section);
      const studentIds = students.map(s => s.id);
      const subjectIds = subjects.map(s => s.id);
      const { data } = await supabase
        .from('subject_submissions')
        .select('id, student_id, subject_id, marks, grade, status')
        .in('student_id', studentIds)
        .in('subject_id', subjectIds)
        .eq('academic_year_id', currentYear.id)
        .eq('term', dbTerm);

      const next: Record<string, Record<string, Submission>> = {};
      students.forEach(s => {
        next[s.id] = {};
        subjects.forEach(sub => {
          next[s.id][sub.id] = { marks: '', grade: '', status: undefined };
        });
      });
      (data || []).forEach((row: any) => {
        if (!next[row.student_id]) next[row.student_id] = {};
        next[row.student_id][row.subject_id] = {
          id: row.id,
          marks: row.marks?.toString() ?? '',
          grade: row.grade || '',
          status: row.status,
        };
      });
      setGrid(next);
    };
    load();
  }, [classId, currentYear?.id, term, section, students, subjects]);

  const updateCell = (sid: string, subId: string, marks: string) => {
    setGrid(prev => {
      const row = prev[sid] || {};
      const cell = row[subId] || { marks: '', grade: '' };
      const n = marks === '' ? null : parseFloat(marks);
      const valid = n === null || (!isNaN(n) && n >= 0 && n <= 100);
      const grade = n === null || isNaN(n) ? '' : calculateGrade(n);
      return {
        ...prev,
        [sid]: { ...row, [subId]: { ...cell, marks: valid ? marks : cell.marks, grade } },
      };
    });
  };

  // Keyboard navigation: Enter / arrows move between inputs
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rIdx: number, cIdx: number) => {
    const move = (dr: number, dc: number) => {
      const target = document.querySelector<HTMLInputElement>(
        `input[data-r="${rIdx + dr}"][data-c="${cIdx + dc}"]`
      );
      if (target) {
        e.preventDefault();
        target.focus();
        target.select();
      }
    };
    if (e.key === 'Enter' || e.key === 'ArrowDown') move(1, 0);
    else if (e.key === 'ArrowUp') move(-1, 0);
    else if (e.key === 'ArrowRight' && (e.currentTarget.selectionStart ?? 0) === e.currentTarget.value.length) move(0, 1);
    else if (e.key === 'ArrowLeft' && (e.currentTarget.selectionStart ?? 0) === 0) move(0, -1);
  };

  const totals = useMemo(() => {
    const map: Record<string, { total: number; avg: number; count: number }> = {};
    if (!students || !subjects) return map;
    students.forEach(s => {
      let total = 0, count = 0;
      subjects.forEach(sub => {
        const v = parseFloat(grid[s.id]?.[sub.id]?.marks || '');
        if (!isNaN(v)) { total += v; count++; }
      });
      map[s.id] = { total, count, avg: count ? total / count : 0 };
    });
    return map;
  }, [grid, students, subjects]);

  const handleSaveAll = async (statusToSave: 'draft' | 'pending') => {
    if (!profile?.id || !currentYear?.id || !classId) return;
    setSaving(true);
    const dbTerm = buildDbTerm(term, section);
    const initials = `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase();

    const inserts: any[] = [];
    const updates: { id: string; payload: any }[] = [];
    let errors = 0;

    (students || []).forEach(s => {
      (subjects || []).forEach(sub => {
        const cell = grid[s.id]?.[sub.id];
        if (!cell) return;
        if (cell.status === 'approved') return; // never overwrite approved
        const raw = cell.marks.trim();
        if (raw === '') return;
        const n = parseFloat(raw);
        if (isNaN(n) || n < 0 || n > 100) { errors++; return; }
        const payload: any = {
          student_id: s.id,
          subject_id: sub.id,
          academic_year_id: currentYear.id,
          school_id: profile.school_id,
          term: dbTerm,
          marks: n,
          grade: cell.grade || calculateGrade(n) || null,
          teacher_initials: initials,
          submitted_by: profile.id,
          status: statusToSave,
          ...(statusToSave === 'pending' ? { submitted_at: new Date().toISOString() } : {}),
        };
        if (cell.id) updates.push({ id: cell.id, payload });
        else inserts.push(payload);
      });
    });

    if (errors) toast.warning(`${errors} invalid mark(s) skipped (must be 0–100).`);

    try {
      let savedCount = 0;
      if (inserts.length) {
        const { data, error } = await supabase.from('subject_submissions').insert(inserts).select('id, student_id, subject_id');
        if (error) throw error;
        savedCount += data?.length || 0;
        // patch ids back into grid
        setGrid(prev => {
          const next = { ...prev };
          (data || []).forEach((row: any) => {
            if (next[row.student_id]?.[row.subject_id]) {
              next[row.student_id][row.subject_id] = {
                ...next[row.student_id][row.subject_id],
                id: row.id,
                status: statusToSave,
              };
            }
          });
          return next;
        });
      }
      for (const u of updates) {
        const { error } = await supabase.from('subject_submissions').update(u.payload).eq('id', u.id);
        if (error) throw error;
        savedCount++;
      }
      // patch update statuses
      setGrid(prev => {
        const next = { ...prev };
        updates.forEach(u => {
          for (const sid of Object.keys(next)) {
            for (const subId of Object.keys(next[sid])) {
              if (next[sid][subId].id === u.id) {
                next[sid][subId] = { ...next[sid][subId], status: statusToSave };
              }
            }
          }
        });
        return next;
      });

      if (statusToSave === 'pending' && savedCount > 0 && profile.school_id) {
        try {
          const { data: admins } = await supabase
            .from('profiles')
            .select('id')
            .eq('school_id', profile.school_id)
            .in('role', ['admin', 'principal', 'head_teacher'])
            .eq('is_active', true);
          if (admins?.length) {
            const teacherName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
            await supabase.from('notifications').insert(
              admins.map(a => ({
                user_id: a.id,
                title: '📝 Bulk Marks Submission',
                message: `${teacherName} submitted ${SECTION_LABEL[section]} bulk marks for ${term} (${savedCount} entries).`,
                type: 'info',
                category: 'marks_submission',
                school_id: profile.school_id,
              }))
            );
          }
        } catch {}
      }

      toast.success(
        statusToSave === 'pending'
          ? `Submitted ${savedCount} mark${savedCount === 1 ? '' : 's'} for approval`
          : `Saved ${savedCount} mark${savedCount === 1 ? '' : 's'} as draft`
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to save marks');
    } finally {
      setSaving(false);
    }
  };

  const hasGrid = (students?.length || 0) > 0 && (subjects?.length || 0) > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TableIcon className="h-5 w-5" />
          Bulk Marks Entry (Spreadsheet Mode)
        </CardTitle>
        <CardDescription>
          Enter marks for the whole class at once. Use <kbd className="px-1 border rounded">Enter</kbd> or arrow keys to navigate. Grades auto-calculate.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Class</Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
              <SelectContent>
                {classes?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Term</Label>
            <Select value={term} onValueChange={setTerm}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Term 1">Term 1</SelectItem>
                <SelectItem value="Term 2">Term 2</SelectItem>
                <SelectItem value="Term 3">Term 3</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Assessment</Label>
            <Select value={section} onValueChange={(v) => setSection(v as SectionKey)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bot">Beginning of Term (BOT)</SelectItem>
                <SelectItem value="mot">Mid Term (MOT)</SelectItem>
                <SelectItem value="eot">End of Term (EOT)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {!classId && (
          <div className="text-sm text-muted-foreground border rounded p-4 text-center">
            Select a class to load the marks grid.
          </div>
        )}

        {classId && !hasGrid && (
          <div className="text-sm text-muted-foreground border rounded p-4 text-center">
            {(!subjects || !subjects.length)
              ? 'No subjects assigned to you for this class.'
              : 'No active students enrolled in this class.'}
          </div>
        )}

        {hasGrid && (
          <>
            <div className="overflow-auto border rounded">
              <table className="w-full text-xs border-collapse">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="border px-2 py-1.5 text-left sticky left-0 bg-muted z-10 min-w-[180px]">Student</th>
                    {subjects!.map(sub => (
                      <th key={sub.id} className="border px-2 py-1.5 text-center min-w-[70px]" title={sub.name}>
                        {sub.code || sub.name.slice(0, 6).toUpperCase()}
                      </th>
                    ))}
                    <th className="border px-2 py-1.5 text-center min-w-[60px]">Total</th>
                    <th className="border px-2 py-1.5 text-center min-w-[60px]">Avg</th>
                  </tr>
                </thead>
                <tbody>
                  {students!.map((s, rIdx) => {
                    const t = totals[s.id];
                    return (
                      <tr key={s.id} className="hover:bg-muted/30">
                        <td className="border px-2 py-1 sticky left-0 bg-card z-10">
                          <div className="font-medium">{s.name}</div>
                          {s.admissionNo && <div className="text-[10px] text-muted-foreground">{s.admissionNo}</div>}
                        </td>
                        {subjects!.map((sub, cIdx) => {
                          const cell = grid[s.id]?.[sub.id] || { marks: '', grade: '' };
                          const isApproved = cell.status === 'approved';
                          const isPending = cell.status === 'pending';
                          return (
                            <td key={sub.id} className="border p-0 align-top">
                              <Input
                                data-r={rIdx}
                                data-c={cIdx}
                                value={cell.marks}
                                disabled={isApproved}
                                onChange={(e) => updateCell(s.id, sub.id, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, rIdx, cIdx)}
                                onFocus={(e) => e.currentTarget.select()}
                                className={`h-8 rounded-none border-0 text-center text-xs px-1 ${
                                  isApproved ? 'bg-green-50 text-green-900 font-semibold' :
                                  isPending ? 'bg-yellow-50' : ''
                                }`}
                                inputMode="decimal"
                                placeholder="—"
                              />
                              {cell.grade && (
                                <div className="text-[9px] text-center text-muted-foreground pb-0.5">{cell.grade}</div>
                              )}
                            </td>
                          );
                        })}
                        <td className="border px-2 py-1 text-center font-semibold">
                          {t?.count ? Math.round(t.total) : '—'}
                        </td>
                        <td className="border px-2 py-1 text-center font-semibold">
                          {t?.count ? t.avg.toFixed(1) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Badge variant="outline" className="bg-green-50">Approved</Badge>
                <Badge variant="outline" className="bg-yellow-50">Pending</Badge>
                <span>Approved cells are locked.</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={saving} onClick={() => handleSaveAll('draft')}>
                  {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                  Save Draft
                </Button>
                <Button size="sm" disabled={saving} onClick={() => handleSaveAll('pending')}>
                  {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                  Submit for Approval
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default BulkMarksEntry;
