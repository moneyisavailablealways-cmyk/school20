-- Add unique constraint to student_medical_info table to support upsert operations
ALTER TABLE public.student_medical_info 
ADD CONSTRAINT student_medical_info_student_id_unique UNIQUE (student_id);