-- Create teachers table for additional teacher-specific information
CREATE TABLE public.teachers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    employee_id TEXT UNIQUE,
    specialization TEXT,
    qualification TEXT,
    experience_years INTEGER DEFAULT 0,
    joining_date DATE DEFAULT CURRENT_DATE,
    department TEXT,
    salary NUMERIC,
    is_class_teacher BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create parents table for additional parent-specific information  
CREATE TABLE public.parents (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    occupation TEXT,
    workplace TEXT,
    national_id TEXT UNIQUE,
    address TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    emergency_contact_relationship TEXT,
    preferred_contact_method TEXT DEFAULT 'email',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;

-- RLS policies for teachers table
CREATE POLICY "Admins can manage all teachers" 
ON public.teachers 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'principal', 'head_teacher')
    )
);

CREATE POLICY "Teachers can view their own details" 
ON public.teachers 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() 
        AND id = teachers.profile_id
    )
);

CREATE POLICY "Teachers can update their own details" 
ON public.teachers 
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() 
        AND id = teachers.profile_id
    )
);

-- RLS policies for parents table
CREATE POLICY "Admins can manage all parents" 
ON public.parents 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'principal')
    )
);

CREATE POLICY "Parents can view their own details" 
ON public.parents 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() 
        AND id = parents.profile_id
    )
);

CREATE POLICY "Parents can update their own details" 
ON public.parents 
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() 
        AND id = parents.profile_id
    )
);

-- Add triggers for updated_at columns
CREATE TRIGGER update_teachers_updated_at
    BEFORE UPDATE ON public.teachers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_parents_updated_at
    BEFORE UPDATE ON public.parents
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_teachers_profile_id ON public.teachers(profile_id);
CREATE INDEX idx_teachers_employee_id ON public.teachers(employee_id);
CREATE INDEX idx_parents_profile_id ON public.parents(profile_id);
CREATE INDEX idx_parents_national_id ON public.parents(national_id);