import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

Deno.test('teacher creation rejects unauthenticated requests before making changes', async () => {
  const response = await fetch('https://lbserxuqjcxmuvucokyc.supabase.co/functions/v1/create-user', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
  });
  await response.text();
  assertEquals(response.status, 401);
});