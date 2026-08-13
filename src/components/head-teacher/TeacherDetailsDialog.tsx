import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Mail, Phone, GraduationCap, BookOpen, Users, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacherProfileId: string | null;
  teacherName?: string;
  department?: string;
  qualification?: string;
  avatarUrl?: string | null;
}

interface ClassTeacherClass {
  id: string;
  name: string;
  subjectsByTeacher: number;
  totalSubjects: number;
}

interface SubjectGroup {
  classId: string | null;
  className: string;
  subjects: string[];
}

interface Details {
  phone: string | null;
  email: string | null;
  classTeacherOf: ClassTeacherClass[];
  subjectGroups: SubjectGroup[];
  totalSubjects: number;
}

const TeacherDetailsDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  teacherProfileId,
  teacherName,
  department,
  qualification,
  avatarUrl,
}) => {
  const { profile } = useAuth();
  const schoolId = profile?.school_id;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<Details | null>(null);

  useEffect(() => {
    if (!open || !teacherProfileId || !schoolId) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      setDetails(null);

      try {
        const [profileRes, classesRes, specRes, enrollRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('phone, email')
            .eq('id', teacherProfileId)
            .eq('school_id', schoolId)
            .maybeSingle(),
          supabase
            .from('classes')
            .select('id, name')
            .eq('school_id', schoolId)
            .eq('class_teacher_id', teacherProfileId),
          supabase
            .from('teacher_specializations')
            .select('class_id, subject_id')
            .eq('teacher_id', teacherProfileId),
          supabase
            .from('teacher_enrollments')
            .select('class_id, subject_id, status')
            .eq('school_id', schoolId)
            .eq('teacher_id', teacherProfileId),
        ]);

        if (cancelled) return;

        // Assignments belonging to this teacher only
        const assignments: { class_id: string | null; subject_id: string | null }[] = [
          ...(specRes.data || []).map((s) => ({ class_id: s.class_id, subject_id: s.subject_id })),
          ...(enrollRes.data || [])
            .filter((e) => (e.status ?? 'active') === 'active')
            .map((e) => ({ class_id: e.class_id, subject_id: e.subject_id })),
        ].filter((a) => a.subject_id);

        // De-duplicate class+subject pairs
        const pairKeys = new Set<string>();
        const uniquePairs = assignments.filter((a) => {
          const key = `${a.class_id ?? 'none'}::${a.subject_id}`;
          if (pairKeys.has(key)) return false;
          pairKeys.add(key);
          return true;
        });

        const classTeacherClasses = classesRes.data || [];
        const classIds = Array.from(
          new Set([
            ...classTeacherClasses.map((c) => c.id),
            ...uniquePairs.map((p) => p.class_id).filter(Boolean) as string[],
          ])
        );
        const subjectIds = Array.from(new Set(uniquePairs.map((p) => p.subject_id!) as string[]));

        const [classNamesRes, subjectNamesRes, classSubjectsRes, classSubjectsEnrollRes, periodsRes] =
          await Promise.all([
            classIds.length
              ? supabase.from('classes').select('id, name').eq('school_id', schoolId).in('id', classIds)
              : Promise.resolve({ data: [] as { id: string; name: string }[] }),
            subjectIds.length
              ? supabase.from('subjects').select('id, name').eq('school_id', schoolId).in('id', subjectIds)
              : Promise.resolve({ data: [] as { id: string; name: string }[] }),
            classTeacherClasses.length
              ? supabase
                  .from('teacher_specializations')
                  .select('class_id, subject_id')
                  .in('class_id', classTeacherClasses.map((c) => c.id))
              : Promise.resolve({ data: [] as { class_id: string; subject_id: string }[] }),
            classTeacherClasses.length
              ? supabase
                  .from('teacher_enrollments')
                  .select('class_id, subject_id')
                  .eq('school_id', schoolId)
                  .in('class_id', classTeacherClasses.map((c) => c.id))
              : Promise.resolve({ data: [] as { class_id: string; subject_id: string }[] }),
            classTeacherClasses.length
              ? supabase
                  .from('subject_period_config')
                  .select('class_id, subject_id')
                  .eq('school_id', schoolId)
                  .in('class_id', classTeacherClasses.map((c) => c.id))
              : Promise.resolve({ data: [] as { class_id: string; subject_id: string }[] }),
          ]);

        if (cancelled) return;

        const classNameMap = new Map((classNamesRes.data || []).map((c) => [c.id, c.name]));
        const subjectNameMap = new Map((subjectNamesRes.data || []).map((s) => [s.id, s.name]));

        // Total subjects configured per class (any source)
        const totalSubjectsPerClass = new Map<string, Set<string>>();
        [
          ...(classSubjectsRes.data || []),
          ...(classSubjectsEnrollRes.data || []),
          ...(periodsRes.data || []),
        ].forEach((row: { class_id: string | null; subject_id: string | null }) => {
          if (!row.class_id || !row.subject_id) return;
          if (!totalSubjectsPerClass.has(row.class_id)) totalSubjectsPerClass.set(row.class_id, new Set());
          totalSubjectsPerClass.get(row.class_id)!.add(row.subject_id);
        });

        // Group this teacher's subjects by class
        const groupsMap = new Map<string, Set<string>>();
        uniquePairs.forEach((p) => {
          const key = p.class_id ?? 'unassigned';
          if (!groupsMap.has(key)) groupsMap.set(key, new Set());
          groupsMap.get(key)!.add(p.subject_id!);
        });

        const subjectGroups: SubjectGroup[] = Array.from(groupsMap.entries()).map(([classId, subs]) => ({
          classId: classId === 'unassigned' ? null : classId,
          className: classId === 'unassigned' ? 'Not linked to a class' : classNameMap.get(classId) || 'Unknown class',
          subjects: Array.from(subs)
            .map((id) => subjectNameMap.get(id) || 'Unknown subject')
            .sort((a, b) => a.localeCompare(b)),
        }));
        subjectGroups.sort((a, b) => a.className.localeCompare(b.className));

        const classTeacherOf: ClassTeacherClass[] = classTeacherClasses
          .map((c) => ({
            id: c.id,
            name: c.name,
            subjectsByTeacher: groupsMap.get(c.id)?.size || 0,
            totalSubjects: totalSubjectsPerClass.get(c.id)?.size || 0,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

        setDetails({
          phone: profileRes.data?.phone || null,
          email: profileRes.data?.email || null,
          classTeacherOf,
          subjectGroups,
          totalSubjects: subjectIds.length,
        });
      } catch (e) {
        console.error('Error loading teacher details:', e);
        if (!cancelled) setError('Some teacher details could not be loaded.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [open, teacherProfileId, schoolId]);

  const initials = (teacherName || '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Teacher Details</DialogTitle>
          <DialogDescription>Complete supervision information for the selected teacher</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <Avatar className="h-14 w-14 shrink-0">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt={teacherName} /> : null}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h3 className="font-semibold text-lg truncate">{teacherName}</h3>
              <p className="text-sm text-muted-foreground truncate">{department || 'General'}</p>
              {qualification && (
                <Badge variant="outline" className="mt-1">
                  {qualification}
                </Badge>
              )}
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <>
              {error && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              {/* Contact */}
              <Card>
                <CardContent className="p-4 space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <Mail className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <span className="break-all">{details?.email || 'Not provided'}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Phone className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <span className="break-all">{details?.phone?.trim() ? details.phone : 'Not provided'}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Class teacher assignments */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <Users className="h-4 w-4" /> Class Teacher Assignments
                    </h4>
                    <Badge variant="secondary">Total Classes: {details?.classTeacherOf.length || 0}</Badge>
                  </div>
                  {details?.classTeacherOf.length ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {details.classTeacherOf.map((c) => (
                        <div key={c.id} className="rounded-lg border p-3 space-y-1">
                          <p className="font-semibold">{c.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Subjects Taught by Teacher: {c.subjectsByTeacher}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Total Subjects in Class: {c.totalSubjects}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No class teacher assignments</p>
                  )}
                </CardContent>
              </Card>

              {/* Subjects taught */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <BookOpen className="h-4 w-4" /> Subjects Taught
                    </h4>
                    <Badge variant="secondary">Total Subjects: {details?.totalSubjects || 0}</Badge>
                  </div>
                  {details?.subjectGroups.length ? (
                    <div className="space-y-3">
                      {details.subjectGroups.map((g) => (
                        <div key={g.classId ?? 'unassigned'} className="rounded-lg border p-3">
                          <p className="font-semibold text-sm mb-2">{g.className}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {g.subjects.map((s) => (
                              <Badge key={s} variant="outline" className="font-normal">
                                {s}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No subject assignments</p>
                  )}
                </CardContent>
              </Card>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <GraduationCap className="h-3.5 w-3.5" />
                Data shown is scoped to your school only.
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TeacherDetailsDialog;
