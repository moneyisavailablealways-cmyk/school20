import { supabase } from '@/integrations/supabase/client';

export const duplicateAssignmentMessage = 'This subject is already assigned to this teacher in this class.';
export type SubjectClasses = { subjectId: string; classIds: string[] };
export type AssignmentRow = { school_id: string; teacher_id: string; subject_id: string; class_id: string | null };

export function assignmentRows(schoolId: string, teacherId: string, assignments: SubjectClasses[]): AssignmentRow[] {
  const rows = assignments.flatMap(a => (a.classIds.length ? a.classIds : [null]).map(classId => ({
    school_id: schoolId, teacher_id: teacherId, subject_id: a.subjectId, class_id: classId,
  })));
  const keys = rows.map(r => JSON.stringify([r.school_id, r.teacher_id, r.subject_id, r.class_id]));
  if (new Set(keys).size !== keys.length) throw new Error(duplicateAssignmentMessage);
  return rows;
}

export function assignmentExists(rows: AssignmentRow[], candidate: AssignmentRow): boolean {
  return rows.some(r => r.school_id === candidate.school_id && r.teacher_id === candidate.teacher_id &&
    r.subject_id === candidate.subject_id && r.class_id === candidate.class_id);
}

export function teacherAssignmentError(error: { code?: string; message?: string }): string {
  if (error.code === '23505') {
    if (error.message?.includes('teachers_employee_id_key')) return 'This employee ID belongs to another teacher in your school. Select the existing teacher or use a different employee ID.';
    if (error.message?.includes('teacher_specializations')) return duplicateAssignmentMessage;
  }
  return error.message || 'Unable to save teacher assignments. Please try again.';
}

export async function saveTeacherAssignments(schoolId: string, teacherId: string, assignments: SubjectClasses[], replace = false) {
  const rows = assignmentRows(schoolId, teacherId, assignments);
  if (!replace && rows.length) {
    const { data, error } = await supabase.from('teacher_specializations').select('*')
      .eq('school_id', schoolId).eq('teacher_id', teacherId);
    if (error) throw error;
    if (rows.some(r => assignmentExists(data || [], r))) throw new Error(duplicateAssignmentMessage);
  }
  const { error } = await supabase.rpc('save_teacher_subject_assignments', {
    p_school_id: schoolId, p_teacher_id: teacherId,
    p_assignments: rows.map(r => ({ subject_id: r.subject_id, class_id: r.class_id })), p_replace: replace,
  });
  if (error) throw error;
}