import { describe, test, expect } from 'bun:test';
import { assignmentRows, assignmentExists, duplicateAssignmentMessage, teacherAssignmentError } from './teacherAssignments';

describe('teacher assignment integrity in Primary and Secondary', () => {
  for (const school of ['primary-school', 'secondary-school']) {
    test(`${school}: reject repeated teacher/subject/class combination`, () => {
      expect(() => assignmentRows(school, 'teacher-1', [{subjectId:'math',classIds:['class-1','class-1']}])).toThrow(duplicateAssignmentMessage);
    });
    test(`${school}: allow multiple subjects and classes`, () => {
      expect(assignmentRows(school,'teacher-1',[{subjectId:'math',classIds:['class-1','class-2']},{subjectId:'english',classIds:['class-1']}])).toHaveLength(3);
    });
  }
  test('never match assignments from another school', () => {
    const [candidate] = assignmentRows('primary-school','teacher-1',[{subjectId:'math',classIds:['class-1']}]);
    expect(assignmentExists(assignmentRows('secondary-school','teacher-1',[{subjectId:'math',classIds:['class-1']}]),candidate)).toBe(false);
    expect(assignmentExists([candidate],candidate)).toBe(true);
  });
  test('allow removing all assignments during editing', () => {
    expect(assignmentRows('school','teacher',[])).toEqual([]);
  });
  test('employee constraint conflicts get a specific message', () => {
    expect(teacherAssignmentError({code:'23505',message:'teachers_employee_id_key'})).toContain('another teacher in your school');
  });
});