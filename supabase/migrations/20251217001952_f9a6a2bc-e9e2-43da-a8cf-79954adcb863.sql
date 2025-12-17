-- Add queue management columns to library_reservations
ALTER TABLE public.library_reservations 
ADD COLUMN IF NOT EXISTS queue_position integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS hold_until timestamp with time zone,
ADD COLUMN IF NOT EXISTS notified_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS fulfilled_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS cancelled_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS cancel_reason text;

-- Add waiting status to represent queue position
-- Update status column comments: active, waiting, ready, fulfilled, expired, cancelled

-- Create index for queue ordering
CREATE INDEX IF NOT EXISTS idx_library_reservations_queue 
ON public.library_reservations(library_item_id, queue_position) 
WHERE status IN ('active', 'waiting', 'ready');

-- Create function to get next queue position for a book
CREATE OR REPLACE FUNCTION public.get_next_queue_position(p_library_item_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT MAX(queue_position) + 1 
     FROM library_reservations 
     WHERE library_item_id = p_library_item_id 
     AND status IN ('active', 'waiting', 'ready')),
    1
  );
END;
$$;

-- Create function to create a reservation with proper queue handling
CREATE OR REPLACE FUNCTION public.create_library_reservation(
  p_library_item_id uuid,
  p_reserver_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item record;
  v_existing_reservation record;
  v_queue_position integer;
  v_status text;
  v_expiry_date timestamp with time zone;
  v_reservation_id uuid;
BEGIN
  -- Check if item exists
  SELECT * INTO v_item FROM library_items WHERE id = p_library_item_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Library item not found or inactive');
  END IF;
  
  -- Check for existing active reservation by this user for this book
  SELECT * INTO v_existing_reservation 
  FROM library_reservations 
  WHERE library_item_id = p_library_item_id 
  AND reserver_id = p_reserver_id 
  AND status IN ('active', 'waiting', 'ready');
  
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already have an active reservation for this book');
  END IF;
  
  -- Only allow reservations when book is unavailable
  IF v_item.available_copies > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Book is currently available. Please borrow directly instead of reserving.');
  END IF;
  
  -- Get queue position
  v_queue_position := get_next_queue_position(p_library_item_id);
  
  -- Set status based on queue position
  v_status := 'waiting';
  
  -- Set expiry date (30 days from now for waiting reservations)
  v_expiry_date := now() + interval '30 days';
  
  -- Insert reservation
  INSERT INTO library_reservations (
    library_item_id,
    reserver_id,
    queue_position,
    status,
    expiry_date,
    notes,
    reservation_date
  ) VALUES (
    p_library_item_id,
    p_reserver_id,
    v_queue_position,
    v_status,
    v_expiry_date,
    p_notes,
    now()
  )
  RETURNING id INTO v_reservation_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'reservation_id', v_reservation_id,
    'queue_position', v_queue_position,
    'message', 'Reservation created. You are #' || v_queue_position || ' in the queue.'
  );
END;
$$;

-- Create function to fulfill a reservation
CREATE OR REPLACE FUNCTION public.fulfill_library_reservation(
  p_reservation_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reservation record;
BEGIN
  -- Get reservation
  SELECT * INTO v_reservation FROM library_reservations WHERE id = p_reservation_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reservation not found');
  END IF;
  
  IF v_reservation.status NOT IN ('active', 'waiting', 'ready') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reservation cannot be fulfilled - status is ' || v_reservation.status);
  END IF;
  
  -- Update reservation
  UPDATE library_reservations 
  SET status = 'fulfilled',
      fulfilled_at = now(),
      updated_at = now()
  WHERE id = p_reservation_id;
  
  -- Reorder queue for this book
  PERFORM reorder_reservation_queue(v_reservation.library_item_id);
  
  RETURN jsonb_build_object('success', true, 'message', 'Reservation fulfilled successfully');
END;
$$;

-- Create function to cancel a reservation
CREATE OR REPLACE FUNCTION public.cancel_library_reservation(
  p_reservation_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reservation record;
BEGIN
  -- Get reservation
  SELECT * INTO v_reservation FROM library_reservations WHERE id = p_reservation_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reservation not found');
  END IF;
  
  IF v_reservation.status NOT IN ('active', 'waiting', 'ready') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reservation cannot be cancelled - already ' || v_reservation.status);
  END IF;
  
  -- Update reservation
  UPDATE library_reservations 
  SET status = 'cancelled',
      cancelled_at = now(),
      cancel_reason = p_reason,
      updated_at = now()
  WHERE id = p_reservation_id;
  
  -- Reorder queue for this book
  PERFORM reorder_reservation_queue(v_reservation.library_item_id);
  
  RETURN jsonb_build_object('success', true, 'message', 'Reservation cancelled');
END;
$$;

-- Create function to reorder queue positions after changes
CREATE OR REPLACE FUNCTION public.reorder_reservation_queue(p_library_item_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reservation record;
  v_new_position integer := 1;
BEGIN
  FOR v_reservation IN 
    SELECT id 
    FROM library_reservations 
    WHERE library_item_id = p_library_item_id 
    AND status IN ('active', 'waiting', 'ready')
    ORDER BY queue_position, reservation_date
  LOOP
    UPDATE library_reservations 
    SET queue_position = v_new_position 
    WHERE id = v_reservation.id;
    v_new_position := v_new_position + 1;
  END LOOP;
END;
$$;

-- Create function to notify next person in queue when book becomes available
CREATE OR REPLACE FUNCTION public.process_reservation_queue_on_return()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_reservation record;
BEGIN
  -- Only process when a book is returned
  IF NEW.return_date IS NOT NULL AND OLD.return_date IS NULL THEN
    -- Find the first person in queue for this book
    SELECT * INTO v_next_reservation
    FROM library_reservations
    WHERE library_item_id = NEW.library_item_id
    AND status IN ('waiting', 'active')
    ORDER BY queue_position
    LIMIT 1;
    
    IF FOUND THEN
      -- Update their reservation to ready status with 48 hour hold
      UPDATE library_reservations
      SET status = 'ready',
          hold_until = now() + interval '48 hours',
          notified_at = now(),
          updated_at = now()
      WHERE id = v_next_reservation.id;
      
      -- Create notification for the student
      PERFORM create_library_notification(
        v_next_reservation.reserver_id,
        'Book Available for Pickup',
        'A book you reserved is now available! Please collect it within 48 hours.',
        'info',
        v_next_reservation.id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for book return queue processing
DROP TRIGGER IF EXISTS trg_process_reservation_queue ON library_transactions;
CREATE TRIGGER trg_process_reservation_queue
AFTER UPDATE ON library_transactions
FOR EACH ROW
EXECUTE FUNCTION process_reservation_queue_on_return();

-- Create function to expire overdue reservations
CREATE OR REPLACE FUNCTION public.expire_overdue_reservations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expired_count integer := 0;
  v_reservation record;
BEGIN
  -- Expire reservations that have passed their hold_until time
  FOR v_reservation IN
    SELECT * FROM library_reservations
    WHERE status = 'ready'
    AND hold_until < now()
  LOOP
    -- Mark as expired
    UPDATE library_reservations
    SET status = 'expired',
        updated_at = now()
    WHERE id = v_reservation.id;
    
    v_expired_count := v_expired_count + 1;
    
    -- Notify student that reservation expired
    PERFORM create_library_notification(
      v_reservation.reserver_id,
      'Reservation Expired',
      'Your book reservation has expired because it was not collected within the hold period.',
      'warning',
      v_reservation.id
    );
    
    -- Reorder queue and notify next person
    PERFORM reorder_reservation_queue(v_reservation.library_item_id);
    
    -- Check if there's a next person in queue
    PERFORM notify_next_in_queue(v_reservation.library_item_id);
  END LOOP;
  
  -- Also expire waiting reservations that have passed their general expiry
  FOR v_reservation IN
    SELECT * FROM library_reservations
    WHERE status IN ('waiting', 'active')
    AND expiry_date < now()
  LOOP
    UPDATE library_reservations
    SET status = 'expired',
        updated_at = now()
    WHERE id = v_reservation.id;
    
    v_expired_count := v_expired_count + 1;
    
    PERFORM create_library_notification(
      v_reservation.reserver_id,
      'Reservation Expired',
      'Your book reservation has expired. Please create a new reservation if you still need this book.',
      'warning',
      v_reservation.id
    );
    
    PERFORM reorder_reservation_queue(v_reservation.library_item_id);
  END LOOP;
  
  RETURN v_expired_count;
END;
$$;

-- Create function to notify next person in queue
CREATE OR REPLACE FUNCTION public.notify_next_in_queue(p_library_item_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item record;
  v_next_reservation record;
BEGIN
  -- Check if book is available
  SELECT * INTO v_item FROM library_items WHERE id = p_library_item_id;
  IF NOT FOUND OR v_item.available_copies = 0 THEN
    RETURN;
  END IF;
  
  -- Find next person waiting
  SELECT * INTO v_next_reservation
  FROM library_reservations
  WHERE library_item_id = p_library_item_id
  AND status = 'waiting'
  ORDER BY queue_position
  LIMIT 1;
  
  IF FOUND THEN
    -- Update to ready status
    UPDATE library_reservations
    SET status = 'ready',
        hold_until = now() + interval '48 hours',
        notified_at = now(),
        updated_at = now()
    WHERE id = v_next_reservation.id;
    
    -- Create notification
    PERFORM create_library_notification(
      v_next_reservation.reserver_id,
      'Book Available for Pickup',
      'A book you reserved is now available! Please collect it within 48 hours.',
      'info',
      v_next_reservation.id
    );
  END IF;
END;
$$;