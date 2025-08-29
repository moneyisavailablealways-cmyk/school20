-- Create timetable table for schedule management
CREATE TABLE public.timetables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID REFERENCES public.classes(id),
  subject_id UUID REFERENCES public.subjects(id),
  teacher_id UUID REFERENCES public.profiles(id),
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 7), -- 1=Monday, 7=Sunday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room_number TEXT,
  academic_year_id UUID REFERENCES public.academic_years(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Enable RLS on timetables
ALTER TABLE public.timetables ENABLE ROW LEVEL SECURITY;

-- Create policies for timetables
CREATE POLICY "Head teachers can manage timetables" 
ON public.timetables 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() 
  AND role IN ('admin', 'principal', 'head_teacher')
));

CREATE POLICY "Teachers can view their timetables" 
ON public.timetables 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() 
  AND (role IN ('admin', 'principal', 'head_teacher', 'teacher') OR id = timetables.teacher_id)
));

-- Create trigger for timetables updated_at
CREATE TRIGGER update_timetables_updated_at
BEFORE UPDATE ON public.timetables
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_timetables_class_id ON public.timetables(class_id);
CREATE INDEX idx_timetables_teacher_id ON public.timetables(teacher_id);
CREATE INDEX idx_timetables_day_time ON public.timetables(day_of_week, start_time);