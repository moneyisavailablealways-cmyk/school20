// Single source of truth for gender values.
// Must match the database CHECK constraint: students_gender_check -> ('male','female')
export const GENDER_VALUES = ['male', 'female'] as const;

export type Gender = (typeof GENDER_VALUES)[number];

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

/** Normalizes any user/legacy input to a DB-allowed value, or null when empty/invalid. */
export const normalizeGender = (value?: string | null): Gender | null => {
  const v = (value ?? '').trim().toLowerCase();
  if (!v) return null;
  if (['m', 'male', 'boy'].includes(v)) return 'male';
  if (['f', 'female', 'girl'].includes(v)) return 'female';
  return null;
};

export const isValidGender = (value?: string | null): boolean =>
  !value || normalizeGender(value) !== null;

export const GENDER_ERROR_MESSAGE = 'Please select a valid gender (Male or Female).';
