import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.25.76';

const BodySchema = z.object({
  applicationId: z.string().uuid(),
  classId: z.string().uuid().nullable().optional(),
  streamId: z.string().uuid().nullable().optional(),
});

type AuthUser = {
  id: string;
  email?: string;
};

const normalizeEmail = (email: unknown) =>
  typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : null;

const splitName = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || 'User',
    lastName: parts.slice(1).join(' ') || '-',
  };
};

const generatePassword = () => {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return `S20-${Array.from(bytes, (byte) => byte.toString(36).padStart(2, '0')).join('').slice(0, 18)}!`;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const headers = { ...corsHeaders, 'Content-Type': 'application/json' };

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'Approval service is not configured' }), { status: 500, headers });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Please sign in before approving admissions' }), { status: 401, headers });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const token = authHeader.replace('Bearer ', '').trim();
    const { data: requester, error: requesterError } = await supabase.auth.getUser(token);
    if (requesterError || !requester.user) {
      return new Response(JSON.stringify({ error: 'Your session could not be verified' }), { status: 401, headers });
    }

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Invalid approval request', details: parsed.error.flatten().fieldErrors }), { status: 400, headers });
    }

    const { applicationId, classId, streamId } = parsed.data;

    const { data: actorProfile, error: actorError } = await supabase
      .from('profiles')
      .select('id, role, school_id')
      .eq('user_id', requester.user.id)
      .maybeSingle();

    if (actorError) {
      return new Response(JSON.stringify({ error: `Could not verify approver: ${actorError.message}` }), { status: 400, headers });
    }

    if (!actorProfile || !['admin', 'principal', 'head_teacher'].includes(actorProfile.role)) {
      return new Response(JSON.stringify({ error: 'Only admin, principal, or head teacher accounts can approve admissions' }), { status: 403, headers });
    }

    const { data: application, error: applicationError } = await supabase
      .from('admission_applications')
      .select('*')
      .eq('id', applicationId)
      .maybeSingle();

    if (applicationError) {
      return new Response(JSON.stringify({ error: `Could not load application: ${applicationError.message}` }), { status: 400, headers });
    }

    if (!application) {
      return new Response(JSON.stringify({ error: 'Application not found' }), { status: 404, headers });
    }

    if (application.school_id !== actorProfile.school_id) {
      return new Response(JSON.stringify({ error: 'This application belongs to another school' }), { status: 403, headers });
    }

    if (application.stage === 'enrolled') {
      return new Response(JSON.stringify({ error: 'Application is already enrolled' }), { status: 409, headers });
    }

    const findAuthUserByEmail = async (email: string): Promise<AuthUser | null> => {
      let page = 1;
      const perPage = 1000;
      while (page <= 10) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
        if (error) throw new Error(`Could not check existing login accounts: ${error.message}`);
        const found = data.users.find((user) => normalizeEmail(user.email) === email);
        if (found) return { id: found.id, email: found.email ?? undefined };
        if (data.users.length < perPage) return null;
        page += 1;
      }
      return null;
    };

    const ensureAuthUser = async ({
      email,
      name,
      role,
      allowExistingRoles,
    }: {
      email: string;
      name: string;
      role: 'student' | 'teacher' | 'parent';
      allowExistingRoles: string[];
    }) => {
      const existingAuthUser = await findAuthUserByEmail(email);
      const { firstName, lastName } = splitName(name);

      if (existingAuthUser) {
        const { data: existingProfile, error: profileError } = await supabase
          .from('profiles')
          .select('id, role, school_id, is_active')
          .eq('user_id', existingAuthUser.id)
          .maybeSingle();

        if (profileError) throw new Error(`Could not verify existing account for ${email}: ${profileError.message}`);
        if (existingProfile && existingProfile.school_id && existingProfile.school_id !== application.school_id) {
          throw new Error(`The account ${email} belongs to another school`);
        }
        const isUnassignedAuthTriggerProfile = existingProfile && !existingProfile.school_id && existingProfile.role === 'student';
        if (existingProfile && !isUnassignedAuthTriggerProfile && !allowExistingRoles.includes(existingProfile.role)) {
          throw new Error(`The account ${email} is already assigned as ${existingProfile.role}`);
        }

        const password = generatePassword();
        const { error: updateError } = await supabase.auth.admin.updateUserById(existingAuthUser.id, {
          password,
          email_confirm: true,
          ban_duration: 'none',
          user_metadata: { first_name: firstName, last_name: lastName, role },
        });
        if (updateError) throw new Error(`Could not reactivate ${email}: ${updateError.message}`);
        return { id: existingAuthUser.id, email, password, created: false };
      }

      const password = generatePassword();
      const { data: created, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { first_name: firstName, last_name: lastName, role },
      });

      if (createError || !created.user) {
        throw new Error(`Could not create login for ${email}: ${createError?.message || 'Unknown error'}`);
      }

      return { id: created.user.id, email, password, created: true };
    };

    const createdAuthIds: string[] = [];

    try {
      const mainEmail = application.application_type === 'staff'
        ? normalizeEmail(application.parent_email) ?? `staff+${application.id}@school20.local`
        : `learner+${application.id}@school20.local`;

      const mainRole = application.application_type === 'staff' ? 'teacher' : 'student';
      const mainAccount = await ensureAuthUser({
        email: mainEmail,
        name: application.student_name,
        role: mainRole,
        allowExistingRoles: mainRole === 'teacher' ? ['teacher', 'head_teacher'] : ['student'],
      });
      if (mainAccount.created) createdAuthIds.push(mainAccount.id);

      let parentAccount: Awaited<ReturnType<typeof ensureAuthUser>> | null = null;
      if (application.application_type === 'learner' && application.parent_name?.trim()) {
        const parentEmail = normalizeEmail(application.parent_email) ?? `parent+${application.id}@school20.local`;
        parentAccount = await ensureAuthUser({
          email: parentEmail,
          name: application.parent_name,
          role: 'parent',
          allowExistingRoles: ['parent'],
        });
        if (parentAccount.created) createdAuthIds.push(parentAccount.id);
      }

      const { data: result, error: finalizeError } = await supabase.rpc('finalize_admission_approval', {
        p_app_id: application.id,
        p_auth_user_id: mainAccount.id,
        p_parent_auth_user_id: parentAccount?.id ?? null,
        p_class_id: classId ?? null,
        p_stream_id: streamId ?? null,
        p_actor_user_id: requester.user.id,
      });

      if (finalizeError) throw new Error(`Approval finalization failed: ${finalizeError.message}`);
      if (!result?.success) throw new Error(result?.error || 'Approval finalization failed');

      return new Response(JSON.stringify({
        ...result,
        credentials: {
          primary: { email: mainAccount.email, temporaryPassword: mainAccount.password },
          parent: parentAccount ? { email: parentAccount.email, temporaryPassword: parentAccount.password } : null,
        },
      }), { headers });
    } catch (error) {
      await Promise.allSettled(createdAuthIds.map((id) => supabase.auth.admin.deleteUser(id)));
      throw error;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Approval failed';
    return new Response(JSON.stringify({ error: message }), { status: 400, headers });
  }
});