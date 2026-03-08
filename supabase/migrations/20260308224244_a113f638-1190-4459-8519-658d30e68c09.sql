INSERT INTO public.report_templates (name, description, template_type, is_default, school_id)
SELECT 
  'Primary School Template',
  'Standard primary school report card with Beginning of Term, Mid Term, and End of Term examination sections. Matches Uganda primary school layout.',
  'primary',
  false,
  s.id
FROM public.schools s
WHERE NOT EXISTS (
  SELECT 1 FROM public.report_templates rt 
  WHERE rt.template_type = 'primary' AND rt.school_id = s.id
);