-- Clean up the orphaned school registration with typo'd email
-- 1. Delete the profile linked to the bad registration
DELETE FROM public.profiles WHERE user_id = 'e7a09ca2-d62e-4fe0-b00f-2e5ed29907e1';

-- 2. Delete the school record (school code SCHP20)
DELETE FROM public.schools WHERE id = '85e6b2fd-aeae-4253-b9c9-1bde72663433';