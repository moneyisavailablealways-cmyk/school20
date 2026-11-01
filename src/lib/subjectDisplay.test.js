import { describe, test, expect } from 'bun:test';
import { uniqueSubjects, splitSubjects } from './subjectDisplay';

describe('Subjects Taught badges (teacher-subject-class assignments)', () => {
  test('removes repeated subject names regardless of letter case or extra spaces', () => {
    expect(uniqueSubjects([
      { id: 's1', name: 'Mathematics' },
      { id: 's2', name: 'mathematics' },
      { id: 's3', name: '  Mathematics ' },
      { id: 's4', name: 'English' },
    ])).toEqual([{ id: 's1', name: 'Mathematics' }, { id: 's4', name: 'English' }]);
  });

  test('keeps distinct subjects in assignment order and drops blank names', () => {
    expect(uniqueSubjects([
      { id: 'a', name: 'Physics' },
      { id: 'b', name: '   ' },
      { id: 'c', name: 'Chemistry' },
      { id: 'd', name: 'Biology' },
    ])).toEqual([{ id: 'a', name: 'Physics' }, { id: 'c', name: 'Chemistry' }, { id: 'd', name: 'Biology' }]);
  });

  test('shows three badges and collapses the rest into a +N count', () => {
    const five = ['Mathematics', 'English', 'Physics', 'Chemistry', 'Biology'].map((name, i) => ({ id: `s${i}`, name }));
    const { shown, hidden, unique } = splitSubjects(five, 3);
    expect(shown.map(s => s.name)).toEqual(['Mathematics', 'English', 'Physics']);
    expect(hidden).toBe(2);
    expect(unique).toHaveLength(5);
  });

  test('a student in a class the teacher teaches one subject for gets one badge and no overflow', () => {
    const { shown, hidden } = splitSubjects([{ id: 'x', name: 'Literature' }, { id: 'x2', name: 'literature' }], 3);
    expect(shown).toEqual([{ id: 'x', name: 'Literature' }]);
    expect(hidden).toBe(0);
  });

  test('a student with no assigned subject renders no badges', () => {
    expect(splitSubjects([], 3)).toEqual({ unique: [], shown: [], hidden: 0 });
  });
});
