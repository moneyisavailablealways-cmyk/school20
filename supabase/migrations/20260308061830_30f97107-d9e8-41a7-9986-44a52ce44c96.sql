
-- Schedule hourly cleanup of expired appointments
SELECT cron.schedule(
  'cleanup-expired-appointments',
  '0 * * * *',
  $$SELECT public.cleanup_expired_appointments()$$
);
