import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { identifier } = await req.json()

    if (!identifier || typeof identifier !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing login identifier' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const normalizedIdentifier = identifier.trim()
    const normalizedCode = normalizedIdentifier.toUpperCase()

    const { data: school, error: schoolError } = await supabaseAdmin
      .from('schools')
      .select('id, admin_email, status')
      .or(`email.eq.${normalizedIdentifier},school_code.eq.${normalizedCode}`)
      .maybeSingle()

    if (schoolError) {
      console.error('resolve-school-login lookup error:', schoolError)
      return new Response(
        JSON.stringify({ error: 'Failed to resolve school login' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!school || !school.admin_email) {
      return new Response(
        JSON.stringify({ admin_email: null }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (school.status !== 'active') {
      return new Response(
        JSON.stringify({ error: 'School account is inactive' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ admin_email: school.admin_email }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in resolve-school-login:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to resolve school login' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
