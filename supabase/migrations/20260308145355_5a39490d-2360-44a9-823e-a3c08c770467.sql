
-- Schedule Friday weekend notifications at 5:00 PM EAT (2:00 PM UTC)
SELECT cron.schedule(
  'friday-weekend-notifications',
  '0 14 * * 5',
  $$
  SELECT
    net.http_post(
      url:='https://lbserxuqjcxmuvucokyc.supabase.co/functions/v1/term-notifications',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxic2VyeHVxamN4bXV2dWNva3ljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMzM4NzksImV4cCI6MjA3MTkwOTg3OX0.PY9UEtmWGwZ1Ec0VEQjsKaA6iH39JPC54pA0yvcOmmo"}'::jsonb,
      body:='{"type": "auto"}'::jsonb
    ) as request_id;
  $$
);

-- Schedule daily term check at 8:00 AM EAT (5:00 AM UTC) for reminders/holiday notifications
SELECT cron.schedule(
  'daily-term-check',
  '0 5 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://lbserxuqjcxmuvucokyc.supabase.co/functions/v1/term-notifications',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxic2VyeHVxamN4bXV2dWNva3ljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMzM4NzksImV4cCI6MjA3MTkwOTg3OX0.PY9UEtmWGwZ1Ec0VEQjsKaA6iH39JPC54pA0yvcOmmo"}'::jsonb,
      body:='{"type": "auto"}'::jsonb
    ) as request_id;
  $$
);
