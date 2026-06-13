import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PromoteStudentsDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  schoolId: string;
  schoolLevel: 'primary' | 'secondary' | 'higher_institution' | null;
  onComplete: () => void;
}

interface ClassRow { id: string; name: string; }
interface RowStudent {
  enrollment_id: string;
  student_id: string;
  student_code: string;
  full_name: string;
  gender: string | null;
  stream_name: string | null;
}

// Natural sort: P1 < P2 < P10, Senior 1 < Senior 2, Baby < Middle < Top
const NURSERY_ORDER = ['baby', 'middle', 'top'];
function classWeight(name: string): [number, number, string] {
  const n = name.trim().toLowerCase();
  // Nursery
  for (let i = 0; i < NURSERY_ORDER.length; i++) {
    if (n.startsWith(NURSERY_ORDER[i])) return [0, i, n];
  }
  // P# (primary)
  const pMatch = n.match(/^p\s*(\d+)/);
  if (pMatch) return [1, parseInt(pMatch[1], 10), n];
  // Senior #, S#
  const sMatch = n.match(/^(?:senior|s)\s*(\d+)/);
  if (sMatch) return [2, parseInt(sMatch[1], 10), n];
  // Year #
  const yMatch = n.match(/^year\s*(\d+)/);
  if (yMatch) return [3, parseInt(yMatch[1], 10), n];
  return [9, 0, n];
}
function sortClasses(arr: ClassRow[]): ClassRow[] {
  return [...arr].sort((a, b) => {
    const [ag, an, as] = classWeight(a.name);
    const [bg, bn, bs] = classWeight(b.name);
    if (ag !== bg) return ag - bg;
    if (an !== bn) return an - bn;
    return as.localeCompare(bs);
  });
}
function isCandidate(name: string, level: string | null): boolean {
  const n = name.trim().toLowerCase().replace(/\s+/g, '');
  if (level === 'primary') return n === 'p7';
  if (level === 'secondary') return n === 's4' || n === 's6' || n === 'senior4' || n === 'senior6';
  return false;
}

const PromoteStudentsDialog: React.FC<PromoteStudentsDialogProps> = ({
  open, onOpenChange, schoolId, schoolLevel, onComplete,
}) => {
  const { toast } = useToast();
  const isPrimary = schoolLevel === 'primary';
  const noun = isPrimary ? 'Learner' : 'Student';
  const nounPlural = isPrimary ? 'Learners' : 'Students';

  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [currentClassId, setCurrentClassId] = useState<string>('');
  const [targetClassId, setTargetClassId] = useState<string>('');
  const [students, setStudents] = useState<RowStudent[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const sortedClasses = useMemo(() => sortClasses(classes), [classes]);
  const currentClass = sortedClasses.find(c => c.id === currentClassId) || null;
  const candidate = currentClass ? isCandidate(currentClass.name, schoolLevel) : false;

  const nextClass = useMemo(() => {
    if (!currentClass) return null;
    const idx = sortedClasses.findIndex(c => c.id === currentClass.id);
    if (idx < 0 || idx === sortedClasses.length - 1) return null;
    const next = sortedClasses[idx + 1];
    // Only allow same family (group)
    if (classWeight(next.name)[0] !== classWeight(currentClass.name)[0]) return null;
    return next;
  }, [currentClass, sortedClasses]);

  // Allowed target options: next class (promote) + same class (repeat)
  const targetOptions = useMemo(() => {
    if (!currentClass) return [];
    const opts: { id: string; label: string }[] = [];
    if (nextClass) opts.push({ id: nextClass.id, label: `${nextClass.name} (Promote)` });
    opts.push({ id: currentClass.id, label: `${currentClass.name} (Repeat / Stay)` });
    return opts;
  }, [currentClass, nextClass]);

  // Load classes
  useEffect(() => {
    if (!open || !schoolId) return;
    (async () => {
      setLoadingClasses(true);
      const { data, error } = await supabase
        .from('classes')
        .select('id, name')
        .eq('school_id', schoolId);
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        setClasses(data || []);
      }
      setLoadingClasses(false);
    })();
  }, [open, schoolId, toast]);

  // Auto-select target when current changes
  useEffect(() => {
    if (nextClass) setTargetClassId(nextClass.id);
    else if (currentClass) setTargetClassId(currentClass.id);
    else setTargetClassId('');
  }, [currentClass, nextClass]);

  // Load students for current class
  useEffect(() => {
    if (!currentClassId || !schoolId) {
      setStudents([]);
      setSelected(new Set());
      return;
    }
    (async () => {
      setLoadingStudents(true);
      setSelected(new Set());
      const { data, error } = await supabase
        .from('student_enrollments')
        .select('id, student_id, stream_id, students!inner(id, student_id, gender, profile_id, profiles!inner(first_name, last_name)), streams(name)')
        .eq('school_id', schoolId)
        .eq('class_id', currentClassId)
        .eq('status', 'active');
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        setLoadingStudents(false);
        return;
      }
      const rows: RowStudent[] = (data || []).map((e: any) => ({
        enrollment_id: e.id,
        student_id: e.students?.id,
        student_code: e.students?.student_id || '',
        full_name: `${e.students?.profiles?.first_name || ''} ${e.students?.profiles?.last_name || ''}`.trim(),
        gender: e.students?.gender || null,
        stream_name: e.streams?.name || null,
      }));
      rows.sort((a, b) => a.full_name.localeCompare(b.full_name));
      setStudents(rows);
      setLoadingStudents(false);
    })();
  }, [currentClassId, schoolId, toast]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };
  const toggleAll = () => {
    if (selected.size === students.length) setSelected(new Set());
    else setSelected(new Set(students.map(s => s.enrollment_id)));
  };

  const handleSubmit = async () => {
    if (!targetClassId || selected.size === 0) return;
    setSubmitting(true);
    try {
      const ids = Array.from(selected);
      // If target === current => repeater, no change required, just notify.
      if (targetClassId === currentClassId) {
        toast({ title: `${selected.size} ${nounPlural.toLowerCase()} kept as repeaters` });
      } else {
        const { error } = await supabase
          .from('student_enrollments')
          .update({ class_id: targetClassId, updated_at: new Date().toISOString() })
          .in('id', ids);
        if (error) throw error;
        toast({ title: `Promoted ${selected.size} ${nounPlural.toLowerCase()}` });
      }
      setSelected(new Set());
      onComplete();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Promotion failed', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStudent = async (studentId: string, name: string) => {
    if (!confirm(`Remove ${name} from the school? This cannot be undone.`)) return;
    try {
      const { error } = await supabase.from('students').delete().eq('id', studentId);
      if (error) throw error;
      toast({ title: `${noun} removed` });
      setStudents(prev => prev.filter(s => s.student_id !== studentId));
    } catch (err: any) {
      toast({ title: 'Delete failed', description: err.message, variant: 'destructive' });
    }
  };

  const allSelected = students.length > 0 && selected.size === students.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Promote {nounPlural} to a Class</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Current Class</label>
            <Select value={currentClassId} onValueChange={setCurrentClassId} disabled={loadingClasses}>
              <SelectTrigger><SelectValue placeholder="Select current class" /></SelectTrigger>
              <SelectContent>
                {sortedClasses.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Target Class</label>
            <Select value={targetClassId} onValueChange={setTargetClassId} disabled={!currentClassId || targetOptions.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder={currentClassId ? 'Select target class' : 'Pick current class first'} />
              </SelectTrigger>
              <SelectContent>
                {targetOptions.map(o => (
                  <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {currentClassId && !nextClass && (
              <p className="text-xs text-muted-foreground">
                {candidate
                  ? 'Candidate class — no next class. Use Delete to remove finishers, or keep as repeaters.'
                  : 'No higher class available. Only repeating is allowed.'}
              </p>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto border rounded-md mt-2">
          {!currentClassId ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Select a class to view {nounPlural.toLowerCase()}.</div>
          ) : loadingStudents ? (
            <div className="p-8 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
          ) : students.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No {nounPlural.toLowerCase()} found in this class.</div>
          ) : (
            <>
              <div className="flex items-center gap-3 px-4 py-2 border-b bg-muted/40 sticky top-0">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} id="select-all" />
                <label htmlFor="select-all" className="text-sm font-medium flex-1">Select all</label>
                <span className="text-xs text-muted-foreground">{selected.size} selected</span>
              </div>
              {students.map(s => (
                <div key={s.enrollment_id} className="flex items-center gap-3 px-4 py-2 border-b last:border-b-0 hover:bg-muted/30">
                  <Checkbox
                    checked={selected.has(s.enrollment_id)}
                    onCheckedChange={() => toggle(s.enrollment_id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{s.full_name || 'Unnamed'}</div>
                    <div className="text-xs text-muted-foreground">
                      #{s.student_code}{s.gender ? ` • ${s.gender.toUpperCase()}` : ''}
                    </div>
                  </div>
                  {s.stream_name && <Badge variant="secondary">{s.stream_name}</Badge>}
                  {candidate && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteStudent(s.student_id, s.full_name)}
                      title={`Remove ${noun.toLowerCase()}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || selected.size === 0 || !targetClassId}
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {targetClassId === currentClassId && targetClassId
              ? `Keep ${selected.size} as Repeater${selected.size === 1 ? '' : 's'}`
              : `Promote ${selected.size} ${selected.size === 1 ? noun : nounPlural}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PromoteStudentsDialog;
