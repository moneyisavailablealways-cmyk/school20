export interface SubjectRef {
  id: string;
  name: string;
}

/**
 * Keep one entry per subject name (case/blank insensitive), preserving the order
 * the teacher's subject-class assignments arrived in. Blank names are dropped.
 */
export const uniqueSubjects = (subjects: SubjectRef[]): SubjectRef[] =>
  (subjects || []).reduce<SubjectRef[]>((acc, subject) => {
    const name = String(subject?.name ?? '').trim();
    if (!name) return acc;
    return acc.some(existing => existing.name.toLowerCase() === name.toLowerCase())
      ? acc
      : [...acc, { id: subject.id, name }];
  }, []);

/** Split a student's subjects into the badges shown inline and the "+N" overflow. */
export const splitSubjects = (subjects: SubjectRef[], max = 3) => {
  const unique = uniqueSubjects(subjects);
  return { unique, shown: unique.slice(0, max), hidden: Math.max(0, unique.length - max) };
};
