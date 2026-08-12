export type PortalRole =
  | 'admin'
  | 'principal'
  | 'head_teacher'
  | 'teacher'
  | 'bursar'
  | 'librarian'
  | 'student'
  | 'parent'
  | 'super_admin';

const BASE_PATHS: Record<string, string> = {
  admin: '/admin',
  principal: '/principal',
  head_teacher: '/head-teacher',
  teacher: '/teacher',
  bursar: '/bursar',
  librarian: '/librarian',
  student: '/student',
  parent: '/parent',
  super_admin: '/super-admin',
};

export const getPortalBasePath = (role?: string | null) =>
  (role && BASE_PATHS[role]) || '/dashboard';

/** Roles a given role is allowed to start a conversation with, within its own school.
 *  Mirrors public.can_message_recipient() in the database (source of truth). */
const RECIPIENT_MATRIX: Record<string, PortalRole[]> = {
  admin: ['admin', 'principal', 'head_teacher', 'bursar', 'librarian', 'teacher', 'student', 'parent'],
  principal: ['admin', 'principal', 'head_teacher', 'bursar', 'librarian', 'teacher', 'student', 'parent'],
  head_teacher: ['admin', 'principal', 'head_teacher', 'bursar', 'librarian', 'teacher', 'student', 'parent'],
  // Admin receives direct messages only from the Head Teacher; replies stay possible in-thread.
  bursar: ['principal', 'head_teacher', 'bursar', 'librarian', 'teacher', 'student', 'parent'],
  librarian: ['principal', 'head_teacher', 'bursar', 'librarian', 'teacher', 'student', 'parent'],
  teacher: ['principal', 'head_teacher', 'bursar', 'librarian', 'teacher', 'student', 'parent'],
  student: ['principal', 'head_teacher', 'bursar', 'librarian', 'teacher', 'parent'],
  parent: ['principal', 'head_teacher', 'bursar', 'librarian', 'teacher', 'student'],
};

export const getAllowedRecipientRoles = (role?: string | null): PortalRole[] =>
  (role && RECIPIENT_MATRIX[role]) || [];

