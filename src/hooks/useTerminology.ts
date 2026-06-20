import { useMemo } from 'react';
import { useSchoolLevel, type SchoolLevel } from '@/hooks/useSchoolLevel';

export interface Terminology {
  student: string;
  students: string;
  Student: string;
  Students: string;
  studentManagement: string;
  studentAttendance: string;
  totalStudents: string;
  viewStudents: string;
  myStudents: string;
  addStudent: string;
  newStudent: string;
  studentProfile: string;
  studentList: string;
  noStudents: string;
}

const TERMINOLOGY_MAP: Record<SchoolLevel, Terminology> = {
  primary: {
    student: 'learner',
    students: 'learners',
    Student: 'Learner',
    Students: 'Learners',
    studentManagement: 'Learner Management',
    studentAttendance: 'Learner Attendance',
    totalStudents: 'Total Learners',
    viewStudents: 'View Learners',
    myStudents: 'My Learners',
    addStudent: 'Add Learner',
    newStudent: 'New Learner',
    studentProfile: 'Learner Profile',
    studentList: 'Learner List',
    noStudents: 'No learners found',
  },
  secondary: {
    student: 'student',
    students: 'students',
    Student: 'Student',
    Students: 'Students',
    studentManagement: 'Student Management',
    studentAttendance: 'Student Attendance',
    totalStudents: 'Total Students',
    viewStudents: 'View Students',
    myStudents: 'My Students',
    addStudent: 'Add Student',
    newStudent: 'New Student',
    studentProfile: 'Student Profile',
    studentList: 'Student List',
    noStudents: 'No students found',
  },
  higher_institution: {
    student: 'student',
    students: 'students',
    Student: 'Student',
    Students: 'Students',
    studentManagement: 'Student Management',
    studentAttendance: 'Student Attendance',
    totalStudents: 'Total Students',
    viewStudents: 'View Students',
    myStudents: 'My Students',
    addStudent: 'Add Student',
    newStudent: 'New Student',
    studentProfile: 'Student Profile',
    studentList: 'Student List',
    noStudents: 'No students found',
  },
};

/**
 * Centralized terminology helper. Returns the correct learner/student
 * vocabulary based on the logged-in school's level.
 *
 * Usage:
 *   const t = useTerminology();
 *   <h1>{t.studentManagement}</h1>
 */
export const useTerminology = (): Terminology & { isPrimary: boolean; loading: boolean } => {
  const { schoolLevel, loading } = useSchoolLevel();
  return useMemo(() => {
    const level: SchoolLevel = schoolLevel ?? 'secondary';
    return {
      ...TERMINOLOGY_MAP[level],
      isPrimary: level === 'primary',
      loading,
    };
  }, [schoolLevel, loading]);
};

export const getTerminology = (level: SchoolLevel | null | undefined): Terminology => {
  return TERMINOLOGY_MAP[level ?? 'secondary'];
};
