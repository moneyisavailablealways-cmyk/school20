-- Create notifications table for library and other events
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- 'info', 'warning', 'error', 'success'
  category TEXT NOT NULL DEFAULT 'general', -- 'library', 'attendance', 'grades', 'announcements', etc.
  reference_id UUID, -- Optional reference to related entity
  reference_type TEXT, -- 'library_transaction', 'attendance_record', etc.
  is_read BOOLEAN DEFAULT false,
  is_email_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- System/Staff can insert notifications
CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Staff can view all notifications for admin purposes
CREATE POLICY "Staff can view all notifications"
ON public.notifications
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.user_id = auth.uid()
  AND profiles.role IN ('admin', 'principal', 'librarian')
));

-- Create index for faster queries
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_category ON public.notifications(category);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Create function to send library notification
CREATE OR REPLACE FUNCTION public.create_library_notification(
  p_borrower_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info',
  p_reference_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_notification_id UUID;
  v_parent_id UUID;
BEGIN
  -- Create notification for the borrower (student)
  INSERT INTO notifications (user_id, title, message, type, category, reference_id, reference_type)
  VALUES (p_borrower_id, p_title, p_message, p_type, 'library', p_reference_id, 'library_transaction')
  RETURNING id INTO v_notification_id;
  
  -- Also notify linked parents
  FOR v_parent_id IN
    SELECT psr.parent_id 
    FROM parent_student_relationships psr
    JOIN students s ON s.id = psr.student_id
    WHERE s.profile_id = p_borrower_id
  LOOP
    INSERT INTO notifications (user_id, title, message, type, category, reference_id, reference_type)
    VALUES (v_parent_id, p_title, p_message, p_type, 'library', p_reference_id, 'library_transaction');
  END LOOP;
  
  RETURN v_notification_id;
END;
$$;

-- Create trigger function for library transactions
CREATE OR REPLACE FUNCTION public.notify_library_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_book_title TEXT;
  v_borrower_name TEXT;
BEGIN
  -- Get book title
  SELECT title INTO v_book_title FROM library_items WHERE id = NEW.library_item_id;
  
  -- Get borrower name
  SELECT first_name || ' ' || last_name INTO v_borrower_name 
  FROM profiles WHERE id = NEW.borrower_id;

  IF TG_OP = 'INSERT' THEN
    -- New borrow transaction
    IF NEW.transaction_type = 'borrow' THEN
      PERFORM create_library_notification(
        NEW.borrower_id,
        'Book Borrowed',
        'You have borrowed "' || v_book_title || '". Due date: ' || to_char(NEW.due_date, 'Mon DD, YYYY'),
        'info',
        NEW.id
      );
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Book returned
    IF NEW.return_date IS NOT NULL AND OLD.return_date IS NULL THEN
      PERFORM create_library_notification(
        NEW.borrower_id,
        'Book Returned',
        'You have returned "' || v_book_title || '". Thank you!',
        'success',
        NEW.id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on library_transactions
DROP TRIGGER IF EXISTS trigger_notify_library_transaction ON library_transactions;
CREATE TRIGGER trigger_notify_library_transaction
AFTER INSERT OR UPDATE ON library_transactions
FOR EACH ROW
EXECUTE FUNCTION notify_library_transaction();