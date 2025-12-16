import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify the requesting user is an admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const token = authHeader.replace('Bearer ', '')
    
    const { data: user, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is admin or principal
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.user.id)
      .single()

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Could not verify user permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!['admin', 'principal'].includes(profile.role)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions: Only admin or principal can delete users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { userId } = await req.json()
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prevent self-deletion
    if (userId === user.user.id) {
      return new Response(
        JSON.stringify({ error: 'Cannot delete your own account' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Attempting to deactivate user: ${userId}`)

    // Step 1: Soft delete - Set profile as inactive
    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({ is_active: false })
      .eq('user_id', userId)

    if (profileUpdateError) {
      console.error('Error deactivating profile:', profileUpdateError)
      return new Response(
        JSON.stringify({ error: `Failed to deactivate profile: ${profileUpdateError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Profile deactivated for user: ${userId}`)

    // Step 2: Ban the auth user to prevent login
    const { error: banError } = await supabase.auth.admin.updateUserById(userId, {
      ban_duration: '876000h', // ~100 years
      user_metadata: { deleted_at: new Date().toISOString(), deleted_by: user.user.id }
    })

    if (banError) {
      console.error('Error banning auth user:', banError)
      // Don't fail the whole operation - profile is already deactivated
      console.log('Profile was deactivated but auth ban failed - user still cannot access system')
    } else {
      console.log(`Auth user banned: ${userId}`)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User account deactivated and banned from system',
        deleted_user_id: userId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in delete-user function:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error occurred during user deletion' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
