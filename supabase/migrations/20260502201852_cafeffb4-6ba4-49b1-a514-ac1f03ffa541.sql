SELECT cron.schedule(
  'send-fee-reminders-weekly',
  '0 8 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://lbserxuqjcxmuvucokyc.supabase.co/functions/v1/send-fee-reminders',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxic2VyeHVxamN4bXV2dWNva3ljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMzM4NzksImV4cCI6MjA3MTkwOTg3OX0.PY9UEtmWGwZ1Ec0VEQjsKaA6iH39JPC54pA0yvcOmmo"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);