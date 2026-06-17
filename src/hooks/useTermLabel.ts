import { useSchoolLevel } from '@/hooks/useSchoolLevel';

/**
 * Returns dynamic terminology for learner vs student based on school level.
 * Primary schools → "Learner / Learners"
 * Secondary (and others) → "Student / Students"
 */
export const useTermLabel = () => {
  const { schoolLevel } = useSchoolLevel();
  const isPrimary = schoolLevel === 'primary';
  return {
    isPrimary,
    singular: isPrimary ? 'Learner' : 'Student',
    plural: isPrimary ? 'Learners' : 'Students',
    singularLower: isPrimary ? 'learner' : 'student',
    pluralLower: isPrimary ? 'learners' : 'students',
  };
};
