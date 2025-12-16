-- Create a test appointment request from a teacher to the bursar
INSERT INTO public.appointment_requests (
  title,
  message,
  appointment_date,
  duration_minutes,
  meeting_type,
  sender_id,
  sender_role,
  status
) VALUES (
  'Budget Discussion Meeting',
  'I would like to discuss the upcoming budget allocation for the Science department.',
  (NOW() + INTERVAL '3 days')::timestamptz,
  30,
  'in_person',
  '728aa949-1b6d-4408-806a-30cfa265dca8', -- Teacher (mails hens)
  'teacher',
  'pending'
);

-- Add the bursar as a recipient
INSERT INTO public.appointment_recipients (
  appointment_id,
  recipient_id,
  recipient_role,
  status
) VALUES (
  (SELECT id FROM public.appointment_requests WHERE title = 'Budget Discussion Meeting' ORDER BY created_at DESC LIMIT 1),
  'c9ac81ac-7012-490b-8321-1808174377d1', -- Bursar (Come2 Nit)
  'bursar',
  'pending'
);