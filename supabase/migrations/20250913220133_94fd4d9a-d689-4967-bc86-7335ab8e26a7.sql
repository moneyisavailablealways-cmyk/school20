-- Create levels table with hierarchy support
CREATE TABLE public.levels (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    parent_id uuid REFERENCES public.levels(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS on levels table
ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;

-- Create policies for levels table
CREATE POLICY "Authenticated users can view levels" ON public.levels
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage levels" ON public.levels
    FOR ALL TO authenticated 
    USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'principal')
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'principal')
    ));

-- Rename sections table to streams
ALTER TABLE public.sections RENAME TO streams;

-- Add level_id to classes table and remove the old level field
ALTER TABLE public.classes ADD COLUMN level_id uuid REFERENCES public.levels(id) ON DELETE SET NULL;

-- Update streams table to reference class_id with cascade delete
ALTER TABLE public.streams DROP CONSTRAINT IF EXISTS sections_class_id_fkey;
ALTER TABLE public.streams ADD CONSTRAINT streams_class_id_fkey 
    FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;

-- Update RLS policies for streams (renamed from sections)
DROP POLICY IF EXISTS "Admins can manage sections" ON public.streams;
DROP POLICY IF EXISTS "Teachers can view sections" ON public.streams;

CREATE POLICY "Admins can manage streams" ON public.streams
    FOR ALL TO authenticated 
    USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'principal', 'head_teacher')
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'principal', 'head_teacher')
    ));

CREATE POLICY "Teachers can view streams" ON public.streams
    FOR SELECT TO authenticated 
    USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'principal', 'head_teacher', 'teacher')
    ));

-- Insert some sample levels to get started
INSERT INTO public.levels (name, parent_id) VALUES 
('Nursery', NULL),
('Primary', NULL),
('Secondary', NULL),
('College', NULL),
('University', NULL);

-- Get the Secondary level ID and create O Level and A Level sub-levels
INSERT INTO public.levels (name, parent_id) 
SELECT 'O Level', id FROM public.levels WHERE name = 'Secondary'
UNION ALL
SELECT 'A Level', id FROM public.levels WHERE name = 'Secondary';

-- Update student_enrollments table to reference streams instead of sections
ALTER TABLE public.student_enrollments RENAME COLUMN section_id TO stream_id;

-- Update foreign key constraint
ALTER TABLE public.student_enrollments DROP CONSTRAINT IF EXISTS student_enrollments_section_id_fkey;
ALTER TABLE public.student_enrollments ADD CONSTRAINT student_enrollments_stream_id_fkey 
    FOREIGN KEY (stream_id) REFERENCES public.streams(id) ON DELETE SET NULL;

-- Update teacher_enrollments table if it references sections
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teacher_enrollments' AND column_name = 'section_id') THEN
        ALTER TABLE public.teacher_enrollments RENAME COLUMN section_id TO stream_id;
        ALTER TABLE public.teacher_enrollments DROP CONSTRAINT IF EXISTS teacher_enrollments_section_id_fkey;
        ALTER TABLE public.teacher_enrollments ADD CONSTRAINT teacher_enrollments_stream_id_fkey 
            FOREIGN KEY (stream_id) REFERENCES public.streams(id) ON DELETE SET NULL;
    END IF;
END $$;