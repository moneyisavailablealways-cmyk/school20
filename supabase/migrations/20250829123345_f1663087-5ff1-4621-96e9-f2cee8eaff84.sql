-- Create announcements table for school-wide communications
CREATE TABLE public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  target_audience TEXT[] NOT NULL DEFAULT '{}', -- Array of roles: 'all', 'parents', 'teachers', 'students'
  published_date TIMESTAMPTZ DEFAULT now(),
  expiry_date TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create attendance records table
CREATE TABLE public.attendance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  notes TEXT,
  recorded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, date)
);

-- Create behavior notes table
CREATE TABLE public.behavior_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  note_type TEXT NOT NULL CHECK (note_type IN ('positive', 'neutral', 'negative')),
  category TEXT NOT NULL, -- e.g., 'conduct', 'participation', 'discipline'
  description TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_by UUID REFERENCES profiles(id),
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create report cards table
CREATE TABLE public.report_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES academic_years(id),
  term TEXT NOT NULL,
  overall_grade TEXT,
  overall_percentage DECIMAL(5,2),
  teacher_comments TEXT,
  principal_comments TEXT,
  issued_date DATE DEFAULT CURRENT_DATE,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create appointments table for parent-teacher meetings
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id UUID REFERENCES profiles(id),
  teacher_id UUID REFERENCES profiles(id),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  appointment_date TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  purpose TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
  meeting_type TEXT DEFAULT 'in_person' CHECK (meeting_type IN ('in_person', 'virtual')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create library items table
CREATE TABLE public.library_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT,
  isbn TEXT,
  barcode TEXT UNIQUE,
  item_type TEXT NOT NULL CHECK (item_type IN ('book', 'ebook', 'journal', 'magazine', 'dvd', 'material')),
  category TEXT NOT NULL,
  subject TEXT,
  publisher TEXT,
  publication_year INTEGER,
  edition TEXT,
  language TEXT DEFAULT 'English',
  total_copies INTEGER NOT NULL DEFAULT 1,
  available_copies INTEGER NOT NULL DEFAULT 1,
  location TEXT, -- shelf location
  description TEXT,
  cover_image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create library transactions table for borrowing/returning
CREATE TABLE public.library_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  library_item_id UUID REFERENCES library_items(id) ON DELETE CASCADE,
  borrower_id UUID REFERENCES profiles(id), -- can be student or staff
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('borrow', 'return', 'renew')),
  issue_date TIMESTAMPTZ DEFAULT now(),
  due_date TIMESTAMPTZ NOT NULL,
  return_date TIMESTAMPTZ,
  fine_amount DECIMAL(10,2) DEFAULT 0,
  is_overdue BOOLEAN DEFAULT false,
  notes TEXT,
  processed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create library reservations table
CREATE TABLE public.library_reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  library_item_id UUID REFERENCES library_items(id) ON DELETE CASCADE,
  reserver_id UUID REFERENCES profiles(id),
  reservation_date TIMESTAMPTZ DEFAULT now(),
  expiry_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'fulfilled', 'cancelled', 'expired')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create library fines table
CREATE TABLE public.library_fines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID REFERENCES library_transactions(id),
  borrower_id UUID REFERENCES profiles(id),
  fine_type TEXT NOT NULL CHECK (fine_type IN ('overdue', 'damage', 'lost', 'other')),
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  is_paid BOOLEAN DEFAULT false,
  paid_date TIMESTAMPTZ,
  waived_by UUID REFERENCES profiles(id),
  waived_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavior_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_fines ENABLE ROW LEVEL SECURITY;

-- RLS Policies for announcements
CREATE POLICY "Staff can manage announcements" ON public.announcements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role IN ('admin', 'principal', 'head_teacher', 'teacher')
    )
  );

CREATE POLICY "Parents can view relevant announcements" ON public.announcements
  FOR SELECT USING (
    is_active = true 
    AND (published_date IS NULL OR published_date <= now())
    AND (expiry_date IS NULL OR expiry_date > now())
    AND ('all' = ANY(target_audience) OR 'parents' = ANY(target_audience))
  );

-- RLS Policies for attendance records
CREATE POLICY "Staff can manage attendance" ON public.attendance_records
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role IN ('admin', 'principal', 'head_teacher', 'teacher')
    )
  );

CREATE POLICY "Parents can view their children's attendance" ON public.attendance_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM parent_student_relationships psr
      JOIN profiles p ON p.id = psr.parent_id
      WHERE p.user_id = auth.uid() AND psr.student_id = attendance_records.student_id
    )
  );

-- RLS Policies for behavior notes
CREATE POLICY "Staff can manage behavior notes" ON public.behavior_notes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role IN ('admin', 'principal', 'head_teacher', 'teacher')
    )
  );

CREATE POLICY "Parents can view their children's behavior notes" ON public.behavior_notes
  FOR SELECT USING (
    is_private = false AND
    EXISTS (
      SELECT 1 FROM parent_student_relationships psr
      JOIN profiles p ON p.id = psr.parent_id
      WHERE p.user_id = auth.uid() AND psr.student_id = behavior_notes.student_id
    )
  );

-- RLS Policies for report cards
CREATE POLICY "Staff can manage report cards" ON public.report_cards
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role IN ('admin', 'principal', 'head_teacher', 'teacher')
    )
  );

CREATE POLICY "Parents can view their children's published report cards" ON public.report_cards
  FOR SELECT USING (
    is_published = true AND
    EXISTS (
      SELECT 1 FROM parent_student_relationships psr
      JOIN profiles p ON p.id = psr.parent_id
      WHERE p.user_id = auth.uid() AND psr.student_id = report_cards.student_id
    )
  );

-- RLS Policies for appointments
CREATE POLICY "Parents can manage their appointments" ON public.appointments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.id = appointments.parent_id
    )
  );

CREATE POLICY "Teachers can manage appointments with them" ON public.appointments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.id = appointments.teacher_id
    )
  );

CREATE POLICY "Staff can view all appointments" ON public.appointments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role IN ('admin', 'principal', 'head_teacher')
    )
  );

-- RLS Policies for library items
CREATE POLICY "Everyone can view active library items" ON public.library_items
  FOR SELECT USING (is_active = true);

CREATE POLICY "Librarians can manage library items" ON public.library_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role IN ('admin', 'principal', 'librarian')
    )
  );

-- RLS Policies for library transactions
CREATE POLICY "Librarians can manage all transactions" ON public.library_transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role IN ('admin', 'principal', 'librarian')
    )
  );

CREATE POLICY "Users can view their own transactions" ON public.library_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.id = library_transactions.borrower_id
    )
  );

-- RLS Policies for library reservations
CREATE POLICY "Librarians can manage all reservations" ON public.library_reservations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role IN ('admin', 'principal', 'librarian')
    )
  );

CREATE POLICY "Users can manage their own reservations" ON public.library_reservations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.id = library_reservations.reserver_id
    )
  );

-- RLS Policies for library fines
CREATE POLICY "Librarians can manage all fines" ON public.library_fines
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role IN ('admin', 'principal', 'librarian')
    )
  );

CREATE POLICY "Users can view their own fines" ON public.library_fines
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.id = library_fines.borrower_id
    )
  );

-- Add triggers for updated_at columns
CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_attendance_records_updated_at
  BEFORE UPDATE ON public.attendance_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_behavior_notes_updated_at
  BEFORE UPDATE ON public.behavior_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_report_cards_updated_at
  BEFORE UPDATE ON public.report_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_library_items_updated_at
  BEFORE UPDATE ON public.library_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_library_transactions_updated_at
  BEFORE UPDATE ON public.library_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_library_reservations_updated_at
  BEFORE UPDATE ON public.library_reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_library_fines_updated_at
  BEFORE UPDATE ON public.library_fines
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update library item availability
CREATE OR REPLACE FUNCTION public.update_library_item_availability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- When borrowing, decrease available copies
    IF NEW.transaction_type = 'borrow' THEN
      UPDATE public.library_items 
      SET available_copies = available_copies - 1,
          updated_at = now()
      WHERE id = NEW.library_item_id AND available_copies > 0;
    END IF;
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    -- When returning, increase available copies
    IF OLD.transaction_type = 'borrow' AND NEW.return_date IS NOT NULL AND OLD.return_date IS NULL THEN
      UPDATE public.library_items 
      SET available_copies = available_copies + 1,
          updated_at = now()
      WHERE id = NEW.library_item_id;
    END IF;
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Trigger to update library item availability
CREATE TRIGGER update_library_availability
  AFTER INSERT OR UPDATE ON public.library_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_library_item_availability();