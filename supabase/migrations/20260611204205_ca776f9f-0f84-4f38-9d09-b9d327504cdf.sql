
INSERT INTO public.report_templates (school_id, name, description, template_type, is_active, is_default, version, template_config)
SELECT s.id,
       'Primary Template 1 – Classic Uganda Style',
       'Traditional Ugandan primary school report card with watermark logo, bordered tables, BOT / Mid-Term / EOT exam sections, conduct and signature blocks. Available to primary schools only.',
       'primary_classic_uganda',
       true,
       false,
       1,
       '{}'::jsonb
FROM public.schools s
WHERE s.school_level = 'primary'
  AND NOT EXISTS (
    SELECT 1 FROM public.report_templates rt
    WHERE rt.school_id = s.id
      AND rt.template_type = 'primary_classic_uganda'
  );
