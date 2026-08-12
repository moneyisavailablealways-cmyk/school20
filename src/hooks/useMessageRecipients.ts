import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getAllowedRecipientRoles } from '@/lib/portalPaths';

export interface RecipientPerson {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  email: string;
  /** Class name for students, or the related child's name for parents */
  context?: string;
}

export interface RecipientGroup {
  id: string;
  name: string;
  memberIds: string[];
}

/**
 * Loads the profiles the current user is allowed to start a conversation with.
 * Mirrors the database rules in public.can_message_recipient().
 */
export const useMessageRecipients = (enabled: boolean) => {
  const { profile } = useAuth();
  const [people, setPeople] = useState<RecipientPerson[]>([]);
  const [groups, setGroups] = useState<RecipientGroup[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!enabled || !profile?.id || !profile.school_id) return;
    const roles = getAllowedRecipientRoles(profile.role);
    if (!roles.length) {
      setPeople([]);
      setGroups([]);
      return;
    }
    setLoading(true);
    const schoolId = profile.school_id;

    const { data: profileRows } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, role, email')
      .eq('school_id', schoolId)
      .eq('is_active', true)
      .in('role', roles)
      .neq('id', profile.id)
      .order('first_name');

    let list = ((profileRows || []) as RecipientPerson[]).slice();
    const nextGroups: RecipientGroup[] = [];

    const loadClassStudents = async (classIds: string[]) => {
      if (!classIds.length) return { students: [] as any[], classNames: {} as Record<string, string> };
      const [{ data: students }, { data: classes }] = await Promise.all([
        supabase
          .from('students')
          .select('id, profile_id, current_class_id')
          .eq('school_id', schoolId)
          .in('current_class_id', classIds),
        supabase.from('classes').select('id, name').in('id', classIds),
      ]);
      const classNames: Record<string, string> = {};
      (classes || []).forEach((c: any) => {
        classNames[c.id] = c.name;
      });
      return { students: students || [], classNames };
    };

    if (profile.role === 'teacher') {
      // Classes where the teacher is class teacher, or teaches a subject
      const [{ data: ownClasses }, { data: enrollments }, { data: teacherRow }] = await Promise.all([
        supabase.from('classes').select('id').eq('school_id', schoolId).eq('class_teacher_id', profile.id),
        supabase.from('teacher_enrollments').select('class_id, status').eq('teacher_id', profile.id),
        supabase.from('teachers').select('id').eq('profile_id', profile.id).maybeSingle(),
      ]);

      let specClassIds: string[] = [];
      if (teacherRow?.id) {
        const { data: specs } = await supabase
          .from('teacher_specializations')
          .select('class_id')
          .eq('teacher_id', teacherRow.id);
        specClassIds = (specs || []).map((s: any) => s.class_id).filter(Boolean);
      }

      const classIds = Array.from(
        new Set([
          ...((ownClasses || []).map((c: any) => c.id) as string[]),
          ...((enrollments || [])
            .filter((e: any) => !e.status || e.status === 'active')
            .map((e: any) => e.class_id)
            .filter(Boolean) as string[]),
          ...specClassIds,
        ]),
      );

      const { students, classNames } = await loadClassStudents(classIds);

      const studentProfileIds = new Set(students.map((s: any) => s.profile_id).filter(Boolean));
      const studentIds = students.map((s: any) => s.id);

      let parentIds = new Set<string>();
      const parentChild: Record<string, string[]> = {};
      if (studentIds.length) {
        const { data: rels } = await supabase
          .from('parent_student_relationships')
          .select('parent_id, student_id')
          .in('student_id', studentIds);
        (rels || []).forEach((r: any) => {
          if (!r.parent_id) return;
          parentIds.add(r.parent_id);
          parentChild[r.parent_id] = [...(parentChild[r.parent_id] || []), r.student_id];
        });
      }

      const classOfProfile: Record<string, string> = {};
      students.forEach((s: any) => {
        if (s.profile_id) classOfProfile[s.profile_id] = classNames[s.current_class_id] || '';
      });

      list = list.filter((p) => {
        if (p.role === 'student') return studentProfileIds.has(p.id);
        if (p.role === 'parent') return parentIds.has(p.id);
        return true;
      });
      list = list.map((p) => (p.role === 'student' ? { ...p, context: classOfProfile[p.id] } : p));

      classIds.forEach((cid) => {
        const memberIds = students
          .filter((s: any) => s.current_class_id === cid && s.profile_id && studentProfileIds.has(s.profile_id))
          .map((s: any) => s.profile_id as string);
        if (memberIds.length) nextGroups.push({ id: cid, name: classNames[cid] || 'Class', memberIds });
      });
    }

    if (profile.role === 'student' || profile.role === 'parent') {
      // Resolve the learner rows relevant to this user
      let studentRows: any[] = [];
      if (profile.role === 'student') {
        const { data } = await supabase
          .from('students')
          .select('id, profile_id, current_class_id')
          .eq('school_id', schoolId)
          .eq('profile_id', profile.id);
        studentRows = data || [];
      } else {
        const { data: rels } = await supabase
          .from('parent_student_relationships')
          .select('student_id')
          .eq('parent_id', profile.id);
        const ids = (rels || []).map((r: any) => r.student_id).filter(Boolean);
        if (ids.length) {
          const { data } = await supabase
            .from('students')
            .select('id, profile_id, current_class_id')
            .eq('school_id', schoolId)
            .in('id', ids);
          studentRows = data || [];
        }
      }

      const classIds = Array.from(new Set(studentRows.map((s) => s.current_class_id).filter(Boolean)));

      // Teachers of those classes
      const teacherProfileIds = new Set<string>();
      if (classIds.length) {
        const [{ data: classRows }, { data: enrollments }, { data: specs }] = await Promise.all([
          supabase.from('classes').select('id, class_teacher_id').in('id', classIds),
          supabase.from('teacher_enrollments').select('teacher_id, status').in('class_id', classIds),
          supabase.from('teacher_specializations').select('teacher_id').in('class_id', classIds),
        ]);
        (classRows || []).forEach((c: any) => c.class_teacher_id && teacherProfileIds.add(c.class_teacher_id));
        (enrollments || [])
          .filter((e: any) => !e.status || e.status === 'active')
          .forEach((e: any) => e.teacher_id && teacherProfileIds.add(e.teacher_id));
        const specTeacherIds = (specs || []).map((s: any) => s.teacher_id).filter(Boolean);
        if (specTeacherIds.length) {
          const { data: tRows } = await supabase.from('teachers').select('profile_id').in('id', specTeacherIds);
          (tRows || []).forEach((t: any) => t.profile_id && teacherProfileIds.add(t.profile_id));
        }
      }

      // Linked family members
      const familyIds = new Set<string>();
      const childNameOfParent: Record<string, string[]> = {};
      if (profile.role === 'student') {
        const ids = studentRows.map((s) => s.id);
        if (ids.length) {
          const { data: rels } = await supabase
            .from('parent_student_relationships')
            .select('parent_id')
            .in('student_id', ids);
          (rels || []).forEach((r: any) => r.parent_id && familyIds.add(r.parent_id));
        }
      } else {
        studentRows.forEach((s) => s.profile_id && familyIds.add(s.profile_id));
      }

      list = list.filter((p) => {
        if (p.role === 'teacher') return teacherProfileIds.has(p.id);
        if (p.role === 'student' || p.role === 'parent') return familyIds.has(p.id);
        return true;
      });
      void childNameOfParent;
    }

    setPeople(list);
    setGroups(nextGroups);
    setLoading(false);
  }, [enabled, profile?.id, profile?.role, profile?.school_id]);

  useEffect(() => {
    load();
  }, [load]);

  return { people, groups, loading, reload: load };
};
