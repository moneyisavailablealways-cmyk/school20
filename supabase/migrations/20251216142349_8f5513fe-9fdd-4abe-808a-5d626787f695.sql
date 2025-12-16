-- Clear existing grading config and insert the exact grade boundaries from image
DELETE FROM public.grading_config;

-- Insert grade boundaries: A (90-100), B (80-89), C (70-79), D (60-69), E (50-59), F (0-49)
INSERT INTO public.grading_config (name, grade, min_marks, max_marks, grade_points, remark, division_contribution, is_active)
VALUES
  ('A', 'A', 90, 100, 1, 'Excellent', 1, true),
  ('B', 'B', 80, 89, 2, 'Very Good', 2, true),
  ('C', 'C', 70, 79, 3, 'Good', 3, true),
  ('D', 'D', 60, 69, 4, 'Satisfactory', 4, true),
  ('E', 'E', 50, 59, 5, 'Pass', 5, true),
  ('F', 'F', 0, 49, 9, 'Fail', 9, true);