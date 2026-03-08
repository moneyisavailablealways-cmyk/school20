-- Fix user created by Bruno that got wrong school_id
UPDATE public.profiles 
SET school_id = '52526dbc-f9f8-4456-b33b-b0dcfb347c8e'
WHERE id = '7cc8a57f-d489-4044-a2cb-7ff4170ca071';