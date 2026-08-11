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

/** Roles a given role is allowed to message within its own school. */
const RECIPIENT_MATRIX: Record<string, PortalRole[]> = {
  admin: ['admin', 'principal', 'head_teacher', 'teacher', 'bursar', 'librarian'],
  principal: ['admin', 'principal', 'head_teacher', 'teacher', 'bursar', 'librarian'],
  head_teacher: ['admin', 'principal', 'head_teacher', 'teacher', 'bursar', 'librarian'],
  teacher: ['admin', 'principal', 'head_teacher', 'teacher', 'bursar', 'librarian'],
  bursar: ['admin', 'principal', 'head_teacher', 'bursar'],
  librarian: ['admin', 'principal', 'head_teacher', 'librarian'],
};

export const getAllowedRecipientRoles = (role?: string | null): PortalRole[] =>
  (role && RECIPIENT_MATRIX[role]) || [];
